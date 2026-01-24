import os
from pymongo import MongoClient
from dotenv import load_dotenv
import json

load_dotenv()

mongo_uri = os.getenv('MONGO_URI')
client = MongoClient(mongo_uri)
db = client.get_database('attendanceDB')

print("=== MANUAL COURSES COLLECTION ===")
courses = list(db.manual_courses.find())
print(f"Total courses: {len(courses)}")
print("\nCourse details:")
for i, course in enumerate(courses, 1):
    print(f"\n{i}. Course ID: {course.get('_id')}")
    print(f"   Owner: {course.get('owner_email')}")
    print(f"   Title: {course.get('title', 'MISSING')}")
    print(f"   Platform: {course.get('platform', 'MISSING')}")
    print(f"   URL: {course.get('url', 'MISSING')}")
    print(f"   Progress: {course.get('progress', 'MISSING')}")
    print(f"   All fields: {list(course.keys())}")
