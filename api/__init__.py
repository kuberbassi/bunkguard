# api/__init__.py

import os
from flask import Flask
from flask_cors import CORS
from pymongo import MongoClient
from dotenv import load_dotenv


load_dotenv()

try:
    client = MongoClient(os.getenv('MONGO_URI'))
    db = client.get_database('attendanceDB')
except Exception as e:
    print(f"MongoDB failed: {e}")
    db = None

from .auth import oauth

def create_app():
    # Get current directory (api/)
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    template_folder = os.path.join(current_dir, 'templates')
    static_folder = os.path.join(current_dir, 'static')
    
    app = Flask(__name__,
                template_folder=template_folder,
                static_folder=static_folder,
                static_url_path='/static')
    
    app.secret_key = os.getenv("FLASK_SECRET_KEY", "change-in-production")
    
    # Enable CORS for React frontend
    CORS(app, 
         resources={r"/*": {
             "origins": ["http://localhost:5173", "http://127.0.0.1:5173"],
             "supports_credentials": True,
             "allow_headers": ["Content-Type", "Authorization", "Accept"],
             "expose_headers": ["Content-Type", "Authorization"],
             "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"]
         }})
    
    oauth.init_app(app)
    
    try:
        oauth.register(
            'auth0',
            client_id=os.getenv('AUTH0_CLIENT_ID'),
            client_secret=os.getenv('AUTH0_CLIENT_SECRET'),
            server_metadata_url=f'https://{os.getenv("AUTH0_DOMAIN")}/.well-known/openid-configuration',
            client_kwargs={'scope': 'openid profile email'},
        )
    except Exception as e:
        print(f"OAuth warning: {e}")
    
    from .api import api_bp
    from .auth import auth_bp
    from .classroom import classroom_bp

    app.register_blueprint(api_bp)
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(classroom_bp)
    
    return app
