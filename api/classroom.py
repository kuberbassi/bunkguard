import requests
from flask import Blueprint, jsonify, session, request
import traceback

classroom_bp = Blueprint('classroom', __name__, url_prefix='/api/classroom')

@classroom_bp.route('/courses', methods=['GET'])
def list_courses():
    if 'user' not in session: return jsonify({"error": "Unauthorized"}), 401
    token = session['user'].get('google_token')
    if not token: return jsonify({"error": "No Google Token found. Please re-login."}), 401

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
    if not token: return jsonify({"error": "No Google Token found"}), 401

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
    if not token: return jsonify({"error": "No Google Token found"}), 401
    
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
    """Fetch announcements from all courses."""
    if 'user' not in session: return jsonify({"error": "Unauthorized"}), 401
    token = session['user'].get('google_token')
    if not token: return jsonify({"error": "No Google Token found"}), 401
    
    try:
        # 1. Get Courses
        courses_resp = requests.get(
            'https://classroom.googleapis.com/v1/courses',
            headers={'Authorization': f'Bearer {token}'},
            params={'courseStates': 'ACTIVE'}
        )
        courses = courses_resp.json().get('courses', [])
        
        all_announcements = []
        
        # 2. Get Announcements for each course
        for course in courses[:5]:  # Limit to 5 courses
            announce_resp = requests.get(
                f'https://classroom.googleapis.com/v1/courses/{course["id"]}/announcements',
                headers={'Authorization': f'Bearer {token}'},
                params={'pageSize': 3}  # Latest 3
            )
            if announce_resp.status_code == 200:
                announcements = announce_resp.json().get('announcements', [])
                for a in announcements:
                    a['courseName'] = course['name']
                    all_announcements.append(a)
        
        # Sort by creationTime
        all_announcements.sort(key=lambda x: x.get('creationTime', ''), reverse=True)
        
        return jsonify(all_announcements[:10])  # Top 10 most recent
    except Exception as e:
        print(f"Announcements Error: {e}")
        traceback.print_exc()
        return jsonify({"error": "Internal error"}), 500

@classroom_bp.route('/materials', methods=['GET'])
def get_materials():
    """Fetch course materials."""
    if 'user' not in session: return jsonify({"error": "Unauthorized"}), 401
    token = session['user'].get('google_token')
    if not token: return jsonify({"error": "No Google Token found"}), 401
    
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
