import os
import platform

# Deployment configuration
class Config:
    # Basic Flask config
    SECRET_KEY = os.environ.get('SECRET_KEY', 'batas-production-secret-key-2024')
    
    # Environment detection
    FLASK_ENV = os.environ.get('FLASK_ENV', 'production')
    
    # Cross-platform paths
    if platform.system().lower() == 'windows':
        # Development paths
        UPLOAD_FOLDER = 'data'
        MODEL_FOLDER = 'models_h5_fixed'
        LOG_FOLDER = 'logs'
    else:
        # Production paths (Linux)
        if os.path.exists('/var/www/html/batas.bpskotabatu.com'):
            UPLOAD_FOLDER = '/var/www/html/batas.bpskotabatu.com/data'
            MODEL_FOLDER = '/var/www/html/batas.bpskotabatu.com/models_h5_fixed'
            LOG_FOLDER = '/var/log'
        else:
            # Development on Linux
            UPLOAD_FOLDER = 'data'
            MODEL_FOLDER = 'models_h5_fixed'
            LOG_FOLDER = 'logs'
    
    # File upload limits
    MAX_CONTENT_LENGTH = 50 * 1024 * 1024  # 50MB
    ALLOWED_EXTENSIONS = {'csv', 'xlsx', 'xls'}
    
    # Database-like storage
    KUNJUNGAN_DATA_FILE = os.path.join(UPLOAD_FOLDER, 'kunjungan_data.json')
    MAIN_DATASET_FILE = os.path.join(UPLOAD_FOLDER, 'combined_batu_tourism_reviews_cleaned.csv')