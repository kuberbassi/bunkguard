import os
import sys

# Get the current directory of the file (api/)
current_dir = os.path.dirname(os.path.abspath(__file__))

# Add the parent directory (root) to sys.path so we can import api packages if needed
sys.path.append(os.path.join(current_dir, '..'))

# Add the current directory (api/) to sys.path
sys.path.append(current_dir)

# Now we can import from the package
from __init__ import create_app

app = create_app()
