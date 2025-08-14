#!/usr/bin/env python3
"""
WSGI Entry Point for Tourism Satisfaction Index Application
"""
import os
import sys

# Add the project directory to the sys.path
project_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, project_dir)

# Import Flask app
from app import app

# Production configuration
if os.environ.get('FLASK_ENV') == 'production':
    app.config['DEBUG'] = False
    app.config['TESTING'] = False

if __name__ == "__main__":
    app.run()