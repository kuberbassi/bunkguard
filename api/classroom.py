import requests
from flask import Blueprint, jsonify, session, request
import traceback
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta
from functools import lru_cache
import time
import os
from api.database import db

classroom_bp = Blueprint('classroom', __name__, url_prefix='/api/classroom')

# Simple in-memory cache for courses (per user session)
_courses_cache = {}
_cache_ttl = 120  # 2 minutes (reduced for serverless)

def refresh_google_token_if_needed(user_data):
    """
    Checks if token is expired and refreshes it if a refresh token is available.
    Returns True if token is valid (or successfully refreshed).
    """
    if not user_data:
        return False
        
    token_expiry = user_data.get('google_token_expiry', 0)
    current_time = time.time()
    
    # buffer of 5 minutes
    if current_time < (token_expiry - 300):
        return True
        
    # Token is expired or about to expire
    refresh_token = user_data.get('google_refresh_token')
    if not refresh_token:
        print("❌ Token expired and no refresh token available")
        return False
        
    print("🔄 Refreshing expired Google token...")
    
    try:
        # Exchange refresh token for new access token
        token_url = "https://oauth2.googleapis.com/token"
        payload = {
            "client_id": os.getenv("GOOGLE_CLIENT_ID"),
            "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"),
            "refresh_token": refresh_token,
            "grant_type": "refresh_token"
        }
        
        resp = requests.post(token_url, data=payload)
        
        if resp.status_code != 200:
            print(f"❌ Failed to refresh token: {resp.text}")
            return False
            
        new_tokens = resp.json()
        new_access_token = new_tokens.get('access_token')
        new_expires_in = new_tokens.get('expires_in', 3599)
        
        if not new_access_token:
            return False
            
        # Update User Data
        new_expiry = time.time() + new_expires_in
        
        user_data['google_token'] = new_access_token
        user_data['google_token_expiry'] = new_expiry
        
        # Update DB
        if db is not None:
            users_collection = db.get_collection('users')
            users_collection.update_one(
                {'email': user_data['email']},
                {'$set': {
                    'google_token': new_access_token,
                    'google_token_expiry': new_expiry
                }}
            )
            
        # Update Session
        session['user'] = user_data
        session.modified = True
        
        print("✅ Token refreshed successfully")
        return True
        
    except Exception as e:
        print(f"❌ Error refreshing token: {e}")
        return False

def is_token_valid(user_data):
    """Check if Google token is valid, refreshing if necessary."""
    return refresh_google_token_if_needed(user_data)

def make_google_api_request(url, headers, params=None, timeout=10, max_retries=3):
    """
    Make a request to Google API with retry logic and exponential backoff.
    
    Args:
        url: API endpoint URL
        headers: Request headers
        params: Query parameters
        timeout: Request timeout in seconds
        max_retries: Maximum number of retry attempts
    
    Returns:
        tuple: (success: bool, response_data: dict, status_code: int, error_message: str)
    """
    for attempt in range(max_retries):
        try:
            resp = requests.get(
                url,
                headers=headers,
                params=params,
                timeout=timeout
            )
            
            # Success
            if resp.status_code == 200:
                return (True, resp.json(), 200, None)
            
            # Auth errors - don't retry
            if resp.status_code in [401, 403]:
                error_msg = f"Authentication failed: {resp.text}"
                return (False, None, resp.status_code, error_msg)
            
            # Rate limiting or server errors - retry with backoff
            if resp.status_code in [429, 500, 502, 503]:
                if attempt < max_retries - 1:
                    # Exponential backoff: 1s, 2s, 4s
                    wait_time = 2 ** attempt
                    print(f"Google API returned {resp.status_code}, retrying in {wait_time}s... (attempt {attempt + 1}/{max_retries})")
                    time.sleep(wait_time)
                    continue
                else:
                    error_msg = f"Google API error after {max_retries} attempts: {resp.status_code}"
                    return (False, None, resp.status_code, error_msg)
            
            # Other errors
            return (False, None, resp.status_code, f"Unexpected error: {resp.status_code}")
            
        except requests.exceptions.Timeout:
            if attempt < max_retries - 1:
                wait_time = 2 ** attempt
                print(f"Request timeout, retrying in {wait_time}s... (attempt {attempt + 1}/{max_retries})")
                time.sleep(wait_time)
                continue
            return (False, None, 408, "Request timeout after multiple attempts")
        
        except requests.exceptions.RequestException as e:
            if attempt < max_retries - 1:
                wait_time = 2 ** attempt
                print(f"Network error: {e}, retrying in {wait_time}s... (attempt {attempt + 1}/{max_retries})")
                time.sleep(wait_time)
                continue
            return (False, None, 500, f"Network error: {str(e)}")
    
    return (False, None, 500, "Max retries exceeded")


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
    if 'user' not in session: 
        return jsonify({"error": "Unauthorized", "code": "NO_SESSION"}), 401
    
    user_data = session['user']
    
    # Validate token
    if not is_token_valid(user_data):
        return jsonify({
            "error": "Your Google session has expired. Please login again.",
            "code": "TOKEN_EXPIRED"
        }), 401
    
    token = user_data.get('google_token')
    if not token: 
        return jsonify({"error": "No Google Token found", "code": "NO_TOKEN"}), 403

    try:
        success, data, status, error = make_google_api_request(
            'https://classroom.googleapis.com/v1/courses',
            {'Authorization': f'Bearer {token}'},
            {'courseStates': 'ACTIVE'}
        )
        
        if not success:
            print(f"Classroom API Error: {error}")
            if status in [401, 403]:
                return jsonify({"error": error, "code": "AUTH_FAILED"}), status
            return jsonify({"error": error or "Failed to fetch courses", "code": "API_ERROR"}), status or 500
        
        courses = data.get('courses', [])
        return jsonify(courses)
    except Exception as e:
        print(f"Classroom Error: {e}")
        traceback.print_exc()
        return jsonify({"error": "Internal error", "code": "SERVER_ERROR"}), 500

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
    if 'user' not in session: 
        return jsonify({"error": "Unauthorized", "code": "NO_SESSION"}), 401
    
    user_data = session['user']
    
    # Validate token
    if not is_token_valid(user_data):
        return jsonify({
            "error": "Your Google session has expired. Please login again.", 
            "code": "TOKEN_EXPIRED"
        }), 401
    
    token = user_data.get('google_token')
    user_email = user_data.get('email', 'unknown')
    
    if not token: 
        return jsonify({"error": "No Google Token found", "code": "NO_TOKEN"}), 403
    
    try:
        # 1. Get Courses (cached)
        courses = get_cached_courses(token, user_email)
        
        if not courses:
            # Try to fetch without cache  
            success, data, status, error = make_google_api_request(
                'https://classroom.googleapis.com/v1/courses',
                {'Authorization': f'Bearer {token}'},
                {'courseStates': 'ACTIVE'}
            )
            
            if not success:
                if status in [401, 403]:
                    return jsonify({"error": error, "code": "AUTH_FAILED"}), status
                return jsonify({"error": error or "Failed to fetch courses", "code": "API_ERROR"}), status or 500
            
            courses = data.get('courses', [])
        
        if not courses:
            return jsonify([])
        
        all_announcements = []
        
        # 2. Fetch announcements in parallel with error tolerance
        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = {}
            for course in courses[:10]:  # Up to 10 courses
                future = executor.submit(
                    fetch_course_announcements_with_retry,
                    course,
                    token
                )
                futures[future] = course
            
            for future in as_completed(futures):
                try:
                    result = future.result(timeout=15)
                    if result:
                        all_announcements.extend(result)
                except Exception as e:
                    course = futures[future]
                    print(f"Failed to fetch announcements for {course.get('name', 'Unknown')}: {e}")
                    # Continue with other courses even if one fails
                    continue
        
        # Sort by creationTime (newest first)
        all_announcements.sort(key=lambda x: x.get('creationTime', ''), reverse=True)
        
        return jsonify(all_announcements[:15])  # Top 15 most recent
    except Exception as e:
        print(f"Announcements Error: {e}")
        traceback.print_exc()
        return jsonify({"error": "Internal error", "code": "SERVER_ERROR"}), 500

def fetch_course_announcements_with_retry(course, token):
    """Helper to fetch announcements for a single course with retry logic."""
    success, data, status, error = make_google_api_request(
        f'https://classroom.googleapis.com/v1/courses/{course["id"]}/announcements',
        {'Authorization': f'Bearer {token}'},
        {'pageSize': 5},
        timeout=10
    )
    
    if success:
        items = data.get('announcements', [])
        for item in items:
            item['courseName'] = course['name']
        return items
    else:
        print(f"Error fetching announcements for {course['name']}: {error}")
        return []

@classroom_bp.route('/materials', methods=['GET'])
def get_materials():
    """Fetch course materials."""
    if 'user' not in session: 
        return jsonify({"error": "Unauthorized", "code": "NO_SESSION"}), 401
    
    user_data = session['user']
    
    # Validate token
    if not is_token_valid(user_data):
        return jsonify({
            "error": "Your Google session has expired. Please login again.",
            "code": "TOKEN_EXPIRED"
        }), 401
    
    token = user_data.get('google_token')
    if not token: 
        return jsonify({"error": "No Google Token found", "code": "NO_TOKEN"}), 403
    
    try:
        # Get courses with retry logic
        success, data, status, error = make_google_api_request(
            'https://classroom.googleapis.com/v1/courses',
            {'Authorization': f'Bearer {token}'},
            {'courseStates': 'ACTIVE'}
        )
        
        if not success:
            return jsonify({"error": error or "Failed to fetch courses", "code": "API_ERROR"}), status or 500
        
        courses = data.get('courses', [])
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
