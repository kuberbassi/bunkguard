import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

mongo_uri = os.getenv('MONGO_URI')
if not mongo_uri:
    print("❌ ERROR: MONGO_URI not found in environment variables.")
    exit(1)

try:
    client = MongoClient(mongo_uri)
    db = client.get_database('attendanceDB')
    
    collection_name = 'manual_courses'
    
    # Check current count
    count_before = db[collection_name].count_documents({})
    print(f"ℹ️  Documents in '{collection_name}' before cleanup: {count_before}")
    
    if count_before > 0:
        # Delete all documents
        result = db[collection_name].delete_many({})
        print(f"✅ Deleted {result.deleted_count} documents from '{collection_name}'.")
    else:
        print(f"ℹ️  No documents found in '{collection_name}' to delete.")
        
    # Verify count
    count_after = db[collection_name].count_documents({})
    print(f"ℹ️  Documents in '{collection_name}' after cleanup: {count_after}")
    
    if count_after == 0:
        print("✅ Cleanup successful!")
    else:
        print("❌ Cleanup FAILED: Some documents remain.")

except Exception as e:
    print(f"❌ An error occurred: {e}")
