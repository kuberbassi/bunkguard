
import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

def get_db():
    """
    Lazy initialize MongoDB connection to avoid top-level crashes 
    during Vercel deployment if environment variables are slow to load.
    """
    mongo_uri = os.getenv('MONGO_URI')
    if not mongo_uri:
        print("❌ MONGO_URI is missing in environment!")
        return None
        
    try:
        client = MongoClient(
            mongo_uri,
            maxPoolSize=50,
            minPoolSize=5,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000,
            retryWrites=True
        )
        return client.get_database('attendanceDB')
    except Exception as e:
        print(f"❌ MongoDB Connection Error: {e}")
        return None

# Singleton instance for the package
db = get_db()
