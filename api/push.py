import os
import json
from flask import Blueprint, jsonify, request, session, Response
from . import db
from datetime import datetime
try:
    from pywebpush import webpush, WebPushException
except ImportError:
    webpush = None

push_bp = Blueprint('push', __name__, url_prefix='/api/push')

# Mongo collection
subscriptions = db.get_collection('push_subscriptions')

@push_bp.route('/vapid_public_key', methods=['GET'])
def get_vapid_public_key():
    """Return VAPID public key for frontend subscription"""
    # In production, these should be in env vars
    return jsonify({
        "publicKey": os.getenv("VAPID_PUBLIC_KEY")
    })

@push_bp.route('/subscribe', methods=['POST'])
def subscribe():
    """Save a push subscription"""
    if 'user' not in session:
        return jsonify({"error": "Unauthorized"}), 401
        
    subscription_info = request.json
    if not subscription_info:
        return jsonify({"error": "No subscription data"}), 400
        
    user_email = session['user']['email']
    
    # Update or insert subscription
    subscriptions.update_one(
        {
            'user_email': user_email, 
            'endpoint': subscription_info.get('endpoint')
        },
        {'$set': {
            'user_email': user_email,
            'subscription_info': subscription_info,
            'updated_at': datetime.utcnow()
        }},
        upsert=True
    )
    
    return jsonify({"success": True})

@push_bp.route('/unsubscribe', methods=['POST'])
def unsubscribe():
    """Remove a push subscription"""
    if 'user' not in session:
        return jsonify({"error": "Unauthorized"}), 401
        
    subscription_info = request.json
    endpoint = subscription_info.get('endpoint') if subscription_info else None
    
    if endpoint:
        subscriptions.delete_one({'endpoint': endpoint})
        
    return jsonify({"success": True})

def send_web_push(user_email, data):
    """Internal function to send push notification to a user"""
    if not webpush:
        print("pywebpush not installed")
        return
        
    results = list(subscriptions.find({'user_email': user_email}))
    
    private_key = os.getenv("VAPID_PRIVATE_KEY")
    claims = {"sub": "mailto:admin@acadhub.com"}
    
    for sub in results:
        try:
            webpush(
                subscription_info=sub['subscription_info'],
                data=json.dumps(data),
                vapid_private_key=private_key,
                vapid_claims=claims
            )
        except WebPushException as ex:
            print(f"Web push failed: {ex}")
            # If expired/invalid, delete
            if ex.response and ex.response.status_code == 410:
                subscriptions.delete_one({'_id': sub['_id']})
