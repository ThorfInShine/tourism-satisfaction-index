#!/usr/bin/env python3
import os
import sys

# Add backend directory to path
sys.path.insert(0, '/var/www/html/batas.bpskotabatu.com/backend')

# Set environment
os.environ['FLASK_ENV'] = 'production'

# Import Flask app
from app import app as application

if __name__ == "__main__":
    application.run()