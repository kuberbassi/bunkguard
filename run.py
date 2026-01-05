# run.py (complete version with dev server)

import os
import sys

# Fix Windows console encoding for emoji/unicode output
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

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
    
    # Start Background Worker (Notification Polling)
    from api.background_worker import start_worker
    
    # Only start worker in the reloader's worker process (or main if no reloader)
    if not app.debug or os.environ.get('WERKZEUG_RUN_MAIN') == 'true':
        start_worker(app)

    app.run(
        debug=True,
        host='0.0.0.0',
        port=5000,
        use_reloader=True
    )
