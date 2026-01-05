
import time
import threading
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from . import db
from .classroom import get_cached_courses, fetch_course_data
from .push import send_web_push

# Collection to track what we've already sent
sent_notifications = db.get_collection('sent_notifications')
users_collection = db.get_collection('users')

def worker_loop(app):
    """Main background loop."""
    print("Background worker started...")
    while True:
        try:
            with app.app_context():
                check_and_notify()
        except Exception as e:
            print(f"Worker Error: {e}")
        
        # Sleep for 15 minutes (900 seconds)
        # For testing, we might want this to be shorter, but 15m is reasonable for production polling
        time.sleep(900)

def check_and_notify():
    """Polls Google Classroom for all users and sends notifications."""
    # Find users with google tokens
    users = list(users_collection.find({'google_token': {'$exists': True, '$ne': None}}))
    
    for user in users:
        try:
            token = user.get('google_token')
            email = user.get('email')
            
            if not token or not email:
                continue
                
            # 1. Get Courses
            courses = get_cached_courses(token, email)
            if not courses:
                continue
                
            # 2. Fetch Announcements & Assignments
            new_items = []
            
            with ThreadPoolExecutor(max_workers=5) as executor:
                # Fetch Announcements
                futures_ann = {
                    executor.submit(
                        fetch_course_data, course, token, 'announcements', {'pageSize': 3}, 'announcements'
                    ): course for course in courses[:5]
                }
                
                # Fetch Assignments (courseWork)
                futures_work = {
                    executor.submit(
                        fetch_course_data, course, token, 'courseWork', {'orderBy': 'updateTime desc', 'pageSize': 3}, 'courseWork'
                    ): course for course in courses[:5]
                }
                
                # Process Announcements
                for future in as_completed(futures_ann):
                    items = future.result()
                    for item in items:
                        if is_new_notification(email, item['id'], 'announcement'):
                            new_items.append({
                                'type': 'announcement',
                                'title': 'New Announcement',
                                'body': f"{item.get('text', 'New announcement available')[:100]}...",
                                'data': item,
                                'id': item['id']
                            })

                # Process Assignments
                for future in as_completed(futures_work):
                    items = future.result()
                    for item in items:
                        if is_new_notification(email, item['id'], 'assignment'):
                            new_items.append({
                                'type': 'assignment',
                                'title': 'New Assignment',
                                'body': f"{item.get('title', 'New assignment')}",
                                'data': item,
                                'id': item['id']
                            })
                            
            # 3. Send Notifications
            for item in new_items:
                payload = {
                    "title": item['title'],
                    "body": item['body'],
                    "url": item['data'].get('alternateLink', '/')
                }
                
                print(f"Sending push to {email}: {item['title']}")
                send_web_push(email, payload)
                
                # Mark as sent
                mark_as_sent(email, item['id'], item['type'])
                
        except Exception as e:
            print(f"Error processing user {user.get('email')}: {e}")

def is_new_notification(email, item_id, item_type):
    """Check if we've already sent a notification for this item."""
    exists = sent_notifications.find_one({
        'user_email': email,
        'item_id': item_id,
        'type': item_type
    })
    return exists is None

def mark_as_sent(email, item_id, item_type):
    """Record that we've sent this notification."""
    sent_notifications.insert_one({
        'user_email': email,
        'item_id': item_id,
        'type': item_type,
        'sent_at': datetime.utcnow()
    })

def start_worker(app):
    """Starts the background thread."""
    # Only start if not already running (simple check)
    # in reloader, this might run twice, but daemon threads die with main process
    thread = threading.Thread(target=worker_loop, args=(app,), daemon=True)
    thread.start()
