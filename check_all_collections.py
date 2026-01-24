import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

mongo_uri = os.getenv('MONGO_URI')
client = MongoClient(mongo_uri)
db = client.get_database('attendanceDB')

print("=== ALL COLLECTIONS IN DATABASE ===")
collections = db.list_collection_names()
for coll in collections:
    count = db[coll].count_documents({})
    print(f"{coll}: {count} documents")

print("\n=== CHECKING FOR COURSE-RELATED COLLECTIONS ===")
course_collections = [c for c in collections if 'course' in c.lower()]
for coll in course_collections:
    print(f"\n{coll}:")
    sample = db[coll].find_one()
    if sample:
        print(f"  Sample fields: {list(sample.keys())}")
        print(f"  Sample data: {sample}")
