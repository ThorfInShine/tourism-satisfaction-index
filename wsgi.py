#!/usr/bin/env python3
import os
import sys
import platform

# Cross-platform path setup
if platform.system().lower() == 'windows':
    # Windows development
    project_path = os.path.dirname(os.path.abspath(__file__))
else:
    # Linux production or development
    if os.path.exists('/var/www/html/batas.bpskotabatu.com'):
        project_path = '/var/www/html/batas.bpskotabatu.com'
    else:
        project_path = os.path.dirname(os.path.abspath(__file__))

# Add project directory to path
sys.path.insert(0, project_path)

# Set environment to production
os.environ['FLASK_ENV'] = 'production'

# Import the application
from app import app

# For WSGI servers
application = app

if __name__ == "__main__":
    app.run()