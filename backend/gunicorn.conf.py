import multiprocessing
import os

# Server socket
bind = f"127.0.0.1:{os.environ.get('PORT', 5000)}"
backlog = 2048

# Worker processes
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = 'sync'
worker_connections = 1000
timeout = 600
keepalive = 5

# Restart workers after this many requests
max_requests = 1000
max_requests_jitter = 50

# Preload the application
preload_app = True

# Logging
accesslog = '/var/www/html/batas.bpskotabatu.com/logs/gunicorn-access.log'
errorlog  = '/var/www/html/batas.bpskotabatu.com/logs/gunicorn-error.log'
loglevel = 'info'
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Process naming
proc_name = 'batas-app'

# Server mechanics
daemon = False
pidfile = '/var/www/html/batas.bpskotabatu.com/runtime/batas-app.pid'
tmp_upload_dir = '/var/www/html/batas.bpskotabatu.com/data/temp'

# Environment
os.environ['PYTHONPATH'] = '/var/www/html/batas.bpskotabatu.com'