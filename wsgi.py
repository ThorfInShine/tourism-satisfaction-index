#!/usr/bin/env python3
import os
import sys
import platform

# Set production environment
os.environ['FLASK_ENV'] = 'production'

# Cross-platform path setup
if platform.system().lower() == 'windows':
    project_path = os.path.dirname(os.path.abspath(__file__))
else:
    # Linux production
    if os.path.exists('/var/www/html/batas.bpskotabatu.com'):
        project_path = '/var/www/html/batas.bpskotabatu.com'
    else:
        project_path = os.path.dirname(os.path.abspath(__file__))

# Add project to Python path
sys.path.insert(0, project_path)

# Import the Flask app
from app import app

# For WSGI servers
application = app

if __name__ == "__main__":
    app.run()