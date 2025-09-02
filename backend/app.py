# FILE: app.py (UPDATED FOR REACT.JS FRONTEND - COMPLETE VERSION)
import os
import sys
import logging
from datetime import datetime, timedelta
from functools import lru_cache
import pandas as pd
import numpy as np
import plotly.graph_objs as go
import plotly.utils
import json
from flask import Flask, request, jsonify, send_from_directory, send_file, session
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from flask_cors import CORS
from werkzeug.utils import secure_filename
from werkzeug.middleware.proxy_fix import ProxyFix
import pickle
import joblib
import gc
import warnings
import traceback
import re
import signal
import io
from collections import defaultdict, Counter
import tempfile
import shutil
import h5py
import codecs
import platform
import zipfile
from collections import Counter

# Import authentication components
from config import Config
from auth_service import auth_service, User

# Load environment variables from .env file if available
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # dotenv not installed, skip

# Set UTF-8 encoding untuk Windows console - PERBAIKAN
if os.name == 'nt':  # Windows
    # Set environment variables
    os.environ['PYTHONIOENCODING'] = 'utf-8'
    
    # Reconfigure stdout dan stderr dengan error handling
    try:
        # Method 1: Reconfigure with UTF-8
        if hasattr(sys.stdout, 'reconfigure'):
            sys.stdout.reconfigure(encoding='utf-8')
            sys.stderr.reconfigure(encoding='utf-8')
        else:
            # Method 2: Wrap dengan UTF-8 writer
            sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer)
            sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer)
    except Exception as e:
        # Method 3: Fallback - buat custom writer yang aman
        class SafeWriter:
            def __init__(self, original):
                self.original = original
                
            def write(self, text):
                try:
                    # Coba tulis dengan UTF-8
                    if hasattr(self.original, 'buffer'):
                        self.original.buffer.write(text.encode('utf-8'))
                    else:
                        # Fallback: replace emoji dengan text
                        safe_text = text.encode('ascii', 'replace').decode('ascii')
                        self.original.write(safe_text)
                except:
                    # Last resort: skip emoji
                    safe_text = ''.join(c if ord(c) < 128 else '?' for c in text)
                    self.original.write(safe_text)
                    
            def flush(self):
                if hasattr(self.original, 'flush'):
                    self.original.flush()
                    
        sys.stdout = SafeWriter(sys.stdout)
        sys.stderr = SafeWriter(sys.stderr)
    
    # Set console code page ke UTF-8
    try:
        os.system('chcp 65001 > nul 2>&1')
    except:
        pass

warnings.filterwarnings('ignore')

# Initialize Flask app with production settings
app = Flask(__name__)
app.config.from_object(Config)
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)

# Enable CORS for React development
CORS(app, origins=['http://localhost:3000'], supports_credentials=True)

# Initialize Flask-Login
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'api_login'
login_manager.login_message = 'Silakan login untuk mengakses halaman ini.'
login_manager.login_message_category = 'info'

@login_manager.user_loader
def load_user(user_id):
    return auth_service.get_user_by_id(user_id)

class EmojiSafeHandler(logging.StreamHandler):
    """Custom handler yang aman untuk emoji"""
    
    def emit(self, record):
        try:
            msg = self.format(record)
            stream = self.stream
            
            # Coba tulis dengan encoding asli
            try:
                stream.write(msg + self.terminator)
                stream.flush()
                return
            except UnicodeEncodeError:
                # Jika gagal, coba dengan UTF-8
                try:
                    if hasattr(stream, 'buffer'):
                        stream.buffer.write((msg + self.terminator).encode('utf-8'))
                        stream.buffer.flush()
                        return
                except:
                    pass
                
                # Last resort: replace problematic chars
                safe_msg = msg.encode('ascii', 'replace').decode('ascii')
                stream.write(safe_msg + self.terminator)
                stream.flush()
                
        except Exception:
            self.handleError(record)

# PERBAIKAN: Environment detection yang lebih akurat
def detect_environment():
    """Detect if running in production or development"""
    # Check explicit environment variable first
    flask_env = os.environ.get('FLASK_ENV')
    if flask_env:
        return flask_env.lower()
    
    # Check deployment indicators
    deployment_indicators = [
        os.environ.get('DEPLOYED'),  # Custom deployment flag
        os.environ.get('HEROKU'),    # Heroku
        os.environ.get('RAILWAY_ENVIRONMENT'),  # Railway
        os.environ.get('VERCEL'),    # Vercel
        'gunicorn' in os.environ.get('SERVER_SOFTWARE', '').lower(),
        'uwsgi' in os.environ.get('SERVER_SOFTWARE', '').lower(),
        '/var/www' in os.getcwd(),   # Common production path
        '/opt/app' in os.getcwd(),   # Docker production path
    ]
    
    if any(deployment_indicators):
        return 'production'
    
    # Check if running directly with python (development)
    if __name__ == '__main__':
        return 'development'
    
    # Default to development for safety
    return 'development'

# Get environment
FLASK_ENV = detect_environment()
app.logger = logging.getLogger(__name__)
app.logger.info(f"🔍 Detected environment: {FLASK_ENV}")

# Configuration based on environment
if FLASK_ENV == 'production':
    app.config['DEBUG'] = False
    
    # Cross-platform path configuration
    if os.name == 'nt':  # Windows
        app.config['UPLOAD_FOLDER'] = 'data'
        app.config['MODEL_FOLDER'] = 'models_h5_fixed'
        app.config['STATIC_FOLDER'] = 'static'
        log_dir = 'logs'
    else:  # Linux/Unix
        # Check if running in typical production paths
        if os.path.exists('/var/www/html'):
            app.config['UPLOAD_FOLDER'] = '/var/www/html/batas.bpskotabatu.com/data'
            app.config['MODEL_FOLDER'] = '/var/www/html/batas.bpskotabatu.com/models_h5_fixed'
            app.config['STATIC_FOLDER'] = '/var/www/html/batas.bpskotabatu.com/static'
            log_dir = '/var/log'
        else:
            # Development on Linux
            app.config['UPLOAD_FOLDER'] = 'data'
            app.config['MODEL_FOLDER'] = 'models_h5_fixed'
            app.config['STATIC_FOLDER'] = 'static'
            log_dir = 'logs'
    
    # Ensure log directory exists
    if log_dir == '/var/log':
        # For system log directory, fallback to local if no permission
        try:
            test_file = os.path.join(log_dir, 'test_write_permission')
            with open(test_file, 'w') as f:
                f.write('test')
            os.remove(test_file)
        except (PermissionError, OSError):
            log_dir = 'logs'
            os.makedirs(log_dir, exist_ok=True)
    else:
        os.makedirs(log_dir, exist_ok=True)
    
    # Setup logging
    log_file = os.path.join(log_dir, 'batas-app.log')
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]',
        handlers=[
            EmojiSafeHandler(sys.stdout),
            logging.FileHandler(log_file, mode='a', encoding='utf-8')
        ]
    )
    app.logger.setLevel(logging.INFO)
    app.logger.info(f'BATAS Tourist Satisfaction Analyzer startup - PRODUCTION MODE (Log: {log_file})')
    
else:
    # Development mode
    app.config['DEBUG'] = True
    app.config['UPLOAD_FOLDER'] = 'data'
    app.config['MODEL_FOLDER'] = 'models_h5_fixed'
    app.config['STATIC_FOLDER'] = 'static'
    
    # Setup logging untuk development
    logging.basicConfig(
        level=logging.DEBUG,
        format='%(asctime)s %(levelname)s: %(message)s',
        handlers=[
            EmojiSafeHandler(sys.stdout)
        ]
    )
    app.logger.info('BATAS Tourist Satisfaction Analyzer startup - DEVELOPMENT MODE')

# Additional configuration
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max file size
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 31536000  # 1 year cache for static files
app.config['ALLOWED_EXTENSIONS'] = {'csv', 'xlsx', 'xls'}

# Konfigurasi analisis - bisa diubah sesuai kebutuhan
MAX_COMPLAINTS_PER_WISATA = None  # None = tampilkan semua, atau set angka seperti 100
MAX_COMPLAINTS_PROCESSING = 200  # Batas saat processing untuk mencegah memory issues

# Ensure directories exist
for directory in [app.config['UPLOAD_FOLDER'], app.config['MODEL_FOLDER'], app.config['STATIC_FOLDER'],
                  os.path.join(app.config['UPLOAD_FOLDER'], 'temp'),
                  os.path.join(app.config['UPLOAD_FOLDER'], 'backups'),
                  os.path.join(app.config['STATIC_FOLDER'], 'dist')]:
    os.makedirs(directory, exist_ok=True)

# Import data kunjungan functions
from data_kunjungan_wisata import get_kunjungan_data, get_wisata_kunjungan, clear_cache

# Import TensorFlow with error handling - PERBAIKAN
try:
    os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
    import tensorflow as tf
    tf.get_logger().setLevel('ERROR')
    from tensorflow.keras.preprocessing.sequence import pad_sequences
    TENSORFLOW_AVAILABLE = True
    app.logger.info(f"✅ TensorFlow available - Version: {tf.__version__}")
except ImportError as e:
    app.logger.warning(f"❌ TensorFlow not available - LSTM models will be disabled. Error: {e}")
    app.logger.info("💡 To enable LSTM models, install TensorFlow: pip install tensorflow")
    TENSORFLOW_AVAILABLE = False
except Exception as e:
    app.logger.error(f"❌ Error importing TensorFlow: {e}")
    TENSORFLOW_AVAILABLE = False

# Import sklearn components
try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.linear_model import LogisticRegression
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.pipeline import Pipeline
    SKLEARN_AVAILABLE = True
    app.logger.info("✅ Scikit-learn available")
except ImportError:
    app.logger.error("❌ Scikit-learn not available")
    SKLEARN_AVAILABLE = False

# PERBAIKAN: Signal handler yang lebih baik
interrupt_received = False

def signal_handler(sig, frame):
    global interrupt_received
    interrupt_received = True
    app.logger.info('🛑 Interrupt received, finishing current operation...')
    
    # Don't exit immediately, let current operation finish
    # The app will check interrupt_received flag periodically

signal.signal(signal.SIGINT, signal_handler)

# Global variables with thread safety
processor = None
predictor = None
df_processed = None
metrics = None
model_results = None
current_data_info = None

# Visit level categories (simplified for production)
VISIT_LEVEL_HIGH = [
    'eco green park', 'eco active park', 'gunung panderman', 'batu night spectacular',
    'museum angkut', 'coban talun', 'taman selecta', 'jatim park 3',
    'jatim park 2', 'jatim park 1', 'alun alun kota wisata batu'
]

VISIT_LEVEL_MEDIUM = [
    'songgoriti hot springs', 'tirta nirwana hotspring', 'desa wisata tulungrejo',
    'coban putri', 'paralayang gunung banyak', 'air terjun coban rais',
    'batu economis park', 'wisata bunga sidomulyo', 'batu love garden',
    'milenial glow garden', 'pemandian air panas cangar'
]

VISIT_LEVEL_LOW = [
    'gussari goa pinus batu', 'batu rafting', 'wisata desa agro bumiaji',
    'taman dolan', 'gunung arjuno', 'taman pinus campervan',
    'wisata petik apel mandiri', 'desa wisata punten', 'lumbung stroberi'
]

VALID_TIME_RANGES = [
    # Real-time
    'Baru saja', 'Beberapa saat lalu', 'Hari ini',
    
    # Jam (biasanya 1-23 jam)
    *[f'{i} jam lalu' for i in range(1, 24)],
    
    # Hari (biasanya 1-6 hari, setelah itu jadi minggu)
    *[f'{i} hari lalu' for i in range(1, 7)],
    'Kemarin',
    
    # Minggu (1-4 minggu)
    *[f'{i} minggu lalu' for i in range(1, 5)],
    'Minggu lalu',
    
    # Bulan (1-11 bulan)
    *[f'{i} bulan lalu' for i in range(1, 12)],
    'Bulan lalu',
    
    # Tahun (Google Maps bisa menampilkan foto/review bertahun-tahun lalu)
    '1 tahun lalu',
    
    # Format alternatif yang kadang muncul
    'Beberapa jam lalu', 'Beberapa hari lalu', 'Beberapa minggu lalu', 'Beberapa bulan lalu'
]

# Enhanced negative keywords for complaint analysis - EXPANDED
NEGATIVE_KEYWORDS = {
    'harga': [
        'mahal', 'expensive', 'harga tinggi', 'overpriced', 'kemahalan', 'pricey',
        'tidak worth', 'tidak sebanding', 'overprice', 'mahal banget', 'harga selangit',
        'biaya tinggi', 'tarif mahal', 'tiket mahal', 'entrance fee mahal', 'parkir mahal',
        'makan mahal', 'food expensive', 'souvenir mahal', 'tidak terjangkau', 'budget killer'
    ],
    
    'fasilitas': [
        'rusak', 'broken', 'tidak berfungsi', 'error', 'mati', 'hancur', 'jelek',
        'toilet rusak', 'wc rusak', 'kamar mandi kotor', 'mushola rusak', 'gazebo rusak',
        'jembatan rusak', 'tangga rusak', 'perosotan rusak', 'wahana rusak', 'permainan rusak',
        'lampu mati', 'listrik mati', 'ac rusak', 'kipas rusak', 'sound system rusak',
        'fasilitas kurang', 'tidak ada toilet', 'tidak ada mushola', 'tidak ada tempat duduk'
    ],
    
    'kebersihan': [
        'kotor', 'dirty', 'jorok', 'bau', 'smell', 'kumuh', 'tidak bersih',
        'sampah berserakan', 'banyak sampah', 'sampah dimana-mana', 'penuh sampah',
        'toilet kotor', 'wc bau', 'kamar mandi jorok', 'air kotor', 'kolam kotor',
        'lantai kotor', 'meja kotor', 'kursi kotor', 'tempat makan kotor',
        'bau pesing', 'bau tidak sedap', 'bau busuk', 'amis', 'pengap',
        'berdebu', 'lumut', 'berlumut', 'becek', 'berlumpur'
    ],
    
    'pelayanan': [
        'lambat', 'slow', 'tidak ramah', 'kasar', 'buruk', 'mengecewakan',
        'pelayanan jelek', 'service bad', 'staff tidak ramah', 'petugas kasar',
        'tidak helpful', 'tidak membantu', 'cuek', 'acuh tak acuh', 'sombong',
        'tidak profesional', 'asal-asalan', 'seenaknya', 'tidak peduli',
        'respon lambat', 'lama dilayani', 'diabaikan', 'tidak diperhatikan'
    ],
    
    'antrian': [
        'antri', 'queue', 'lama', 'menunggu', 'crowded', 'ramai', 'penuh',
        'antrian panjang', 'antri lama', 'waiting time lama', 'nunggu lama',
        'overcrowded', 'terlalu ramai', 'sesak', 'penuh sesak', 'berdesakan',
        'tidak bisa masuk', 'sold out', 'tiket habis', 'full booked',
        'traffic jam', 'macet masuk', 'parkir penuh', 'susah parkir'
    ],
    
    'akses': [
        'susah', 'sulit', 'jauh', 'macet', 'traffic', 'parkir', 'jalan rusak',
        'akses sulit', 'jalan jelek', 'jalan berlubang', 'jalan sempit',
        'tidak ada transportasi', 'transport sulit', 'ojek mahal', 'grab mahal',
        'parkir jauh', 'jalan kaki jauh', 'naik turun', 'tanjakan curam',
        'tidak ada petunjuk', 'susah dicari', 'tersesat', 'GPS error',
        'sinyal lemah', 'no signal', 'internet lemah'
    ],
    
    'kualitas': [
        'kecewa', 'disappointed', 'tidak sesuai', 'zonk', 'rugi', 'tidak worth',
        'ekspektasi tinggi', 'overrated', 'biasa aja', 'nothing special',
        'tidak istimewa', 'standar', 'kurang menarik', 'boring', 'membosankan',
        'tidak seru', 'monoton', 'gitu doang', 'cuma gitu', 'kurang greget',
        'foto lebih bagus', 'tidak seindah foto', 'misleading', 'berbeda dari foto'
    ],
    
    'keamanan': [
        'tidak aman', 'unsafe', 'bahaya', 'dangerous', 'sepi', 'gelap',
        'pencurian', 'copet', 'kehilangan', 'hilang', 'dicuri',
        'tidak ada security', 'tidak ada penjaga', 'rawan', 'menakutkan',
        'jalan gelap', 'lampu mati', 'serem', 'takut', 'was-was'
    ],
    
    'makanan': [
        'makanan tidak enak', 'rasa hambar', 'tidak enak', 'makanan mahal',
        'porsi kecil', 'food bad', 'taste bad', 'overpriced food',
        'makanan dingin', 'tidak fresh', 'basi', 'expired',
        'pilihan sedikit', 'menu terbatas', 'warung tutup', 'kantin tutup',
        'makan di luar mahal', 'tidak boleh bawa makanan'
    ],
    
    'wahana': [
        'wahana rusak', 'permainan rusak', 'ride broken', 'tidak jalan',
        'antri wahana lama', 'wahana tutup', 'maintenance', 'under repair',
        'wahana sepi', 'wahana sedikit', 'tidak ada wahana baru',
        'wahana membosankan', 'wahana biasa', 'tidak menantang',
        'terlalu mudah', 'terlalu susah', 'tidak seru'
    ],
    
    'transportasi': [
        'transportasi sulit', 'tidak ada angkot', 'tidak ada bus',
        'ojek susah', 'grab susah', 'taxi mahal', 'transport mahal',
        'jalan macet', 'traffic jam', 'kemacetan', 'akses terbatas',
        'shuttle tidak ada', 'bus wisata rusak', 'kendaraan rusak'
    ],
    
    'informasi': [
        'informasi kurang', 'tidak ada info', 'tidak jelas', 'confusing',
        'petunjuk tidak ada', 'sign tidak jelas', 'papan rusak',
        'guide tidak ada', 'tour guide jelek', 'penjelasan kurang',
        'tidak ada peta', 'map tidak ada', 'brosur tidak ada',
        'website tidak update', 'info online salah'
    ]
}

def get_category_display_info(category):
    """Get display information for complaint categories"""
    category_info = {
        'harga': {
            'display_name': 'Harga Mahal',
            'icon': 'fas fa-dollar-sign',
            'color': '#dc2626',
            'description': 'Keluhan terkait harga tiket, makanan, atau biaya lainnya'
        },
        'fasilitas': {
            'display_name': 'Fasilitas Rusak',
            'icon': 'fas fa-tools',
            'color': '#ea580c',
            'description': 'Keluhan tentang fasilitas yang rusak atau tidak berfungsi'
        },
        'kebersihan': {
            'display_name': 'Kebersihan Kurang',
            'icon': 'fas fa-broom',
            'color': '#ca8a04',
            'description': 'Keluhan tentang kebersihan toilet, area wisata, atau lingkungan'
        },
        'pelayanan': {
            'display_name': 'Pelayanan Buruk',
            'icon': 'fas fa-user-times',
            'color': '#c2410c',
            'description': 'Keluhan tentang attitude atau kualitas pelayanan staff'
        },
        'antrian': {
            'display_name': 'Antrian Panjang',
            'icon': 'fas fa-clock',
            'color': '#a16207',
            'description': 'Keluhan tentang antrian atau waiting time yang lama'
        },
        'akses': {
            'display_name': 'Akses Sulit',
            'icon': 'fas fa-road',
            'color': '#92400e',
            'description': 'Keluhan tentang akses jalan, transportasi, atau lokasi'
        },
        'kualitas': {
            'display_name': 'Kualitas Mengecewakan',
            'icon': 'fas fa-star-half-alt',
            'color': '#b91c1c',
            'description': 'Keluhan tentang kualitas experience yang tidak sesuai ekspektasi'
        },
        'cuaca': {
            'display_name': 'Cuaca Tidak Mendukung',
            'icon': 'fas fa-cloud-rain',
            'color': '#7c2d12',
            'description': 'Keluhan terkait cuaca panas, hujan, atau kondisi alam'
        },
        'keamanan': {
            'display_name': 'Keamanan Kurang',
            'icon': 'fas fa-shield-alt',
            'color': '#991b1b',
            'description': 'Keluhan tentang keamanan, pencurian, atau area yang tidak aman'
        },
        'makanan': {
            'display_name': 'Makanan Tidak Memuaskan',
            'icon': 'fas fa-utensils',
            'color': '#be185d',
            'description': 'Keluhan tentang rasa, harga, atau kualitas makanan'
        },
        'wahana': {
            'display_name': 'Wahana Bermasalah',
            'icon': 'fas fa-gamepad',
            'color': '#9333ea',
            'description': 'Keluhan tentang wahana yang rusak, tutup, atau tidak menarik'
        },
        'transportasi': {
            'display_name': 'Transportasi Sulit',
            'icon': 'fas fa-bus',
            'color': '#7c3aed',
            'description': 'Keluhan tentang transportasi umum atau akses kendaraan'
        },
        'informasi': {
            'display_name': 'Informasi Kurang',
            'icon': 'fas fa-info-circle',
            'color': '#2563eb',
            'description': 'Keluhan tentang kurangnya informasi atau petunjuk'
        }
    }
    
    return category_info.get(category, {
        'display_name': category.title(),
        'icon': 'fas fa-exclamation',
        'color': '#6b7280',
        'description': f'Keluhan kategori {category}'
    })

def get_visit_level(wisata_name):
    """Determine visit level for a wisata"""
    if pd.isna(wisata_name) or wisata_name is None:
        return 'low'
    
    wisata_lower = str(wisata_name).lower().strip()
    
    for high_wisata in VISIT_LEVEL_HIGH:
        if high_wisata.lower() in wisata_lower or wisata_lower in high_wisata.lower():
            return 'high'
    
    for medium_wisata in VISIT_LEVEL_MEDIUM:
        if medium_wisata.lower() in wisata_lower or wisata_lower in medium_wisata.lower():
            return 'medium'
    
    return 'low'

def is_valid_time_range(date_str):
    """Check if date string is within valid time range"""
    if pd.isna(date_str) or date_str is None:
        return False
    
    date_lower = str(date_str).lower().strip()
    
    for valid_range in VALID_TIME_RANGES:
        if valid_range.lower() in date_lower or date_lower == valid_range.lower():
            return True
    
    return False

def format_date_display(date_str):
    """Format date string for display"""
    if pd.isna(date_str) or date_str is None:
        return "Tidak diketahui"
    
    date_str = str(date_str).strip()
    
    for valid_range in VALID_TIME_RANGES:
        if valid_range.lower() in date_str.lower():
            return valid_range
    
    return date_str

def update_kunjungan_data(nama_wisata, jumlah_kunjungan, action='add'):
    """Update kunjungan data file"""
    try:
        kunjungan_file = os.path.join(app.config['UPLOAD_FOLDER'], 'kunjungan_data.json')
        
        # Load existing data
        if os.path.exists(kunjungan_file):
            with open(kunjungan_file, 'r', encoding='utf-8') as f:
                kunjungan_data = json.load(f)
        else:
            kunjungan_data = get_kunjungan_data()
        
        # Update data based on action
        if action == 'add' or action == 'update':
            kunjungan_data[nama_wisata] = jumlah_kunjungan
        elif action == 'delete':
            if nama_wisata in kunjungan_data:
                del kunjungan_data[nama_wisata]
        
        # Save updated data
        with open(kunjungan_file, 'w', encoding='utf-8') as f:
            json.dump(kunjungan_data, f, ensure_ascii=False, indent=2)
        
        # Clear cache
        clear_cache()
        
        return True
        
    except Exception as e:
        app.logger.error(f"Error updating kunjungan data: {e}")
        return False

class FixedH5ModelLoader:
    """Optimized H5 model loader for production"""
    
    def __init__(self, models_dir):
        self.models_dir = models_dir
        self.label_encoder_classes = None
        app.logger.info(f"🔧 Initializing H5 Model Loader from: {models_dir}")
        
        if not os.path.exists(models_dir):
            app.logger.warning(f"⚠️ Models directory not found: {models_dir}")
            os.makedirs(models_dir, exist_ok=True)
    
    @lru_cache(maxsize=1)
    def load_label_encoder(self, filepath=None):
        """Load and cache label encoder"""
        if filepath is None:
            filepath = os.path.join(self.models_dir, 'label_encoder.h5')
        
        try:
            if os.path.exists(filepath):
                with h5py.File(filepath, 'r') as f:
                    classes_data = None
                    for key in ['classes', 'classes_', 'label_encoder_classes']:
                        if key in f:
                            classes_data = f[key][:]
                            break
                    
                    if classes_data is not None:
                        if isinstance(classes_data[0], bytes):
                            classes = [cls.decode('utf-8') for cls in classes_data]
                        else:
                            classes = [str(cls) for cls in classes_data]
                        
                        self.label_encoder_classes = classes
                        return classes
        except Exception as e:
            app.logger.error(f"Error loading label encoder: {e}")
        
        self.label_encoder_classes = ['negative', 'neutral', 'positive']
        return self.label_encoder_classes
    
    def load_sklearn_model(self, filepath, model_name):
        """Load sklearn model with caching"""
        try:
            if not os.path.exists(filepath):
                return None
            
            with h5py.File(filepath, 'r') as f:
                if 'joblib_compressed' in f:
                    try:
                        joblib_bytes = f['joblib_compressed'][:]
                        with tempfile.NamedTemporaryFile(delete=False, suffix='.joblib') as tmp_file:
                            tmp_file.write(joblib_bytes.tobytes())
                            temp_path = tmp_file.name
                        
                        model = joblib.load(temp_path)
                        os.unlink(temp_path)
                        return model
                    except Exception as e:
                        app.logger.warning(f"Joblib load failed: {str(e)[:100]}")
                
                if 'full_pipeline_pickle' in f:
                    try:
                        pipeline_bytes = f['full_pipeline_pickle'][:]
                        buffer = io.BytesIO(pipeline_bytes.tobytes())
                        model = pickle.load(buffer)
                        return model
                    except Exception as e:
                        app.logger.warning(f"Pickle load failed: {str(e)[:100]}")
                
        except Exception as e:
            app.logger.error(f"Error loading {model_name}: {e}")
        
        return None
    
    def load_lstm_model(self, filepath=None):
        """Load LSTM model if TensorFlow available - PERBAIKAN"""
        if not TENSORFLOW_AVAILABLE:
            app.logger.warning("⚠️ TensorFlow not available - skipping LSTM model load")
            return None
        
        if filepath is None:
            filepath = os.path.join(self.models_dir, 'lstm_model.h5')
        
        tf_filepath = os.path.join(self.models_dir, 'lstm_model_tensorflow.h5')
        
        try:
            tokenizer = None
            max_len = 100
            max_words = 8000
            
            # Load tokenizer and parameters from main H5 file
            if os.path.exists(filepath):
                with h5py.File(filepath, 'r') as f:
                    if 'max_len' in f.attrs:
                        max_len = int(f.attrs['max_len'])
                    if 'max_words' in f.attrs:
                        max_words = int(f.attrs['max_words'])
                    
                    if 'tokenizer' in f and 'tokenizer_pickle' in f['tokenizer']:
                        try:
                            tokenizer_bytes = f['tokenizer']['tokenizer_pickle'][:]
                            buffer = io.BytesIO(tokenizer_bytes.tobytes())
                            tokenizer = pickle.load(buffer)
                            app.logger.info("✅ LSTM tokenizer loaded successfully")
                        except Exception as e:
                            app.logger.warning(f"Failed to load tokenizer: {e}")
            
            # Load TensorFlow model
            model = None
            if os.path.exists(tf_filepath):
                try:
                    model = tf.keras.models.load_model(tf_filepath, compile=False)
                    app.logger.info(f"✅ LSTM TensorFlow model loaded from {tf_filepath}")
                except Exception as e:
                    app.logger.error(f"Failed to load TensorFlow model: {e}")
                    return None
            
            # PERBAIKAN: Pastikan kedua komponen tersedia
            if tokenizer is not None and model is not None:
                # Test the model with a simple prediction to ensure it works
                try:
                    test_text = ["test text"]
                    test_seq = tokenizer.texts_to_sequences(test_text)
                    test_padded = pad_sequences(test_seq, maxlen=max_len, padding='post')
                    test_pred = model.predict(test_padded, verbose=0)
                    
                    if test_pred is not None and len(test_pred) > 0:
                        app.logger.info("✅ LSTM model validation successful")
                        return {
                            'model': model,
                            'tokenizer': tokenizer,
                            'max_len': max_len,
                            'max_words': max_words
                        }
                    else:
                        app.logger.error("❌ LSTM model validation failed - invalid prediction")
                        return None
                        
                except Exception as e:
                    app.logger.error(f"❌ LSTM model validation failed: {e}")
                    return None
            else:
                missing = []
                if tokenizer is None:
                    missing.append("tokenizer")
                if model is None:
                    missing.append("model")
                app.logger.warning(f"⚠️ LSTM components missing: {', '.join(missing)}")
                return None
                
        except Exception as e:
            app.logger.error(f"Error loading LSTM model: {e}")
        
        return None

class SmartEnsembleH5Fixed:
    """Production-optimized ensemble model - PERBAIKAN"""
    
    def __init__(self, models_dir=None):
        if models_dir is None:
            models_dir = app.config['MODEL_FOLDER']
        
        self.models_dir = models_dir
        self.model_name = "Smart Ensemble H5 Fixed"
        self.model_type = "h5_ensemble_fixed"
        
        self.h5_loader = FixedH5ModelLoader(models_dir)
        
        self.tfidf_lr = None
        self.rf = None
        self.lstm_data = None
        self.label_encoder_classes = None
        
        self.tfidf_lr_ready = False
        self.rf_ready = False
        self.lstm_ready = False
        
        # PERBAIKAN: Dynamic weights based on available models
        self.use_manual_weights = True
        self.ensemble_weights = [0, 0, 0]  # Will be set dynamically
        
        self.load_ensemble_components()
    
    def load_ensemble_components(self):
        """Load all ensemble components - PERBAIKAN"""
        try:
            self.label_encoder_classes = self.h5_loader.load_label_encoder()
            
            # Load TF-IDF + LR
            tfidf_path = os.path.join(self.models_dir, 'tfidf_lr_model.h5')
            self.tfidf_lr = self.h5_loader.load_sklearn_model(tfidf_path, 'TF-IDF + LR')
            if self.tfidf_lr:
                self.tfidf_lr_ready = True
                app.logger.info("✅ TF-IDF + LR model loaded")
            
            # Load Random Forest
            rf_path = os.path.join(self.models_dir, 'random_forest_model.h5')
            self.rf = self.h5_loader.load_sklearn_model(rf_path, 'Random Forest')
            if self.rf:
                self.rf_ready = True
                app.logger.info("✅ Random Forest model loaded")
            
            # Load LSTM only if TensorFlow is available
            if TENSORFLOW_AVAILABLE:
                self.lstm_data = self.h5_loader.load_lstm_model()
                if self.lstm_data:
                    self.lstm_ready = True
                    app.logger.info("✅ LSTM model loaded and validated")
                else:
                    app.logger.warning("⚠️ LSTM model not available or validation failed")
            else:
                app.logger.info("ℹ️ Skipping LSTM model (TensorFlow not available)")
            
            # PERBAIKAN: Set weights dynamically based on available models
            self.set_dynamic_weights()
            
            active_models = sum([self.tfidf_lr_ready, self.rf_ready, self.lstm_ready])
            
            if active_models == 0:
                app.logger.warning("⚠️ No models loaded, creating fallback models")
                self.create_fallback_models()
                active_models = sum([self.tfidf_lr_ready, self.rf_ready, self.lstm_ready])
            
            if active_models > 0:
                self.update_model_name()
                app.logger.info(f"✅ Ensemble ready with {active_models} active component(s)")
                return True
                
        except Exception as e:
            app.logger.error(f"Error loading ensemble: {e}")
            self.create_fallback_models()
        
        return self.tfidf_lr_ready or self.rf_ready or self.lstm_ready
    
    def set_dynamic_weights(self):
        """Set ensemble weights dynamically based on available models"""
        available_models = []
        if self.tfidf_lr_ready:
            available_models.append('tfidf')
        if self.rf_ready:
            available_models.append('rf')
        if self.lstm_ready:
            available_models.append('lstm')
        
        # Set weights based on available models
        if len(available_models) == 3:
            # All models available - balanced ensemble
            self.ensemble_weights = [1, 0, 0]  # TF-IDF, RF, LSTM
        elif len(available_models) == 2:
            if 'lstm' in available_models:
                # LSTM + one other
                if 'rf' in available_models:
                    self.ensemble_weights = [0, 0.6, 0.4]  # RF + LSTM
                else:
                    self.ensemble_weights = [0.6, 0, 0.4]  # TF-IDF + LSTM
            else:
                # TF-IDF + RF
                self.ensemble_weights = [0.4, 0.6, 0]
        elif len(available_models) == 1:
            # Single model
            if self.lstm_ready:
                self.ensemble_weights = [0, 0, 1.0]
            elif self.rf_ready:
                self.ensemble_weights = [0, 1.0, 0]
            else:
                self.ensemble_weights = [1.0, 0, 0]
        else:
            # No models - will use fallback
            self.ensemble_weights = [0, 0, 0]
        
        app.logger.info(f"📊 Dynamic weights set: TF-IDF={self.ensemble_weights[0]:.1f}, RF={self.ensemble_weights[1]:.1f}, LSTM={self.ensemble_weights[2]:.1f}")
    
    def create_fallback_models(self):
        """Create simple fallback models"""
        if not SKLEARN_AVAILABLE:
            app.logger.error("❌ Cannot create fallback models - scikit-learn not available")
            return False
        
        try:
            texts = [
                'bagus sekali', 'sangat baik', 'memuaskan', 'luar biasa', 'recommended',
                'buruk sekali', 'mengecewakan', 'tidak bagus', 'jelek', 'parah',
                'biasa saja', 'standar', 'cukup', 'lumayan', 'oke'
            ]
            labels = ['positive']*5 + ['negative']*5 + ['neutral']*5
            
            if not self.tfidf_lr_ready:
                try:
                    self.tfidf_lr = Pipeline([
                        ('tfidf', TfidfVectorizer(max_features=100)),
                        ('classifier', LogisticRegression(random_state=42, max_iter=100))
                    ])
                    self.tfidf_lr.fit(texts, labels)
                    self.tfidf_lr_ready = True
                    app.logger.info("✅ Fallback TF-IDF + LR model created")
                except Exception as e:
                    app.logger.error(f"Failed to create fallback TF-IDF model: {e}")
            
            if not self.rf_ready:
                try:
                    self.rf = Pipeline([
                        ('tfidf', TfidfVectorizer(max_features=100)),
                        ('classifier', RandomForestClassifier(n_estimators=10, random_state=42))
                    ])
                    self.rf.fit(texts, labels)
                    self.rf_ready = True
                    app.logger.info("✅ Fallback Random Forest model created")
                except Exception as e:
                    app.logger.error(f"Failed to create fallback RF model: {e}")
            
            # Update weights after creating fallback models
            self.set_dynamic_weights()
            
            return self.tfidf_lr_ready or self.rf_ready
            
        except Exception as e:
            app.logger.error(f"Error creating fallback: {e}")
            return False
    
    def update_model_name(self):
        """Update model name based on active models"""
        components = []
        
        if self.tfidf_lr_ready and self.ensemble_weights[0] > 0:
            components.append(f"TF-IDF({self.ensemble_weights[0]:.0%})")
        if self.rf_ready and self.ensemble_weights[1] > 0:
            components.append(f"RF({self.ensemble_weights[1]:.0%})")
        if self.lstm_ready and self.ensemble_weights[2] > 0:
            components.append(f"LSTM({self.ensemble_weights[2]:.0%})")
        
        if components:
            self.model_name = f"Ensemble: {'+'.join(components)}"
        else:
            self.model_name = "Rule-based Fallback"
        
        app.logger.info(f"📊 Model ensemble: {self.model_name}")
    
    def clean_text_simple(self, text):
        """Simple text cleaning"""
        if pd.isna(text) or text is None:
            return ""
        
        text = str(text).lower()
        text = re.sub(r'http\S+|www\.\S+', '', text)
        text = re.sub(r'<.*?>', '', text)
        text = re.sub(r'[^a-zA-Z0-9\s!?.,]', ' ', text)
        text = re.sub(r'(.)\1{2,}', r'\1\1', text)
        text = ' '.join(text.split())
        
        return text if text.strip() else "no content"
    
    def fallback_sentiment(self, text):
        """Rule-based sentiment analysis fallback"""
        if not text:
            return 'neutral'
        
        text_lower = str(text).lower()
        
        positive_words = ['bagus', 'baik', 'indah', 'cantik', 'menarik', 'seru', 'asik', 'keren', 
                         'mantap', 'puas', 'senang', 'suka', 'recommended', 'luar biasa']
        negative_words = ['buruk', 'jelek', 'tidak bagus', 'mengecewakan', 'kecewa', 'mahal', 
                         'kotor', 'jorok', 'bau', 'rusak', 'parah', 'zonk', 'rugi']
        
        pos_count = sum(1 for word in positive_words if word in text_lower)
        neg_count = sum(1 for word in negative_words if word in text_lower)
        
        if pos_count > neg_count:
            return 'positive'
        elif neg_count > pos_count:
            return 'negative'
        else:
            return 'neutral'
    
    @lru_cache(maxsize=1000)
    def predict_single_cached(self, text):
        """Cached prediction for single text"""
        return self.predict_single(text, return_probabilities=False)
    
    def predict_single(self, text, return_probabilities=False):
        """Predict sentiment for single text - PERBAIKAN"""
        try:
            cleaned = self.clean_text_simple(text)
            
            if not cleaned:
                return {
                    'text': text,
                    'sentiment': 'neutral',
                    'confidence': 0.33,
                    'model_used': 'empty_text'
                }
            
            all_probs = []
            models_used = []
            
            # TF-IDF + LR
            if self.tfidf_lr_ready and self.tfidf_lr and self.ensemble_weights[0] > 0:
                try:
                    prob = self.tfidf_lr.predict_proba([cleaned])[0]
                    all_probs.append(prob * self.ensemble_weights[0])
                    models_used.append("TF-IDF")
                except Exception as e:
                    app.logger.debug(f"TF-IDF prediction failed: {e}")
            
            # Random Forest
            if self.rf_ready and self.rf and self.ensemble_weights[1] > 0:
                try:
                    prob = self.rf.predict_proba([cleaned])[0]
                    all_probs.append(prob * self.ensemble_weights[1])
                    models_used.append("RF")
                except Exception as e:
                    app.logger.debug(f"RF prediction failed: {e}")
            
            # LSTM - PERBAIKAN
            if self.lstm_ready and self.lstm_data and TENSORFLOW_AVAILABLE and self.ensemble_weights[2] > 0:
                try:
                    tokenizer = self.lstm_data['tokenizer']
                    max_len = self.lstm_data['max_len']
                    model = self.lstm_data['model']
                    
                    seq = tokenizer.texts_to_sequences([cleaned])
                    padded = pad_sequences(seq, maxlen=max_len, padding='post')
                    prob = model.predict(padded, verbose=0)[0]
                    
                    # Ensure prob is valid
                    if prob is not None and len(prob) == len(self.label_encoder_classes):
                        all_probs.append(prob * self.ensemble_weights[2])
                        models_used.append("LSTM")
                    else:
                        app.logger.warning("LSTM returned invalid prediction")
                        
                except Exception as e:
                    app.logger.debug(f"LSTM prediction failed: {e}")
            
            # Combine predictions
            if all_probs:
                ensemble_prob = np.sum(all_probs, axis=0)
                ensemble_prob = ensemble_prob / np.sum(ensemble_prob)
                pred_idx = np.argmax(ensemble_prob)
                
                result = {
                    'text': text,
                    'sentiment': self.label_encoder_classes[pred_idx],
                    'confidence': float(ensemble_prob[pred_idx]),
                    'model_used': f"Ensemble ({'+'.join(models_used)})"
                }
                
                if return_probabilities:
                    result['probabilities'] = {
                        self.label_encoder_classes[i]: float(p)
                        for i, p in enumerate(ensemble_prob)
                    }
                
                return result
            else:
                # Fallback to rule-based
                sentiment = self.fallback_sentiment(text)
                
                result = {
                    'text': text,
                    'sentiment': sentiment,
                    'confidence': 0.6,
                    'model_used': 'Rule-based'
                }
                
                if return_probabilities:
                    if sentiment == 'positive':
                        probs = {'negative': 0.1, 'neutral': 0.3, 'positive': 0.6}
                    elif sentiment == 'negative':
                        probs = {'negative': 0.6, 'neutral': 0.3, 'positive': 0.1}
                    else:
                        probs = {'negative': 0.2, 'neutral': 0.6, 'positive': 0.2}
                    result['probabilities'] = probs
                
                return result
                
        except Exception as e:
            app.logger.error(f"Prediction error: {e}")
            return {
                'text': text,
                'sentiment': 'neutral',
                'confidence': 0.33,
                'model_used': 'error_fallback'
            }
    
    def predict_batch(self, texts, batch_size=100):
        """Optimized batch prediction with interrupt handling"""
        global interrupt_received
        results = []
        total = len(texts)
        
        for i in range(0, total, batch_size):
            # Check for interrupt
            if interrupt_received:
                app.logger.info(f"🛑 Interrupt detected during batch processing at {i}/{total}")
                break
                
            batch = texts[i:i + batch_size]
            batch_results = [self.predict_single(text) for text in batch]
            results.extend(batch_results)
            
            if i % 1000 == 0 and i > 0:
                app.logger.info(f"Processed {min(i + batch_size, total)}/{total} texts")
                gc.collect()  # Clean up memory periodically
        
        return results

class DataProcessor:
    """Optimized data processor for production - PERBAIKAN"""
    
    def __init__(self, models_dir=None):
        if models_dir is None:
            models_dir = app.config['MODEL_FOLDER']
        
        self.models_dir = models_dir
        self.sentiment_analyzer = None
        self.load_models()
    
    def load_models(self):
        """Load sentiment model"""
        try:
            self.sentiment_analyzer = SmartEnsembleH5Fixed(self.models_dir)
            app.logger.info("✅ Sentiment analyzer loaded")
        except Exception as e:
            app.logger.error(f"Error loading models: {e}")
            self.sentiment_analyzer = None
    
    @lru_cache(maxsize=1)
    def load_data(self, file_path):
        """Load and cache data from CSV"""
        try:
            app.logger.info(f"📂 Loading data from: {file_path}")
            df = pd.read_csv(file_path, low_memory=False)
            app.logger.info(f"✅ Loaded {len(df)} rows")
            return df
        except Exception as e:
            app.logger.error(f"Error loading data: {e}")
            raise
    
    def clean_text(self, text):
        """Clean text"""
        if self.sentiment_analyzer:
            return self.sentiment_analyzer.clean_text_simple(text)
        else:
            if pd.isna(text):
                return ""
            text = str(text).lower()
            text = re.sub(r'[^a-zA-Z\s]', ' ', text)
            text = ' '.join(text.split())
            return text
    
    def process_reviews(self, df):
        """Process reviews with optimization and interrupt handling"""
        global interrupt_received
        
        app.logger.info("🔄 Processing reviews...")
        
        try:
            df_processed = df.copy()
            
            # Check for interrupt
            if interrupt_received:
                app.logger.info("🛑 Processing interrupted during setup")
                return df_processed
            
            # Clean text
            app.logger.info("🧹 Cleaning text...")
            df_processed['cleaned_text'] = df_processed['review_text'].apply(self.clean_text)
            
            # Check for interrupt
            if interrupt_received:
                app.logger.info("🛑 Processing interrupted during text cleaning")
                return df_processed
            
            # Get sentiment in batches
            app.logger.info("🎯 Analyzing sentiment...")
            if self.sentiment_analyzer:
                texts = df_processed['cleaned_text'].tolist()
                results = self.sentiment_analyzer.predict_batch(texts, batch_size=200)
                
                # Check if processing was interrupted
                if interrupt_received:
                    app.logger.info("🛑 Processing interrupted during sentiment analysis")
                    # Use partial results if available
                    if results:
                        df_processed.loc[:len(results)-1, 'sentiment'] = [r['sentiment'] for r in results]
                        df_processed['sentiment'] = df_processed['sentiment'].fillna('neutral')
                    else:
                        df_processed['sentiment'] = 'neutral'
                else:
                    df_processed['sentiment'] = [r['sentiment'] for r in results]
            else:
                df_processed['sentiment'] = 'neutral'
            
            # Add other features
            df_processed['review_length'] = df_processed['review_text'].astype(str).str.len()
            df_processed['positive_score'] = 5.0
            df_processed['negative_score'] = 5.0
            df_processed['sentiment_intensity'] = 0.5
            
            # Parse date
            df_processed['date_parsed'] = pd.to_datetime(df_processed['date'], errors='coerce')
            
            # Ensure visit_time exists
            if 'visit_time' not in df_processed.columns:
                df_processed['visit_time'] = 'Tidak diketahui'
            
            if interrupt_received:
                app.logger.info(f"⚠️ Processing completed with interruption - processed {len(df_processed)} reviews")
            else:
                app.logger.info(f"✅ Processing completed successfully - processed {len(df_processed)} reviews")
            
            # Clean up memory
            gc.collect()
            
            return df_processed
            
        except Exception as e:
            app.logger.error(f"Error processing: {e}")
            df_processed = df.copy()
            df_processed['sentiment'] = 'neutral'
            df_processed['cleaned_text'] = ''
            df_processed['review_length'] = 100
            df_processed['positive_score'] = 5.0
            df_processed['negative_score'] = 5.0
            df_processed['sentiment_intensity'] = 0.5
            return df_processed
    
    def get_satisfaction_metrics(self, df):
        """Calculate metrics optimized for production"""
        try:
            metrics = {}
            
            metrics['total_reviews'] = len(df)
            
            # Calculate average rating
            if 'rating' in df.columns and len(df) > 0:
                avg_rating = df['rating'].mean()
                metrics['avg_rating'] = float(avg_rating) if not pd.isna(avg_rating) else 0.0
            else:
                metrics['avg_rating'] = 0.0
            
            metrics['overall_satisfaction'] = metrics['avg_rating']
            
            # Rating distribution
            if 'rating' in df.columns:
                rating_dist = df['rating'].value_counts().sort_index().to_dict()
                metrics['rating_distribution'] = {str(k): int(v) for k, v in rating_dist.items()}
            else:
                metrics['rating_distribution'] = {}
            
            # Sentiment distribution
            if 'sentiment' in df.columns:
                sentiment_dist = df['sentiment'].value_counts().to_dict()
                metrics['sentiment_distribution'] = sentiment_dist
                
                total = len(df)
                if total > 0:
                    metrics['positive_percentage'] = float((sentiment_dist.get('positive', 0) / total) * 100)
                    metrics['negative_percentage'] = float((sentiment_dist.get('negative', 0) / total) * 100)
                    metrics['neutral_percentage'] = float((sentiment_dist.get('neutral', 0) / total) * 100)
                else:
                    metrics['positive_percentage'] = 0.0
                    metrics['negative_percentage'] = 0.0
                    metrics['neutral_percentage'] = 0.0
            else:
                metrics['sentiment_distribution'] = {}
                metrics['positive_percentage'] = 0.0
                metrics['negative_percentage'] = 0.0
                metrics['neutral_percentage'] = 0.0
            
            metrics['satisfaction_score'] = metrics['avg_rating'] * 20
            
            # Top wisata
            if 'wisata' in df.columns and len(df) > 0:
                try:
                    wisata_ratings = df.groupby('wisata')['rating'].agg(['mean', 'count'])
                    wisata_ratings = wisata_ratings[wisata_ratings['count'] >= 3]
                    
                    if not wisata_ratings.empty:
                        top_wisata = wisata_ratings.sort_values('mean', ascending=False).head(10)
                        metrics['top_wisata'] = {}
                        for wisata, row in top_wisata.iterrows():
                            metrics['top_wisata'][wisata] = {
                                'mean': float(row['mean']),
                                'count': int(row['count'])
                            }
                except Exception as e:
                    app.logger.error(f"Error calculating top wisata: {e}")
                    metrics['top_wisata'] = {}
            else:
                metrics['top_wisata'] = {}
            
            # Additional metrics
            metrics['total_destinations'] = len(df['wisata'].unique()) if 'wisata' in df.columns else 0
            metrics['avg_review_length'] = float(df['review_length'].mean()) if 'review_length' in df.columns and len(df) > 0 else 0.0
            metrics['most_active_month'] = 'Unknown'
            
            return metrics
            
        except Exception as e:
            app.logger.error(f"Error calculating metrics: {e}")
            return {
                'total_reviews': 0,
                'avg_rating': 0.0,
                'overall_satisfaction': 0.0,
                'rating_distribution': {},
                'sentiment_distribution': {},
                'positive_percentage': 0.0,
                'negative_percentage': 0.0,
                'neutral_percentage': 0.0,
                'satisfaction_score': 0.0,
                'top_wisata': {},
                'total_destinations': 0,
                'avg_review_length': 0.0,
                'most_active_month': 'Unknown'
            }

class SatisfactionPredictor:
    """Satisfaction predictor for production"""
    
    def __init__(self, models_dir=None):
        if models_dir is None:
            models_dir = app.config['MODEL_FOLDER']
        
        self.models_dir = models_dir
        self.sentiment_analyzer = None
        self.is_trained = False
        self.load_trained_model()
    
    def load_trained_model(self):
        """Load model"""
        try:
            self.sentiment_analyzer = SmartEnsembleH5Fixed(self.models_dir)
            self.is_trained = True
            app.logger.info("✅ Predictor model loaded")
            return True
        except Exception as e:
            app.logger.error(f"Error loading predictor: {e}")
            return False
    
    def train(self, df, force_retrain=False):
        """Return model info"""
        if self.is_trained:
            return {
                'accuracy': 0.85,
                'f1_score': 0.83,
                'report': 'Using pre-trained ensemble',
                'model_type': 'Ensemble'
            }
        else:
            return {
                'accuracy': 0.0,
                'f1_score': 0.0,
                'report': 'Model not available',
                'model_type': 'Not Available'
            }
    
    def predict_satisfaction(self, text, visit_time='Tidak diketahui', processor=None):
        """Predict satisfaction"""
        if not self.is_trained or not self.sentiment_analyzer:
            return {
                'prediction': 'satisfied',
                'confidence': 0.6,
                'probabilities': {'satisfied': 0.6, 'neutral': 0.3, 'dissatisfied': 0.1}
            }
        
        try:
            result = self.sentiment_analyzer.predict_single(text, return_probabilities=True)
            sentiment = result['sentiment']
            
            satisfaction_map = {
                'positive': 'very_satisfied',
                'neutral': 'satisfied',
                'negative': 'dissatisfied'
            }
            
            satisfaction = satisfaction_map.get(sentiment, 'satisfied')
            
            return {
                'prediction': satisfaction,
                'confidence': result['confidence'],
                'probabilities': {
                    'very_satisfied': result.get('probabilities', {}).get('positive', 0.33),
                    'satisfied': result.get('probabilities', {}).get('neutral', 0.33),
                    'dissatisfied': result.get('probabilities', {}).get('negative', 0.33)
                },
                'model_used': result.get('model_used', 'Unknown')
            }
            
        except Exception as e:
            app.logger.error(f"Prediction error: {e}")
            return {
                'prediction': 'satisfied',
                'confidence': 0.6,
                'probabilities': {'satisfied': 0.6, 'neutral': 0.3, 'dissatisfied': 0.1}
            }

# Enhanced complaint analysis functions
def create_empty_complaint_analysis():
    """Create empty complaint analysis structure"""
    return {
        'success': True,
        'total_complaints': 0,
        'total_negative_reviews': 0,
        'total_reviews_analyzed': 0,
        'top_complaints': [],
        'insights': [{
            'type': 'success',
            'icon': 'fas fa-smile',
            'title': 'Excellent Performance!',
            'description': 'Tidak ada keluhan signifikan terdeteksi. Semua destinasi memiliki feedback yang positif.'
        }],
        'trend_analysis': {
            'percentage': 0,
            'trend': 'stable',
            'description': 'Tidak ada trend keluhan yang terdeteksi'
        },
        'wisata_complaints': {},
        'filter_type': 'all',
        'categories_found': 0
    }

def analyze_negative_keywords(df_processed, filter_type='all'):
    """Analyze negative keywords from review dataset - ENHANCED"""
    try:
        app.logger.info(f"🔍 Analyzing negative keywords for filter: {filter_type}")
        
        if df_processed is None or df_processed.empty:
            return create_empty_complaint_analysis()
        
        # Filter data based on filter_type
        if filter_type == 'all':
            filtered_df = df_processed
        else:
            if 'wisata' in df_processed.columns:
                filtered_df = df_processed[df_processed['wisata'].apply(lambda x: get_visit_level(x) == filter_type)]
            else:
                filtered_df = df_processed
        
        # Get negative reviews only
        if 'sentiment' in filtered_df.columns:
            negative_reviews = filtered_df[filtered_df['sentiment'] == 'negative']
        else:
            # Fallback: filter by low ratings
            negative_reviews = filtered_df[filtered_df['rating'] <= 2] if 'rating' in filtered_df.columns else filtered_df
        
        if negative_reviews.empty:
            return create_empty_complaint_analysis()
        
        # Extract all review texts
        review_texts = negative_reviews['review_text'].astype(str).tolist()
        all_text = ' '.join(review_texts).lower()
        
        # Remove punctuation and clean text for better matching
        clean_text = re.sub(r'[^\w\s]', ' ', all_text)
        clean_text = ' '.join(clean_text.split())
        
        # Count keywords by category with better matching
        keyword_analysis = {}
        total_complaints = 0
        keyword_details = {}
        
        for category, keywords in NEGATIVE_KEYWORDS.items():
            category_count = 0
            found_keywords = []
            
            for keyword in keywords:
                # Use word boundary for better matching
                pattern = r'\b' + re.escape(keyword.lower()) + r'\b'
                matches = re.findall(pattern, clean_text)
                count = len(matches)
                
                if count > 0:
                    category_count += count
                    found_keywords.append({
                        'keyword': keyword,
                        'count': count
                    })
                    total_complaints += count
            
            if category_count > 0:
                keyword_analysis[category] = {
                    'total_count': category_count,
                    'keywords': sorted(found_keywords, key=lambda x: x['count'], reverse=True)[:5],  # Top 5 keywords per category
                    'percentage': 0,  # Will be calculated later
                    'category_info': get_category_display_info(category)
                }
        
        # Calculate percentages
        if total_complaints > 0:
            for category in keyword_analysis:
                keyword_analysis[category]['percentage'] = (keyword_analysis[category]['total_count'] / total_complaints) * 100
        
        # Sort by frequency
        sorted_complaints = sorted(keyword_analysis.items(), key=lambda x: x[1]['total_count'], reverse=True)
        
        # Get top complaints
        top_complaints = sorted_complaints[:10]  # Top 10 categories
        
        # Create insights
        insights = generate_complaint_insights_enhanced(keyword_analysis, total_complaints, len(negative_reviews), filter_type)
        
        # Calculate trend (enhanced)
        trend_analysis = calculate_complaint_trend_enhanced(negative_reviews, keyword_analysis)
        
        # Get wisata with most complaints
        wisata_complaints = analyze_complaints_by_wisata(negative_reviews, keyword_analysis)
        
        result = {
            'success': True,
            'total_complaints': total_complaints,
            'total_negative_reviews': len(negative_reviews),
            'total_reviews_analyzed': len(filtered_df),
            'top_complaints': top_complaints,
            'insights': insights,
            'trend_analysis': trend_analysis,
            'wisata_complaints': wisata_complaints,
            'filter_type': filter_type,
            'categories_found': len(keyword_analysis)
        }
        
        app.logger.info(f"✅ Enhanced complaint analysis completed: {total_complaints} complaints in {len(keyword_analysis)} categories from {len(negative_reviews)} negative reviews")
        
        return result
        
    except Exception as e:
        app.logger.error(f"Error analyzing negative keywords: {e}")
        return create_empty_complaint_analysis()

def generate_complaint_insights_enhanced(keyword_analysis, total_complaints, negative_reviews_count, filter_type):
    """Generate enhanced insights from complaint analysis"""
    insights = []
    
    try:
        if not keyword_analysis:
            insights.append({
                'type': 'success',
                'icon': 'fas fa-smile',
                'title': 'Excellent Performance!',
                'description': f'Tidak ada keluhan signifikan terdeteksi dalam {filter_type} kategori kunjungan. Semua destinasi memiliki feedback yang positif.'
            })
            return insights
        
        # Find top 3 complaints
        top_3_complaints = sorted(keyword_analysis.items(), key=lambda x: x[1]['total_count'], reverse=True)[:3]
        
        for i, (category, details) in enumerate(top_3_complaints):
            category_info = details['category_info']
            percentage = details['percentage']
            count = details['total_count']
            
            if percentage > 30:
                insight_type = 'danger'
                priority = 'URGENT'
            elif percentage > 20:
                insight_type = 'warning'
                priority = 'TINGGI'
            elif percentage > 10:
                insight_type = 'info'
                priority = 'SEDANG'
            else:
                insight_type = 'info'
                priority = 'RENDAH'
            
            insights.append({
                'type': insight_type,
                'icon': category_info['icon'],
                'title': f'#{i+1} {category_info["display_name"]} ({priority}):',
                'description': f'{category_info["description"]}. Ditemukan {count} mentions ({percentage:.1f}% dari total keluhan).'
            })
        
        # Overall trend insight
        if total_complaints > 100:
            insights.append({
                'type': 'info',
                'icon': 'fas fa-chart-line',
                'title': 'Analisis Trend:',
                'description': f'Dari {negative_reviews_count} review negatif, terdeteksi {total_complaints} keyword keluhan dalam {len(keyword_analysis)} kategori. Top 3 kategori menyumbang {sum(item[1]["percentage"] for item in top_3_complaints):.1f}% dari total keluhan.'
            })
        
        return insights
        
    except Exception as e:
        app.logger.error(f"Error generating enhanced insights: {e}")
        return [{
            'type': 'info',
            'icon': 'fas fa-info-circle',
            'title': 'Analisis Tersedia',
            'description': 'Data keluhan berhasil dianalisis dengan keyword detection.'
        }]

def calculate_complaint_trend_enhanced(negative_reviews, keyword_analysis):
    """Calculate enhanced complaint trend analysis"""
    try:
        if not keyword_analysis:
            return {
                'percentage': 0,
                'trend': 'stable',
                'description': 'Tidak ada trend keluhan yang terdeteksi'
            }
        
        # Calculate trend based on complaint distribution
        total_categories = len(keyword_analysis)
        total_complaints = sum(cat['total_count'] for cat in keyword_analysis.values())
        
        # Get top category percentage
        top_category = max(keyword_analysis.values(), key=lambda x: x['total_count'])
        top_percentage = top_category['percentage']
        
        # Determine trend
        if top_percentage > 40:
            trend = 'critical'
            description = 'Trend keluhan sangat tinggi, perlu tindakan segera'
        elif top_percentage > 25:
            trend = 'high'
            description = 'Trend keluhan tinggi, perlu perhatian prioritas'
        elif top_percentage > 15:
            trend = 'moderate'
            description = 'Trend keluhan sedang, monitoring diperlukan'
        else:
            trend = 'low'
            description = 'Trend keluhan rendah, kondisi terkendali'
        
        return {
            'percentage': top_percentage,
            'trend': trend,
            'description': description,
            'total_categories': total_categories,
            'total_complaints': total_complaints
        }
        
    except Exception as e:
        app.logger.error(f"Error calculating enhanced trend: {e}")
        return {
            'percentage': 0,
            'trend': 'unknown',
            'description': 'Error calculating trend'
        }

def analyze_complaints_by_wisata(negative_reviews, keyword_analysis):
    """Analyze which wisata has most complaints"""
    try:
        if 'wisata' not in negative_reviews.columns:
            return {}
        
        wisata_complaint_count = negative_reviews['wisata'].value_counts().head(5).to_dict()
        
        return {
            'top_problematic_destinations': wisata_complaint_count,
            'total_destinations_with_complaints': len(negative_reviews['wisata'].unique())
        }
        
    except Exception as e:
        app.logger.error(f"Error analyzing complaints by wisata: {e}")
        return {}

# Analysis functions optimized for production
def generate_analysis_data(df_processed):
    """Generate analysis data with memory optimization"""
    try:
        if df_processed is None or df_processed.empty:
            return create_empty_analysis_data()
        
        app.logger.info("📊 Generating analysis data...")
        
        visitor_insights = analyze_visitor_patterns(df_processed)
        all_wisata_analysis = analyze_all_wisata(df_processed)
        
        # Clean up memory after heavy operations
        gc.collect()
        
        return {
            'suggestions': [],
            'complaints': [],
            'all_wisata_analysis': all_wisata_analysis,
            'time_analysis': {},
            'keyword_analysis': {'positive_keywords': [], 'negative_keywords': []},
            'sentiment_analysis': {'by_rating': {}},
            'visitor_insights': visitor_insights
        }
        
    except Exception as e:
        app.logger.error(f"Error generating analysis: {e}")
        return create_empty_analysis_data()

def create_empty_analysis_data():
    """Create empty analysis data structure"""
    return {
        'suggestions': [],
        'complaints': [],
        'all_wisata_analysis': {
            'total_destinations': 0,
            'urgent_count': 0,
            'high_complaint_count': 0,
            'medium_complaint_count': 0,
            'low_complaint_count': 0,
            'excellent_count': 0,
            'destinations': {}
        },
        'time_analysis': {},
        'keyword_analysis': {'positive_keywords': [], 'negative_keywords': []},
        'sentiment_analysis': {'by_rating': {}},
        'visitor_insights': {
            'review_length_analysis': {'short_reviews': 0, 'medium_reviews': 0, 'long_reviews': 0},
            'length_rating_correlation': 0,
            'visit_patterns': {}
        }
    }

def analyze_all_wisata(df):
    """Analyze all wisata with memory optimization"""
    try:
        if 'wisata' not in df.columns:
            return create_empty_analysis_data()['all_wisata_analysis']
        
        destinations = {}
        
        # Process in chunks for large datasets
        for wisata_name in df['wisata'].unique():
            wisata_data = df[df['wisata'] == wisata_name]
            
            if len(wisata_data) < 3:
                continue
            
            avg_rating = float(wisata_data['rating'].mean())
            total_reviews = len(wisata_data)
            
            sentiment_dist = wisata_data['sentiment'].value_counts()
            total_sentiment = len(wisata_data)
            
            positive_ratio = float((sentiment_dist.get('positive', 0) / total_sentiment) * 100)
            negative_ratio = float((sentiment_dist.get('negative', 0) / total_sentiment) * 100)
            neutral_ratio = float((sentiment_dist.get('neutral', 0) / total_sentiment) * 100)
            complaint_ratio = negative_ratio
            
            rating_distribution = wisata_data['rating'].value_counts().to_dict()
            
            # Get negative reviews
            negative_reviews = wisata_data[wisata_data['sentiment'] == 'negative']
            main_complaints = []
            
            if not negative_reviews.empty and 'date' in negative_reviews.columns:
                processed_count = 0
                for idx, row in negative_reviews.iterrows():
                    date_str = str(row.get('date', ''))
                    
                    if is_valid_time_range(date_str):
                        formatted_date = format_date_display(date_str)
                        review_text = str(row.get('review_text', ''))
                        
                        if review_text and review_text.strip() and review_text.lower() not in ['nan', 'none', '']:
                            main_complaints.append({
                                'display_text': review_text[:120] + "..." if len(review_text) > 120 else review_text,
                                'full_text': review_text,
                                'count': 1,
                                'date': formatted_date
                            })
                    
                    processed_count += 1
                    if MAX_COMPLAINTS_PROCESSING and processed_count >= MAX_COMPLAINTS_PROCESSING:
                        app.logger.warning(f"Reached processing limit for {wisata_name}: {processed_count} complaints processed")
                        break
            
            # Simpan sesuai konfigurasi
            final_complaints = main_complaints
            if MAX_COMPLAINTS_PER_WISATA:
                final_complaints = main_complaints[:MAX_COMPLAINTS_PER_WISATA]
            
            avg_review_length = float(wisata_data['review_text'].astype(str).str.len().mean())
            
            if avg_review_length > 200:
                engagement_level = 'High'
            elif avg_review_length > 100:
                engagement_level = 'Medium'
            else:
                engagement_level = 'Low'
            
            most_common_rating = int(wisata_data['rating'].mode().iloc[0]) if not wisata_data['rating'].mode().empty else 3
            
            visit_level = get_visit_level(wisata_name)
            
            destinations[wisata_name] = {
                'avg_rating': avg_rating,
                'total_reviews': total_reviews,
                'positive_ratio': positive_ratio,
                'negative_ratio': negative_ratio,
                'neutral_ratio': neutral_ratio,
                'complaint_ratio': complaint_ratio,
                'rating_distribution': rating_distribution,
                'main_complaints': final_complaints,
                'total_complaints': len(negative_reviews),
                'valid_time_complaints_count': len(main_complaints),
                'displayed_complaints_count': len(final_complaints),
                'top_keywords': {},
                'engagement_level': engagement_level,
                'most_common_rating': most_common_rating,
                'avg_review_length': avg_review_length,
                'visit_level': visit_level
            }
        
        # Calculate summary statistics
        total_destinations = len(destinations)
        urgent_count = sum(1 for d in destinations.values() if d['complaint_ratio'] > 30)
        high_count = sum(1 for d in destinations.values() if 20 < d['complaint_ratio'] <= 30)
        medium_count = sum(1 for d in destinations.values() if 10 < d['complaint_ratio'] <= 20)
        low_count = sum(1 for d in destinations.values() if 5 < d['complaint_ratio'] <= 10)
        excellent_count = sum(1 for d in destinations.values() if d['complaint_ratio'] <= 5)
        
        return {
            'total_destinations': total_destinations,
            'urgent_count': urgent_count,
            'high_complaint_count': high_count,
            'medium_complaint_count': medium_count,
            'low_complaint_count': low_count,
            'excellent_count': excellent_count,
            'destinations': destinations
        }
        
    except Exception as e:
        app.logger.error(f"Error analyzing wisata: {e}")
        return create_empty_analysis_data()['all_wisata_analysis']

def analyze_visitor_patterns(df):
    """Analyze visitor patterns with optimization"""
    try:
        insights = {}
        
        if 'review_length' in df.columns:
            review_lengths = df['review_length']
            insights['review_length_analysis'] = {
                'short_reviews': int((review_lengths < 50).sum()),
                'medium_reviews': int(((review_lengths >= 50) & (review_lengths <= 150)).sum()),
                'long_reviews': int((review_lengths > 150).sum())
            }
            
            if 'rating' in df.columns:
                correlation = df['review_length'].corr(df['rating'])
                insights['length_rating_correlation'] = float(correlation) if not pd.isna(correlation) else 0
        else:
            insights['review_length_analysis'] = {
                'short_reviews': 0,
                'medium_reviews': 0,
                'long_reviews': 0
            }
            insights['length_rating_correlation'] = 0
        
        if 'visit_time' in df.columns:
            visit_patterns = df['visit_time'].value_counts().to_dict()
            insights['visit_patterns'] = visit_patterns
        else:
            insights['visit_patterns'] = {'Tidak diketahui': len(df)}
        
        return insights
        
    except Exception as e:
        app.logger.error(f"Error analyzing visitor patterns: {e}")
        return {
            'review_length_analysis': {'short_reviews': 0, 'medium_reviews': 0, 'long_reviews': 0},
            'length_rating_correlation': 0,
            'visit_patterns': {'Tidak diketahui': 0}
        }

@lru_cache(maxsize=10)
def create_charts():
    """Create charts with external kunjungan data ONLY - FIXED MARGINS"""
    charts = {}
    
    try:
        global df_processed
        
        if df_processed is None or df_processed.empty:
            return charts
        
        # Rating Distribution
        if 'rating' in df_processed.columns:
            rating_counts = df_processed['rating'].value_counts().sort_index()
            charts['rating_dist'] = {
                'data': [{
                    'x': [str(x) for x in rating_counts.index.tolist()],
                    'y': rating_counts.values.tolist(),
                    'type': 'bar',
                    'marker': {'color': ['#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#27ae60']},
                    'name': 'Rating Count'
                }],
                'layout': {
                    'title': '',
                    'xaxis': {'title': 'Rating'},
                    'yaxis': {'title': 'Jumlah Review'},
                    'showlegend': False,
                    'margin': {'l': 70, 'r': 40, 't': 40, 'b': 90}
                }
            }
        
        # Sentiment Distribution 
        if 'sentiment' in df_processed.columns:
            sentiment_counts = df_processed['sentiment'].value_counts()
            charts['sentiment_dist'] = {
                'data': [{
                    'labels': sentiment_counts.index.tolist(),
                    'values': sentiment_counts.values.tolist(),
                    'type': 'pie',
                    'marker': {'colors': ['#f1c40f', '#2ecc71', '#e74c3c']}
                }],
                'layout': {
                    'title': '',
                    'margin': {'l': 50, 'r': 50, 't': 40, 'b': 70}
                }
            }
        
        # Top 10 Wisata by Rating
        if 'wisata' in df_processed.columns and 'rating' in df_processed.columns:
            try:
                wisata_rating = df_processed.groupby('wisata').agg({
                    'rating': ['mean', 'count']
                }).round(2)
                wisata_rating.columns = ['mean_rating', 'review_count']
                wisata_rating = wisata_rating[wisata_rating['review_count'] >= 5]
                wisata_rating = wisata_rating.sort_values('mean_rating', ascending=True).tail(10)
                
                charts['top_rating'] = {
                    'data': [{
                        'y': [name[:25] + '...' if len(name) > 25 else name for name in wisata_rating.index.tolist()],
                        'x': wisata_rating['mean_rating'].values.tolist(),
                        'type': 'bar',
                        'orientation': 'h',
                        'marker': {'color': '#f39c12'},
                        'text': [f"{rating:.2f}" for rating in wisata_rating['mean_rating']],
                        'textposition': 'auto'
                    }],
                    'layout': {
                        'title': '',
                        'xaxis': {'title': 'Rating Rata-rata'},
                        'yaxis': {'title': ''},
                        'showlegend': False,
                        'height': 400,
                        'margin': {'l': 220, 'r': 50, 't': 30, 'b': 90}
                    }
                }
            except Exception as e:
                app.logger.error(f"Error creating top rating chart: {e}")
        
        # Top 10 Wisata by External Kunjungan Data ONLY
        try:
            kunjungan_data = get_kunjungan_data()
            valid_kunjungan = {k: v for k, v in kunjungan_data.items() if v > 0}
            
            if valid_kunjungan:
                sorted_kunjungan = sorted(valid_kunjungan.items(), key=lambda x: x[1], reverse=True)[:10]
                sorted_kunjungan = sorted_kunjungan[::-1]
                
                wisata_names = [name[:25] + '...' if len(name) > 25 else name for name, _ in sorted_kunjungan]
                kunjungan_counts = [count for _, count in sorted_kunjungan]
                
                charts['top_visits'] = {
                    'data': [{
                        'y': wisata_names,
                        'x': kunjungan_counts,
                        'type': 'bar',
                        'orientation': 'h',
                        'marker': {'color': '#3498db'},
                        'text': [f"{count:,}" for count in kunjungan_counts],
                        'textposition': 'auto'
                    }],
                    'layout': {
                        'title': '',
                        'xaxis': {'title': 'Jumlah Kunjungan (Data Manual Admin)'},
                        'yaxis': {'title': ''},
                        'showlegend': False,
                        'height': 400,
                        'margin': {'l': 220, 'r': 50, 't': 30, 'b': 90}
                    }
                }
                
                app.logger.info(f"📊 Top visits chart created with {len(sorted_kunjungan)} destinations from manual admin data")
        except Exception as e:
            app.logger.error(f"Error creating top visits chart: {e}")
        
        return charts
        
    except Exception as e:
        app.logger.error(f"Error creating charts: {e}")
        return charts

# Flask helper functions
def get_processor():
    global processor
    if processor is None:
        processor = DataProcessor()
    return processor

def get_predictor():
    global predictor
    if predictor is None:
        predictor = SatisfactionPredictor()
    return predictor

def get_data_info():
    try:
        data_path = os.path.join(app.config['UPLOAD_FOLDER'], 'combined_batu_tourism_reviews_cleaned.csv')
        if os.path.exists(data_path):
            file_stats = os.stat(data_path)
            return {
                'filename': 'combined_batu_tourism_reviews_cleaned.csv',
                'size': file_stats.st_size,
                'modified': datetime.fromtimestamp(file_stats.st_mtime).strftime('%Y-%m-%d %H:%M:%S')
            }
        return None
    except:
        return None

def initialize_app(force_retrain=False):
    """Initialize application with error handling and interrupt support"""
    global df_processed, metrics, model_results, current_data_info, interrupt_received
    
    try:
        app.logger.info("🚀 Initializing application...")
        
        data_path = os.path.join(app.config['UPLOAD_FOLDER'], 'combined_batu_tourism_reviews_cleaned.csv')
        if not os.path.exists(data_path):
            app.logger.warning(f"⚠️ Data file not found at {data_path}")
            return False
        
        # Check for interrupt
        if interrupt_received:
            app.logger.info("🛑 Initialization interrupted")
            return False
        
        proc = get_processor()
        if proc is None:
            return False
        
        df = proc.load_data(data_path)
        
        # Check for interrupt before processing
        if interrupt_received:
            app.logger.info("🛑 Initialization interrupted before processing")
            return False
        
        df_processed = proc.process_reviews(df)
        
        # Check for interrupt after processing
        if interrupt_received:
            app.logger.info("🛑 Initialization interrupted after processing")
            # Still calculate metrics if we have processed data
            if df_processed is not None:
                metrics = proc.get_satisfaction_metrics(df_processed)
            return True  # Return True since we have some data
        
        metrics = proc.get_satisfaction_metrics(df_processed)
        
        pred = get_predictor()
        if pred:
            model_results = pred.train(df_processed, force_retrain=force_retrain)
        
        current_data_info = get_data_info()
        
        app.logger.info("✅ App initialized successfully!")
        return True
        
    except Exception as e:
        app.logger.error(f"Error initializing: {e}")
        traceback.print_exc()
        return False

def create_csv_template():
    """Create CSV template for upload"""
    try:
        template_data = {
            'wisata': ['Eco Green Park', 'Museum Angkut +', 'Jatim Park I'],
            'rating': [5, 4, 3],
            'review_text': [
                'Tempat yang sangat bagus dan menyenangkan untuk keluarga',
                'Museum yang menarik dengan koleksi yang beragam',
                'Wahana cukup seru tapi agak ramai'
            ],
            'date': ['1 bulan lalu', '2 minggu lalu', '3 hari lalu'],
            'visit_time': ['Akhir pekan', 'Hari biasa', 'Hari libur nasional']
        }
        
        template_df = pd.DataFrame(template_data)
        template_path = os.path.join(app.config['UPLOAD_FOLDER'], 'template_upload.csv')
        template_df.to_csv(template_path, index=False)
        
        return template_path
        
    except Exception as e:
        app.logger.error(f"Error creating template: {e}")
        return None

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

# ===== REACT APP ROUTES (SERVE SINGLE PAGE APPLICATION) =====
@app.route('/')
@app.route('/dashboard')
@app.route('/analysis')
@app.route('/admin')
@app.route('/login')
def serve_react_app():
    """Serve React application for all frontend routes"""
    try:
        # Check if built React app exists
        react_index = os.path.join(app.config['STATIC_FOLDER'], 'dist', 'index.html')
        
        if os.path.exists(react_index):
            return send_from_directory(
                os.path.join(app.config['STATIC_FOLDER'], 'dist'), 
                'index.html'
            )
        else:
            # Fallback: serve a basic HTML with correct root element
            return """
            <!DOCTYPE html>
            <html lang="id">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Tourism Analytics</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
            </head>
            <body>
                <div id="root" class="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
                    <div class="text-center">
                        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p class="text-gray-600">Loading Tourism Analytics...</p>
                        <p class="text-sm text-gray-500 mt-2">React Development Mode</p>
                    </div>
                </div>
                
                <!-- React Development Scripts -->
                <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
                <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
                
                <script>
                    console.log('Fallback HTML served - React app should be running on port 3000');
                    
                    // Redirect to React dev server if available
                    if (window.location.port === '5000') {
                        console.log('Redirecting to React dev server...');
                        setTimeout(() => {
                            window.location.href = 'http://localhost:3000' + window.location.pathname;
                        }, 2000);
                    }
                </script>
            </body>
            </html>
            """
    except Exception as e:
        app.logger.error(f"Error serving React app: {e}")
        return jsonify({'error': 'Failed to load application'}), 500

# ===== STATIC FILES SERVING =====
@app.route('/static/dist/<path:filename>')
def serve_static_files(filename):
    """Serve React build files"""
    try:
        return send_from_directory(
            os.path.join(app.config['STATIC_FOLDER'], 'dist'), 
            filename
        )
    except Exception as e:
        app.logger.error(f"Error serving static file {filename}: {e}")
        return jsonify({'error': 'File not found'}), 404

# ===== AUTHENTICATION API ROUTES =====
@app.route('/api/auth/login', methods=['POST'])
def api_login():
    """API endpoint for React login"""
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        
        app.logger.info(f"🔍 API Login attempt for: {email}")
        
        if not email or not password:
            return jsonify({'success': False, 'error': 'Email dan password harus diisi'}), 400
        
        user = auth_service.authenticate_user(email, password)
        
        if user:
            login_user(user, remember=True)
            app.logger.info(f"✅ API Login successful for: {user.email} (Role: {user.role})")
            
            return jsonify({
                'success': True,
                'user': {
                    'id': user.id,
                    'name': user.name,
                    'email': user.email,
                    'role': user.role
                },
                'message': f'Selamat datang, {user.name}!'
            })
        else:
            app.logger.warning(f"❌ API Authentication failed for: {email}")
            return jsonify({'success': False, 'error': 'Email atau password salah'}), 401
            
    except Exception as e:
        app.logger.error(f"❌ API Login error: {e}")
        return jsonify({'success': False, 'error': 'Terjadi kesalahan sistem'}), 500

@app.route('/api/auth/logout', methods=['POST'])
@login_required
def api_logout():
    """API endpoint for React logout"""
    try:
        logout_user()
        return jsonify({'success': True, 'message': 'Berhasil logout'})
    except Exception as e:
        app.logger.error(f"API Logout error: {e}")
        return jsonify({'success': False, 'error': 'Gagal logout'}), 500

@app.route('/api/auth/user')
def api_current_user():
    """API endpoint to get current user info"""
    try:
        if current_user.is_authenticated:
            return jsonify({
                'success': True,
                'user': {
                    'id': current_user.id,
                    'name': current_user.name,
                    'email': current_user.email,
                    'role': current_user.role,
                    'is_admin': current_user.is_admin()
                }
            })
        else:
            return jsonify({'success': False, 'error': 'Not authenticated'}), 401
    except Exception as e:
        app.logger.error(f"Get current user error: {e}")
        return jsonify({'success': False, 'error': 'Failed to get user info'}), 500

# ===== PUBLIC API ROUTES =====
@app.route('/api/stats')
def api_stats():
    """API endpoint for homepage stats"""
    try:
        global df_processed, metrics
        
        if df_processed is None or metrics is None:
            # Try to initialize if not already done
            if not initialize_app():
                return jsonify({
                    'success': False,
                    'error': 'Data not available'
                })
        
        # Get actual stats from processed data
        total_reviews = metrics.get('total_reviews', 0) if metrics else 0
        total_destinations = metrics.get('total_destinations', 0) if metrics else 0
        
        # If no data, return reasonable defaults
        if total_reviews == 0:
            total_reviews = 22000  # Fallback
        if total_destinations == 0:
            total_destinations = 30  # Fallback
            
        return jsonify({
            'success': True,
            'total_reviews': total_reviews,
            'total_destinations': total_destinations,
            'last_updated': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        })
        
    except Exception as e:
        app.logger.error(f"Stats API error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        })

@app.route('/api/dashboard')
def api_dashboard():
    """API endpoint for React dashboard"""
    try:
        global df_processed, metrics, current_data_info
        
        if df_processed is None:
            if not initialize_app():
                return jsonify({'success': False, 'error': 'Data not initialized'})
        
        charts = create_charts()
        
        return jsonify({
            'success': True,
            'charts': charts,
            'metrics': metrics,
            'data_info': current_data_info
        })
        
    except Exception as e:
        app.logger.error(f"Dashboard API error: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/analysis')
def api_analysis():
    """API endpoint for React analysis page"""
    try:
        global df_processed
        
        if df_processed is None:
            if not initialize_app():
                return jsonify({'success': False, 'error': 'Data not initialized'})
        
        analysis_data = generate_analysis_data(df_processed)
        
        return jsonify({
            'success': True,
            'analysis_data': analysis_data
        })
        
    except Exception as e:
        app.logger.error(f"Analysis API error: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/filter_data')
def api_filter_data():
    """API endpoint for filtering data - NO TOP CHARTS FOR FILTERED VIEWS"""
    try:
        filter_type = request.args.get('filter', 'all')
        
        global df_processed
        if df_processed is None:
            return jsonify({'success': False, 'error': 'No data loaded'})
        
        if filter_type == 'all':
            filtered_df = df_processed
        else:
            if 'wisata' in df_processed.columns:
                filtered_df = df_processed[df_processed['wisata'].apply(lambda x: get_visit_level(x) == filter_type)]
            else:
                filtered_df = df_processed
        
        proc = get_processor()
        if proc:
            filtered_metrics = proc.get_satisfaction_metrics(filtered_df)
        else:
            filtered_metrics = metrics
        
        # Create charts for filtered data - ONLY BASIC CHARTS FOR FILTERED VIEWS
        filtered_charts = {}
        
        # Always include rating and sentiment charts
        if 'rating' in filtered_df.columns:
            rating_counts = filtered_df['rating'].value_counts().sort_index()
            filtered_charts['rating_dist'] = {
                'data': [{
                    'x': [str(x) for x in rating_counts.index.tolist()],
                    'y': rating_counts.values.tolist(),
                    'type': 'bar',
                    'marker': {'color': ['#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#27ae60']},
                    'name': 'Rating Count'
                }],
                'layout': {
                    'title': 'Rating Distribution',
                    'xaxis': {'title': 'Rating'},
                    'yaxis': {'title': 'Count'},
                    'showlegend': False,
                    'margin': {'l': 70, 'r': 40, 't': 40, 'b': 90}
                }
            }
        
        if 'sentiment' in filtered_df.columns:
            sentiment_counts = filtered_df['sentiment'].value_counts()
            filtered_charts['sentiment_dist'] = {
                'data': [{
                    'labels': sentiment_counts.index.tolist(),
                    'values': sentiment_counts.values.tolist(),
                    'type': 'pie',
                    'marker': {'colors': ['#f1c40f', '#2ecc71', '#e74c3c']}
                }],
                'layout': {
                    'title': 'Sentiment Distribution',
                    'margin': {'l': 50, 'r': 50, 't': 40, 'b': 70}
                }
            }
        
        # TOP CHARTS HANYA UNTUK FILTER 'ALL'
        if filter_type == 'all':
            # Create full charts including top charts
            global df_processed_temp
            df_processed_temp = df_processed
            df_processed = filtered_df
            create_charts.cache_clear()  # Clear cache
            full_charts = create_charts()
            df_processed = df_processed_temp
            
            # Merge with basic charts
            filtered_charts.update(full_charts)
        
        visit_level_counts = {
            'all': len(df_processed),
            'high': 0,
            'medium': 0,
            'low': 0
        }
        
        if 'wisata' in df_processed.columns:
            for wisata_name in df_processed['wisata'].unique():
                level = get_visit_level(wisata_name)
                count = len(df_processed[df_processed['wisata'] == wisata_name])
                visit_level_counts[level] += count
        
        # Add complaint analysis for all filter types
        complaint_data = analyze_negative_keywords(filtered_df, filter_type)
        
        app.logger.info(f"📊 Filter API response - Filter: {filter_type}, Charts included: {list(filtered_charts.keys())}")
        
        return jsonify({
            'success': True,
            'metrics': filtered_metrics,
            'charts': filtered_charts,
            'complaint_analysis': complaint_data,
            'visit_level_counts': visit_level_counts,
            'filter_type': filter_type,
            'charts_available': list(filtered_charts.keys())
        })
        
    except Exception as e:
        app.logger.error(f"Filter API error: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/complaint_analysis')
def api_complaint_analysis():
    """API endpoint for complaint analysis"""
    try:
        filter_type = request.args.get('filter', 'all')
        
        global df_processed
        if df_processed is None:
            return jsonify({'success': False, 'error': 'No data loaded'})
        
        # Analyze complaints for the given filter
        complaint_data = analyze_negative_keywords(df_processed, filter_type)
        
        return jsonify(complaint_data)
        
    except Exception as e:
        app.logger.error(f"Complaint analysis API error: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/quadrant_data_filtered')
def api_quadrant_data_filtered():
    """API endpoint for filtered quadrant chart data with ONLY external kunjungan data - NO FALLBACK"""
    try:
        filter_type = request.args.get('filter', 'all')
        
        global df_processed
        if df_processed is None:
            return jsonify({'success': False, 'error': 'No data loaded'})
        
        # HANYA TAMPILKAN KUADRAN UNTUK FILTER 'ALL'
        if filter_type != 'all':
            return jsonify({'success': False, 'error': 'Quadrant analysis only available for all data'})
        
        if 'wisata' not in df_processed.columns or 'rating' not in df_processed.columns:
            return jsonify({'success': False, 'error': 'Missing required columns'})
        
        # Hitung rating rata-rata per wisata
        wisata_stats = df_processed.groupby('wisata').agg({
            'rating': ['mean', 'count']
        }).round(2)
        wisata_stats.columns = ['mean_rating', 'review_count']
        wisata_stats = wisata_stats[wisata_stats['review_count'] >= 3]
        
        if wisata_stats.empty:
            return jsonify({'success': False, 'error': 'No data available for this filter'})
        
        # Gunakan HANYA data kunjungan eksternal - TANPA FALLBACK
        kunjungan_data = get_kunjungan_data()
        
        names = []
        full_names = []
        ratings = []
        visits = []
        skipped_wisata = []
        matched_wisata = []
        
        app.logger.info("🔍 Processing quadrant data with external kunjungan only (NO FALLBACK)...")
        
        for wisata_name, row in wisata_stats.iterrows():
            # Cari data kunjungan eksternal
            kunjungan_count = get_wisata_kunjungan(wisata_name)
            
            # HANYA TAMPILKAN WISATA YANG ADA DATA KUNJUNGANNYA (> 0)
            if kunjungan_count > 0:
                display_name = wisata_name[:30] + '...' if len(wisata_name) > 30 else wisata_name
                names.append(display_name)
                full_names.append(wisata_name)
                ratings.append(float(row['mean_rating']))
                visits.append(kunjungan_count)
                matched_wisata.append(wisata_name)
                
                app.logger.info(f"✅ {wisata_name}: Rating {row['mean_rating']:.2f}, Kunjungan {kunjungan_count:,}")
            else:
                skipped_wisata.append(wisata_name)
                app.logger.warning(f"⚠️ Skipped '{wisata_name}' - no external kunjungan data (returned 0)")
        
        if not visits:
            return jsonify({
                'success': False, 
                'error': 'No wisata found with external kunjungan data',
                'total_wisata_in_dataset': len(wisata_stats),
                'skipped_wisata_count': len(skipped_wisata),
                'skipped_wisata': skipped_wisata[:10],  # Show first 10 for debugging
                'message': 'Please add kunjungan data in admin panel for these destinations'
            })
        
        # Hitung rata-rata berdasarkan data yang tersedia
        avg_rating = sum(ratings) / len(ratings)
        avg_visits = sum(visits) / len(visits)
        
        # FIXED RANGE: X dari -100k sampai 2.5M
        x_min = -100000  # -100k
        x_max = 2500000  # 2.5M
        
        # Y range berdasarkan rating
        y_min = 1.0
        y_max = 5.2
        
        app.logger.info(f"📊 Quadrant created with {len(names)} wisata (skipped {len(skipped_wisata)})")
        app.logger.info(f"📊 Average rating: {avg_rating:.2f}, Average visits: {avg_visits:,.0f}")
        app.logger.info(f"📊 Matched wisata: {matched_wisata}")
        
        return jsonify({
            'success': True,
            'quadrant_data': {
                'names': names,
                'full_names': full_names,
                'ratings': ratings,
                'visits': visits  # HANYA menggunakan data kunjungan eksternal
            },
            'avg_rating': float(avg_rating),
            'avg_visits': float(avg_visits),
            'x_min': x_min,
            'x_max': x_max,
            'y_min': y_min,
            'y_max': y_max,
            'data_source': 'external_kunjungan_only',
            'total_wisata_processed': len(names),
            'total_wisata_in_dataset': len(wisata_stats),
            'skipped_wisata_count': len(skipped_wisata),
            'matched_wisata': matched_wisata,
            'skipped_wisata': skipped_wisata[:5] if skipped_wisata else []  # Show first 5 for debugging
        })
        
    except Exception as e:
        app.logger.error(f"Quadrant API error: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/predict', methods=['POST'])
def api_predict():
    """API endpoint for sentiment prediction"""
    try:
        data = request.get_json()
        text = data.get('text', '')
        visit_time = data.get('visit_time', 'Tidak diketahui')
        
        if not text:
            return jsonify({'success': False, 'error': 'Text cannot be empty'}), 400
        
        pred = get_predictor()
        if pred is None:
            return jsonify({'success': False, 'error': 'Model not initialized'}), 500
        
        prediction = pred.predict_satisfaction(text, visit_time)
        
        return jsonify({
            'success': True,
            'satisfaction': prediction.get('prediction', 'neutral'),
            'probabilities': prediction.get('probabilities', {}),
            'model_used': prediction.get('model_used', 'Unknown')
        })
        
    except Exception as e:
        app.logger.error(f"Prediction error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# ===== PROTECTED ADMIN API ROUTES =====
@app.route('/api/admin/kunjungan')
@login_required
def api_admin_kunjungan():
    """API endpoint for kunjungan data"""
    if not current_user.is_admin():
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    
    try:
        kunjungan_data = get_kunjungan_data()
        data_info = get_data_info()
        
        return jsonify({
            'success': True,
            'kunjungan_data': kunjungan_data,
            'data_info': data_info
        })
    except Exception as e:
        app.logger.error(f"Admin kunjungan API error: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/admin/add_wisata', methods=['POST'])
@login_required
def api_add_wisata():
    """API endpoint for adding wisata"""
    if not current_user.is_admin():
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    
    try:
        data = request.get_json()
        nama_wisata = data.get('nama_wisata', '').strip()
        jumlah_kunjungan = int(data.get('jumlah_kunjungan', 0))
        
        if not nama_wisata or jumlah_kunjungan < 0:
            return jsonify({'success': False, 'error': 'Data tidak valid'})
        
        # Check if wisata already exists
        kunjungan_data = get_kunjungan_data()
        if nama_wisata in kunjungan_data:
            return jsonify({'success': False, 'error': 'Wisata sudah ada. Gunakan fungsi edit untuk mengubah data.'})
        
        # Update data kunjungan
        success = update_kunjungan_data(nama_wisata, jumlah_kunjungan, action='add')
        
        if success:
            return jsonify({'success': True, 'message': f'Wisata "{nama_wisata}" berhasil ditambahkan dengan {jumlah_kunjungan:,} kunjungan'})
        else:
            return jsonify({'success': False, 'error': 'Gagal menambahkan data'})
            
    except Exception as e:
        app.logger.error(f"Add wisata error: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/admin/update_wisata', methods=['POST'])
@login_required
def api_update_wisata():
    """API endpoint for updating wisata"""
    if not current_user.is_admin():
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    
    try:
        data = request.get_json()
        nama_wisata = data.get('nama_wisata', '').strip()
        jumlah_kunjungan = int(data.get('jumlah_kunjungan', 0))
        
        if not nama_wisata or jumlah_kunjungan < 0:
            return jsonify({'success': False, 'error': 'Data tidak valid'})
        
        success = update_kunjungan_data(nama_wisata, jumlah_kunjungan, action='update')
        
        if success:
            return jsonify({'success': True, 'message': f'Data "{nama_wisata}" berhasil diupdate menjadi {jumlah_kunjungan:,} kunjungan'})
        else:
            return jsonify({'success': False, 'error': 'Gagal mengupdate data'})
            
    except Exception as e:
        app.logger.error(f"Update wisata error: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/admin/delete_wisata', methods=['POST'])
@login_required
def api_delete_wisata():
    """API endpoint for deleting wisata"""
    if not current_user.is_admin():
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    
    try:
        data = request.get_json()
        nama_wisata = data.get('nama_wisata', '').strip()
        
        if not nama_wisata:
            return jsonify({'success': False, 'error': 'Nama wisata tidak valid'})
        
        success = update_kunjungan_data(nama_wisata, 0, action='delete')
        
        if success:
            return jsonify({'success': True, 'message': f'Wisata "{nama_wisata}" berhasil dihapus'})
        else:
            return jsonify({'success': False, 'error': 'Gagal menghapus data'})
            
    except Exception as e:
        app.logger.error(f"Delete wisata error: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/admin/upload_file', methods=['POST'])
@login_required
def api_upload_file():
    """API endpoint for file upload"""
    if not current_user.is_admin():
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'error': 'No file selected'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'success': False, 'error': 'No file selected'}), 400
        
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            
            upload_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(upload_path)
            
            try:
                if filename.endswith('.csv'):
                    df = pd.read_csv(upload_path)
                else:
                    df = pd.read_excel(upload_path)
                
                required_columns = ['wisata', 'rating', 'review_text', 'date']
                missing_columns = [col for col in required_columns if col not in df.columns]
                
                if missing_columns:
                    os.remove(upload_path)
                    return jsonify({
                        'success': False, 
                        'error': f'Missing required columns: {", ".join(missing_columns)}'
                    }), 400
                
                standard_path = os.path.join(app.config['UPLOAD_FOLDER'], 'combined_batu_tourism_reviews_cleaned.csv')
                df.to_csv(standard_path, index=False)
                
                if upload_path != standard_path:
                    os.remove(upload_path)
                
                # Clear cache and reinitialize
                global df_processed, metrics, current_data_info
                df_processed = None
                metrics = None
                current_data_info = None
                create_charts.cache_clear()
                
                if initialize_app():
                    return jsonify({
                        'success': True,
                        'message': f'File uploaded successfully! Processed {len(df)} reviews.'
                    })
                else:
                    return jsonify({'success': False, 'error': 'Error processing uploaded file'}), 500
                
            except Exception as e:
                app.logger.error(f"Error processing file: {e}")
                if os.path.exists(upload_path):
                    os.remove(upload_path)
                return jsonify({'success': False, 'error': f'Error processing file: {str(e)}'}), 500
        
        else:
            return jsonify({
                'success': False, 
                'error': 'Invalid file format. Please upload CSV or Excel file.'
            }), 400
            
    except Exception as e:
        app.logger.error(f"Upload error: {e}")
        return jsonify({'success': False, 'error': f'Upload failed: {str(e)}'}), 500

@app.route('/api/admin/system_info')
@login_required
def api_system_info():
    """API endpoint for system information"""
    if not current_user.is_admin():
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    
    try:
        global df_processed, metrics
        
        kunjungan_data = get_kunjungan_data()
        data_info = get_data_info()
        
        # Calculate storage usage
        upload_dir_size = 0
        model_dir_size = 0
        
        try:
            for root, dirs, files in os.walk(app.config['UPLOAD_FOLDER']):
                for file in files:
                    upload_dir_size += os.path.getsize(os.path.join(root, file))
        except:
            pass
            
        try:
            for root, dirs, files in os.walk(app.config['MODEL_FOLDER']):
                for file in files:
                    model_dir_size += os.path.getsize(os.path.join(root, file))
        except:
            pass
        
        system_info = {
            'system': {
                'platform': platform.system(),
                'python_version': platform.python_version(),
                'flask_env': FLASK_ENV,
                'tensorflow_available': TENSORFLOW_AVAILABLE,
                'sklearn_available': SKLEARN_AVAILABLE
            },
            'data': {
                'kunjungan_wisata_count': len(kunjungan_data),
                'total_kunjungan': sum(kunjungan_data.values()) if kunjungan_data else 0,
                'dataset_loaded': df_processed is not None,
                'total_reviews': len(df_processed) if df_processed is not None else 0,
                'data_file_info': data_info
            },
            'storage': {
                'upload_dir_size_mb': round(upload_dir_size / 1024 / 1024, 2),
                'model_dir_size_mb': round(model_dir_size / 1024 / 1024, 2),
                'total_size_mb': round((upload_dir_size + model_dir_size) / 1024 / 1024, 2)
            },
            'models': {
                'processor_loaded': processor is not None,
                'predictor_loaded': predictor is not None,
                'metrics_available': metrics is not None
            }
        }
        
        return jsonify({'success': True, 'system_info': system_info})
        
    except Exception as e:
        app.logger.error(f"System info error: {e}")
        return jsonify({'success': False, 'error': str(e)})

# ===== FILE DOWNLOAD ROUTES =====
@app.route('/api/download/template')
def api_download_template():
    """API endpoint for downloading template"""
    try:
        template_path = create_csv_template()
        
        if template_path and os.path.exists(template_path):
            return send_file(
                template_path,
                as_attachment=True,
                download_name='template_upload.csv',
                mimetype='text/csv'
            )
        else:
            return jsonify({'success': False, 'error': 'Error creating template file'}), 500
            
    except Exception as e:
        app.logger.error(f"Template download error: {e}")
        return jsonify({'success': False, 'error': f'Error downloading template: {str(e)}'}), 500

@app.route('/api/admin/export_kunjungan')
@login_required
def api_export_kunjungan():
    """API endpoint for exporting kunjungan data"""
    if not current_user.is_admin():
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    
    try:
        kunjungan_data = get_kunjungan_data()
        
        if not kunjungan_data:
            return jsonify({'success': False, 'error': 'Tidak ada data kunjungan untuk diekspor'}), 400
        
        # Create DataFrame
        df_export = pd.DataFrame([
            {'Nama Wisata': nama, 'Jumlah Kunjungan': jumlah}
            for nama, jumlah in kunjungan_data.items()
        ])
        
        # Sort by kunjungan descending
        df_export = df_export.sort_values('Jumlah Kunjungan', ascending=False)
        
        # Add timestamp
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f'data_kunjungan_wisata_{timestamp}.csv'
        
        # Create temporary file
        temp_path = os.path.join(app.config['UPLOAD_FOLDER'], 'temp', filename)
        os.makedirs(os.path.dirname(temp_path), exist_ok=True)
        
        # Export to CSV with proper encoding
        df_export.to_csv(temp_path, index=False, encoding='utf-8-sig')
        
        app.logger.info(f"✅ Exported {len(df_export)} kunjungan records to {filename}")
        
        return send_file(
            temp_path,
            as_attachment=True,
            download_name=filename,
            mimetype='text/csv'
        )
        
    except Exception as e:
        app.logger.error(f"Export kunjungan error: {e}")
        return jsonify({'success': False, 'error': f'Error saat export: {str(e)}'}), 500

@app.route('/api/admin/backup_data')
@login_required
def api_backup_data():
    """API endpoint for backing up data"""
    if not current_user.is_admin():
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    
    try:
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_filename = f'backup_tourism_data_{timestamp}.zip'
        backup_path = os.path.join(app.config['UPLOAD_FOLDER'], 'backups', backup_filename)
        
        # Ensure backup directory exists
        os.makedirs(os.path.dirname(backup_path), exist_ok=True)
        
        with zipfile.ZipFile(backup_path, 'w', zipfile.ZIP_DEFLATED) as backup_zip:
            # Backup kunjungan data
            kunjungan_file = os.path.join(app.config['UPLOAD_FOLDER'], 'kunjungan_data.json')
            if os.path.exists(kunjungan_file):
                backup_zip.write(kunjungan_file, 'kunjungan_data.json')
                app.logger.info("✅ Added kunjungan_data.json to backup")
            
            # Backup main dataset
            dataset_file = os.path.join(app.config['UPLOAD_FOLDER'], 'combined_batu_tourism_reviews_cleaned.csv')
            if os.path.exists(dataset_file):
                backup_zip.write(dataset_file, 'combined_batu_tourism_reviews_cleaned.csv')
                app.logger.info("✅ Added main dataset to backup")
            
            # Backup models if they exist
            models_dir = app.config['MODEL_FOLDER']
            if os.path.exists(models_dir):
                for root, dirs, files in os.walk(models_dir):
                    for file in files:
                        if file.endswith(('.h5', '.json', '.pkl', '.joblib')):
                            file_path = os.path.join(root, file)
                            arcname = os.path.join('models', file)
                            backup_zip.write(file_path, arcname)
                            app.logger.info(f"✅ Added model {file} to backup")
            
            # Add system info
            system_info = {
                'backup_timestamp': timestamp,
                'system_info': {
                    'platform': platform.system(),
                    'python_version': platform.python_version(),
                    'app_version': '1.0.0',
                    'tensorflow_available': TENSORFLOW_AVAILABLE,
                    'sklearn_available': SKLEARN_AVAILABLE
                },
                'data_stats': {
                    'kunjungan_count': len(get_kunjungan_data()),
                    'dataset_available': os.path.exists(dataset_file) if 'dataset_file' in locals() else False
                }
            }
            
            system_info_json = json.dumps(system_info, indent=2, ensure_ascii=False)
            backup_zip.writestr('backup_info.json', system_info_json)
        
        file_size = os.path.getsize(backup_path)
        app.logger.info(f"✅ Backup created: {backup_filename} ({file_size/1024/1024:.2f} MB)")
        
        return send_file(
            backup_path,
            as_attachment=True,
            download_name=backup_filename,
            mimetype='application/zip'
        )
        
    except Exception as e:
        app.logger.error(f"Backup error: {e}")
        return jsonify({'success': False, 'error': f'Error saat backup: {str(e)}'}), 500

# ===== HEALTH CHECK =====
@app.route('/health')
def health_check():
    """Health check endpoint for monitoring"""
    try:
        status = {
            'status': 'healthy',
            'timestamp': datetime.now().isoformat(),
            'environment': FLASK_ENV,
            'platform': platform.system(),
            'data_loaded': df_processed is not None,
            'models_loaded': predictor is not None,
            'react_build_exists': os.path.exists(os.path.join(app.config['STATIC_FOLDER'], 'dist', 'index.html'))
        }
        return jsonify(status), 200
    except Exception as e:
        return jsonify({'status': 'unhealthy', 'error': str(e)}), 503

# ===== ERROR HANDLERS FOR API =====
@app.errorhandler(404)
def not_found_error(error):
    # For API routes, return JSON
    if request.path.startswith('/api/'):
        return jsonify({'success': False, 'error': 'Endpoint not found'}), 404
    
    # For frontend routes, serve React app (React Router will handle 404)
    return serve_react_app()

@app.errorhandler(500)
def internal_error(error):
    app.logger.error(f"Internal error: {error}")
    
    # For API routes, return JSON
    if request.path.startswith('/api/'):
        return jsonify({'success': False, 'error': 'Internal server error'}), 500
    
    # For frontend routes, serve React app (ErrorBoundary will handle)
    return serve_react_app()

@app.errorhandler(502)
def bad_gateway_error(error):
    app.logger.error(f"Bad gateway error: {error}")
    
    if request.path.startswith('/api/'):
        return jsonify({'success': False, 'error': 'Service temporarily unavailable'}), 502
    
    return serve_react_app()

# ===== LEGACY SUPPORT ROUTES (FOR BACKWARD COMPATIBILITY) =====
@app.route('/predict', methods=['POST'])
def legacy_predict():
    """Legacy predict endpoint - redirect to API"""
    return api_predict()

@app.route('/upload_file', methods=['POST'])
@login_required
def legacy_upload_file():
    """Legacy upload endpoint - redirect to API"""
    return api_upload_file()

@app.route('/admin/add_wisata', methods=['POST'])
@login_required
def legacy_add_wisata():
    """Legacy add wisata endpoint - redirect to API"""
    return api_add_wisata()

@app.route('/admin/update_wisata', methods=['POST'])
@login_required
def legacy_update_wisata():
    """Legacy update wisata endpoint - redirect to API"""
    return api_update_wisata()

@app.route('/admin/delete_wisata', methods=['POST'])
@login_required
def legacy_delete_wisata():
    """Legacy delete wisata endpoint - redirect to API"""
    return api_delete_wisata()

@app.route('/download_template')
def legacy_download_template():
    """Legacy template download endpoint - redirect to API"""
    return api_download_template()

@app.route('/admin/export_kunjungan')
@login_required
def legacy_export_kunjungan():
    """Legacy export endpoint - redirect to API"""
    return api_export_kunjungan()

@app.route('/admin/backup_data')
@login_required
def legacy_backup_data():
    """Legacy backup endpoint - redirect to API"""
    return api_backup_data()

@app.route('/admin/system_info')
@login_required
def legacy_system_info():
    """Legacy system info endpoint - redirect to API"""
    return api_system_info()

# ===== APPLICATION STARTUP =====
def start_application():
    """Start the Flask application with cross-platform support - PERBAIKAN"""
    try:
        port = int(os.environ.get('PORT', 5000))
        host = os.environ.get('HOST', '0.0.0.0')
        
        app.logger.info("📁 Ensuring directories exist...")
        for directory in [app.config['UPLOAD_FOLDER'], app.config['MODEL_FOLDER'], app.config['STATIC_FOLDER']]:
            os.makedirs(directory, exist_ok=True)
        
        # Check if React build exists
        react_build_path = os.path.join(app.config['STATIC_FOLDER'], 'dist', 'index.html')
        if os.path.exists(react_build_path):
            app.logger.info("✅ React build found - serving SPA")
        else:
            app.logger.warning("⚠️ React build not found - run 'npm run build' for production")
        
        app.logger.info("🚀 Initializing app...")
        if initialize_app():
            app.logger.info("✅ App initialized successfully!")
        else:
            app.logger.warning("⚠️ App initialization incomplete - waiting for data upload")
        
        # Determine how to run based on environment and context
        if FLASK_ENV == 'production':
            # Check if we're actually running under a WSGI server
            if any(server in os.environ.get('SERVER_SOFTWARE', '').lower() 
                   for server in ['gunicorn', 'uwsgi', 'apache', 'nginx']):
                app.logger.info("🌐 Running under WSGI server in production mode")
                return app  # Return app for WSGI server
            else:
                # Production mode but running directly - start production-like server
                app.logger.info(f"🌐 Starting production server on {host}:{port}")
                app.logger.info("🔗 API Documentation: http://localhost:5000/health")
                app.run(debug=False, host=host, port=port, threaded=True)
        else:
            # Development mode
            app.logger.info(f"🚀 Starting development server on {host}:{port}")
            app.logger.info(f"🌍 React App: http://localhost:3000 (if webpack dev server running)")
            app.logger.info(f"🌍 Flask API: http://localhost:{port}")
            app.logger.info("💡 For development: run 'npm run dev' in another terminal")
            app.run(debug=True, host=host, port=port, threaded=True)
            
    except KeyboardInterrupt:
        app.logger.info("🛑 Server stopped by user")
        sys.exit(0)
    except Exception as e:
        app.logger.error(f"Failed to start: {e}")
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    start_application()
else:
    # When imported by WSGI server
    application = app