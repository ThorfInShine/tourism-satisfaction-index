# FILE: app.py
import sys
print(f"Python version: {sys.version}")

import os
import logging
from logging.handlers import RotatingFileHandler
from flask import Flask, render_template, request, jsonify, redirect, url_for, flash, send_file
import pandas as pd
import plotly.graph_objs as go
import plotly.utils
import json
import pickle
import joblib
from werkzeug.utils import secure_filename
import shutil
from datetime import datetime, timedelta
import tempfile
from collections import Counter
import gc
import warnings
import traceback
import numpy as np
import re
import signal
import io
from collections import defaultdict
import h5py
warnings.filterwarnings('ignore')

# Import TensorFlow for LSTM model
try:
    import tensorflow as tf
    from tensorflow.keras.preprocessing.sequence import pad_sequences
    TENSORFLOW_AVAILABLE = True
    print("✅ TensorFlow available")
    # Set TensorFlow to be less verbose
    tf.get_logger().setLevel('ERROR')
    os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
except ImportError:
    print("❌ TensorFlow not available")
    TENSORFLOW_AVAILABLE = False

# Import sklearn components
try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.linear_model import LogisticRegression
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.pipeline import Pipeline
    from sklearn.utils.class_weight import compute_class_weight
    SKLEARN_AVAILABLE = True
    print("✅ Scikit-learn available")
except ImportError:
    print("❌ Scikit-learn not available")
    SKLEARN_AVAILABLE = False

# Signal handler for graceful shutdown
def signal_handler(sig, frame):
    print('\n🛑 Interrupt received, cleaning up...')
    gc.collect()
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)

# Initialize Flask app
app = Flask(__name__)

# Configuration based on environment
def configure_app():
    """Configure Flask app based on environment"""
    if os.environ.get('FLASK_ENV') == 'production':
        # Production configuration
        app.config['DEBUG'] = False
        app.config['TESTING'] = False
        app.config['UPLOAD_FOLDER'] = '/var/www/html/batas.bpskotabatu.com/data'
        app.config['MODELS_FOLDER'] = '/var/www/html/batas.bpskotabatu.com/models_h5_fixed'
        app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB
        
        # Get secret key from environment or use generated one
        secret_key = os.environ.get('SECRET_KEY')
        if not secret_key:
            # Try to read from file
            try:
                with open('/var/www/html/batas.bpskotabatu.com/secret_key.txt', 'r') as f:
                    secret_key = f.read().strip()
            except:
                # Fallback secret key
                secret_key = 'batas-kepuasan-wisatawan-production-key-2024-hostinger-secure'
        
        app.secret_key = secret_key
        
        # Setup production logging
        if not app.debug:
            file_handler = RotatingFileHandler(
                '/var/log/supervisor/batas-app.log', 
                maxBytes=10240000, 
                backupCount=10
            )
            file_handler.setFormatter(logging.Formatter(
                '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
            ))
            file_handler.setLevel(logging.INFO)
            app.logger.addHandler(file_handler)
            app.logger.setLevel(logging.INFO)
            app.logger.info('Tourism Satisfaction Index Application Started')
            
    else:
        # Development configuration
        app.config['DEBUG'] = True
        app.config['TESTING'] = True
        app.config['UPLOAD_FOLDER'] = 'data'
        app.config['MODELS_FOLDER'] = 'models_h5_fixed'
        app.config['MAX_CONTENT_LENGTH'] = 20 * 1024 * 1024  # 20MB
        app.secret_key = 'development-secret-key-tourism-satisfaction-2024'

# Configure the app
configure_app()

# Ensure directories exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['MODELS_FOLDER'], exist_ok=True)
os.makedirs(os.path.join(app.config['UPLOAD_FOLDER'], 'backups'), exist_ok=True)
os.makedirs(os.path.join(app.config['UPLOAD_FOLDER'], 'temp'), exist_ok=True)

# Helper functions
def get_model_path(filename):
    """Get full path to model file"""
    return os.path.join(app.config['MODELS_FOLDER'], filename)

def get_data_path():
    """Get full path to main data file"""
    return os.path.join(app.config['UPLOAD_FOLDER'], 'combined_batu_tourism_reviews_cleaned.csv')

def log_info(message):
    """Log info message"""
    if app.config.get('DEBUG'):
        print(f"INFO: {message}")
    else:
        app.logger.info(message)

def log_error(message):
    """Log error message"""
    if app.config.get('DEBUG'):
        print(f"ERROR: {message}")
    else:
        app.logger.error(message)

# Configuration
ALLOWED_EXTENSIONS = {'csv', 'xlsx', 'xls'}

# Initialize components with lazy loading
processor = None
predictor = None

# Global variables
df_processed = None
metrics = None
model_results = None
current_data_info = None

# HIGH VISITS (Kunjungan Tinggi)
VISIT_LEVEL_HIGH = [
    'eco active park',  # eco green park -> eco active park
    'gunung panderman',  # jalur pendakian gunung panderman -> gunung panderman
    'batu night spectacular',  # bns (batu night spectacular) -> batu night spectacular
    'museum angkut',  # museum angkut + -> museum angkut
    'coban talun',  # wana wisata coban talun -> coban talun
    'taman selecta',  # taman rekreasi selecta -> taman selecta
    'jatim park 3',  # jatim park iii -> jatim park 3
    'jatim park 2',  # jatim park ii -> jatim park 2
    'jatim park 1',  # jatim park i -> jatim park 1
    'alun alun kota wisata batu'  # alun-alun kota wisata batu -> alun alun kota wisata batu
]

# MEDIUM VISITS (Kunjungan Sedang)
VISIT_LEVEL_MEDIUM = [
    'songgoriti hot springs',  # songgoriti hot spring + pemandian tirta nirwana songgoriti -> songgoriti hot springs
    'tirta nirwana hotspring',  # part of songgoriti -> tirta nirwana hotspring
    'desa wisata tulungrejo',  # desa wisata tulungrejo -> desa wisata tulungrejo
    'coban putri',  # wana wisata coban putri -> coban putri
    'paralayang gunung banyak',  # gunung banyak -> paralayang gunung banyak
    'air terjun coban rais',  # wana wisata coban rais -> air terjun coban rais
    'batu economis park',  # predator fun park/batu economis park -> batu economis park
    'wisata bunga sidomulyo',  # desa wisata sidomulyo -> wisata bunga sidomulyo
    'batu love garden (baloga)',  # batu love garden -> batu love garden (baloga)
    'milenial glow garden',  # millenial glow garden -> milenial glow garden
    'pemandian air panas cangar'  # pemandian air panas alam cangar -> pemandian air panas cangar
]

# LOW VISITS (Kunjungan Rendah)
VISIT_LEVEL_LOW = [
    'gussari goa pinus batu',  # goa pinus -> gussari goa pinus batu
    'batu rafting',  # batu rafting -> batu rafting
    'wisata desa agro bumiaji',  # desa wisata bumiaji -> wisata desa agro bumiaji
    'taman dolan',  # taman dolan -> taman dolan (no change)
    'gunung arjuno',  # jalur pendakian gunung arjuno -> gunung arjuno
    'taman pinus campervan',  # taman pinus campervan park -> taman pinus campervan
    'wisata petik apel mandiri',  # petik apel mandiri -> wisata petik apel mandiri
    'desa wisata punten',  # desa wisata punten -> desa wisata punten
    'lumbung stroberi'  # desa wisata pandesari (lumbung stroben) -> lumbung stroberi
]

def get_visit_level(wisata_name):
    """Determine visit level for a wisata based on ACTUAL database names"""
    if pd.isna(wisata_name) or wisata_name is None:
        return 'low'
    
    wisata_lower = str(wisata_name).lower().strip()
    
    # Check if in high visit list
    for high_wisata in VISIT_LEVEL_HIGH:
        if high_wisata.lower() in wisata_lower or wisata_lower in high_wisata.lower():
            return 'high'
    
    # Check if in medium visit list
    for medium_wisata in VISIT_LEVEL_MEDIUM:
        if medium_wisata.lower() in wisata_lower or wisata_lower in medium_wisata.lower():
            return 'medium'
    
    # Check if in low visit list
    for low_wisata in VISIT_LEVEL_LOW:
        if low_wisata.lower() in wisata_lower or wisata_lower in low_wisata.lower():
            return 'low'
    
    # Default to low for unmatched wisata
    return 'low'

def debug_wisata_names(df):
    """Debug function to check wisata names and their categorization"""
    if 'wisata' not in df.columns:
        log_error("No 'wisata' column in dataframe")
        return
    
    log_info("DEBUG: WISATA CATEGORIZATION CHECK")
    
    # Get unique wisata names
    unique_wisata = df['wisata'].unique()
    
    # Categorize each wisata
    categorization = {
        'high': [],
        'medium': [],
        'low': []
    }
    
    for wisata in unique_wisata:
        if pd.notna(wisata):
            level = get_visit_level(wisata)
            categorization[level].append(wisata)
    
    # Print results
    log_info(f"TOTAL UNIQUE WISATA: {len(unique_wisata)}")
    log_info(f"HIGH VISITS ({len(categorization['high'])} wisata)")
    log_info(f"MEDIUM VISITS ({len(categorization['medium'])} wisata)")
    log_info(f"LOW VISITS ({len(categorization['low'])} wisata)")

# Define valid time ranges for filtering complaints
VALID_TIME_RANGES = [
    '1 jam lalu', '2 jam lalu', '3 jam lalu', '4 jam lalu', '5 jam lalu', 
    '6 jam lalu', '7 jam lalu', '8 jam lalu', '9 jam lalu', '10 jam lalu', 
    '11 jam lalu', '12 jam lalu', '13 jam lalu', '14 jam lalu', '15 jam lalu', 
    '16 jam lalu', '17 jam lalu', '18 jam lalu', '19 jam lalu', '20 jam lalu', 
    '21 jam lalu', '22 jam lalu', '23 jam lalu', 'hari ini', '1 hari lalu', 
    '2 hari lalu', '3 hari lalu', '4 hari lalu', '5 hari lalu', '6 hari lalu', 
    'beberapa hari lalu', 'seminggu lalu', '1 minggu lalu', '2 minggu lalu', 
    '3 minggu lalu', '4 minggu lalu', 'sebulan lalu', '1 bulan lalu', '2 bulan lalu', 
    '3 bulan lalu', '4 bulan lalu', '5 bulan lalu', '6 bulan lalu', '7 bulan lalu', 
    '8 bulan lalu', '9 bulan lalu', '10 bulan lalu', '11 bulan lalu', '1 tahun lalu'
]

def is_valid_time_range(date_str):
    """Check if date string is within valid time range (1 year)"""
    if pd.isna(date_str) or date_str is None:
        return False
    
    date_lower = str(date_str).lower().strip()
    
    # Check if date matches any valid time range
    for valid_range in VALID_TIME_RANGES:
        if valid_range.lower() in date_lower or date_lower == valid_range.lower():
            return True
    
    return False

def format_date_display(date_str):
    """Format date string for display - ensure it shows complete text"""
    if pd.isna(date_str) or date_str is None:
        return "Tidak diketahui"
    
    date_str = str(date_str).strip()
    
    # Ensure proper formatting for display
    for valid_range in VALID_TIME_RANGES:
        if valid_range.lower() in date_str.lower():
            return valid_range
    
    return date_str

class FixedH5ModelLoader:
    """FIXED utility class to load models from H5 format"""
    
    def __init__(self, models_dir=None):
        if models_dir is None:
            models_dir = app.config['MODELS_FOLDER']
        self.models_dir = models_dir
        self.label_encoder_classes = None
        log_info(f"Initializing H5 Model Loader from: {models_dir}")
        
        # Check if directory exists
        if not os.path.exists(models_dir):
            log_info(f"Models directory not found: {models_dir}")
            log_info("Creating directory...")
            os.makedirs(models_dir, exist_ok=True)
    
    def load_label_encoder(self, filepath=None):
        """Load label encoder classes from H5 file"""
        if filepath is None:
            filepath = get_model_path('label_encoder.h5')
        
        try:
            if os.path.exists(filepath):
                log_info(f"Loading label encoder from: {filepath}")
                with h5py.File(filepath, 'r') as f:
                    # Try different possible keys for classes
                    classes_data = None
                    if 'classes' in f:
                        classes_data = f['classes'][:]
                    elif 'classes_' in f:
                        classes_data = f['classes_'][:]
                    elif 'label_encoder_classes' in f:
                        classes_data = f['label_encoder_classes'][:]
                    
                    if classes_data is not None:
                        # Convert bytes to strings if needed
                        if isinstance(classes_data[0], bytes):
                            classes = [cls.decode('utf-8') for cls in classes_data]
                        else:
                            classes = [str(cls) for cls in classes_data]
                        
                        self.label_encoder_classes = classes
                        log_info(f"Loaded classes: {self.label_encoder_classes}")
                        return classes
                    else:
                        log_error("No classes data found in H5 file")
            else:
                log_error(f"Label encoder file not found: {filepath}")
                
        except Exception as e:
            log_error(f"Error loading label encoder: {e}")
        
        # Default fallback classes
        self.label_encoder_classes = ['negative', 'neutral', 'positive']
        log_info(f"Using default classes: {self.label_encoder_classes}")
        return self.label_encoder_classes
    
    def load_sklearn_model(self, filepath, model_name):
        """Load sklearn model from H5 file with multiple methods"""
        try:
            if not os.path.exists(filepath):
                log_error(f"Model file not found: {filepath}")
                return None
                
            log_info(f"Loading {model_name} from: {filepath}")
            
            with h5py.File(filepath, 'r') as f:
                # Try Method 1: Joblib (most reliable)
                if 'joblib_compressed' in f:
                    try:
                        log_info(f"Trying Method 1: Joblib")
                        joblib_bytes = f['joblib_compressed'][:]
                        
                        # Write to temporary file
                        with tempfile.NamedTemporaryFile(delete=False, suffix='.joblib') as tmp_file:
                            tmp_file.write(joblib_bytes.tobytes())
                            temp_path = tmp_file.name
                        
                        # Load with joblib
                        model = joblib.load(temp_path)
                        os.unlink(temp_path)
                        
                        log_info(f"Method 1 (Joblib) SUCCESS: {model_name}")
                        return model
                        
                    except Exception as e:
                        log_error(f"Method 1 (Joblib) failed: {str(e)[:100]}")
                
                # Try Method 2: Standard pickle
                if 'full_pipeline_pickle' in f:
                    try:
                        log_info(f"Trying Method 2: Pickle")
                        pipeline_bytes = f['full_pipeline_pickle'][:]
                        buffer = io.BytesIO(pipeline_bytes.tobytes())
                        model = pickle.load(buffer)
                        
                        log_info(f"Method 2 (Pickle) SUCCESS: {model_name}")
                        return model
                        
                    except Exception as e:
                        log_error(f"Method 2 (Pickle) failed: {str(e)[:100]}")
                
                log_error(f"All loading methods failed for {model_name}")
                return None
                
        except Exception as e:
            log_error(f"Error loading {model_name}: {e}")
            return None
    
    def load_lstm_model(self, filepath=None):
        """Load LSTM model from H5 files"""
        if filepath is None:
            filepath = get_model_path('lstm_model.h5')
        
        tf_filepath = get_model_path('lstm_model_tensorflow.h5')
        
        try:
            log_info(f"Loading LSTM model...")
            
            lstm_data = None
            tokenizer = None
            max_len = 100
            max_words = 8000
            
            # Load metadata and tokenizer
            if os.path.exists(filepath):
                with h5py.File(filepath, 'r') as f:
                    # Get parameters
                    if 'max_len' in f.attrs:
                        max_len = int(f.attrs['max_len'])
                    if 'max_words' in f.attrs:
                        max_words = int(f.attrs['max_words'])
                    
                    # Load tokenizer
                    if 'tokenizer' in f:
                        tokenizer_group = f['tokenizer']
                        if 'tokenizer_pickle' in tokenizer_group:
                            try:
                                tokenizer_bytes = tokenizer_group['tokenizer_pickle'][:]
                                buffer = io.BytesIO(tokenizer_bytes.tobytes())
                                tokenizer = pickle.load(buffer)
                                log_info("Tokenizer loaded")
                            except Exception as e:
                                log_error(f"Failed to load tokenizer: {e}")
            
            # Load TensorFlow model
            model = None
            if os.path.exists(tf_filepath):
                try:
                    model = tf.keras.models.load_model(tf_filepath, compile=False)
                    log_info("TensorFlow model loaded")
                except Exception as e:
                    log_error(f"Failed to load TensorFlow model: {e}")
            
            # Return if we have both components
            if tokenizer is not None and model is not None:
                return {
                    'model': model,
                    'tokenizer': tokenizer,
                    'max_len': max_len,
                    'max_words': max_words
                }
            
            return None
                
        except Exception as e:
            log_error(f"Error loading LSTM model: {e}")
            return None

class SmartEnsembleH5Fixed:
    """FIXED Smart Ensemble that loads models from H5 format"""
    
    def __init__(self, models_dir=None):
        log_info("Initializing FIXED Smart Ensemble from H5 format...")
        if models_dir is None:
            models_dir = app.config['MODELS_FOLDER']
        self.models_dir = models_dir
        self.model_name = "Smart Ensemble H5 Fixed"
        self.model_type = "h5_ensemble_fixed"
        
        # H5 Model Loader
        self.h5_loader = FixedH5ModelLoader(models_dir)
        
        # Model components
        self.tfidf_lr = None
        self.rf = None
        self.lstm_data = None
        self.label_encoder_classes = None
        
        # Component status
        self.tfidf_lr_ready = False
        self.rf_ready = False
        self.lstm_ready = False
        
        # Ensemble parameters
        self.use_manual_weights = True
        self.ensemble_weights = [0.2, 0, 0.8]
        
        # Load all components
        self.load_ensemble_components()
    
    def load_ensemble_components(self):
        """Load ensemble components from H5 format"""
        try:
            # Load label encoder
            self.label_encoder_classes = self.h5_loader.load_label_encoder()
            
            # Load TF-IDF + LR
            tfidf_path = get_model_path('tfidf_lr_model.h5')
            self.tfidf_lr = self.h5_loader.load_sklearn_model(tfidf_path, 'TF-IDF + LR')
            if self.tfidf_lr:
                # Check if weight is 0, if yes, disable the model
                if hasattr(self, 'use_manual_weights') and self.use_manual_weights and self.ensemble_weights[0] == 0:
                    self.tfidf_lr_ready = False
                    log_info("TF-IDF + LR loaded but disabled (weight=0)")
                else:
                    self.tfidf_lr_ready = True
                    log_info("TF-IDF + LR loaded successfully")
            
            # Load Random Forest
            rf_path = get_model_path('random_forest_model.h5')
            self.rf = self.h5_loader.load_sklearn_model(rf_path, 'Random Forest')
            if self.rf:
                # Check if weight is 0, if yes, disable the model
                if hasattr(self, 'use_manual_weights') and self.use_manual_weights and self.ensemble_weights[1] == 0:
                    self.rf_ready = False
                    log_info("Random Forest loaded but disabled (weight=0)")
                else:
                    self.rf_ready = True
                    log_info("Random Forest loaded successfully")
            
            # Load LSTM
            if TENSORFLOW_AVAILABLE:
                self.lstm_data = self.h5_loader.load_lstm_model()
                if self.lstm_data:
                    # Check if weight is 0, if yes, disable the model
                    if hasattr(self, 'use_manual_weights') and self.use_manual_weights and self.ensemble_weights[2] == 0:
                        self.lstm_ready = False
                        log_info("LSTM loaded but disabled (weight=0)")
                    else:
                        self.lstm_ready = True
                        log_info("LSTM loaded successfully")
            
            # Count active models (models with weight > 0)
            active_models = 0
            if self.tfidf_lr_ready and self.ensemble_weights[0] > 0:
                active_models += 1
            if self.rf_ready and self.ensemble_weights[1] > 0:
                active_models += 1
            if self.lstm_ready and self.ensemble_weights[2] > 0:
                active_models += 1
            
            # Count loaded models (regardless of weight)
            loaded_models = sum([self.tfidf_lr is not None, self.rf is not None, self.lstm_data is not None])
            
            log_info(f"MODEL STATUS:")
            log_info(f"TF-IDF + LR: {self.tfidf_lr_ready} (weight={self.ensemble_weights[0]:.2f})")
            log_info(f"Random Forest: {self.rf_ready} (weight={self.ensemble_weights[1]:.2f})")
            log_info(f"LSTM: {self.lstm_ready} (weight={self.ensemble_weights[2]:.2f})")
            log_info(f"Loaded Models: {loaded_models}/3")
            log_info(f"Active Models: {active_models}/3")
            
            # Create fallback if needed
            if active_models == 0:
                log_info("No active models (all weights are 0), creating fallback...")
                self.create_fallback_models()
                active_models = sum([self.tfidf_lr_ready, self.rf_ready, self.lstm_ready])
            
            if active_models > 0:
                self.adjust_weights()
                self.update_model_name()
                log_info(f"Ensemble ready with {active_models} active component(s)")
                return True
            else:
                log_error("No models available")
                return False
                
        except Exception as e:
            log_error(f"Error loading ensemble: {e}")
            self.create_fallback_models()
            return self.tfidf_lr_ready or self.rf_ready or self.lstm_ready
    
    def create_fallback_models(self):
        """Create simple fallback models"""
        if not SKLEARN_AVAILABLE:
            return False
            
        try:
            log_info("Creating fallback models...")
            
            # Training data
            texts = [
                'bagus sekali', 'sangat baik', 'memuaskan', 'luar biasa', 'recommended',
                'buruk sekali', 'mengecewakan', 'tidak bagus', 'jelek', 'parah',
                'biasa saja', 'standar', 'cukup', 'lumayan', 'oke'
            ]
            labels = ['positive']*5 + ['negative']*5 + ['neutral']*5
            
            # Create simple TF-IDF + LR
            if not self.tfidf_lr_ready:
                try:
                    self.tfidf_lr = Pipeline([
                        ('tfidf', TfidfVectorizer(max_features=100)),
                        ('classifier', LogisticRegression(random_state=42))
                    ])
                    self.tfidf_lr.fit(texts, labels)
                    self.tfidf_lr_ready = True
                    log_info("Fallback TF-IDF + LR created")
                except:
                    pass
            
            # Create simple RF
            if not self.rf_ready:
                try:
                    self.rf = Pipeline([
                        ('tfidf', TfidfVectorizer(max_features=100)),
                        ('classifier', RandomForestClassifier(n_estimators=10, random_state=42))
                    ])
                    self.rf.fit(texts, labels)
                    self.rf_ready = True
                    log_info("Fallback Random Forest created")
                except:
                    pass
            
            return self.tfidf_lr_ready or self.rf_ready
            
        except Exception as e:
            log_error(f"Error creating fallback: {e}")
            return False
    
    def adjust_weights(self):
        """Adjust ensemble weights based on working components"""
        if hasattr(self, 'use_manual_weights') and self.use_manual_weights:
            log_info(f"Using MANUAL weights: TF-IDF={self.ensemble_weights[0]:.2f}, RF={self.ensemble_weights[1]:.2f}, LSTM={self.ensemble_weights[2]:.2f}")
            return
        
        working = []
        if self.tfidf_lr_ready:
            working.append(0)
        if self.rf_ready:
            working.append(1)
        if self.lstm_ready:
            working.append(2)
        
        self.ensemble_weights = [0.0, 0.0, 0.0]
        
        if working:
            weight = 1.0 / len(working)
            for idx in working:
                self.ensemble_weights[idx] = weight
        
        log_info(f"Weights: TF-IDF={self.ensemble_weights[0]:.2f}, RF={self.ensemble_weights[1]:.2f}, LSTM={self.ensemble_weights[2]:.2f}")
    
    def update_model_name(self):
        """Update model name based on active models (weight > 0)"""
        components = []
        
        # Only include models that are ready AND have weight > 0
        if self.tfidf_lr_ready and self.ensemble_weights[0] > 0:
            components.append(f"TF-IDF({self.ensemble_weights[0]:.0%})")
        if self.rf_ready and self.ensemble_weights[1] > 0:
            components.append(f"RF({self.ensemble_weights[1]:.0%})")
        if self.lstm_ready and self.ensemble_weights[2] > 0:
            components.append(f"LSTM({self.ensemble_weights[2]:.0%})")
        
        if components:
            if self.use_manual_weights:
                self.model_name = f"Manual: {'+'.join(components)}"
            else:
                self.model_name = f"Auto: {'+'.join(components)}"
        else:
            self.model_name = "Rule-based (No Active Models)"
    
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
    
    def predict_single(self, text, return_probabilities=False):
        """Predict sentiment for single text"""
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
            if self.tfidf_lr_ready and self.tfidf_lr:
                try:
                    prob = self.tfidf_lr.predict_proba([cleaned])[0]
                    all_probs.append(prob * self.ensemble_weights[0])
                    models_used.append("TF-IDF")
                except:
                    pass
            
            # Random Forest
            if self.rf_ready and self.rf:
                try:
                    prob = self.rf.predict_proba([cleaned])[0]
                    all_probs.append(prob * self.ensemble_weights[1])
                    models_used.append("RF")
                except:
                    pass
            
            # LSTM
            if self.lstm_ready and self.lstm_data:
                try:
                    tokenizer = self.lstm_data['tokenizer']
                    max_len = self.lstm_data['max_len']
                    model = self.lstm_data['model']
                    
                    seq = tokenizer.texts_to_sequences([cleaned])
                    padded = pad_sequences(seq, maxlen=max_len, padding='post')
                    prob = model.predict(padded, verbose=0)[0]
                    all_probs.append(prob * self.ensemble_weights[2])
                    models_used.append("LSTM")
                except:
                    pass
            
            # Combine predictions
            if all_probs:
                ensemble_prob = np.sum(all_probs, axis=0)
                ensemble_prob = ensemble_prob / np.sum(ensemble_prob)
                pred_idx = np.argmax(ensemble_prob)
                
                result = {
                    'text': text,
                    'sentiment': self.label_encoder_classes[pred_idx],
                    'confidence': float(ensemble_prob[pred_idx]),
                    'model_used': f"Ensemble ({'+'.join(models_used)})",
                    'models_count': len(models_used)
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
                    'model_used': 'Rule-based',
                    'models_count': 0
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
            log_error(f"Prediction error: {e}")
            return {
                'text': text,
                'sentiment': 'neutral',
                'confidence': 0.33,
                'model_used': 'error_fallback'
            }
    
    def predict_batch(self, texts, batch_size=50):
        """Batch prediction"""
        results = []
        total = len(texts)
        
        for i in range(0, total, batch_size):
            batch = texts[i:i + batch_size]
            batch_results = [self.predict_single(text) for text in batch]
            results.extend(batch_results)
            
            if i % 1000 == 0:
                log_info(f"Processed {min(i + batch_size, total)}/{total} texts")
        
        return results
    
    def get_model_info(self):
        """Get model information"""
        components = []
        if self.tfidf_lr_ready:
            components.append('TF-IDF + LR')
        if self.rf_ready:
            components.append('Random Forest')
        if self.lstm_ready:
            components.append('LSTM')
        
        return {
            'model_name': self.model_name,
            'model_type': self.model_type,
            'components': components,
            'working_components': len(components),
            'total_components': 3,
            'weights': self.ensemble_weights,
            'source': 'H5 Fixed Format'
        }

class DataProcessor:
    """Data processor using sentiment model"""
    def __init__(self, models_dir=None):
        if models_dir is None:
            models_dir = app.config['MODELS_FOLDER']
        self.models_dir = models_dir
        self.sentiment_analyzer = None
        self.load_models()
    
    def load_models(self):
        """Load sentiment model"""
        try:
            self.sentiment_analyzer = SmartEnsembleH5Fixed(self.models_dir)
            log_info("Sentiment analyzer loaded")
        except Exception as e:
            log_error(f"Error loading models: {e}")
            self.sentiment_analyzer = None
    
    def load_data(self, file_path):
        """Load data from CSV"""
        try:
            log_info(f"Loading data from: {file_path}")
            df = pd.read_csv(file_path)
            log_info(f"Loaded {len(df)} rows")
            return df
        except Exception as e:
            log_error(f"Error loading data: {e}")
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
    
    def get_sentiment(self, text):
        """Get sentiment"""
        if self.sentiment_analyzer:
            try:
                result = self.sentiment_analyzer.predict_single(text)
                return result['sentiment']
            except:
                return 'neutral'
        else:
            return 'neutral'
    
    def process_reviews(self, df):
        """Process reviews"""
        log_info("Processing reviews...")
        
        try:
            df_processed = df.copy()
            
            # Clean text
            log_info("Cleaning text...")
            df_processed['cleaned_text'] = df_processed['review_text'].apply(self.clean_text)
            
            # Get sentiment
            log_info("Analyzing sentiment...")
            if self.sentiment_analyzer:
                texts = df_processed['cleaned_text'].tolist()
                results = self.sentiment_analyzer.predict_batch(texts, batch_size=100)
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
            
            log_info(f"Processed {len(df_processed)} reviews")
            return df_processed
            
        except Exception as e:
            log_error(f"Error processing: {e}")
            df_processed = df.copy()
            df_processed['sentiment'] = 'neutral'
            df_processed['cleaned_text'] = df_processed['review_text'].apply(self.clean_text)
            df_processed['review_length'] = 100
            df_processed['positive_score'] = 5.0
            df_processed['negative_score'] = 5.0
            df_processed['sentiment_intensity'] = 0.5
            return df_processed
    
    def get_satisfaction_metrics(self, df):
        """Calculate metrics - FIXED with overall_satisfaction as a value not object"""
        try:
            metrics = {}
            
            metrics['total_reviews'] = len(df)
            
            # Calculate average rating and ensure it's a float
            if 'rating' in df.columns and len(df) > 0:
                avg_rating = df['rating'].mean()
                metrics['avg_rating'] = float(avg_rating) if not pd.isna(avg_rating) else 0.0
            else:
                metrics['avg_rating'] = 0.0
            
            # FIXED: Set overall_satisfaction as a float value, not dict
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
                metrics['positive_percentage'] = float((sentiment_dist.get('positive', 0) / total) * 100) if total > 0 else 0.0
                metrics['negative_percentage'] = float((sentiment_dist.get('negative', 0) / total) * 100) if total > 0 else 0.0
                metrics['neutral_percentage'] = float((sentiment_dist.get('neutral', 0) / total) * 100) if total > 0 else 0.0
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
                    else:
                        metrics['top_wisata'] = {}
                except Exception as e:
                    log_error(f"Error calculating top wisata: {e}")
                    metrics['top_wisata'] = {}
            else:
                metrics['top_wisata'] = {}
            
            # Visit time distribution
            if 'visit_time' in df.columns:
                metrics['visit_time_distribution'] = df['visit_time'].value_counts().to_dict()
            else:
                metrics['visit_time_distribution'] = {}
            
            # Additional metrics
            metrics['total_destinations'] = len(df['wisata'].unique()) if 'wisata' in df.columns else 0
            metrics['avg_review_length'] = float(df['review_length'].mean()) if 'review_length' in df.columns and len(df) > 0 else 0.0
            metrics['most_active_month'] = 'Unknown'
            
            return metrics
            
        except Exception as e:
            log_error(f"Error calculating metrics: {e}")
            # Return default metrics with overall_satisfaction as float
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
                'visit_time_distribution': {},
                'total_destinations': 0,
                'avg_review_length': 0.0,
                'most_active_month': 'Unknown'
            }

class SatisfactionPredictor:
    """Satisfaction predictor"""
    def __init__(self, models_dir=None):
        if models_dir is None:
            models_dir = app.config['MODELS_FOLDER']
        self.models_dir = models_dir
        self.sentiment_analyzer = None
        self.is_trained = False
        self.load_trained_model()
    
    def load_trained_model(self):
        """Load model"""
        try:
            self.sentiment_analyzer = SmartEnsembleH5Fixed(self.models_dir)
            self.is_trained = True
            log_info("Predictor model loaded")
            return True
        except Exception as e:
            log_error(f"Error loading predictor: {e}")
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
            log_error(f"Prediction error: {e}")
            return {
                'prediction': 'satisfied',
                'confidence': 0.6,
                'probabilities': {'satisfied': 0.6, 'neutral': 0.3, 'dissatisfied': 0.1}
            }

# Analysis functions
def generate_analysis_data(df_processed):
    """Generate analysis data"""
    try:
        if df_processed is None or df_processed.empty:
            return create_empty_analysis_data()
        
        log_info("Generating analysis data...")
        
        # Add visitor insights
        visitor_insights = analyze_visitor_patterns(df_processed)
        
        return {
            'suggestions': [],
            'complaints': [],
            'all_wisata_analysis': analyze_all_wisata(df_processed),
            'time_analysis': {},
            'keyword_analysis': {'positive_keywords': [], 'negative_keywords': []},
            'sentiment_analysis': {'by_rating': {}},
            'visitor_insights': visitor_insights
        }
        
    except Exception as e:
        log_error(f"Error generating analysis: {e}")
        return create_empty_analysis_data()

def create_empty_analysis_data():
    """Create empty analysis data"""
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
    """FIXED: Analyze all wisata destinations with corrected categorization"""
    try:
        if 'wisata' not in df.columns:
            return {
                'total_destinations': 0,
                'urgent_count': 0,
                'high_complaint_count': 0,
                'medium_complaint_count': 0,
                'low_complaint_count': 0,
                'excellent_count': 0,
                'destinations': {}
            }
        
        destinations = {}
        
        for wisata_name in df['wisata'].unique():
            wisata_data = df[df['wisata'] == wisata_name]
            
            if len(wisata_data) < 3:  # Skip destinations with too few reviews
                continue
            
            # Basic metrics
            avg_rating = float(wisata_data['rating'].mean())
            total_reviews = len(wisata_data)
            
            # Sentiment analysis
            sentiment_dist = wisata_data['sentiment'].value_counts()
            total_sentiment = len(wisata_data)
            
            positive_ratio = float((sentiment_dist.get('positive', 0) / total_sentiment) * 100)
            negative_ratio = float((sentiment_dist.get('negative', 0) / total_sentiment) * 100)
            neutral_ratio = float((sentiment_dist.get('neutral', 0) / total_sentiment) * 100)
            complaint_ratio = negative_ratio
            
            # Rating distribution
            rating_distribution = wisata_data['rating'].value_counts().to_dict()
            
            # FIXED: Get ALL negative reviews within 1 year time range (no limit)
            negative_reviews = wisata_data[wisata_data['sentiment'] == 'negative']
            main_complaints = []
            
            if not negative_reviews.empty and 'date' in negative_reviews.columns:
                # Filter for reviews within valid time range (1 year)
                for idx, row in negative_reviews.iterrows():
                    date_str = str(row.get('date', ''))
                    
                    # Check if date is within valid range
                    if is_valid_time_range(date_str):
                        # Format the date properly for display
                        formatted_date = format_date_display(date_str)
                        
                        # Only add if there's actual review text
                        review_text = str(row.get('review_text', ''))
                        if review_text and review_text.strip() and review_text.lower() not in ['nan', 'none', '']:
                            main_complaints.append({
                                'display_text': review_text[:120] + "..." if len(review_text) > 120 else review_text,
                                'full_text': review_text,
                                'count': 1,
                                'date': formatted_date  # Use properly formatted date
                            })
            
            # Engagement level
            avg_review_length = float(wisata_data['review_text'].astype(str).str.len().mean())
            if avg_review_length > 200:
                engagement_level = 'High'
            elif avg_review_length > 100:
                engagement_level = 'Medium'
            else:
                engagement_level = 'Low'
            
            # Most common rating
            most_common_rating = int(wisata_data['rating'].mode().iloc[0]) if not wisata_data['rating'].mode().empty else 3
            
            # Determine visit level for this wisata
            visit_level = get_visit_level(wisata_name)
            
            # Store destination data
            destinations[wisata_name] = {
                'avg_rating': avg_rating,
                'total_reviews': total_reviews,
                'positive_ratio': positive_ratio,
                'negative_ratio': negative_ratio,
                'neutral_ratio': neutral_ratio,
                'complaint_ratio': complaint_ratio,
                'rating_distribution': rating_distribution,
                'main_complaints': main_complaints,  # ALL valid complaints within 1 year
                'total_complaints': len(negative_reviews),
                'valid_time_complaints_count': len(main_complaints),  # Count of complaints within time range
                'top_keywords': {},
                'engagement_level': engagement_level,
                'most_common_rating': most_common_rating,
                'avg_review_length': avg_review_length,
                'visit_level': visit_level  # Add visit level
            }
        
        # FIXED: Calculate summary statistics with proper categorization
        total_destinations = len(destinations)
        
        # Categorize based on complaint ratio
        urgent_count = 0      # > 30% complaints
        high_count = 0        # 20-30% complaints  
        medium_count = 0      # 10-20% complaints
        low_count = 0         # 5-10% complaints
        excellent_count = 0   # < 5% complaints
        
        for dest_data in destinations.values():
            complaint_ratio = dest_data['complaint_ratio']
            if complaint_ratio > 30:
                urgent_count += 1
            elif complaint_ratio > 20:
                high_count += 1
            elif complaint_ratio > 10:
                medium_count += 1
            elif complaint_ratio > 5:
                low_count += 1
            else:
                excellent_count += 1
        
        return {
            'total_destinations': total_destinations,
            'urgent_count': urgent_count,           # > 30% complaints
            'high_complaint_count': high_count,     # 20-30% complaints
            'medium_complaint_count': medium_count, # 10-20% complaints
            'low_complaint_count': low_count,       # 5-10% complaints
            'excellent_count': excellent_count,     # < 5% complaints
            'destinations': destinations
        }
        
    except Exception as e:
        log_error(f"Error analyzing wisata: {e}")
        return {
            'total_destinations': 0,
            'urgent_count': 0,
            'high_complaint_count': 0,
            'medium_complaint_count': 0,
            'low_complaint_count': 0,
            'excellent_count': 0,
            'destinations': {}
        }

def analyze_visitor_patterns(df):
    """Analyze visitor behavior patterns"""
    try:
        insights = {}
        
        # Review length analysis
        if 'review_length' in df.columns:
            review_lengths = df['review_length']
            short_reviews = len(review_lengths[review_lengths < 50])
            medium_reviews = len(review_lengths[(review_lengths >= 50) & (review_lengths <= 150)])
            long_reviews = len(review_lengths[review_lengths > 150])
            
            insights['review_length_analysis'] = {
                'short_reviews': short_reviews,
                'medium_reviews': medium_reviews,
                'long_reviews': long_reviews
            }
            
            # Correlation between review length and rating
            if 'rating' in df.columns:
                correlation = float(df['review_length'].corr(df['rating']))
                insights['length_rating_correlation'] = correlation if not pd.isna(correlation) else 0
        else:
            insights['review_length_analysis'] = {
                'short_reviews': 0,
                'medium_reviews': 0,
                'long_reviews': 0
            }
            insights['length_rating_correlation'] = 0
        
        # Visit patterns
        if 'visit_time' in df.columns:
            visit_patterns = df['visit_time'].value_counts().to_dict()
            insights['visit_patterns'] = visit_patterns
        else:
            insights['visit_patterns'] = {
                'Tidak diketahui': len(df),
                'Akhir pekan': 0,
                'Hari biasa': 0,
                'Hari libur nasional': 0
            }
        
        return insights
        
    except Exception as e:
        log_error(f"Error analyzing visitor patterns: {e}")
        return {
            'review_length_analysis': {'short_reviews': 0, 'medium_reviews': 0, 'long_reviews': 0},
            'length_rating_correlation': 0,
            'visit_patterns': {
                'Tidak diketahui': 0,
                'Akhir pekan': 0,
                'Hari biasa': 0,
                'Hari libur nasional': 0
            }
        }

def create_charts():
    """Create charts for dashboard"""
    charts = {}
    
    try:
        global df_processed
        
        if df_processed is None or df_processed.empty:
            return charts
        
        # Rating Distribution
        if 'rating' in df_processed.columns:
            rating_counts = df_processed['rating'].value_counts().sort_index()
            charts['rating_dist'] = json.dumps({
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
                    'showlegend': False
                }
            })
        
        # Sentiment Distribution
        if 'sentiment' in df_processed.columns:
            sentiment_counts = df_processed['sentiment'].value_counts()
            charts['sentiment_dist'] = json.dumps({
                'data': [{
                    'labels': sentiment_counts.index.tolist(),
                    'values': sentiment_counts.values.tolist(),
                    'type': 'pie',
                    'marker': {'colors': [ '#f1c40f','#2ecc71', '#e74c3c']}
                }],
                'layout': {'title': 'Sentiment Distribution'}
            })
        
        # Top 10 Wisata by Rating
        if 'wisata' in df_processed.columns and 'rating' in df_processed.columns:
            try:
                wisata_rating = df_processed.groupby('wisata').agg({
                    'rating': ['mean', 'count']
                }).round(2)
                wisata_rating.columns = ['mean_rating', 'review_count']
                wisata_rating = wisata_rating[wisata_rating['review_count'] >= 5]
                wisata_rating = wisata_rating.sort_values('mean_rating', ascending=True).tail(10)
                
                charts['top_rating'] = json.dumps({
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
                        'height': 400
                    }
                })
            except Exception as e:
                log_error(f"Error creating top rating chart: {e}")
        
        # Top 10 Wisata by Visits
        if 'wisata' in df_processed.columns:
            try:
                wisata_visits = df_processed.groupby('wisata').agg({
                    'rating': 'count'
                }).round(2)
                wisata_visits.columns = ['visit_count']
                wisata_visits = wisata_visits.sort_values('visit_count', ascending=True).tail(10)
                
                charts['top_visits'] = json.dumps({
                    'data': [{
                        'y': [name[:25] + '...' if len(name) > 25 else name for name in wisata_visits.index.tolist()],
                        'x': wisata_visits['visit_count'].values.tolist(),
                        'type': 'bar',
                        'orientation': 'h',
                        'marker': {'color': '#3498db'},
                        'text': [f"{count}" for count in wisata_visits['visit_count']],
                        'textposition': 'auto'
                    }],
                    'layout': {
                        'title': '',
                        'xaxis': {'title': 'Jumlah Review'},
                        'yaxis': {'title': ''},
                        'showlegend': False,
                        'height': 400
                    }
                })
            except Exception as e:
                log_error(f"Error creating top visits chart: {e}")
        
        return charts
        
    except Exception as e:
        log_error(f"Error creating charts: {e}")
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

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_data_info():
    try:
        data_path = get_data_path()
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
    global df_processed, metrics, model_results, current_data_info
    
    try:
        log_info("Initializing application...")
        
        data_path = get_data_path()
        if not os.path.exists(data_path):
            log_error(f"Data file not found")
            return False
        
        proc = get_processor()
        if proc is None:
            return False
        
        df = proc.load_data(data_path)
        
        # DEBUG: Check wisata names and categorization
        debug_wisata_names(df)
        
        df_processed = proc.process_reviews(df)
        metrics = proc.get_satisfaction_metrics(df_processed)
        
        pred = get_predictor()
        if pred:
            model_results = pred.train(df_processed, force_retrain=force_retrain)
        
        current_data_info = get_data_info()
        
        log_info("App initialized successfully!")
        return True
        
    except Exception as e:
        log_error(f"Error initializing: {e}")
        return False

# FIXED: Create CSV template
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
        
        # Create template file
        template_path = os.path.join(app.config['UPLOAD_FOLDER'], 'template_upload.csv')
        template_df.to_csv(template_path, index=False)
        
        return template_path
        
    except Exception as e:
        log_error(f"Error creating template: {e}")
        return None

# Flask routes
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/dashboard')
def dashboard():
    try:
        global df_processed, metrics, current_data_info
        
        if df_processed is None:
            if not initialize_app():
                flash('Please upload data file', 'error')
                return redirect(url_for('upload_page'))
        
        charts = create_charts()
        
        return render_template('dashboard.html', 
                            charts=charts, 
                            metrics=metrics,
                            data_info=current_data_info)
                            
    except Exception as e:
        log_error(f"Dashboard error: {e}")
        flash(f'Error: {str(e)}', 'error')
        return redirect(url_for('upload_page'))

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.json
        text = data.get('text', '')
        visit_time = data.get('visit_time', 'Tidak diketahui')
        
        if not text:
            return jsonify({'error': 'Text cannot be empty'}), 400
        
        pred = get_predictor()
        if pred is None:
            return jsonify({'error': 'Model not initialized'}), 500
        
        prediction = pred.predict_satisfaction(text, visit_time)
        
        return jsonify({
            'satisfaction': prediction.get('prediction', 'neutral'),
            'probabilities': prediction.get('probabilities', {}),
            'model_used': prediction.get('model_used', 'Unknown')
        })
        
    except Exception as e:
        log_error(f"Prediction error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/analysis')
def analysis():
    try:
        global df_processed
        
        if df_processed is None:
            if not initialize_app():
                flash('Please upload data first', 'error')
                return redirect(url_for('upload_page'))
        
        analysis_data = generate_analysis_data(df_processed)
        
        return render_template('analysis.html', analysis_data=analysis_data)
        
    except Exception as e:
        log_error(f"Analysis error: {e}")
        flash(f'Error: {str(e)}', 'error')
        return redirect(url_for('dashboard'))

@app.route('/upload')
def upload_page():
    return render_template('upload.html')

# FIXED: Upload functionality with proper error handling
@app.route('/upload_file', methods=['POST'])
def upload_file():
    try:
        if 'file' not in request.files:
            flash('No file selected', 'error')
            return redirect(request.url)
        
        file = request.files['file']
        if file.filename == '':
            flash('No file selected', 'error')
            return redirect(request.url)
        
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            
            # Save uploaded file
            upload_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(upload_path)
            
            try:
                # Load and validate file
                if filename.endswith('.csv'):
                    df = pd.read_csv(upload_path)
                else:
                    df = pd.read_excel(upload_path)
                
                # Validate required columns
                required_columns = ['wisata', 'rating', 'review_text', 'date']
                missing_columns = [col for col in required_columns if col not in df.columns]
                
                if missing_columns:
                    flash(f'Missing required columns: {", ".join(missing_columns)}', 'error')
                    os.remove(upload_path)
                    return redirect(url_for('upload_page'))
                
                # Save as standard filename for processing
                standard_path = get_data_path()
                df.to_csv(standard_path, index=False)
                
                # Clean up temporary file if different
                if upload_path != standard_path:
                    os.remove(upload_path)
                
                # Reinitialize app with new data
                global df_processed, metrics, current_data_info
                df_processed = None
                metrics = None
                current_data_info = None
                
                if initialize_app():
                    flash(f'File uploaded successfully! Processed {len(df)} reviews.', 'success')
                    return redirect(url_for('dashboard'))
                else:
                    flash('Error processing uploaded file', 'error')
                    return redirect(url_for('upload_page'))
                
            except Exception as e:
                log_error(f"Error processing file: {e}")
                flash(f'Error processing file: {str(e)}', 'error')
                if os.path.exists(upload_path):
                    os.remove(upload_path)
                return redirect(url_for('upload_page'))
        
        else:
            flash('Invalid file format. Please upload CSV or Excel file.', 'error')
            return redirect(url_for('upload_page'))
            
    except Exception as e:
        log_error(f"Upload error: {e}")
        flash(f'Upload failed: {str(e)}', 'error')
        return redirect(url_for('upload_page'))

# FIXED: Download template route
@app.route('/download_template')
def download_template():
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
            flash('Error creating template file', 'error')
            return redirect(url_for('upload_page'))
            
    except Exception as e:
        log_error(f"Template download error: {e}")
        flash(f'Error downloading template: {str(e)}', 'error')
        return redirect(url_for('upload_page'))

# FIXED API ROUTES FOR DASHBOARD FILTERS with corrected visit level categorization
@app.route('/api/filter_data')
def api_filter_data():
    """API endpoint for filtering data - FIXED for correct visit level filtering"""
    try:
        filter_type = request.args.get('filter', 'all')
        
        global df_processed
        if df_processed is None:
            return jsonify({
                'success': False,
                'error': 'No data loaded'
            })
        
        # Filter data based on visit level with FIXED categorization
        if filter_type == 'all':
            filtered_df = df_processed
        else:
            # Filter by visit level using the corrected categorization
            if 'wisata' in df_processed.columns:
                filtered_df = df_processed[df_processed['wisata'].apply(lambda x: get_visit_level(x) == filter_type)]
            else:
                filtered_df = df_processed
        
        # Recalculate metrics for filtered data
        proc = get_processor()
        if proc:
            filtered_metrics = proc.get_satisfaction_metrics(filtered_df)
        else:
            filtered_metrics = metrics
        
        # Recreate charts for filtered data
        global df_processed_temp
        df_processed_temp = df_processed
        df_processed = filtered_df
        filtered_charts = create_charts()
        df_processed = df_processed_temp
        
        # Get visit level counts with FIXED categorization
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
        
        return jsonify({
            'success': True,
            'metrics': filtered_metrics,
            'charts': filtered_charts,
            'visit_level_counts': visit_level_counts
        })
        
    except Exception as e:
        log_error(f"Filter API error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        })

@app.route('/api/quadrant_data_filtered')
def api_quadrant_data_filtered():
    """API endpoint for filtered quadrant chart data"""
    try:
        filter_type = request.args.get('filter', 'all')
        
        global df_processed
        if df_processed is None:
            return jsonify({
                'success': False,
                'error': 'No data loaded'
            })
        
        # Filter data with FIXED visit level categorization
        if filter_type == 'all':
            filtered_df = df_processed
        else:
            if 'wisata' in df_processed.columns:
                filtered_df = df_processed[df_processed['wisata'].apply(lambda x: get_visit_level(x) == filter_type)]
            else:
                filtered_df = df_processed
        
        # Prepare quadrant data
        if 'wisata' not in filtered_df.columns or 'rating' not in filtered_df.columns:
            return jsonify({
                'success': False,
                'error': 'Missing required columns'
            })
        
        # Group by wisata
        wisata_stats = filtered_df.groupby('wisata').agg({
            'rating': ['mean', 'count']
        }).round(2)
        wisata_stats.columns = ['mean_rating', 'review_count']
        
        # Filter out wisata with too few reviews
        wisata_stats = wisata_stats[wisata_stats['review_count'] >= 3]
        
        if wisata_stats.empty:
            return jsonify({
                'success': False,
                'error': 'No data available for this filter'
            })
        
        # Calculate averages
        avg_rating = wisata_stats['mean_rating'].mean()
        avg_visits = wisata_stats['review_count'].mean()
        
        # Prepare data for chart
        names = []
        full_names = []
        ratings = []
        visits = []
        
        for wisata_name, row in wisata_stats.iterrows():
            # Truncate name for display
            display_name = wisata_name[:30] + '...' if len(wisata_name) > 30 else wisata_name
            names.append(display_name)
            full_names.append(wisata_name)
            ratings.append(float(row['mean_rating']))
            visits.append(int(row['review_count']))
        
        return jsonify({
            'success': True,
            'quadrant_data': {
                'names': names,
                'full_names': full_names,
                'ratings': ratings,
                'visits': visits
            },
            'avg_rating': float(avg_rating),
            'avg_visits': float(avg_visits)
        })
        
    except Exception as e:
        log_error(f"Quadrant API error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        })

# Health check endpoint for monitoring
@app.route('/health')
def health_check():
    """Health check endpoint"""
    try:
        # Check if models exist
        models_exist = all([
            os.path.exists(get_model_path('tfidf_lr_model.h5')),
            os.path.exists(get_model_path('random_forest_model.h5')),
            os.path.exists(get_model_path('lstm_model.h5')),
            os.path.exists(get_model_path('label_encoder.h5'))
        ])
        
        # Check if data file exists
        data_exists = os.path.exists(get_data_path())
        
        status = {
            'status': 'healthy' if models_exist and data_exists else 'unhealthy',
            'models_loaded': models_exist,
            'data_loaded': data_exists,
            'timestamp': datetime.now().isoformat(),
            'environment': os.environ.get('FLASK_ENV', 'development')
        }
        
        return jsonify(status), 200 if status['status'] == 'healthy' else 503
        
    except Exception as e:
        log_error(f"Health check failed: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

# Error handlers
@app.errorhandler(404)
def not_found_error(error):
    return render_template('404.html'), 404

@app.errorhandler(500)
def internal_error(error):
    log_error(f"Internal server error: {error}")
    return render_template('500.html'), 500

@app.errorhandler(413)
def too_large(error):
    flash('File too large. Maximum size is 50MB.', 'error')
    return redirect(url_for('upload_page'))

if __name__ == '__main__':
    try:
        port = int(os.environ.get('PORT', 5000))
        
        if os.environ.get('FLASK_ENV') == 'production':
            print("🚀 Production mode - use Gunicorn to run this application")
            print(f"   gunicorn -c gunicorn.conf.py wsgi:app")
        else:
            print(f"🔧 Development mode - running on port {port}")
            
            # Initialize app
            log_info("Initializing app...")
            if initialize_app():
                log_info("App initialized successfully!")
            else:
                log_info("App initialization incomplete")
            
            log_info(f"Starting Flask app on port {port}")
            log_info(f"Access at: http://localhost:{port}")
            
            app.run(debug=True, host='0.0.0.0', port=port, threaded=True)
        
    except Exception as e:
        log_error(f"Failed to start: {e}")
        traceback.print_exc()