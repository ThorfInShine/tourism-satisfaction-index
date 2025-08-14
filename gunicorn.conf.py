"""
Gunicorn Configuration for Tourism Satisfaction Index
"""
import multiprocessing

# Server socket
bind = "127.0.0.1:5000"
backlog = 2048

# Worker processes
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "sync"
worker_connections = 1000
timeout = 60
keepalive = 2

# Restart workers
max_requests = 1000
max_requests_jitter = 50
preload_app = True

# Logging
accesslog = "/var/log/supervisor/batas-app-access.log"
errorlog = "/var/log/supervisor/batas-app-error.log"
loglevel = "info"

# Process naming
proc_name = "batas-tourism-app"

# Worker temp directory
worker_tmp_dir = "/dev/shm"

# Security
limit_request_line = 4094
limit_request_fields = 100
limit_request_field_size = 8190