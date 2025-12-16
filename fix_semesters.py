import os
from pymongo import MongoClient
from dotenv import load_dotenv

# Load env variables from .env file
load_dotenv()

mongo_uri = os.getenv('MONGO_URI')
if not mongo_uri:
    print("Error: MONGO_URI not found in environment")
    exit(1)

try:
    client = MongoClient(mongo_uri)
    db = client.get_database('attendanceDB')
    subjects_collection = db.get_collection('subjects')

    print("Checking for subjects with string semesters...")

    # Find subjects where semester is a string
    cursor = subjects_collection.find({'semester': {'$type': 'string'}})
    
    count = 0
    for subject in cursor:
        try:
            semester_int = int(subject['semester'])
            subjects_collection.update_one(
                {'_id': subject['_id']},
                {'$set': {'semester': semester_int}}
            )
            count += 1
            print(f"Updated subject '{subject.get('name')}' semester to {semester_int}")
        except ValueError:
            print(f"Could not convert semester '{subject['semester']}' for subject '{subject.get('name')}'")

    print(f"Finished. Updated {count} subjects.")

except Exception as e:
    print(f"An error occurred: {e}")
