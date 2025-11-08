# run.py (complete version with dev server)

import os
import sys

# Add project root to path
sys.path.insert(0, os.path.dirname(__file__))

from api import create_app

# Create the app instance
app = create_app()

# Run the development server
if __name__ == '__main__':
    print("🚀 Starting BunkGuard Flask Server...")
    print(f"📍 Server running at: http://localhost:5000")
    print(f"🛑 Press Ctrl+C to stop")
    
    app.run(
        debug=True,
        host='0.0.0.0',
        port=5000,
        use_reloader=True
    )
