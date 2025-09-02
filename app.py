from flask import Flask, render_template, request, jsonify
from attendance import AttendanceManager
from flask_httpauth import HTTPBasicAuth

app = Flask(__name__)
manager = AttendanceManager()
auth = HTTPBasicAuth()

# --- Password Protection Setup ---
# Define your username and a secure password here
users = {
    "kuber": "obsidian"  # CHANGE THIS PASSWORD!
}

# This function verifies the username and password
@auth.verify_password
def verify_password(username, password):
    if username in users and users.get(username) == password:
        return username

# --- Helper Function ---
def get_subject_details(sem, subject):
    """Helper to get subject data and calculate recovery."""
    subj_data = manager.semesters[sem][subject]
    attended, total = subj_data["attended"], subj_data["total"]
    percent = manager.calc_percent(attended, total)
    recovery_needed = manager.calculate_recovery_classes(attended, total) if percent < 75 else 0
    return {"attended": attended, "total": total, "percent": percent, "recovery_needed": recovery_needed}

# --- Main Route ---
@app.route("/")
@auth.login_required  # This decorator protects the page
def index():
    """Renders the main HTML page with all necessary data."""
    summaries = {sem: manager.overall_summary(sem) for sem in manager.semesters}
    for sem, subjects in manager.semesters.items():
        for subject, info in subjects.items():
            info.update(get_subject_details(sem, subject))
    return render_template("index.html", semesters=manager.semesters, summaries=summaries)

# --- API Endpoints ---
@app.route("/api/mark", methods=["POST"])
def api_mark_attendance():
    data = request.get_json()
    sem, subject, status = data.get("sem"), data.get("subject"), data.get("status")
    if status in ["p", "a"]:
        manager.mark_attendance(sem, subject, status)
    details = get_subject_details(sem, subject)
    details["summary"] = manager.overall_summary(sem)
    return jsonify(details)

@app.route("/api/undo_subject", methods=["POST"])
def api_undo_subject():
    data = request.get_json()
    sem, subject = data.get("sem"), data.get("subject")
    
    success = manager.undo_last_action_for_subject(sem, subject)
    if success:
        details = get_subject_details(sem, subject)
        details["summary"] = manager.overall_summary(sem)
        details["success"] = True
        details["subject"] = subject
        return jsonify(details)
    else:
        return jsonify({"success": False, "message": "No action to undo for this subject."})

@app.route("/api/redo", methods=["POST"])
def api_redo():
    redo_info = manager.redo_last_action()
    if redo_info:
        sem, subject = redo_info["sem"], redo_info["subject"]
        details = get_subject_details(sem, subject)
        details["summary"] = manager.overall_summary(sem)
        details["success"] = True
        details["subject"] = subject
        return jsonify(details)
    else:
        return jsonify({"success": False, "message": "No action to redo."})

@app.route("/api/add_subject", methods=["POST"])
def api_add_subject():
    data = request.get_json()
    sem, subject = data.get("sem"), data.get("subject")
    if subject:
        manager.add_subject(sem, subject)
        return jsonify({
            "success": True, "subject": subject,
            "attended": 0, "total": 0, "percent": 0, "recovery_needed": 0,
            "summary": manager.overall_summary(sem)
        })
    return jsonify({"success": False, "message": "Subject name cannot be empty."})

@app.route("/api/delete_subject", methods=["POST"])
def delete_subject():
    data = request.get_json()
    sem, subject = data.get("sem"), data.get("subject")
    manager.delete_subject(sem, subject)
    return jsonify({"success": True, "summary": manager.overall_summary(sem)})

if __name__ == "__main__":
    app.run(debug=True)