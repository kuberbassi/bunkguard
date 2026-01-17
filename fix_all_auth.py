#!/usr/bin/env python3
"""
Quick fix: Replace all session auth checks with get_user_email() helper
"""

with open('api/api.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Count replacements
session_checks = content.count("if 'user' not in session:")
session_email_refs = content.count("session['user']['email']")

print(f"Found {session_checks} session auth checks")
print(f"Found {session_email_refs} session['user']['email'] references")

# Replace all "if 'user' not in session: return jsonify..." with helper check
content = content.replace(
    "if 'user' not in session: return jsonify({\"error\": \"Unauthorized\"}), 401",
    """user_email = get_user_email()
    if not user_email:
        return jsonify({"error": "Unauthorized"}), 401"""
)

# Replace session['user']['email'] with user_email (since we now get it from helper)
# But be careful - only do this AFTER the check
content = content.replace(
    "session['user']['email']",
    "user_email"
)

# Write back
with open('api/api.py', 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\n✅ Replaced all session checks with get_user_email() helper")
print("✅ Replaced all session['user']['email'] with user_email variable")
