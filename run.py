# run.py
from bunkguard import create_app

app = create_app()

if __name__ == '__main__':
    app.run(debug=True) # debug=True is great for development