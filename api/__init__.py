import os
from flask import Flask, request, session, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from dotenv import load_dotenv
import nest_asyncio
from datetime import datetime
from flask_socketio import SocketIO

socketio = SocketIO(cors_allowed_origins="*", async_mode='threading')

nest_asyncio.apply()


load_dotenv()

from api.database import db

def create_app():
    app = Flask(__name__)
    
    app.secret_key = os.getenv("FLASK_SECRET_KEY", "change-in-production")
    
    # Session Config
    is_production = os.getenv('FLASK_ENV') == 'production' or os.getenv('VERCEL') == '1'
    app.config['SESSION_COOKIE_SAMESITE'] = 'None' if is_production else 'Lax'
    app.config['SESSION_COOKIE_SECURE'] = is_production # Secure in production
    
     # Enable CORS for React frontend (Explicit ports for stability)
    CORS(app, 
         resources={r"/*": {
             "origins": [
                 "http://localhost:5173", 
                 "http://127.0.0.1:5173",
                 "http://localhost:8081",     # Expo Web
                 "http://localhost:19006",    # Expo Legacy
                 "http://192.168.0.159:8081", # Network IP
                 "https://acadhubkb.vercel.app",
                 "https://acadhub.kuberbassi.com"
             ],
             "supports_credentials": True,
             "allow_headers": ["Content-Type", "Authorization", "Accept"],
             "expose_headers": ["Content-Type", "Authorization"],
             "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"]
         }})

    # JWT-to-Session middleware for mobile app compatibility
    @app.before_request
    def inject_jwt_into_session():
        """
        Middleware: If JWT token is present in Authorization header (mobile),
        inject user data into session so existing session-based endpoints work.
        """
        import jwt as jwt_lib
        
        # Skip if already have session
        if 'user' in session:
            return
        
        # Check for JWT token
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            try:
                payload = jwt_lib.decode(
                    token,
                    os.getenv('FLASK_SECRET_KEY', 'dev-secret-key'),
                    algorithms=['HS256']
                )
                
                # Inject full user data from DB into session
                # This ensures course, semester, batch, etc. are available
                user_email = payload.get('email')
                if user_email:
                    from api.database import db
                    users_collection = db.get_collection('users')
                    db_user = users_collection.find_one({'email': user_email})
                    
                    if db_user:
                        # Convert ObjectId and datetimes to serializable
                        from bson import ObjectId
                        # Create copy to avoid mutating cursor
                        user_data = dict(db_user)
                        
                        if '_id' in user_data: user_data['_id'] = str(user_data['_id'])
                        
                        # Remove typically large fields to prevent cookie bloat
                        fields_to_exclude = ['subjects', 'timetable', 'assignments', 'profile_image', 'picture', 'notifications']
                        for field in fields_to_exclude:
                            user_data.pop(field, None)
                        
                        for k, v in user_data.items():
                            if isinstance(v, datetime): user_data[k] = v.isoformat()
                        
                        session['user'] = user_data
                    else:
                        # Fallback to minimal data if user not in DB yet
                        session['user'] = {
                            'email': user_email,
                            'name': payload.get('name', 'Mobile User')
                        }
                
                # Mark as JWT-based for debugging
                session['auth_method'] = 'jwt'
                
            except (jwt_lib.ExpiredSignatureError, jwt_lib.InvalidTokenError) as e:
                print(f"⚠️ JWT validation failed: {e}")
                # Don't inject anything, endpoint will return 401

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
    


    @app.errorhandler(Exception)
    def handle_exception(e):
        import traceback
        print(f"🔥 SERVER ERROR: {str(e)}")
        traceback.print_exc()
        response = jsonify({"error": str(e), "trace": traceback.format_exc()})
        response.status_code = 500
        # Determine origin for CORS
        request_origin = request.headers.get('Origin')
        allowed_origins = [
            "http://localhost:5173", "http://127.0.0.1:5173",
            "http://localhost:8081", "http://localhost:19006",
            "https://acadhubkb.vercel.app", "https://acadhub.kuberbassi.com"
        ]
        if request_origin in allowed_origins or (request_origin and request_origin.startswith("http://localhost:")):
            response.headers['Access-Control-Allow-Origin'] = request_origin
            response.headers['Access-Control-Allow-Credentials'] = 'true'
            response.headers['Access-Control-Allow-Headers'] = "Content-Type, Authorization, Accept"
        return response
    
    from api.auth import auth_bp, oauth
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
    
    from api.api import api_bp
    from api.auth import auth_bp
    from api.keep import keep_bp
    from api.scraper import scraper_bp

    from api.rate_limiter import init_limiter

    app.register_blueprint(api_bp)
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(keep_bp)
    app.register_blueprint(scraper_bp, url_prefix='/api/scraper')

    
    # Initialize Rate Limiter
    init_limiter(app)
    
    # Initialize SocketIO
    socketio.init_app(app)
    
    return app
