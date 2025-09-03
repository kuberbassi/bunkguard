import os
from flask import Flask, render_template, request, jsonify, Response, session, redirect, url_for
from pymongo import MongoClient
from dotenv import load_dotenv
from bson import json_util, ObjectId
from authlib.integrations.flask_client import OAuth
from datetime import datetime, timedelta

# --- Initialization ---
load_dotenv()
app = Flask(__name__)
app.secret_key = os.urandom(24)
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=30) # Remember login for 30 days

# --- Database Connection ---
MONGO_URI = os.getenv('MONGO_URI')
client = MongoClient(MONGO_URI)
db = client.get_database('attendanceDB')
subjects_collection = db.get_collection('subjects')
actions_collection = db.get_collection('actions')

# --- Google OAuth Setup ---
oauth = OAuth(app)
google = oauth.register(
    name='google',
    client_id=os.getenv("GOOGLE_CLIENT_ID"),
    client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid email profile'}
)

# --- Helper Functions ---
def calculate_percent(attended, total):
    return round((attended / total) * 100, 2) if total > 0 else 0

def calculate_recovery_classes(attended, total):
    # If attendance is already at or above 75%, no classes are needed.
    if total == 0 or (attended / total) >= 0.75:
        return 0
    # This formula calculates the number of consecutive classes you must attend to reach 75%.
    return (3 * total - 4 * attended)

# --- Main & Authentication Routes ---
@app.route('/')
def index():
    if 'user' not in session:
        return render_template("login.html")

    user_email = session['user']['email']
    
    # Create a default structure for 8 semesters
    semesters_data = {f"sem{i}": {} for i in range(1, 9)}
    summaries = {f"sem{i}": {"total_attended": 0, "total_classes": 0, "overall_percent": 0} for i in range(1, 9)}
    
    # Fetch all subjects for the logged-in user, sorted by their custom order
    all_subjects = list(subjects_collection.find({"owner_email": user_email}).sort("order", 1))
    
    # Populate the default structure with real data from the database
    for subject in all_subjects:
        sem = subject.get("semester")
        if sem in semesters_data:
            attended, total = subject.get("attended", 0), subject.get("total", 0)
            subject['percent'] = calculate_percent(attended, total)
            subject['recovery_needed'] = calculate_recovery_classes(attended, total)
            
            semesters_data[sem][subject.get("name")] = subject
            
            summaries[sem]["total_attended"] += attended
            summaries[sem]["total_classes"] += total

    # Calculate the final overall percentage for each semester
    for sem in summaries:
        if summaries[sem]["total_classes"] > 0:
            summaries[sem]["overall_percent"] = calculate_percent(
                summaries[sem]["total_attended"], summaries[sem]["total_classes"]
            )
            
    return render_template("index.html", semesters=semesters_data, summaries=summaries)

@app.route('/login')
def login():
    redirect_uri = url_for('callback', _external=True)
    return google.authorize_redirect(redirect_uri)

@app.route('/callback')
def callback():
    token = google.authorize_access_token()
    session['user'] = google.userinfo()
    session.permanent = True # Make the session persistent
    return redirect('/')

@app.route('/logout')
def logout():
    session.pop('user', None)
    return redirect('/')

# --- API Endpoints ---

@app.route("/api/mark", methods=["POST"])
def api_mark_attendance():
    if 'user' not in session: return jsonify({"error": "Unauthorized"}), 401
    user_email = session['user']['email']
    data = request.get_json()
    sem, subject_name, status = data.get("sem"), data.get("subject"), data.get("status")
    
    subject_doc = subjects_collection.find_one({"semester": sem, "name": subject_name, "owner_email": user_email})
    if not subject_doc: return jsonify({"error": "Subject not found"}), 404

    update_query = {"$inc": {"total": 1}}
    action_type = "absent"
    if status == 'p':
        update_query["$inc"]["attended"] = 1
        action_type = "present"
    
    subjects_collection.update_one({"_id": subject_doc['_id']}, update_query)
    
    # Log the action for the undo/redo feature
    action_log = {
        "user_email": user_email,
        "subject_id": subject_doc['_id'],
        "action": action_type,
        "timestamp": datetime.utcnow(),
        "is_undone": False
    }
    actions_collection.insert_one(action_log)
    
    return jsonify({"success": True})

@app.route("/api/add_subject", methods=["POST"])
def api_add_subject():
    if 'user' not in session: return jsonify({"error": "Unauthorized"}), 401
    user_email = session['user']['email']
    data = request.get_json()
    sem, subject_name = data.get("sem"), data.get("subject")
    
    # Set the order for the new subject
    subject_count = subjects_collection.count_documents({"owner_email": user_email, "semester": sem})
    
    new_subject = {
        "owner_email": user_email, "semester": sem, "name": subject_name,
        "attended": 0, "total": 0, "order": subject_count
    }
    subjects_collection.insert_one(new_subject)
    return jsonify({"success": True}), 201

@app.route("/api/delete_subject", methods=["POST"])
def delete_subject():
    if 'user' not in session: return jsonify({"error": "Unauthorized"}), 401
    user_email = session['user']['email']
    data = request.get_json()
    sem, subject_name = data.get("sem"), data.get("subject")
    
    result = subjects_collection.delete_one({"semester": sem, "name": subject_name, "owner_email": user_email})
    if result.deleted_count > 0:
        return jsonify({"success": True})
    return jsonify({"success": False, "message": "Subject not found."}), 404

@app.route("/api/undo", methods=["POST"])
def api_undo():
    if 'user' not in session: return jsonify({"error": "Unauthorized"}), 401
    user_email = session['user']['email']
    last_action = actions_collection.find_one(
        {"user_email": user_email, "is_undone": False}, sort=[("timestamp", -1)]
    )
    if not last_action: return jsonify({"success": False, "message": "No action to undo."})
    
    update_query = {"$inc": {"total": -1}}
    if last_action['action'] == 'present':
        update_query["$inc"]["attended"] = -1
    
    subjects_collection.update_one({"_id": last_action['subject_id']}, update_query)
    actions_collection.update_one({"_id": last_action['_id']}, {"$set": {"is_undone": True}})
    return jsonify({"success": True})

@app.route("/api/redo", methods=["POST"])
def api_redo():
    if 'user' not in session: return jsonify({"error": "Unauthorized"}), 401
    user_email = session['user']['email']
    last_undone = actions_collection.find_one(
        {"user_email": user_email, "is_undone": True}, sort=[("timestamp", -1)]
    )
    if not last_undone: return jsonify({"success": False, "message": "No action to redo."})

    update_query = {"$inc": {"total": 1}}
    if last_undone['action'] == 'present':
        update_query["$inc"]["attended"] = 1
        
    subjects_collection.update_one({"_id": last_undone['subject_id']}, update_query)
    actions_collection.update_one({"_id": last_undone['_id']}, {"$set": {"is_undone": False}})
    return jsonify({"success": True})

@app.route("/api/reorder", methods=["POST"])
def api_reorder():
    if 'user' not in session: return jsonify({"error": "Unauthorized"}), 401
    data = request.get_json()
    subject_ids_in_order = data.get("subject_ids")
    
    for index, subject_id in enumerate(subject_ids_in_order):
        subjects_collection.update_one(
            {"_id": ObjectId(subject_id)},
            {"$set": {"order": index}}
        )
    return jsonify({"success": True})

if __name__ == "__main__":
    app.run(debug=True, port=5000)