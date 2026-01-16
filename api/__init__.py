# api/__init__.py

import os
from flask import Flask, request
from flask_cors import CORS
from pymongo import MongoClient
from dotenv import load_dotenv


load_dotenv()

try:
    # MongoDB Connection with Connection Pooling for 50+ concurrent users
    client = MongoClient(
        os.getenv('MONGO_URI'),
        maxPoolSize=50,  # Max concurrent connections
        minPoolSize=10,  # Keep minimum connections alive
        maxIdleTimeMS=45000,  # Close idle connections after 45s
        waitQueueTimeoutMS=2500,  # Wait max 2.5s for available connection
        serverSelectionTimeoutMS=5000,  # Server selection timeout
        connectTimeoutMS=10000,  # Initial connection timeout
        socketTimeoutMS=20000,  # Socket operation timeout
    )
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
    
    # Session Config
    is_production = os.getenv('FLASK_ENV') == 'production' or os.getenv('VERCEL') == '1'
    app.config['SESSION_COOKIE_SAMESITE'] = 'None' if is_production else 'Lax'
    app.config['SESSION_COOKIE_SECURE'] = is_production # Secure in production
    
    # Enable CORS for React frontend
    CORS(app, 
         resources={r"/*": {
             "origins": [
                 "http://localhost:5173", 
                 "http://127.0.0.1:5173", 
                 "https://acadhubkb.vercel.app",
                 "https://acadhub.kuberbassi.com"
             ],
             "supports_credentials": True,
             "allow_headers": ["Content-Type", "Authorization", "Accept"],
             "expose_headers": ["Content-Type", "Authorization"],
             "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"]
         }})

    @app.after_request
    def add_security_headers(response):
        # Security Headers
        response.headers['Cross-Origin-Opener-Policy'] = 'same-origin-allow-popups'
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        
        # HSTS (Strict-Transport-Security) only on HTTPS
        if request.scheme == 'https':
             response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
             
        return response
    
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
    from .keep import keep_bp

    from .rate_limiter import init_limiter

    app.register_blueprint(api_bp)
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(classroom_bp)
    app.register_blueprint(keep_bp)

    
    # Initialize Rate Limiter
    init_limiter(app)
    
    return app
