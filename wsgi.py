#!/usr/bin/env python3
import os
import sys

# Add project directory to path
sys.path.insert(0, '/var/www/html/batas.bpskotabatu.com')

# Set environment to production
os.environ['FLASK_ENV'] = 'production'

from app import app

if __name__ == "__main__":
    app.run()