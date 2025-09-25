# debug_subjects.py
import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

# IMPORTANT: Replace this with the email you use to log in to BunkGuard
USER_EMAIL = "kuberbassi2007@gmail.com"

client = MongoClient(os.getenv('MONGO_URI'))
db = client.get_database('attendanceDB')
subjects_collection = db.get_collection('subjects')

print(f"--- Checking subjects for user: {USER_EMAIL} ---")

subjects = list(subjects_collection.find({"owner_email": USER_EMAIL}))

if not subjects:
    print("\nNo subjects found for this email address in the database.")
else:
    print(f"\nFound {len(subjects)} total subjects. Here's a sample:")
    for subject in subjects[:5]: # Check the first 5 subjects
        name = subject.get("name", "N/A")
        semester = subject.get("semester")
        semester_type = type(semester).__name__

        print(f"\n  Subject: '{name}'")
        print(f"  -> Semester value: {semester}")
        print(f"  -> Data type: {semester_type}")