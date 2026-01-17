#!/usr/bin/env python3
"""
Script to add @require_auth decorator to all endpoints in api.py that check for session auth
"""

import re

# Read the file
with open('api/api.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern to find function definitions that check for session immediately
# Matches: def function_name():
#     if 'user' not in session: return ...
pattern = r"(@api_bp\.route\([^\)]+\))\s*\ndef ([a-zA-Z_][a-zA-Z0-9_]*)\(\):\s*\n\s*if 'user' not in session:"

def replacer(match):
    """Add @require_auth and replace session check with g.user_email"""
    route_decorator = match.group(1)
    func_name = match.group(2)
    
    # Return the route decorator, add @require_auth, function def, and remove the session check
    return f"{route_decorator}\n@require_auth\ndef {func_name}():\n    # Auth handled by @require_auth decorator\n    # Use g.user_email instead of session['user']['email']"

# Apply the replacement
updated_content = re.sub(pattern, replacer, content)

# Also need to replace session['user']['email'] with g.user_email throughout
# But be careful - only in functions that now have @require_auth
# For now, let's just output how many we would change
matches = re.findall(pattern, content)
print(f"Found {len(matches)} endpoints to update:")
for match in matches:
    print(f"  - {match[1]}")

# Write back
with open('api/api.py', 'w', encoding='utf-8') as f:
    f.write(updated_content)

print(f"\n✅ Updated {len(matches)} endpoints with @require_auth decorator")
print("⚠️  Note: You'll need to manually replace session['user']['email'] with g.user_email in each function")
