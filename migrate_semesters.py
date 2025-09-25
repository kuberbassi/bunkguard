# migrate_semesters.py
import os
import re
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

client = MongoClient(os.getenv('MONGO_URI'))
db = client.get_database('attendanceDB')
subjects_collection = db.get_collection('subjects')

def migrate_semesters():
    """
    Finds subjects where 'semester' is a string and converts it to an integer.
    """
    print("Starting semester data migration...")
    
    # Find all subjects where the 'semester' field is of type 'string'
    subjects_to_migrate = list(subjects_collection.find({"semester": {"$type": "string"}}))
    
    if not subjects_to_migrate:
        print("No subjects with string-based semesters found. Database is already clean.")
        return

    updated_count = 0
    for subject in subjects_to_migrate:
        old_semester_value = subject.get("semester", "")
        
        # Use a regular expression to find the number within the string
        numeric_part = re.findall(r'\d+', old_semester_value)
        
        if numeric_part:
            # Convert the first number found to an integer
            new_semester_value = int(numeric_part[0])
            
            # Update the document in the database with the new integer value
            result = subjects_collection.update_one(
                {"_id": subject["_id"]},
                {"$set": {"semester": new_semester_value}}
            )
            
            if result.modified_count > 0:
                updated_count += 1
                print(f"  -> Updated '{subject['name']}' from '{old_semester_value}' to {new_semester_value}")
        else:
            print(f"  -> Could not find a number in '{old_semester_value}' for subject '{subject['name']}'. Skipping.")

    print(f"\nMigration complete. Updated {updated_count} subjects successfully.")

if __name__ == "__main__":
    migrate_semesters()