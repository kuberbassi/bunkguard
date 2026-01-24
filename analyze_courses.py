import os
from pymongo import MongoClient
from dotenv import load_dotenv
import json

load_dotenv()

mongo_uri = os.getenv('MONGO_URI')
client = MongoClient(mongo_uri)
db = client.get_database('attendanceDB')

# Save results to a JSON file for easier reading
results = {}

print("Checking all collections...")
collections = db.list_collection_names()
results['collections'] = {}

for coll in collections:
    if 'course' in coll.lower():
        sample_docs = list(db[coll].find().limit(5))
        # Convert ObjectId to string for JSON serialization
        for doc in sample_docs:
            if '_id' in doc:
                doc['_id'] = str(doc['_id'])
            if 'created_at' in doc:
                doc['created_at'] = str(doc['created_at'])
        
        results['collections'][coll] = {
            'count': db[coll].count_documents({}),
            'sample_docs': sample_docs
        }

# Write to JSON file
with open('course_data_analysis.json', 'w', encoding='utf-8') as f:
    json.dump(results, f, indent=2, ensure_ascii=False)

print("Results saved to course_data_analysis.json")
print(f"\nFound {len(results['collections'])} course-related collections")
for coll, data in results['collections'].items():
    print(f"  - {coll}: {data['count']} documents")
