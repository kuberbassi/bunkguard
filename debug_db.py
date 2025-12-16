import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

mongo_uri = os.getenv('MONGO_URI')
client = MongoClient(mongo_uri)
db = client.get_database('attendanceDB')
subjects_collection = db.get_collection('subjects')

print("--- INSPECTING SUBJECTS ---")
cursor = subjects_collection.find().limit(20)
for s in cursor:
    print(f"Name: {s.get('name')}, Email: {s.get('owner_email')}, Sem: {s.get('semester')} (Type: {type(s.get('semester'))})")
print("--- END ---")
