# api/auth.py

import os
import requests
from flask import Blueprint, redirect, url_for, session, request, jsonify
from authlib.integrations.flask_client import OAuth
from urllib.parse import urlencode, quote_plus

auth_bp = Blueprint('auth', __name__)

# This will be initialized in our main __init__.py
oauth = OAuth()

@auth_bp.route('/google', methods=['POST'])
def google_auth():
    data = request.json
    access_token = data.get('access_token')
    
    if not access_token:
        return jsonify({"error": "No access token provided"}), 400
        
    # Verify the token with Google
    try:
        resp = requests.get(
            'https://www.googleapis.com/oauth2/v3/userinfo',
            headers={'Authorization': f'Bearer {access_token}'}
        )
        
        if resp.status_code != 200:
            return jsonify({"error": "Invalid token"}), 401
            
        user_info = resp.json()
        
        # Determine user data structure (normalize it to what the app expects)
        user_data = {
            "email": user_info.get("email"),
            "name": user_info.get("name"),
            "picture": user_info.get("picture"),
            "sub": user_info.get("sub"),
            "google_token": access_token # Store token for API calls
        }
        
        # Create Session
        session['user'] = user_data
        session.permanent = True # Keep session alive
        
        return jsonify({
            "user": user_data,
            "token": "session_active" # Frontend expects a token field, though we rely on cookies
        })
        
    except Exception as e:
        print(f"Google Auth Error: {e}")
        return jsonify({"error": "Authentication failed"}), 500

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