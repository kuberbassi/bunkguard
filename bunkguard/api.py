# bunkguard/api.py
import calendar
import math
import traceback
from datetime import datetime, timedelta
from bson import json_util, ObjectId
from flask import Blueprint, jsonify, request, session, Response

from . import db # Import the shared db instance

api_bp = Blueprint('api', __name__, url_prefix='/api')

# --- Collections ---
subjects_collection = db.get_collection('subjects')
attendance_log_collection = db.get_collection('attendance_logs')
timetable_collection = db.get_collection('timetable')
system_logs_collection = db.get_collection('system_logs')
deadlines_collection = db.get_collection('deadlines')

# --- Helper Functions ---
def create_system_log(user_email, action, description):
    """Logs a system event to the database."""
    system_logs_collection.insert_one({
        "owner_email": user_email,
        "action": action,
        "description": description,
        "timestamp": datetime.utcnow()
    })

def calculate_percent(attended, total):
    """Calculates the attendance percentage."""
    return round((attended / total) * 100, 1) if total > 0 else 0

def calculate_bunk_guard(attended, total, required_percent=75):
    """Calculates bunk status and messages using a potentially custom threshold."""
    required_percent = float(required_percent) / 100.0
    if total == 0:
        return {"status": "neutral", "status_message": "No classes yet", "percentage": 0}

    current_percent = attended / total
    if current_percent >= required_percent:
        safe_skips = math.floor((attended - required_percent * total) / required_percent) if required_percent > 0 else float('inf')
        return {"status": "safe", "status_message": f"You have {safe_skips} safe skips.", "percentage": round(current_percent * 100, 1)}
    else:
        classes_to_attend = math.ceil((required_percent * total - attended) / (1 - required_percent)) if (1 - required_percent) > 0 else -1
        status_msg = f"Attend the next {classes_to_attend} classes." if classes_to_attend != -1 else "Attend all upcoming classes."
        return {"status": "danger", "status_message": status_msg, "percentage": round(current_percent * 100, 1)}

# === CORE API ROUTES ===

@api_bp.route('/dashboard_data')
def get_dashboard_data():
    if 'user' not in session: return jsonify({"error": "Unauthorized"}), 401
    try:
        user_email = session['user']['email']
        user_prefs_doc = timetable_collection.find_one({'owner_email': user_email}, {'preferences': 1})
        required_percent = user_prefs_doc.get('preferences', {}).get('threshold', 75) if user_prefs_doc else 75

        current_semester = int(request.args.get('semester', 1))
        query = {"owner_email": user_email, "semester": current_semester}
        subjects = list(subjects_collection.find(query))
        total_attended = sum(s.get('attended', 0) for s in subjects)
        total_classes = sum(s.get('total', 0) for s in subjects)
        overall_percent = calculate_percent(total_attended, total_classes)
        subjects_overview = [{"name": s.get('name', 'N/A'), **calculate_bunk_guard(s.get('attended', 0), s.get('total', 0), required_percent)} for s in subjects]
        
        response_data = {"current_date": datetime.now().strftime("%B %d, %Y"), "overall_attendance": overall_percent, "subjects_overview": subjects_overview}
        return Response(json_util.dumps(response_data), mimetype='application/json')
    except Exception as e:
        print(f"---! ERROR IN /api/dashboard_data: {e} !---")
        traceback.print_exc()
        return jsonify({"error": "A server error occurred."}), 500

@api_bp.route('/reports_data')
def get_reports_data():
    if 'user' not in session: return jsonify({"error": "Unauthorized"}), 401
    try:
        user_email = session['user']['email']
        current_semester = int(request.args.get('semester', 1))
        
        subjects = list(subjects_collection.find({"owner_email": user_email, "semester": current_semester}))
        
        best_subject, worst_subject = {}, {}
        total_absences = 0
        
        if subjects:
            for s in subjects:
                s['percentage'] = calculate_percent(s.get('attended', 0), s.get('total', 0))
            
            if subjects: # Ensure list is not empty before using max/min
                best_subject = max(subjects, key=lambda s: s['percentage'])
                worst_subject = min(subjects, key=lambda s: s['percentage'])
                total_absences = sum(s.get('total', 0) - s.get('attended', 0) for s in subjects)

        heatmap_data_sets = {}
        start_date = datetime.utcnow().replace(tzinfo=None) - timedelta(days=34)
        logs_for_heatmap = list(attendance_log_collection.find(
            {"owner_email": user_email, "timestamp": {'$gte': start_date}},
            {'date': 1, 'status': 1, '_id': 0}
        ))
        for log in logs_for_heatmap:
            date_str = log['date']
            status = log['status']
            if date_str not in heatmap_data_sets:
                heatmap_data_sets[date_str] = set()
            if status in ['present', 'approved_medical']:
                heatmap_data_sets[date_str].add('present')
            elif status in ['absent', 'pending_medical']:
                heatmap_data_sets[date_str].add('absent')

        heatmap_data_lists = {date: list(statuses) for date, statuses in heatmap_data_sets.items()}
        streak = 0 

        response_data = {
            "kpis": {
                "best_subject_name": best_subject.get('name', '--'),
                "best_subject_percent": f"{best_subject.get('percentage', 0):.1f}%",
                "worst_subject_name": worst_subject.get('name', '--'),
                "worst_subject_percent": f"{worst_subject.get('percentage', 0):.1f}%",
                "total_absences": total_absences,
                "streak": streak
            },
            "subject_breakdown": sorted(subjects, key=lambda s: s.get('percentage', 0), reverse=True),
            "heatmap_data": heatmap_data_lists
        }
        
        return Response(json_util.dumps(response_data), mimetype='application/json')
    except Exception as e:
        print(f"---! UNEXPECTED ERROR IN /api/reports_data: {e} !---")
        traceback.print_exc()
        return jsonify({"error": "An internal error occurred."}), 500

@api_bp.route('/attendance_logs')
def get_attendance_logs():
    if 'user' not in session: return jsonify({"error": "Unauthorized"}), 401
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 15))
        skip = (page - 1) * limit

        user_email = session['user']['email']
        query = {'owner_email': user_email}

        total_logs = attendance_log_collection.count_documents(query)
        pipeline = [
            {'$match': query},
            {'$sort': {'timestamp': -1}},
            {'$skip': skip},
            {'$limit': limit},
            {'$lookup': {'from': 'subjects', 'localField': 'subject_id', 'foreignField': '_id', 'as': 'subject_info'}},
            {'$unwind': '$subject_info'}
        ]
        logs = list(attendance_log_collection.aggregate(pipeline))
        has_next_page = total_logs > (skip + len(logs))
        
        response_data = {"logs": logs, "has_next_page": has_next_page}
        return Response(json_util.dumps(response_data), mimetype='application/json')
    except Exception as e:
        print(f"---! ERROR IN /api/attendance_logs: {e} !---")
        traceback.print_exc()
        return jsonify({"error": "Failed to fetch logs."}), 500

# In bunkguard/api.py, replace the old mark_attendance function

@api_bp.route('/mark_attendance', methods=['POST'])
def mark_attendance():
    if 'user' not in session: return jsonify({"error": "Unauthorized"}), 401
    data = request.json
    subject_id = ObjectId(data.get('subject_id'))
    status = data.get('status')
    # New: Get the date from the request, or default to today
    date_str = data.get('date', datetime.now().strftime("%Y-%m-%d"))

    subject = subjects_collection.find_one({'_id': subject_id})
    if not subject: return jsonify({"error": "Subject not found"}), 404
    
    # Check if already marked for the specific date
    if attendance_log_collection.find_one({"subject_id": subject_id, "date": date_str}):
        return jsonify({"error": "Already marked for this day"}), 400
    
    attendance_log_collection.insert_one({
        "subject_id": subject_id,
        "owner_email": session['user']['email'],
        "date": date_str,
        "status": status,
        "timestamp": datetime.utcnow(), # Timestamp is still 'now'
        "semester": subject.get('semester')
    })
    
    update_query = {}
    if status in ['present', 'absent', 'pending_medical']:
        update_query['$inc'] = {'total': 1}
        if status == 'present':
            update_query['$inc']['attended'] = 1
    if update_query:
        subjects_collection.update_one({'_id': subject_id}, update_query)
        
    return jsonify({"success": True})

@api_bp.route('/todays_classes')
def get_todays_classes():
    if 'user' not in session: return jsonify({"error": "Unauthorized"}), 401
    user_email = session['user']['email']
    today_name = calendar.day_name[datetime.now().weekday()]
    timetable_doc = timetable_collection.find_one({'owner_email': user_email})
    if not timetable_doc:
        return Response(json_util.dumps([]), mimetype='application/json')

    todays_subject_ids = []
    schedule = timetable_doc.get('schedule', {})
    if isinstance(schedule, dict):
        for time_slot, days in schedule.items():
            if isinstance(days, dict) and today_name in days:
                slot_data = days[today_name]
                if isinstance(slot_data, dict) and slot_data.get('type') == 'class' and slot_data.get('subjectId'):
                    todays_subject_ids.append(ObjectId(slot_data['subjectId']))
    
    if not todays_subject_ids:
        return Response(json_util.dumps([]), mimetype='application/json')

    subjects = list(subjects_collection.find({"owner_email": user_email, "_id": {"$in": todays_subject_ids}}))
    today_str = datetime.now().strftime("%Y-%m-%d")
    for subject in subjects:
        log = attendance_log_collection.find_one({"subject_id": subject["_id"], "date": today_str})
        subject["marked_status"] = log["status"] if log else "pending"
        
    return Response(json_util.dumps(subjects), mimetype='application/json')


# === SETTINGS PAGE AND OTHER ROUTES ===

@api_bp.route('/full_subjects_data')
def get_full_subjects_data():
    if 'user' not in session: return jsonify({"error": "Unauthorized"}), 401
    semester = int(request.args.get('semester', 1))
    query = {"owner_email": session['user']['email'], "semester": semester}
    subjects = list(subjects_collection.find(query))
    return Response(json_util.dumps(subjects), mimetype='application/json')

@api_bp.route('/pending_leaves')
def get_pending_leaves():
    if 'user' not in session: return jsonify({"error": "Unauthorized"}), 401
    pipeline = [
        {'$match': {'owner_email': session['user']['email'], 'status': 'pending_medical'}},
        {'$lookup': {'from': 'subjects', 'localField': 'subject_id', 'foreignField': '_id', 'as': 'subject_info'}},
        {'$unwind': '$subject_info'}
    ]
    leaves = list(attendance_log_collection.aggregate(pipeline))
    return Response(json_util.dumps(leaves), mimetype='application/json')

@api_bp.route('/approve_leave/<log_id>', methods=['POST'])
def approve_leave(log_id):
    if 'user' not in session: return jsonify({"error": "Unauthorized"}), 401
    log_oid = ObjectId(log_id)
    log = attendance_log_collection.find_one({'_id': log_oid})
    if not log: return jsonify({"error": "Log not found"}), 404
    
    result = attendance_log_collection.update_one(
        {'_id': log_oid, 'status': 'pending_medical'},
        {'$set': {'status': 'approved_medical'}}
    )
    if result.modified_count > 0:
        subjects_collection.update_one(
            {'_id': log['subject_id']},
            {'$inc': {'attended': 1}}
        )
        create_system_log(session['user']['email'], "Leave Approved", f"A medical leave for subject ID {log['subject_id']} was approved.")
        return jsonify({"success": True})
    else:
        return jsonify({"error": "Leave could not be approved or was already approved."}), 400

@api_bp.route('/preferences', methods=['GET', 'POST'])
def handle_preferences():
    if 'user' not in session: return jsonify({"error": "Unauthorized"}), 401
    user_email = session['user']['email']
    if request.method == 'POST':
        threshold = request.json.get('threshold')
        timetable_collection.update_one(
            {'owner_email': user_email},
            {'$set': {'preferences.threshold': int(threshold)}},
            upsert=True
        )
        create_system_log(user_email, "Preferences Updated", f"Set attendance threshold to {threshold}%.")
        return jsonify({"success": True})
    user_prefs_doc = timetable_collection.find_one({'owner_email': user_email}, {'preferences': 1})
    preferences = user_prefs_doc.get('preferences', {}) if user_prefs_doc else {}
    return jsonify(preferences)

@api_bp.route('/system_logs')
def get_system_logs():
    if 'user' not in session: return jsonify({"error": "Unauthorized"}), 401
    logs = list(system_logs_collection.find({'owner_email': session['user']['email']}).sort('timestamp', -1))
    return Response(json_util.dumps(logs), mimetype='application/json')

@api_bp.route('/delete_all_data', methods=['POST'])
def delete_all_data():
    if 'user' not in session: return jsonify({"error": "Unauthorized"}), 401
    user_email = session['user']['email']
    subjects_collection.delete_many({'owner_email': user_email})
    attendance_log_collection.delete_many({'owner_email': user_email})
    timetable_collection.delete_many({'owner_email': user_email})
    system_logs_collection.delete_many({'owner_email': user_email})
    deadlines_collection.delete_many({'owner_email': user_email})
    create_system_log(user_email, "Data Deleted", "User deleted all their account data.")
    return jsonify({"success": True})

@api_bp.route('/import_data', methods=['POST'])
def import_data():
    if 'user' not in session: return jsonify({"error": "Unauthorized"}), 401
    user_email = session['user']['email']
    data = request.json
    subjects_upserted = 0
    
    if 'subjects' in data:
        for subject in data['subjects']:
            subjects_collection.update_one(
                {'owner_email': user_email, 'name': subject['name'], 'semester': subject['semester']},
                {'$set': subject},
                upsert=True
            )
            subjects_upserted += 1

    if 'schedule' in data and 'schedule' in data.get('schedule', {}):
        timetable_collection.update_one(
            {'owner_email': user_email},
            {'$set': {'schedule': data['schedule']['schedule']}},
            upsert=True
        )
    
    create_system_log(user_email, "Data Imported", f"Imported {subjects_upserted} subjects.")
    return jsonify({"success": True, "message": f"Processed {subjects_upserted} subjects."})

@api_bp.route('/add_subject', methods=['POST'])
def add_subject():
    if 'user' not in session: return jsonify({"error": "Unauthorized"}), 401
    data = request.json
    subject_name, semester = data.get('subject_name'), int(data.get('semester'))
    if not subject_name or not semester: return jsonify({"error": "Subject name and semester are required"}), 400
    subjects_collection.insert_one({"name": subject_name, "owner_email": session['user']['email'], "semester": semester, "attended": 0, "total": 0, "created_at": datetime.utcnow()})
    create_system_log(session['user']['email'], "Subject Added", f"Added '{subject_name}' to Semester {semester}")
    return jsonify({"success": True, "message": "Subject added successfully"})

@api_bp.route('/update_attendance_count', methods=['POST'])
def update_attendance_count():
    if 'user' not in session: return jsonify({"error": "Unauthorized"}), 401
    data = request.json
    subject_id, attended, total = ObjectId(data.get('subject_id')), int(data.get('attended')), int(data.get('total'))
    if attended > total: return jsonify({"success": False, "error": "Attended cannot be more than total."}), 400
    
    subjects_collection.update_one(
        {'_id': subject_id, 'owner_email': session['user']['email']},
        {'$set': {'attended': attended, 'total': total}}
    )
    
    subject = subjects_collection.find_one({'_id': subject_id})
    create_system_log(session['user']['email'], "Data Overridden", f"Manually set attendance for '{subject.get('name')}' to {attended}/{total}.")
    return jsonify({"success": True})

@api_bp.route('/timetable', methods=['GET', 'POST'])
def handle_timetable():
    if 'user' not in session: return jsonify({"error": "Unauthorized"}), 401
    user_email = session['user']['email']
    if request.method == 'POST':
        data = request.json.get('schedule', {})
        timetable_collection.update_one({'owner_email': user_email}, {'$set': {'schedule': data}}, upsert=True)
        create_system_log(user_email, "Schedule Updated", "User saved changes to the class schedule.")
        return jsonify({"success": True})
    timetable_doc = timetable_collection.find_one({'owner_email': user_email})
    return Response(json_util.dumps(timetable_doc.get('schedule', {}) if timetable_doc else {}), mimetype='application/json')

@api_bp.route('/subjects')
def get_subjects():
    if 'user' not in session: return jsonify({"error": "Unauthorized"}), 401
    semester = int(request.args.get('semester', 1))
    query = {"owner_email": session['user']['email'], "semester": semester}
    subjects = list(subjects_collection.find(query, {"name": 1, "semester": 1, "_id": 1}))
    return Response(json_util.dumps(subjects), mimetype='application/json')

@api_bp.route('/export_data')
def export_data():
    if 'user' not in session: return "Unauthorized", 401
    user_email = session['user']['email']
    data_to_export = {
        "subjects": list(subjects_collection.find({"owner_email": user_email}, {'_id': 0})),
        "attendance_logs": list(attendance_log_collection.find({"owner_email": user_email}, {'_id': 0})),
        "schedule": timetable_collection.find_one({"owner_email": user_email}, {'_id': 0, 'schedule': 1})
    }
    return Response(json_util.dumps(data_to_export, indent=4), mimetype="application/json", headers={"Content-Disposition": "attachment;filename=bunkguard_data.json"})

@api_bp.route('/deadlines', methods=['GET'])
def get_deadlines():
    if 'user' not in session: return jsonify({"error": "Unauthorized"}), 401
    deadlines = list(deadlines_collection.find({'owner_email': session['user']['email'], 'completed': False}).sort('due_date', 1))
    return Response(json_util.dumps(deadlines), mimetype='application/json')

@api_bp.route('/add_deadline', methods=['POST'])
def add_deadline():
    if 'user' not in session: return jsonify({"error": "Unauthorized"}), 401
    data = request.json
    deadlines_collection.insert_one({'owner_email': session['user']['email'], 'title': data.get('title'), 'due_date': data.get('due_date'), 'completed': False, 'created_at': datetime.utcnow()})
    return jsonify({"success": True})

@api_bp.route('/toggle_deadline/<deadline_id>', methods=['POST'])
def toggle_deadline(deadline_id):
    if 'user' not in session: return jsonify({"error": "Unauthorized"}), 401
    deadlines_collection.update_one({'_id': ObjectId(deadline_id)}, {'$set': {'completed': True}})
    return jsonify({"success": True})

@api_bp.route('/calendar_data')
def calendar_data():
    if 'user' not in session: return jsonify({"error": "Unauthorized"}), 401
    try:
        user_email = session['user']['email']
        month = int(request.args.get('month'))
        year = int(request.args.get('year'))
        start_date = datetime(year, month, 1)
        end_date = datetime(year, month, calendar.monthrange(year, month)[1], 23, 59, 59)
        pipeline = [{'$match': {'owner_email': user_email, 'timestamp': {'$gte': start_date, '$lte': end_date}}}, {'$group': {'_id': '$date', 'statuses': {'$addToSet': '$status'}}}]
        logs = list(attendance_log_collection.aggregate(pipeline))
        date_statuses = {}
        for log in logs:
            date_str = log['_id']
            statuses = set(log['statuses'])
            if 'absent' in statuses or 'pending_medical' in statuses:
                date_statuses[date_str] = 'any_absent'
            elif 'present' in statuses or 'approved_medical' in statuses:
                date_statuses[date_str] = 'all_present'
        return jsonify(date_statuses)
    except Exception as e:
        print(f"---! ERROR IN /api/calendar_data: {e} !---")
        traceback.print_exc()
        return jsonify({"error": "Could not fetch calendar data."}), 500

@api_bp.route('/logs_for_date')
def get_logs_for_date():
    if 'user' not in session: return jsonify({"error": "Unauthorized"}), 401
    date_str = request.args.get('date')
    if not date_str: return jsonify({"error": "Date parameter is required"}), 400
    pipeline = [
        {'$match': {'owner_email': session['user']['email'], 'date': date_str}},
        {'$lookup': {'from': 'subjects', 'localField': 'subject_id', 'foreignField': '_id', 'as': 'subject_info'}},
        {'$unwind': '$subject_info'},
        {'$project': {'_id': 0, 'subject_name': '$subject_info.name', 'status': '$status'}}
    ]
    logs = list(attendance_log_collection.aggregate(pipeline))
    return Response(json_util.dumps(logs), mimetype='application/json')

@api_bp.route('/dashboard_summary')
def get_dashboard_summary():
    if 'user' not in session: return jsonify({"error": "Unauthorized"}), 401
    try:
        user_email = session['user']['email']
        current_semester = int(request.args.get('semester', 1))
        query = {"owner_email": user_email, "semester": current_semester}
        semester_subjects = list(subjects_collection.find(query))
        total_attended = sum(s.get('attended', 0) for s in semester_subjects)
        total_classes = sum(s.get('total', 0) for s in semester_subjects)
        
        response_data = {
            "semester_stats": {
                "percentage": calculate_percent(total_attended, total_classes), 
                "attended": total_attended, 
                "total": total_classes
            }
        }
        return Response(json_util.dumps(response_data), mimetype='application/json')
    except Exception as e:
        print(f"---! ERROR IN /api/dashboard_summary: {e} !---")
        traceback.print_exc()
        return jsonify({"error": "Could not process summary data."}), 500

@api_bp.route('/all_semesters_overview')
def all_semesters_overview():
    if 'user' not in session: return jsonify({"error": "Unauthorized"}), 401
    user_email = session['user']['email']
    pipeline = [{'$match': {'owner_email': user_email}}, {'$group': {'_id': '$semester', 'total_attended': {'$sum': '$attended'}, 'total_classes': {'$sum': '$total'}}}, {'$sort': {'_id': 1}}]
    semester_data = list(subjects_collection.aggregate(pipeline))
    
    response_data = [{"semester": sem['_id'], "percentage": calculate_percent(sem['total_attended'], sem['total_classes'])} for sem in semester_data]
    return Response(json_util.dumps(response_data), mimetype='application/json')

@api_bp.route('/analytics/day_of_week')
def analytics_day_of_week():
    if 'user' not in session: return jsonify({"error": "Unauthorized"}), 401
    try:
        user_email = session['user']['email']
        pipeline = [
            {'$match': {'owner_email': user_email}},
            {'$project': {'dayOfWeek': {'$dayOfWeek': '$timestamp'}, 'status': '$status'}},
            {'$group': {'_id': {'dayOfWeek': '$dayOfWeek', 'status': '$status'}, 'count': {'$sum': 1}}},
            {'$group': {'_id': '$_id.dayOfWeek', 'counts': {'$push': {'status': '$_id.status', 'count': '$count'}}}},
            {'$sort': {'_id': 1}}
        ]
        data = list(attendance_log_collection.aggregate(pipeline))
        day_map = ["", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
        day_data = {i: {'present': 0, 'total': 0} for i in range(1, 8)}
        for day in data:
            for status_count in day['counts']:
                if status_count['status'] in ['present', 'approved_medical']:
                    day_data[day['_id']]['present'] += status_count['count']
                if status_count['status'] in ['present', 'absent', 'pending_medical', 'approved_medical']:
                    day_data[day['_id']]['total'] += status_count['count']
        analytics = {"labels": [], "percentages": []}
        # Order from Monday to Sunday
        for i in range(2, 8):
            analytics['labels'].append(day_map[i])
            analytics['percentages'].append(calculate_percent(day_data.get(i, {}).get('present', 0), day_data.get(i, {}).get('total', 0)))
        analytics['labels'].append(day_map[1])
        analytics['percentages'].append(calculate_percent(day_data.get(1, {}).get('present', 0), day_data.get(1, {}).get('total', 0)))
        
        return Response(json_util.dumps(analytics), mimetype='application/json')
    except Exception as e:
        print(f"---! ERROR IN /api/analytics/day_of_week: {e} !---")
        traceback.print_exc()
        return jsonify({"error": "Could not fetch analytics."}), 500
    
# In bunkguard/api.py, add this new function

@api_bp.route('/classes_for_date')
def get_classes_for_date():
    if 'user' not in session: return jsonify({"error": "Unauthorized"}), 401
    
    date_str = request.args.get('date')
    if not date_str:
        return jsonify({"error": "Date parameter is required"}), 400

    try:
        target_date = datetime.strptime(date_str, "%Y-%m-%d")
    except ValueError:
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD."}), 400

    user_email = session['user']['email']
    day_name = target_date.strftime('%A')
    
    timetable_doc = timetable_collection.find_one({'owner_email': user_email})
    if not timetable_doc:
        return Response(json_util.dumps([]), mimetype='application/json')

    subject_ids = []
    schedule = timetable_doc.get('schedule', {})
    if isinstance(schedule, dict):
        for days in schedule.values():
            if isinstance(days, dict) and day_name in days:
                slot_data = days[day_name]
                if isinstance(slot_data, dict) and slot_data.get('type') == 'class' and slot_data.get('subjectId'):
                    subject_ids.append(ObjectId(slot_data['subjectId']))
    
    if not subject_ids:
        return Response(json_util.dumps([]), mimetype='application/json')

    subjects = list(subjects_collection.find({"owner_email": user_email, "_id": {"$in": subject_ids}}))
    for subject in subjects:
        log = attendance_log_collection.find_one({"subject_id": subject["_id"], "date": date_str})
        subject["marked_status"] = log["status"] if log else "pending"
        
    return Response(json_util.dumps(subjects), mimetype='application/json')

# In bunkguard/api.py

@api_bp.route('/mark_substituted', methods=['POST'])
def mark_substituted():
    if 'user' not in session: return jsonify({"error": "Unauthorized"}), 401
    
    data = request.json
    original_subject_id = ObjectId(data.get('original_subject_id'))
    substitute_subject_id = ObjectId(data.get('substitute_subject_id'))
    date_str = data.get('date', datetime.now().strftime("%Y-%m-%d"))
    user_email = session['user']['email']

    # --- 1. Mark the original subject as 'substituted' ---
    # Check if it was already marked
    existing_log = attendance_log_collection.find_one_and_update(
        {"subject_id": original_subject_id, "date": date_str},
        {'$set': {"status": "substituted"}},
    )
    # If no log existed, create one. This doesn't affect percentages.
    if not existing_log:
        original_subject = subjects_collection.find_one({'_id': original_subject_id})
        attendance_log_collection.insert_one({
            "subject_id": original_subject_id, "owner_email": user_email,
            "date": date_str, "status": "substituted", "timestamp": datetime.utcnow(),
            "semester": original_subject.get('semester')
        })

    # --- 2. Mark the substitute subject as 'present' ---
    # Check if a log already exists for the substitute on the same day
    substitute_log = attendance_log_collection.find_one(
        {"subject_id": substitute_subject_id, "date": date_str}
    )
    
    if substitute_log:
        # If it was marked 'absent', we correct the record.
        if substitute_log['status'] in ['absent', 'pending_medical']:
            subjects_collection.update_one({'_id': substitute_subject_id}, {'$inc': {'attended': 1}})
        # Update the log status to 'present'
        attendance_log_collection.update_one({'_id': substitute_log['_id']}, {'$set': {'status': 'present'}})
    else:
        # If no log existed, create a new 'present' one and update counts.
        substitute_subject = subjects_collection.find_one({'_id': substitute_subject_id})
        attendance_log_collection.insert_one({
            "subject_id": substitute_subject_id, "owner_email": user_email,
            "date": date_str, "status": "present", "timestamp": datetime.utcnow(),
            "semester": substitute_subject.get('semester')
        })
        subjects_collection.update_one(
            {'_id': substitute_subject_id},
            {'$inc': {'attended': 1, 'total': 1}}
        )

    return jsonify({"success": True})
# In bunkguard/api.py, add this new function

@api_bp.route('/unresolved_substitutions')
def get_unresolved_substitutions():
    if 'user' not in session: return jsonify({"error": "Unauthorized"}), 401
    
    pipeline = [
        {'$match': {'owner_email': session['user']['email'], 'status': 'substituted'}},
        {'$lookup': {'from': 'subjects', 'localField': 'subject_id', 'foreignField': '_id', 'as': 'subject_info'}},
        {'$unwind': '$subject_info'},
        {'$sort': {'date': -1}}
    ]
    unresolved_logs = list(attendance_log_collection.aggregate(pipeline))
    return Response(json_util.dumps(unresolved_logs), mimetype='application/json')