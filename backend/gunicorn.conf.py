import multiprocessing
import os

# Server socket
bind = "127.0.0.1:5000"
backlog = 2048

# Worker processes
workers = 2
worker_class = 'sync'
worker_connections = 1000
timeout = 120
keepalive = 5

# Restart workers after this many requests
max_requests = 1000
max_requests_jitter = 50

# Preload the application
preload_app = False

# Logging
accesslog = '/var/www/html/batas.bpskotabatu.com/backend/logs/gunicorn-access.log'
errorlog  = '/var/www/html/batas.bpskotabatu.com/backend/logs/gunicorn-error.log'
loglevel = 'info'

# Process naming
proc_name = 'batas-app'

# Server mechanics
daemon = False
pidfile = '/var/www/html/batas.bpskotabatu.com/backend/runtime/batas-app.pid'

# Environment
os.environ['PYTHONPATH'] = '/var/www/html/batas.bpskotabatu.com/backend'