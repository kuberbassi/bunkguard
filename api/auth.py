import os
import requests
from flask import Blueprint, redirect, url_for, session, request, jsonify
from authlib.integrations.flask_client import OAuth
from urllib.parse import urlencode, quote_plus
import jwt
import datetime
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
            "redirect_uri": data.get('redirect_uri', "postmessage"),
            "grant_type": "authorization_code"
        }
        
        token_resp = requests.post(token_url, data=token_data)
        
        if token_resp.status_code != 200:
            print(f"❌ Token exchange failed: {token_resp.text}")
            return jsonify({"error": "Failed to exchange token"}), 401
            
        tokens = token_resp.json()
        access_token = tokens.get("access_token")
        refresh_token = tokens.get("refresh_token")
        expires_in = tokens.get("expires_in", 3599)
        
        if not access_token:
            return jsonify({"error": "No access token received"}), 401
            
        # 2. Get user info from Google
        userinfo_url = "https://www.googleapis.com/oauth2/v2/userinfo"
        headers = {"Authorization": f"Bearer {access_token}"}
        userinfo_resp = requests.get(userinfo_url, headers=headers)
        
        if userinfo_resp.status_code != 200:
            return jsonify({"error": "Failed to fetch user info"}), 401
            
        user_info = userinfo_resp.json()
        
        # 3. Fetch existing user to preserve custom PFP
        existing_user = users_collection.find_one({"email": user_info["email"]})
        
        user_data = {
            "email": user_info["email"],
            "name": user_info.get("name"),
            "google_id": user_info.get("id"),
            "last_login": datetime.datetime.utcnow()
        }
        
        # Only set Google picture if user doesn't have one or it's a Google URL (not base64)
        current_pic = existing_user.get("picture") if existing_user else None
        if not current_pic or not current_pic.startswith("data:image/"):
            user_data["picture"] = user_info.get("picture")
        else:
            # Keep existing custom picture
            user_data["picture"] = current_pic

        users_collection.update_one(
            {"email": user_info["email"]},
            {"$set": user_data},
            upsert=True
        )
        
        # Refresh user object after upsert
        db_user = users_collection.find_one({"email": user_info["email"]})
        
        if not db_user:
            return jsonify({"error": "Failed to retrieve user after registration"}), 500
            
        # 4. Generate JWT for mobile/API usage
        token_payload = {
            'email': db_user['email'],
            'name': db_user.get('name', 'User'),
            'exp': datetime.datetime.utcnow() + datetime.timedelta(days=7),
            'iat': datetime.datetime.utcnow()
        }
        
        try:
            jwt_token = jwt.encode(
                token_payload,
                os.getenv('FLASK_SECRET_KEY', 'dev-secret-key'),
                algorithm='HS256'
            )
            # PyJWT 2.0+ returns str, but handle bytes just in case of environment mismatch
            if isinstance(jwt_token, bytes):
                jwt_token = jwt_token.decode('utf-8')
        except Exception as e:
            print(f"❌ JWT Encoding Error: {e}")
            return jsonify({"error": "Failed to generate security token"}), 500
            
        # 5. Also set session for web compatibility
        session['user'] = {
            'email': db_user['email'],
            'name': db_user.get('name'),
            'picture': db_user.get('picture')
        }
        
        # Store tokens in session (for Classroom API usage)
        session['google_access_token'] = access_token
        if refresh_token:
            session['google_refresh_token'] = refresh_token
        
        # Convert ObjectId to string for JSON serialization
        if '_id' in db_user:
            db_user['_id'] = str(db_user['_id'])

        return jsonify({
            "token": jwt_token,
            "user": db_user
        }), 200
        
    except Exception as e:
        import traceback
        error_msg = f"Error in google_auth: {str(e)}"
        print(f"❌ {error_msg}")
        traceback.print_exc()
        return jsonify({
            "error": "Internal Server Error during Google Auth",
            "details": str(e) if not os.getenv('VERCEL') else "Check server logs"
        }), 500

@auth_bp.route('/logout', methods=['POST', 'GET'])
def logout():
    try:
        session.clear()
        
        if request.method == 'POST':
            return jsonify({"message": "Logged out successfully"}), 200
        
        domain = os.getenv('AUTH0_DOMAIN')
        client_id = os.getenv('AUTH0_CLIENT_ID')
        return_to = url_for("auth.login", _external=True)
        logout_url = f"https://{domain}/v2/logout?{urlencode({'returnTo': return_to, 'client_id': client_id}, quote_via=quote_plus)}"
        return redirect(logout_url)
        
    except Exception as e:
        print(f"Error in logout: {e}")
        return jsonify({"error": str(e)}), 500

# DEV/TESTING ONLY - Remove in production
@auth_bp.route('/dev_login', methods=['POST'])
def dev_login():
    """Generate a valid JWT token for testing without OAuth"""
    try:
        if not request.is_json:
            return jsonify({"error": "Content-Type must be application/json"}), 400
            
        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid JSON body"}), 400
            
        email = data.get('email')
        
        if not email:
            return jsonify({"error": "Email required"}), 400
            
        if db is None:
            print("❌ Dev Login Error: Database connection is None")
            return jsonify({"error": "Database not connected"}), 500
            
        users_collection = db.get_collection('users')
        user = users_collection.find_one({"email": email})
        
        # Auto-create user if doesn't exist (dev mode convenience)
        if not user:
            print(f"📝 Dev Login: Creating new user for {email}")
            user_data = {
                "email": email,
                "name": email.split('@')[0].title(),
                "picture": None,
                "created_via": "dev_login"
            }
            users_collection.insert_one(user_data)
            user = user_data
            
        # Generate JWT token
        token_payload = {
            'email': user['email'],
            'exp': datetime.datetime.utcnow() + datetime.timedelta(days=7),
            'iat': datetime.datetime.utcnow()
        }
        
        token = jwt.encode(
            token_payload,
            os.getenv('FLASK_SECRET_KEY', 'dev-secret-key'),
            algorithm='HS256'
        )
        
        # PyJWT < 2.0 returns bytes, >= 2.0 returns string
        if isinstance(token, bytes):
            token = token.decode('utf-8')
        
        user_data = {
            'email': user['email'],
            'name': user.get('name', 'User'),
            'picture': user.get('picture')
        }
        
        print(f"✅ Dev Login successful for {email}")
        return jsonify({
            "token": token,
            "user": user_data
        }), 200
        
    except Exception as e:
        print(f"Dev login error: {e}")
        return jsonify({"error": str(e)}), 500