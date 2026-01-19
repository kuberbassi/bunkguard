
import time
import threading
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from api.database import db
from api.classroom import get_cached_courses, fetch_course_data
# Collection to track what we've already sent
users_collection = db.get_collection('users')

def worker_loop(app):
    """Main background loop."""
    print("Background worker started (Cache Warming Only)...")
    while True:
        try:
            with app.app_context():
                refresh_cache()
        except Exception as e:
            print(f"Worker Error: {e}")
        
        # Sleep for 15 minutes (900 seconds)
        time.sleep(900)

def refresh_cache():
    """Polls Google Classroom to warm the cache for dashboard."""
    # Find users with google tokens
    users = list(users_collection.find({'google_token': {'$exists': True, '$ne': None}}))
    
    for user in users:
        try:
            token = user.get('google_token')
            email = user.get('email')
            
            if not token or not email:
                continue
                
            # 1. Get Courses (This caches them)
            courses = get_cached_courses(token, email)
            if not courses:
                continue
                
            # 2. Fetch Announcements & Assignments (This caches them)
            # We don't need to process the return value, just trigger the fetch
            
            with ThreadPoolExecutor(max_workers=3) as executor:
                # Fetch Announcements
                futures = []
                for course in courses[:5]: # Warm cache for top 5 courses
                    futures.append(executor.submit(
                        fetch_course_data, course, token, 'announcements', {'pageSize': 3}, 'announcements'
                    ))
                    futures.append(executor.submit(
                        fetch_course_data, course, token, 'courseWork', {'orderBy': 'updateTime desc', 'pageSize': 3}, 'courseWork'
                    ))
                    
                # Wait for all to complete to ensure we don't overload
                for future in as_completed(futures):
                    try:
                        future.result()
                    except Exception:
                        pass # Ignore errors, this is just background caching
                            
        except Exception as e:
            print(f"Error processing user {user.get('email')}: {e}")

def start_worker(app):
    """Starts the background thread."""
    thread = threading.Thread(target=worker_loop, args=(app,), daemon=True)
    thread.start()
