import requests
from flask import Blueprint, jsonify, session, request
import traceback
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta
from functools import lru_cache
import time

classroom_bp = Blueprint('classroom', __name__, url_prefix='/api/classroom')

# Simple in-memory cache for courses (per user session)
_courses_cache = {}
_cache_ttl = 300  # 5 minutes

def get_cached_courses(token, user_email):
    """Get courses from cache or fetch from API."""
    cache_key = user_email
    now = time.time()
    
    if cache_key in _courses_cache:
        cached_data, cached_time = _courses_cache[cache_key]
        if now - cached_time < _cache_ttl:
            return cached_data
    
    # Fetch fresh data
    resp = requests.get(
        'https://classroom.googleapis.com/v1/courses',
        headers={'Authorization': f'Bearer {token}'},
        params={'courseStates': 'ACTIVE'}
    )
    
    if resp.status_code == 200:
        courses = resp.json().get('courses', [])
        _courses_cache[cache_key] = (courses, now)
        return courses
    
    return []

def fetch_course_data(course, token, endpoint, params, key):
    """Helper to fetch data for a single course (used in parallel)."""
    try:
        resp = requests.get(
            f'https://classroom.googleapis.com/v1/courses/{course["id"]}/{endpoint}',
            headers={'Authorization': f'Bearer {token}'},
            params=params,
            timeout=10
        )
        if resp.status_code == 200:
            items = resp.json().get(key, [])
            for item in items:
                item['courseName'] = course['name']
            return items
    except Exception as e:
        print(f"Error fetching {endpoint} for {course['name']}: {e}")
    return []

@classroom_bp.route('/courses', methods=['GET'])
def list_courses():
    if 'user' not in session: return jsonify({"error": "Unauthorized"}), 401
    token = session['user'].get('google_token')
    if not token: return jsonify({"error": "No Google Token found. Please re-login."}), 403

    try:
        resp = requests.get(
            'https://classroom.googleapis.com/v1/courses',
            headers={'Authorization': f'Bearer {token}'},
            params={'courseStates': 'ACTIVE'}
        )
        if resp.status_code != 200:
             print(f"Classroom API Error: {resp.text}")
             return jsonify({"error": "Failed to fetch courses from Google"}), resp.status_code
        
        data = resp.json()
        courses = data.get('courses', [])
        return jsonify(courses)
    except Exception as e:
        print(f"Classroom Error: {e}")
        traceback.print_exc()
        return jsonify({"error": "Internal error"}), 500

@classroom_bp.route('/courses/<course_id>/coursework', methods=['GET'])
def list_coursework(course_id):
    if 'user' not in session: return jsonify({"error": "Unauthorized"}), 401
    token = session['user'].get('google_token')
    if not token: return jsonify({"error": "No Google Token found"}), 403

    try:
        resp = requests.get(
            f'https://classroom.googleapis.com/v1/courses/{course_id}/courseWork',
            headers={'Authorization': f'Bearer {token}'},
            params={'orderBy': 'dueDate desc', 'pageSize': 10}
        )
        if resp.status_code != 200:
             return jsonify({"error": "Failed to fetch coursework"}), resp.status_code
        
        data = resp.json()
        work = data.get('courseWork', [])
        return jsonify(work)
    except Exception as e:
        print(f"Classroom Error: {e}")
        return jsonify({"error": "Internal error"}), 500

@classroom_bp.route('/all_assignments', methods=['GET'])
def get_all_assignments():
    """Aggregates assignments from all active courses."""
    if 'user' not in session: return jsonify({"error": "Unauthorized"}), 401
    token = session['user'].get('google_token')
    if not token: return jsonify({"error": "No Google Token found"}), 403
    
    try:
        # 1. Get Courses
        courses_resp = requests.get(
            'https://classroom.googleapis.com/v1/courses',
            headers={'Authorization': f'Bearer {token}'},
            params={'courseStates': 'ACTIVE'}
        )
        courses = courses_resp.json().get('courses', [])
        
        all_work = []
        
        # 2. Get Work for each (Limit to top 5 courses to avoid timeouts/rate limits for now)
        for course in courses[:5]:
            work_resp = requests.get(
                f'https://classroom.googleapis.com/v1/courses/{course["id"]}/courseWork',
                headers={'Authorization': f'Bearer {token}'},
                params={'orderBy': 'dueDate desc', 'pageSize': 5}
            )
            if work_resp.status_code == 200:
                works = work_resp.json().get('courseWork', [])
                for w in works:
                    w['courseName'] = course['name'] # Attach course name
                    all_work.append(w)
        
        # Sort by due date (if present)
        # Handle cases where dueDate is missing
        all_work.sort(key=lambda x: (
            x.get('dueDate', {}).get('year', 9999), 
            x.get('dueDate', {}).get('month', 12), 
            x.get('dueDate', {}).get('day', 31)
        ))
        
        return jsonify(all_work)
    except Exception as e:
        print(f"Classroom Aggregation Error: {e}")
        traceback.print_exc()
        return jsonify({"error": "Internal error"}), 500

@classroom_bp.route('/announcements', methods=['GET'])
def get_announcements():
    """Fetch announcements from all courses with caching and parallel requests."""
    if 'user' not in session: return jsonify({"error": "Unauthorized"}), 401
    token = session['user'].get('google_token')
    user_email = session['user'].get('email', 'unknown')
    if not token: return jsonify({"error": "No Google Token found"}), 403
    
    try:
        # 1. Get Courses (cached)
        courses = get_cached_courses(token, user_email)
        
        if not courses:
            return jsonify([])
        
        all_announcements = []
        
        # 2. Fetch announcements in parallel
        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = {
                executor.submit(
                    fetch_course_data, 
                    course, 
                    token, 
                    'announcements', 
                    {'pageSize': 5},
                    'announcements'
                ): course for course in courses[:10]  # Up to 10 courses
            }
            
            for future in as_completed(futures):
                result = future.result()
                if result:
                    all_announcements.extend(result)
        
        # Sort by creationTime (newest first)
        all_announcements.sort(key=lambda x: x.get('creationTime', ''), reverse=True)
        
        return jsonify(all_announcements[:15])  # Top 15 most recent
    except Exception as e:
        print(f"Announcements Error: {e}")
        traceback.print_exc()
        return jsonify({"error": "Internal error"}), 500

@classroom_bp.route('/materials', methods=['GET'])
def get_materials():
    """Fetch course materials."""
    if 'user' not in session: return jsonify({"error": "Unauthorized"}), 401
    token = session['user'].get('google_token')
    if not token: return jsonify({"error": "No Google Token found"}), 403
    
    try:
        # Get courses
        courses_resp = requests.get(
            'https://classroom.googleapis.com/v1/courses',
            headers={'Authorization': f'Bearer {token}'},
            params={'courseStates': 'ACTIVE'}
        )
        courses = courses_resp.json().get('courses', [])
        
        all_materials = []
        
        for course in courses[:5]:
            # Get course work materials  
            materials_resp = requests.get(
                f'https://classroom.googleapis.com/v1/courses/{course["id"]}/courseWorkMaterials',
                headers={'Authorization': f'Bearer {token}'},
                params={'pageSize': 5}
            )
            if materials_resp.status_code == 200:
                materials = materials_resp.json().get('courseWorkMaterial', [])
                for m in materials:
                    m['courseName'] = course['name']
                    all_materials.append(m)
        
        return jsonify(all_materials)
    except Exception as e:
        print(f"Materials Error: {e}")
        return jsonify({"error": "Internal error"}), 500
