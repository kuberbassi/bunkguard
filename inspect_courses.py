
import os
from pymongo import MongoClient
from dotenv import load_dotenv
import pprint

load_dotenv()

mongo_uri = os.getenv('MONGO_URI')
client = MongoClient(mongo_uri)
db = client.get_database('attendanceDB')
collection = db.get_collection('manual_courses')

print("--- Current Manual Courses Documents ---")
courses = list(collection.find())
for c in courses:
    pprint.pprint(c)
    print("-" * 20)
