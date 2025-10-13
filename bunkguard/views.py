# bunkguard/views.py
from flask import render_template, session, redirect, url_for, send_from_directory
from flask import Blueprint
from datetime import datetime
from . import db  # Import db from our app package

views_bp = Blueprint('views', __name__)

# Helper to check for user session
def is_logged_in():
    return 'user' in session

@views_bp.route('/')
def dashboard():
    if not is_logged_in(): return redirect('/login')
    cache_id = datetime.utcnow().timestamp()
    return render_template("dashboard.html", session=session, cache_id=cache_id)

@views_bp.route('/mark')
def mark_attendance_page():
    if not is_logged_in(): return redirect('/login')
    return render_template("mark_attendance.html", session=session, now=datetime.now())

@views_bp.route('/reports')
def reports_page():
    if not is_logged_in(): return redirect('/login')
    return render_template("reports.html", session=session)

@views_bp.route('/schedule')
def schedule_page():
    if not is_logged_in(): return redirect('/login')
    cache_id = datetime.utcnow().timestamp()
    return render_template("schedule.html", session=session, cache_id=cache_id)

@views_bp.route('/settings')
def settings_page():
    if not is_logged_in(): return redirect('/login')
    return render_template("settings.html", session=session)

@views_bp.route('/report/<int:semester>/print')
def printable_report(semester):
    if not is_logged_in(): return redirect('/login')
    user_email = session['user']['email']
    
    subjects_collection = db.get_collection('subjects')
    
    subjects = list(subjects_collection.find({"owner_email": user_email, "semester": semester}))
    total_attended = sum(s.get('attended', 0) for s in subjects)
    total_classes = sum(s.get('total', 0) for s in subjects)
    
    # Assuming calculate_percent is available or moved to a helpers file
    overall_percent = round((total_attended / total_classes) * 100, 1) if total_classes > 0 else 0

    report_data = {
        "user_name": session['user']['name'],
        "semester": semester,
        "generated_date": datetime.now().strftime("%B %d, %Y"),
        "subjects": subjects,
        "overall_percentage": overall_percent
    }
    return render_template("printable_report.html", data=report_data)

# --- Static file routes for verification, sitemap, robots.txt ---
@views_bp.route('/google75750b6bbd7a51d3.html')
def google_verification():
    return send_from_directory('static', 'google75750b6bbd7a51d3.html')

@views_bp.route('/sitemap.xml')
def sitemap():
    return send_from_directory('static', 'sitemap.xml')

@views_bp.route('/robots.txt')
def robots_txt():
    return send_from_directory('static', 'robots.txt')