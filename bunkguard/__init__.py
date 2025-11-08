# bunkguard/__init__.py
import os
from flask import Flask
from pymongo import MongoClient
from dotenv import load_dotenv
from .auth import oauth  # Import the oauth object from our auth blueprint

# --- Database ---
# We initialize it here so it's accessible to all blueprints
client = MongoClient(os.getenv('MONGO_URI'))
db = client.get_database('attendanceDB')

def create_app():
    """Create and configure an instance of the Flask application."""
    load_dotenv()
    
    # 🎯 CONFIRM THIS IS SET: Explicitly define the static folder
    app = Flask(__name__, static_folder='static', static_url_path='/static')
    
    # bunkguard/__init__.py
    app.secret_key = os.getenv("FLASK_SECRET_KEY")

    # --- Initialize OAuth for the Auth Blueprint ---
    oauth.init_app(app)
    oauth.register(
        'auth0',
        client_id=os.getenv('AUTH0_CLIENT_ID'),
        client_secret=os.getenv('AUTH0_CLIENT_SECRET'),
        server_metadata_url=f'https://{os.getenv("AUTH0_DOMAIN")}/.well-known/openid-configuration',
        client_kwargs={'scope': 'openid profile email'},
    )

    # --- Register Blueprints ---
    from . import views, auth, api # Import blueprints
    
    app.register_blueprint(views.views_bp)
    app.register_blueprint(auth.auth_bp)
    app.register_blueprint(api.api_bp) # Register your api blueprint here

    return app