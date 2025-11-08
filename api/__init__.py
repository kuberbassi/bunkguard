# api/__init__.py

import os
from flask import Flask
from pymongo import MongoClient
from dotenv import load_dotenv
from .auth import oauth

load_dotenv()

try:
    client = MongoClient(os.getenv('MONGO_URI'))
    db = client.get_database('attendanceDB')
except Exception as e:
    print(f"MongoDB failed: {e}")
    db = None

def create_app():
    # Templates and static are in the same directory as this file
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    template_folder = os.path.join(current_dir, 'templates')
    static_folder = os.path.join(current_dir, 'static')
    
    print(f"Current dir: {current_dir}")
    print(f"Templates: {template_folder}")
    print(f"Templates exist: {os.path.exists(template_folder)}")
    
    app = Flask(__name__,
                template_folder=template_folder,
                static_folder=static_folder,
                static_url_path='/static')
    
    app.secret_key = os.getenv("FLASK_SECRET_KEY", "change-in-production")
    
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
    
    from . import views, auth, api as api_module
    
    app.register_blueprint(views.views_bp)
    app.register_blueprint(auth.auth_bp)
    app.register_blueprint(api_module.api_bp)
    
    return app
