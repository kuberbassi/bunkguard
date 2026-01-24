import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

mongo_uri = os.getenv('MONGO_URI')
client = MongoClient(mongo_uri)
db = client.get_database('attendanceDB')

courses = list(db.manual_courses.find())

print(f"Total courses in database: {len(courses)}\n")

for i, course in enumerate(courses):
    print(f"{'='*60}")
    print(f"COURSE #{i+1}")
    print(f"{'='*60}")
    for key, value in course.items():
        if key != '_id':
            print(f"{key:20s}: {value}")
    print()
