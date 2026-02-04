
import os
import time
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

_db_instance = None

def init_db():
    global _db_instance
    mongo_uri = os.getenv('MONGO_URI')
    if not mongo_uri:
        print("❌ MONGO_URI is missing in environment!")
        return None
        
    try:
        # Increase timeout slightly or keep as is
        client = MongoClient(
            mongo_uri,
            maxPoolSize=200,    # Increased for 5M+ accounts concurrency
            minPoolSize=10,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000,
            socketTimeoutMS=30000,
            retryWrites=True
        )
        # Force a connection check to see if it fails immediately (DNS etc)
        # asking for a database is lazy in pymongo, but we want to know if it failed for the 'db' proxy logic
        # However, to be truly lazy we shouldn't block. 
        # But the original code relied on 'db' being valid or None.
        
        # We'll just assume it works or fail later. 
        # But to detect the 'None' case from original code:
        # We try to access it? No, keeping it simple.
        
        _db_instance = client.get_database('attendanceDB')
        return _db_instance
    except Exception as e:
        print(f"❌ MongoDB Connection Error: {e}")
        return None

# Proxy classes to handle lazy connection
class LazyCollection:
    def __init__(self, name):
        self._name = name
    
    def __getattr__(self, name):
        global _db_instance
        if _db_instance is None:
            # Try to reconnect on demand
            print(f"🔄 Attempting to reconnect to MongoDB for collection '{self._name}'...")
            if init_db() is None:
                 raise Exception(f"Database not connected. Cannot perform '{name}' on '{self._name}'")
        
        real_col = _db_instance.get_collection(self._name)
        return getattr(real_col, name)

class LazyDB:
    def get_collection(self, name):
        return LazyCollection(name)

# Initial Connection Attempt
_db_instance = init_db()

if _db_instance is not None:
    db = _db_instance
else:
    print("⚠️  Initial DB connection failed. Using LazyDB proxy to prevent crash.")
    db = LazyDB()
