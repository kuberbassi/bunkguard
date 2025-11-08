import os
from flask import Flask
from pymongo import MongoClient
from dotenv import load_dotenv
from .auth import oauth

# Database
client = MongoClient(os.getenv('MONGO_URI'))
db = client.get_database('attendanceDB')

def create_app():
    """Create and configure the Flask application for Vercel."""
    load_dotenv()
    
    # Critical: Configure paths for Vercel
    template_folder = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'public', 'templates')
    static_folder = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'public', 'static')
    
    app = Flask(__name__, 
                template_folder=template_folder,
                static_folder=static_folder,
                static_url_path='/static')
    
    app.secret_key = os.getenv("FLASK_SECRET_KEY")
    
    # Initialize OAuth
    oauth.init_app(app)
    oauth.register(
        'auth0',
        client_id=os.getenv('AUTH0_CLIENT_ID'),
        client_secret=os.getenv('AUTH0_CLIENT_SECRET'),
        server_metadata_url=f'https://{os.getenv("AUTH0_DOMAIN")}/.well-known/openid-configuration',
        client_kwargs={'scope': 'openid profile email'},
    )
    
    # Register Blueprints
    from . import views, auth, api as api_module
    app.register_blueprint(views.views_bp)
    app.register_blueprint(auth.auth_bp)
    app.register_blueprint(api_module.api_bp)
    
    return app
