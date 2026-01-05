import os
import requests
from flask import Blueprint, redirect, url_for, session, request, jsonify
from authlib.integrations.flask_client import OAuth
from urllib.parse import urlencode, quote_plus
from . import db

auth_bp = Blueprint('auth', __name__)

# This will be initialized in our main __init__.py
oauth = OAuth()

@auth_bp.route('/google', methods=['POST'])
def google_auth():
    data = request.json
    access_token = data.get('access_token')
    
    if not access_token:
        return jsonify({"error": "No access token provided"}), 400
        
    # Verify the user with Google
    try:
        if db is None:
            return jsonify({"error": "Database connection failed"}), 500

        users_collection = db.get_collection('users')

        resp = requests.get(
            'https://www.googleapis.com/oauth2/v3/userinfo',
            headers={'Authorization': f'Bearer {access_token}'}
        )
        
        if resp.status_code != 200:
            return jsonify({"error": "Invalid token"}), 401
            
        user_info = resp.json()
        email = user_info.get("email")
        
        # 1. Get existing user data from DB
        db_user = users_collection.find_one({'email': email}) or {}
        
        # 2. Prepare user data (Google + DB overrides)
        user_data = {
            "email": email,
            "name": user_info.get("name"),
            "picture": user_info.get("picture"),
            "sub": user_info.get("sub"),
            "google_token": access_token,
            # Merge profile fields from DB
            "branch": db_user.get("branch", ""),
            "college": db_user.get("college", ""),
            "semester": db_user.get("semester", 1),
            "batch": db_user.get("batch", "")
        }
        
        # 3. Upsert into DB (Store basic info)
        users_collection.update_one(
            {'email': email},
            {'$set': user_data},
            upsert=True
        )
        
        # 4. Create Session
        session['user'] = user_data
        session.permanent = True
        print(f"✅ SESSION CREATED for {email}")
        print(f"✅ Session data: {session.get('user', 'NO USER')}")
        
        return jsonify({
            "user": user_data,
            "token": "session_active"
        })
        
    except Exception as e:
        import traceback
        print(f"Google Auth Error: {e}")
        traceback.print_exc()
        return jsonify({"error": f"Authentication failed: {str(e)}"}), 500

@auth_bp.route('/login')
def login():
    # We will register auth0 in the factory function
    return oauth.auth0.authorize_redirect(redirect_uri=url_for("auth.callback", _external=True))

@auth_bp.route('/callback')
def callback():
    token = oauth.auth0.authorize_access_token()
    session["user"] = token["userinfo"]
    return redirect("/")

@auth_bp.route('/logout', methods=['GET', 'POST'])
def logout():
    session.clear()
    
    # For API calls (POST), return JSON
    if request.method == 'POST':
        return jsonify({"message": "Logged out successfully"}), 200
    
    # For browser redirects (GET), redirect to Auth0 logout
    domain = os.getenv('AUTH0_DOMAIN')
    client_id = os.getenv('AUTH0_CLIENT_ID')
    return_to = url_for("auth.login", _external=True)
    logout_url = f"https://{domain}/v2/logout?{urlencode({'returnTo': return_to, 'client_id': client_id}, quote_via=quote_plus)}"
    return redirect(logout_url)