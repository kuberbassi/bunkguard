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
    code = data.get('code')
    
    if not code:
        return jsonify({"error": "No authorization code provided"}), 400
        
    try:
        if db is None:
            return jsonify({"error": "Database connection failed"}), 500

        users_collection = db.get_collection('users')
        
        # 1. Exchange code for tokens
        token_url = "https://oauth2.googleapis.com/token"
        token_data = {
            "code": code,
            "client_id": os.getenv("GOOGLE_CLIENT_ID"),
            "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"),
            "redirect_uri": "postmessage",
            "grant_type": "authorization_code"
        }
        
        # print(f"🔍 Exchanging code for tokens... Client ID: {token_data['client_id'][:5]}...")
        
        token_resp = requests.post(token_url, data=token_data)
        
        if token_resp.status_code != 200:
            print(f"❌ Token exchange failed: {token_resp.text}")
            return jsonify({"error": "Failed to exchange token"}), 401
            
        tokens = token_resp.json()
        access_token = tokens.get("access_token")
        refresh_token = tokens.get("refresh_token") # might be None if user already approved and we didn't ask for force prompt
        expires_in = tokens.get("expires_in", 3599)
        
        if not access_token:
            return jsonify({"error": "No access token received"}), 401

        # 2. Get User Info
        resp = requests.get(
            'https://www.googleapis.com/oauth2/v3/userinfo',
            headers={'Authorization': f'Bearer {access_token}'}
        )
        
        if resp.status_code != 200:
            return jsonify({"error": "Failed to fetch user info"}), 401
            
        user_info = resp.json()
        email = user_info.get("email")
        
        # 3. Calculate Expiry
        import time
        token_expiry = time.time() + expires_in
        
        # 4. Get existing user data
        db_user = users_collection.find_one({'email': email}) or {}
        
        # 5. Prepare user data
        user_data = {
            "email": email,
            "name": user_info.get("name"),
            "picture": user_info.get("picture"),
            "sub": user_info.get("sub"),
            "google_token": access_token,
            "google_token_expiry": token_expiry,
            # Merge profile fields
            "branch": db_user.get("branch", ""),
            "college": db_user.get("college", ""),
            "semester": db_user.get("semester", 1),
            "batch": db_user.get("batch", "")
        }
        
        # IMPORTANT: Only update refresh_token if it was returned
        # Google only returns refresh_token on the first consent.
        # If we want it every time, we need prompt='consent' on frontend, 
        # but better to just save it if we have it, and keep old one if we don't.
        if refresh_token:
            user_data["google_refresh_token"] = refresh_token
        elif db_user.get("google_refresh_token"):
             user_data["google_refresh_token"] = db_user.get("google_refresh_token")
            
        
        # 6. Upsert into DB
        users_collection.update_one(
            {'email': email},
            {'$set': user_data},
            upsert=True
        )
        
        # 7. Create Session
        session['user'] = user_data
        session.permanent = True
        print(f"✅ SESSION CREATED for {email}")
        
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