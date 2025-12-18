# api/views.py

from flask import render_template, session, redirect, url_for, send_from_directory, current_app, Response
from flask import Blueprint
from datetime import datetime
from . import db
import os

views_bp = Blueprint('views', __name__)

# Helper to check for user session
def is_logged_in():
    return 'user' in session

@views_bp.route('/')
def dashboard():
    if not is_logged_in(): 
        return redirect('/login')
    cache_id = datetime.utcnow().timestamp()
    return render_template("dashboard.html", session=session, cache_id=cache_id)

@views_bp.route('/mark')
def mark_attendance_page():
    if not is_logged_in(): 
        return redirect('/login')
    return render_template("mark_attendance.html", session=session, now=datetime.now())

@views_bp.route('/reports')
def reports_page():
    if not is_logged_in(): 
        return redirect('/login')
    return render_template("reports.html", session=session)

@views_bp.route('/schedule')
def schedule_page():
    if not is_logged_in(): 
        return redirect('/login')
    cache_id = datetime.utcnow().timestamp()
    return render_template("schedule.html", session=session, cache_id=cache_id)

@views_bp.route('/settings')
def settings_page():
    if not is_logged_in(): 
        return redirect('/login')
    return render_template("settings.html", session=session)

@views_bp.route('/report/<semester>/print')
def printable_report(semester):
    if not is_logged_in(): 
        return redirect('/login')
    
    user_email = session['user']['email']
    subjects_collection = db.get_collection('subjects')
    subjects = list(subjects_collection.find({"owner_email": user_email, "semester": semester}))
    
    total_attended = sum(s.get('attended', 0) for s in subjects)
    total_classes = sum(s.get('total', 0) for s in subjects)
    overall_percent = round((total_attended / total_classes) * 100, 1) if total_classes > 0 else 0
    
    report_data = {
        "user_name": session['user']['name'],
        "semester": semester,
        "generated_date": datetime.now().strftime("%B %d, %Y"),
        "subjects": subjects,
        "overall_percentage": overall_percent
    }
    
    return render_template("printable_report.html", data=report_data)

@views_bp.errorhandler(404)
def not_found(e):
    return render_template('404.html'), 404

# --- SEO & Verification Routes ---

@views_bp.route('/robots.txt')
def robots_txt():
    """Serve robots.txt for search engines"""
    content = """User-agent: *
Allow: /
Disallow: /api/
Disallow: /login
Disallow: /callback

Sitemap: https://acadhubkb.vercel.app/sitemap.xml"""
    return Response(content, mimetype='text/plain')

@views_bp.route('/sitemap.xml')
def sitemap():
    """Serve sitemap.xml for search engines"""
    content = """<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://acadhubkb.vercel.app/</loc>
    <lastmod>{now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://acadhubkb.vercel.app/login</loc>
    <lastmod>2025-11-09</lastmod>
    <priority>0.8</priority>
  </url>
</urlset>"""
    return Response(content, mimetype='application/xml')

@views_bp.route('/google75750b6bbd7a51d3.html')
def google_verification():
    """Serve Google Search Console verification file"""
    # Return the exact content Google gave you
    content = "google-site-verification: google75750b6bbd7a51d3.html"
    return Response(content, mimetype='text/html')