import multiprocessing
import os
import platform

# Cross-platform configuration
system = platform.system().lower()

# Server socket - cross-platform
if system == 'windows':
    bind = f"127.0.0.1:{os.environ.get('PORT', 5000)}"
else:
    bind = f"0.0.0.0:{os.environ.get('PORT', 5000)}"

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

# Cross-platform logging
if system == 'windows' or not os.path.exists('/var/log'):
    # Windows or systems without /var/log
    accesslog = 'logs/gunicorn-access.log'
    errorlog = 'logs/gunicorn-error.log'
    os.makedirs('logs', exist_ok=True)
else:
    # Linux/Unix with /var/log
    accesslog = '/var/log/gunicorn-access.log'
    errorlog = '/var/log/gunicorn-error.log'

loglevel = 'info'
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Process naming
proc_name = 'batas-app'

# Server mechanics - cross-platform
daemon = False

if system != 'windows':
    # Unix-specific settings
    if os.path.exists('/var/run'):
        pidfile = '/var/run/batas-app.pid'
    else:
        pidfile = 'batas-app.pid'
    
    # Try to set user/group if available
    try:
        import pwd
        import grp
        
        # Check if www-data user exists
        try:
            pwd.getpwnam('www-data')
            user = 'www-data'
            group = 'www-data'
        except KeyError:
            # Fallback to current user
            user = None
            group = None
    except ImportError:
        user = None
        group = None
else:
    # Windows doesn't support these
    pidfile = None
    user = None
    group = None

# Temp upload directory - cross-platform
if os.path.exists('/var/www/html/batas.bpskotabatu.com'):
    tmp_upload_dir = '/var/www/html/batas.bpskotabatu.com/data/temp'
else:
    tmp_upload_dir = 'data/temp'
    os.makedirs(tmp_upload_dir, exist_ok=True)

# Environment
os.environ['FLASK_ENV'] = 'production'