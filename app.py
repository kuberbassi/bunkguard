import os
from flask import Flask, render_template, session, redirect, url_for, jsonify, request, Response
from pymongo import MongoClient
from dotenv import load_dotenv
from authlib.integrations.flask_client import OAuth
from urllib.parse import urlencode, quote_plus
from bson import json_util, ObjectId
from datetime import datetime
import calendar

# --- Initialization & Config ---
load_dotenv()
app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY", "your_fallback_secret_key")
app.config['SERVER_NAME'] = os.getenv('SERVER_NAME', '127.0.0.1:5000')

# --- Database ---
client = MongoClient(os.getenv('MONGO_URI'))
db = client.get_database('attendanceDB')
subjects_collection = db.get_collection('subjects')
attendance_log_collection = db.get_collection('attendance_logs')
timetable_collection = db.get_collection('timetable')
system_logs_collection = db.get_collection('system_logs')

# --- CORRECTED Auth0 OAuth Setup ---
oauth = OAuth(app)
auth0 = oauth.register(
    'auth0',
    client_id=os.getenv('AUTH0_CLIENT_ID'),
    client_secret=os.getenv('AUTH0_CLIENT_SECRET'),
    server_metadata_url=f'https://{os.getenv("AUTH0_DOMAIN")}/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid profile email'},
)

# --- Helper Functions ---
def create_system_log(user_email, action, description):
    system_logs_collection.insert_one({"owner_email": user_email, "action": action, "description": description, "timestamp": datetime.utcnow()})

def calculate_percent(attended, total):
    return round((attended / total) * 100, 1) if total > 0 else 0

def calculate_bunk_guard(attended, total, required_percent=75):
    required_percent /= 100.0
    if total == 0: return {"safe_skips": 0, "status": "neutral", "status_message": "No classes yet", "percentage": 0}
    current_percent = attended / total
    if current_percent >= required_percent:
        safe_skips = int((attended - required_percent * total) / required_percent) if required_percent > 0 else float('inf')
        return {"safe_skips": safe_skips, "status": "safe", "status_message": f"{safe_skips} safe skips", "percentage": round(current_percent * 100, 1)}
    else:
        classes_to_attend = -1
        if (1-required_percent) > 0: classes_to_attend = int((required_percent * total - attended) / (1 - required_percent))
        return {"safe_skips": 0, "status": "danger", "status_message": f"Attend next {classes_to_attend}" if classes_to_attend !=-1 else "Attend all upcoming", "percentage": round(current_percent * 100, 1)}

# === Page Routes ===
@app.route('/')
def dashboard():
    if 'user' not in session: return redirect('/login')
    return render_template("dashboard.html", session=session)
@app.route('/mark')
def mark_attendance_page():
    if 'user' not in session: return redirect('/login')
    return render_template("mark_attendance.html", session=session, now=datetime.now())
@app.route('/reports')
def reports_page():
    if 'user' not in session: return redirect('/login')
    return render_template("reports.html", session=session)
@app.route('/schedule')
def schedule_page():
    if 'user' not in session: return redirect('/login')
    cache_id = datetime.utcnow().timestamp()
    return render_template("schedule.html", session=session, cache_id=cache_id)
@app.route('/settings')
def settings_page():
    if 'user' not in session: return redirect('/login')
    return render_template("settings.html", session=session)
@app.route('/report/<int:semester>/print')
def printable_report(semester):
    if 'user' not in session: return redirect('/login')
    user_email = session['user']['email']
    subjects = list(subjects_collection.find({"owner_email": user_email, "semester": semester}))
    total_attended = sum(s.get('attended', 0) for s in subjects)
    total_classes = sum(s.get('total', 0) for s in subjects)
    overall_percent = calculate_percent(total_attended, total_classes)
    report_data = { "user_name": session['user']['name'], "semester": semester, "generated_date": datetime.now().strftime("%B %d, %Y"), "subjects": subjects, "overall_percentage": overall_percent }
    return render_template("printable_report.html", data=report_data)

# === API Routes ===
@app.route('/api/dashboard_data')
def get_dashboard_data():
    if 'user' not in session: return jsonify({"error": "Unauthorized"}), 401
    user_email = session['user']['email']
    try:
        current_semester = int(request.args.get('semester', 1))
        subjects = list(subjects_collection.find({"owner_email": user_email, "semester": current_semester}))
        total_attended = sum(s.get('attended', 0) for s in subjects)
        total_classes = sum(s.get('total', 0) for s in subjects)
        overall_percent = calculate_percent(total_attended, total_classes)
        subjects_overview = [{"name": s.get('name', 'N/A'), **calculate_bunk_guard(s.get('attended', 0), s.get('total', 0))} for s in subjects]
        return json_util.dumps({"current_date": datetime.now().strftime("%B %d, %Y"), "overall_attendance": overall_percent, "subjects_overview": subjects_overview})
    except Exception as e:
        print(f"---! ERROR IN /api/dashboard_data: {e} !---")
        return jsonify({"error": "A server error occurred."}), 500

@app.route('/api/dashboard_summary')
def get_dashboard_summary():
    if 'user' not in session: return jsonify({"error": "Unauthorized"}), 401
    user_email = session['user']['email']
    try:
        all_subjects = list(subjects_collection.find({"owner_email": user_email}))
        total_attended = sum(s.get('attended', 0) for s in all_subjects)
        total_classes = sum(s.get('total', 0) for s in all_subjects)
        at_risk_subjects = []
        for s in all_subjects:
            percent = calculate_percent(s.get('attended', 0), s.get('total', 0))
            if 0 < percent < 75:
                at_risk_subjects.append({"name": s.get('name'), "semester": s.get('semester'), "percentage": percent})
        return json_util.dumps({"all_time_stats": {"percentage": calculate_percent(total_attended, total_classes), "attended": total_attended, "total": total_classes}, "at_risk_subjects": sorted(at_risk_subjects, key=lambda x: x['percentage'])})
    except Exception as e:
        print(f"---! ERROR IN /api/dashboard_summary: {e} !---")
        return jsonify({"error": "Could not process summary data."}), 500

@app.route('/api/all_semesters_overview')
def all_semesters_overview():
    if 'user' not in session: return jsonify({"error": "Unauthorized"}), 401
    user_email = session['user']['email']
    pipeline = [{'$match': {'owner_email': user_email}}, {'$group': {'_id': '$semester', 'total_attended': {'$sum': '$attended'}, 'total_classes': {'$sum': '$total'}}}, {'$sort': {'_id': 1}}]
    semester_data = list(subjects_collection.aggregate(pipeline))
    return json_util.dumps([{"semester": sem['_id'], "percentage": calculate_percent(sem['total_attended'], sem['total_classes'])} for sem in semester_data])

@app.route('/api/analytics/day_of_week')
def analytics_day_of_week():
    if 'user' not in session: return jsonify({"error": "Unauthorized"}), 401
    user_email = session['user']['email']
    pipeline = [{'$match': {'owner_email': user_email}}, {'$project': {'dayOfWeek': {'$dayOfWeek': '$timestamp'}, 'status': '$status'}}, {'$group': {'_id': {'dayOfWeek': '$dayOfWeek', 'status': '$status'}, 'count': {'$sum': 1}}}, {'$group': {'_id': '$_id.dayOfWeek', 'counts': {'$push': {'status': '$_id.status', 'count': '$count'}}}}, {'$sort': {'_id': 1}}]
    data = list(attendance_log_collection.aggregate(pipeline))
    day_map = ["", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    day_data = {i: {'present': 0, 'total': 0} for i in range(1, 8)}
    for day in data:
        for status_count in day['counts']:
            if status_count['status'] == 'present': day_data[day['_id']]['present'] += status_count['count']
            day_data[day['_id']]['total'] += status_count['count']
    analytics = {"labels": [], "percentages": []}
    for i in range(2, 8):
        analytics['labels'].append(day_map[i])
        analytics['percentages'].append(calculate_percent(day_data[i]['present'], day_data[i]['total']))
    analytics['labels'].append(day_map[1])
    analytics['percentages'].append(calculate_percent(day_data[1]['present'], day_data[1]['total']))
    return json_util.dumps(analytics)

@app.route('/api/add_subject', methods=['POST'])
def add_subject():
    if 'user' not in session: return jsonify({"error": "Unauthorized"}), 401
    data = request.json
    subject_name, semester = data.get('subject_name'), int(data.get('semester'))
    if not subject_name or not semester: return jsonify({"error": "Subject name and semester are required"}), 400
    subjects_collection.insert_one({"name": subject_name, "owner_email": session['user']['email'], "semester": semester, "attended": 0, "total": 0, "created_at": datetime.utcnow()})
    create_system_log(session['user']['email'], "Subject Added", f"Added '{subject_name}' to Semester {semester}")
    return jsonify({"success": True, "message": "Subject added successfully"})

@app.route('/api/timetable', methods=['GET', 'POST'])
def handle_timetable():
    if 'user' not in session: return jsonify({"error": "Unauthorized"}), 401
    user_email = session['user']['email']
    if request.method == 'POST':
        data = request.json.get('schedule', {})
        timetable_collection.update_one({'owner_email': user_email}, {'$set': {'schedule': data}}, upsert=True)
        create_system_log(user_email, "Schedule Updated", "User saved changes to the class schedule.")
        return jsonify({"success": True})
    timetable_doc = timetable_collection.find_one({'owner_email': user_email})
    return json_util.dumps(timetable_doc.get('schedule', {}) if timetable_doc else {})

@app.route('/api/attendance_logs')
def get_attendance_logs():
    if 'user' not in session: return jsonify({"error": "Unauthorized"}), 401
    limit = int(request.args.get('limit', 0))
    pipeline = [{'$match': {'owner_email': session['user']['email']}}, {'$sort': {'timestamp': -1}}, {'$lookup': {'from': 'subjects', 'localField': 'subject_id', 'foreignField': '_id', 'as': 'subject_info'}}, {'$unwind': '$subject_info'}]
    if limit > 0: pipeline.append({'$limit': limit})
    return json_util.dumps(list(attendance_log_collection.aggregate(pipeline)))

@app.route('/api/system_logs')
def get_system_logs():
    if 'user' not in session: return jsonify({"error": "Unauthorized"}), 401
    return json_util.dumps(list(system_logs_collection.find({'owner_email': session['user']['email']}).sort('timestamp', -1)))

@app.route('/api/todays_classes')
def get_todays_classes():
    if 'user' not in session: return jsonify({"error": "Unauthorized"}), 401
    user_email = session['user']['email']
    today_name = calendar.day_name[datetime.now().weekday()]
    timetable_doc = timetable_collection.find_one({'owner_email': user_email})
    if not timetable_doc: return json_util.dumps([])
    todays_subject_ids = []
    schedule = timetable_doc.get('schedule', {})
    for time_slot, days in schedule.items():
        if days.get(today_name):
            slot_data = days[today_name]
            if slot_data.get('type') == 'class' and slot_data.get('subjectId'):
                todays_subject_ids.append(ObjectId(slot_data['subjectId']))
    if not todays_subject_ids: return json_util.dumps([])
    subjects = list(subjects_collection.find({"owner_email": user_email, "_id": {"$in": todays_subject_ids}}))
    today_str = datetime.now().strftime("%Y-%m-%d")
    for subject in subjects:
        log = attendance_log_collection.find_one({"subject_id": subject["_id"], "date": today_str})
        subject["marked_status"] = log["status"] if log else "pending"
    return json_util.dumps(subjects)

@app.route('/api/mark_attendance', methods=['POST'])
def mark_attendance():
    if 'user' not in session: return jsonify({"error": "Unauthorized"}), 401
    data = request.json
    subject_id, status = ObjectId(data.get('subject_id')), data.get('status')
    subject = subjects_collection.find_one({'_id': subject_id})
    if not subject: return jsonify({"error": "Subject not found"}), 404
    today_str = datetime.now().strftime("%Y-%m-%d")
    if attendance_log_collection.find_one({"subject_id": subject_id, "date": today_str}): return jsonify({"error": "Already marked today"}), 400
    attendance_log_collection.insert_one({"subject_id": subject_id, "owner_email": session['user']['email'], "date": today_str, "status": status, "timestamp": datetime.utcnow(), "semester": subject.get('semester')})
    update_query = {'$inc': {'total': 1}}
    if status == 'present': update_query['$inc']['attended'] = 1
    subjects_collection.update_one({'_id': subject_id}, update_query)
    return jsonify({"success": True})

@app.route('/api/update_attendance_count', methods=['POST'])
def update_attendance_count():
    if 'user' not in session: return jsonify({"error": "Unauthorized"}), 401
    data = request.json
    subject_id, attended, total = ObjectId(data.get('subject_id')), int(data.get('attended')), int(data.get('total'))
    if attended > total: return jsonify({"success": False, "error": "Attended cannot be more than total."}), 400
    subjects_collection.update_one({'_id': subject_id, 'owner_email': session['user']['email']}, {'$set': {'attended': attended, 'total': total}})
    create_system_log(session['user']['email'], "Data Overridden", "Manually updated attendance counts.")
    return jsonify({"success": True})

@app.route('/api/full_subjects_data')
def get_full_subjects_data():
    if 'user' not in session: return jsonify({"error": "Unauthorized"}), 401
    return json_util.dumps(list(subjects_collection.find({"owner_email": session['user']['email']})))

@app.route('/api/subjects')
def get_subjects():
    if 'user' not in session: return jsonify({"error": "Unauthorized"}), 401
    return json_util.dumps(list(subjects_collection.find({"owner_email": session['user']['email']}, {"name": 1, "semester": 1})))

@app.route('/api/export_data')
def export_data():
    if 'user' not in session: return "Unauthorized", 401
    user_email = session['user']['email']
    data_to_export = {
        "subjects": list(subjects_collection.find({"owner_email": user_email}, {'_id': 0})),
        "attendance_logs": list(attendance_log_collection.find({"owner_email": user_email}, {'_id': 0})),
        "schedule": timetable_collection.find_one({"owner_email": user_email}, {'_id': 0, 'schedule': 1})
    }
    return Response(json_util.dumps(data_to_export, indent=4), mimetype="application/json", headers={"Content-Disposition": "attachment;filename=bunkguard_data.json"})

# === Authentication Routes ===
@app.route('/login')
def login(): return auth0.authorize_redirect(redirect_uri=url_for("callback", _external=True))
@app.route('/callback')
def callback():
    token = auth0.authorize_access_token()
    session["user"] = token["userinfo"]
    return redirect("/")
@app.route('/logout')
def logout():
    session.clear()
    return redirect(f"https://{os.getenv('AUTH0_DOMAIN')}/v2/logout?" + urlencode({"returnTo": url_for("login", _external=True), "client_id": os.getenv("AUTH0_CLIENT_ID")}, quote_via=quote_plus))

if __name__ == "__main__":
    app.run(debug=True)