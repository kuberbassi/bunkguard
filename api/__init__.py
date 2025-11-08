# api/__init__.py

import os
from flask import Flask
from pymongo import MongoClient
from dotenv import load_dotenv
from .auth import oauth

# Load environment variables
load_dotenv()

# Database connection
try:
    client = MongoClient(os.getenv('MONGO_URI'))
    db = client.get_database('attendanceDB')
    print("✅ MongoDB connected successfully")
except Exception as e:
    print(f"❌ MongoDB connection failed: {e}")
    db = None

def create_app():
    """Create and configure the Flask application."""
    
    # __file__ is at: bunkguard/api/__init__.py
    # We need to go up ONE level to: bunkguard/
    basedir = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
    
    # Now point to public/templates and public/static
    template_folder = os.path.join(basedir, 'public', 'templates')
    static_folder = os.path.join(basedir, 'public', 'static')
    
    # Debug output
    print(f"\n📁 Base directory: {basedir}")
    print(f"📄 Template folder: {template_folder}")
    print(f"🎨 Static folder: {static_folder}")
    print(f"✅ Templates exist: {os.path.exists(template_folder)}")
    print(f"✅ Static exists: {os.path.exists(static_folder)}")
    
    if os.path.exists(template_folder):
        files = os.listdir(template_folder)
        print(f"📋 Template files: {files}\n")
    
    app = Flask(__name__,
                template_folder=template_folder,
                static_folder=static_folder,
                static_url_path='/static')
    
    # Set secret key
    app.secret_key = os.getenv("FLASK_SECRET_KEY", "dev-secret-key-change-in-production")
    
    # Initialize OAuth
    oauth.init_app(app)
    
    try:
        oauth.register(
            'auth0',
            client_id=os.getenv('AUTH0_CLIENT_ID'),
            client_secret=os.getenv('AUTH0_CLIENT_SECRET'),
            server_metadata_url=f'https://{os.getenv("AUTH0_DOMAIN")}/.well-known/openid-configuration',
            client_kwargs={'scope': 'openid profile email'},
        )
        print("✅ OAuth configured successfully")
    except Exception as e:
        print(f"⚠️ OAuth registration failed: {e}")
    
    # Register blueprints
    try:
        from . import views, auth, api as api_module
        
        app.register_blueprint(views.views_bp)
        app.register_blueprint(auth.auth_bp)
        app.register_blueprint(api_module.api_bp)
        
        print("✅ All blueprints registered successfully\n")
    except Exception as e:
        print(f"❌ Blueprint registration failed: {e}")
        raise
    
    return app
