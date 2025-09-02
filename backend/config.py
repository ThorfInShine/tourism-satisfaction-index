import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Supabase Configuration
    SUPABASE_URL = os.getenv('SUPABASE_URL')
    SUPABASE_ANON_KEY = os.getenv('SUPABASE_ANON_KEY')
    SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_KEY')
    SECRET_KEY = os.getenv('SECRET_KEY', 'your-secret-key-here')
    
    # Flask Configuration
    FLASK_ENV = os.getenv('FLASK_ENV', 'development')
    
    # Existing configurations...
    UPLOAD_FOLDER = 'data'
    MODEL_FOLDER = 'models_h5_fixed'
    MAX_CONTENT_LENGTH = 50 * 1024 * 1024  # 50MB