from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

# Rate limiting for production use (50+ concurrent users)
def create_limiter(app):
    """
    Create and configure rate limiter for the Flask app.
    Prevents abuse and ensures fair resource allocation.
    """
    limiter = Limiter(
        app=app,
        key_func=get_remote_address,
        default_limits=["200 per day", "50 per hour"],
        storage_uri="memory://",  # Use Redis in production for distributed systems
        strategy="fixed-window"
    )
    
    return limiter

# Rate limit decorators for different endpoint types
STRICT_LIMIT = "10 per minute"      # Auth, sensitive operations
MODERATE_LIMIT = "30 per minute"    # Data mutations (POST/PUT/DELETE)
RELAXED_LIMIT = "60 per minute"     # Read operations (GET)
