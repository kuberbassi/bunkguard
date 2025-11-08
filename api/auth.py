# bunkguard/auth.py
import os
from flask import Blueprint, redirect, url_for, session
from authlib.integrations.flask_client import OAuth
from urllib.parse import urlencode, quote_plus

auth_bp = Blueprint('auth', __name__)

# This will be initialized in our main __init__.py
oauth = OAuth()

@auth_bp.route('/login')
def login():
    # We will register auth0 in the factory function
    return oauth.auth0.authorize_redirect(redirect_uri=url_for("auth.callback", _external=True))

@auth_bp.route('/callback')
def callback():
    token = oauth.auth0.authorize_access_token()
    session["user"] = token["userinfo"]
    return redirect("/")

@auth_bp.route('/logout')
def logout():
    session.clear()
    domain = os.getenv('AUTH0_DOMAIN')
    client_id = os.getenv('AUTH0_CLIENT_ID')
    return_to = url_for("auth.login", _external=True)
    logout_url = f"https://{domain}/v2/logout?" + urlencode({"returnTo": return_to, "client_id": client_id}, quote_via=quote_plus)
    return redirect(logout_url)