
import os
from pymongo import MongoClient
from dotenv import load_dotenv
from bson import json_util
import json

load_dotenv()

mongo_uri = os.getenv('MONGO_URI')
client = MongoClient(mongo_uri)
db = client.get_database('attendanceDB')
collection = db.get_collection('manual_courses')

print("--- RAW DUMP START ---")
courses = list(collection.find())
print(json_util.dumps(courses, indent=2))
print("--- RAW DUMP END ---")
