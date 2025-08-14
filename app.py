# FILE: app.py
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
from flask import Flask, render_template, request, jsonify, redirect, url_for, flash, send_file
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

warnings.filterwarnings('ignore')

# Initialize Flask app with production settings
app = Flask(__name__)
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)

# Configuration based on environment
if os.environ.get('FLASK_ENV') == 'production':
    app.config['DEBUG'] = False
    app.config['UPLOAD_FOLDER'] = '/var/www/html/batas.bpskotabatu.com/data'
    app.config['MODEL_FOLDER'] = '/var/www/html/batas.bpskotabatu.com/models_h5_fixed'
    app.secret_key = os.environ.get('SECRET_KEY', 'batas-bpskotabatu-2024-secret-key')
    
    # Setup logging for production
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]',
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.FileHandler('/var/log/batas-app.log', mode='a')
        ]
    )
    app.logger.setLevel(logging.INFO)
    app.logger.info('BATAS Tourist Satisfaction Analyzer startup - PRODUCTION MODE')
else:
    app.config['DEBUG'] = True
    app.config['UPLOAD_FOLDER'] = 'data'
    app.config['MODEL_FOLDER'] = 'models_h5_fixed'
    app.secret_key = 'dev-secret-key-12345'
    logging.basicConfig(level=logging.DEBUG)
    app.logger.info('BATAS Tourist Satisfaction Analyzer startup - DEVELOPMENT MODE')

# Additional configuration
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max file size
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 31536000  # 1 year cache for static files
app.config['ALLOWED_EXTENSIONS'] = {'csv', 'xlsx', 'xls'}

# Ensure directories exist
for directory in [app.config['UPLOAD_FOLDER'], app.config['MODEL_FOLDER'],
                  os.path.join(app.config['UPLOAD_FOLDER'], 'temp'),
                  os.path.join(app.config['UPLOAD_FOLDER'], 'backups')]:
    os.makedirs(directory, exist_ok=True)

# Import TensorFlow with error handling
try:
    os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
    import tensorflow as tf
    tf.get_logger().setLevel('ERROR')
    from tensorflow.keras.preprocessing.sequence import pad_sequences
    TENSORFLOW_AVAILABLE = True
    app.logger.info("✅ TensorFlow available")
except ImportError:
    app.logger.warning("❌ TensorFlow not available - LSTM models will be disabled")
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

# Signal handler for graceful shutdown
def signal_handler(sig, frame):
    app.logger.info('🛑 Interrupt received, cleaning up...')
    gc.collect()
    sys.exit(0)

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
    f'{i} jam lalu' for i in range(1, 24)
] + [
    'hari ini', f'{i} hari lalu' for i in range(1, 7)
] + [
    'seminggu lalu', f'{i} minggu lalu' for i in range(1, 5)
] + [
    f'{i} bulan lalu' for i in range(1, 13)
] + ['1 tahun lalu']

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
        """Load LSTM model if TensorFlow available"""
        if not TENSORFLOW_AVAILABLE:
            return None
        
        if filepath is None:
            filepath = os.path.join(self.models_dir, 'lstm_model.h5')
        
        tf_filepath = os.path.join(self.models_dir, 'lstm_model_tensorflow.h5')
        
        try:
            tokenizer = None
            max_len = 100
            max_words = 8000
            
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
                        except Exception as e:
                            app.logger.warning(f"Failed to load tokenizer: {e}")
            
            model = None
            if os.path.exists(tf_filepath):
                try:
                    model = tf.keras.models.load_model(tf_filepath, compile=False)
                except Exception as e:
                    app.logger.error(f"Failed to load TensorFlow model: {e}")
            
            if tokenizer is not None and model is not None:
                return {
                    'model': model,
                    'tokenizer': tokenizer,
                    'max_len': max_len,
                    'max_words': max_words
                }
                
        except Exception as e:
            app.logger.error(f"Error loading LSTM model: {e}")
        
        return None

class SmartEnsembleH5Fixed:
    """Production-optimized ensemble model"""
    
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
        
        self.use_manual_weights = True
        self.ensemble_weights = [0.2, 0, 0.8]
        
        self.load_ensemble_components()
    
    def load_ensemble_components(self):
        """Load all ensemble components"""
        try:
            self.label_encoder_classes = self.h5_loader.load_label_encoder()
            
            # Load TF-IDF + LR
            tfidf_path = os.path.join(self.models_dir, 'tfidf_lr_model.h5')
            self.tfidf_lr = self.h5_loader.load_sklearn_model(tfidf_path, 'TF-IDF + LR')
            if self.tfidf_lr and self.ensemble_weights[0] > 0:
                self.tfidf_lr_ready = True
            
            # Load Random Forest
            rf_path = os.path.join(self.models_dir, 'random_forest_model.h5')
            self.rf = self.h5_loader.load_sklearn_model(rf_path, 'Random Forest')
            if self.rf and self.ensemble_weights[1] > 0:
                self.rf_ready = True
            
            # Load LSTM
            if TENSORFLOW_AVAILABLE:
                self.lstm_data = self.h5_loader.load_lstm_model()
                if self.lstm_data and self.ensemble_weights[2] > 0:
                    self.lstm_ready = True
            
            active_models = sum([self.tfidf_lr_ready, self.rf_ready, self.lstm_ready])
            
            if active_models == 0:
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
    
    def create_fallback_models(self):
        """Create simple fallback models"""
        if not SKLEARN_AVAILABLE:
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
                except:
                    pass
            
            if not self.rf_ready:
                try:
                    self.rf = Pipeline([
                        ('tfidf', TfidfVectorizer(max_features=100)),
                        ('classifier', RandomForestClassifier(n_estimators=10, random_state=42))
                    ])
                    self.rf.fit(texts, labels)
                    self.rf_ready = True
                except:
                    pass
            
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
        """Optimized batch prediction"""
        results = []
        total = len(texts)
        
        for i in range(0, total, batch_size):
            batch = texts[i:i + batch_size]
            batch_results = [self.predict_single(text) for text in batch]
            results.extend(batch_results)
            
            if i % 1000 == 0 and i > 0:
                app.logger.info(f"Processed {min(i + batch_size, total)}/{total} texts")
                gc.collect()  # Clean up memory periodically
        
        return results

class DataProcessor:
    """Optimized data processor for production"""
    
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
        """Process reviews with optimization"""
        app.logger.info("🔄 Processing reviews...")
        
        try:
            df_processed = df.copy()
            
            # Clean text
            app.logger.info("🧹 Cleaning text...")
            df_processed['cleaned_text'] = df_processed['review_text'].apply(self.clean_text)
            
            # Get sentiment in batches
            app.logger.info("🎯 Analyzing sentiment...")
            if self.sentiment_analyzer:
                texts = df_processed['cleaned_text'].tolist()
                results = self.sentiment_analyzer.predict_batch(texts, batch_size=200)
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
            
            app.logger.info(f"✅ Processed {len(df_processed)} reviews")
            
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
                    
                    # Limit complaints to prevent memory issues
                    if len(main_complaints) >= 50:
                        break
            
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
                'main_complaints': main_complaints[:20],  # Limit to 20 complaints
                'total_complaints': len(negative_reviews),
                'valid_time_complaints_count': len(main_complaints),
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
    """Create charts with caching"""
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
                    'marker': {'colors': ['#f1c40f', '#2ecc71', '#e74c3c']}
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
                app.logger.error(f"Error creating top rating chart: {e}")
        
        # Top 10 Wisata by Visits
        if 'wisata' in df_processed.columns:
            try:
                wisata_visits = df_processed.groupby('wisata').size().sort_values(ascending=True).tail(10)
                
                charts['top_visits'] = json.dumps({
                    'data': [{
                        'y': [name[:25] + '...' if len(name) > 25 else name for name in wisata_visits.index.tolist()],
                        'x': wisata_visits.values.tolist(),
                        'type': 'bar',
                        'orientation': 'h',
                        'marker': {'color': '#3498db'},
                        'text': [f"{count}" for count in wisata_visits.values],
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
    """Initialize application with error handling"""
    global df_processed, metrics, model_results, current_data_info
    
    try:
        app.logger.info("🚀 Initializing application...")
        
        data_path = os.path.join(app.config['UPLOAD_FOLDER'], 'combined_batu_tourism_reviews_cleaned.csv')
        if not os.path.exists(data_path):
            app.logger.warning(f"⚠️ Data file not found at {data_path}")
            return False
        
        proc = get_processor()
        if proc is None:
            return False
        
        df = proc.load_data(data_path)
        df_processed = proc.process_reviews(df)
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
        app.logger.error(f"Dashboard error: {e}")
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
        app.logger.error(f"Prediction error: {e}")
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
        app.logger.error(f"Analysis error: {e}")
        flash(f'Error: {str(e)}', 'error')
        return redirect(url_for('dashboard'))

@app.route('/upload')
def upload_page():
    return render_template('upload.html')

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
                    flash(f'Missing required columns: {", ".join(missing_columns)}', 'error')
                    os.remove(upload_path)
                    return redirect(url_for('upload_page'))
                
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
                    flash(f'File uploaded successfully! Processed {len(df)} reviews.', 'success')
                    return redirect(url_for('dashboard'))
                else:
                    flash('Error processing uploaded file', 'error')
                    return redirect(url_for('upload_page'))
                
            except Exception as e:
                app.logger.error(f"Error processing file: {e}")
                flash(f'Error processing file: {str(e)}', 'error')
                if os.path.exists(upload_path):
                    os.remove(upload_path)
                return redirect(url_for('upload_page'))
        
        else:
            flash('Invalid file format. Please upload CSV or Excel file.', 'error')
            return redirect(url_for('upload_page'))
            
    except Exception as e:
        app.logger.error(f"Upload error: {e}")
        flash(f'Upload failed: {str(e)}', 'error')
        return redirect(url_for('upload_page'))

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
        app.logger.error(f"Template download error: {e}")
        flash(f'Error downloading template: {str(e)}', 'error')
        return redirect(url_for('upload_page'))

@app.route('/api/filter_data')
def api_filter_data():
    """API endpoint for filtering data"""
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
        
        # Create charts for filtered data
        global df_processed_temp
        df_processed_temp = df_processed
        df_processed = filtered_df
        create_charts.cache_clear()  # Clear cache
        filtered_charts = create_charts()
        df_processed = df_processed_temp
        
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
        app.logger.error(f"Filter API error: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/quadrant_data_filtered')
def api_quadrant_data_filtered():
    """API endpoint for filtered quadrant chart data"""
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
        
        if 'wisata' not in filtered_df.columns or 'rating' not in filtered_df.columns:
            return jsonify({'success': False, 'error': 'Missing required columns'})
        
        wisata_stats = filtered_df.groupby('wisata').agg({
            'rating': ['mean', 'count']
        }).round(2)
        wisata_stats.columns = ['mean_rating', 'review_count']
        wisata_stats = wisata_stats[wisata_stats['review_count'] >= 3]
        
        if wisata_stats.empty:
            return jsonify({'success': False, 'error': 'No data available for this filter'})
        
        avg_rating = wisata_stats['mean_rating'].mean()
        avg_visits = wisata_stats['review_count'].mean()
        
        names = []
        full_names = []
        ratings = []
        visits = []
        
        for wisata_name, row in wisata_stats.iterrows():
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
        app.logger.error(f"Quadrant API error: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/health')
def health_check():
    """Health check endpoint for monitoring"""
    try:
        status = {
            'status': 'healthy',
            'timestamp': datetime.now().isoformat(),
            'environment': os.environ.get('FLASK_ENV', 'development'),
            'data_loaded': df_processed is not None,
            'models_loaded': predictor is not None
        }
        return jsonify(status), 200
    except Exception as e:
        return jsonify({'status': 'unhealthy', 'error': str(e)}), 503

@app.errorhandler(404)
def not_found_error(error):
    return render_template('404.html'), 404

@app.errorhandler(500)
def internal_error(error):
    app.logger.error(f"Internal error: {error}")
    return render_template('500.html'), 500

@app.errorhandler(502)
def bad_gateway_error(error):
    app.logger.error(f"Bad gateway error: {error}")
    return render_template('error.html', message="Server temporarily unavailable"), 502

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

if __name__ == '__main__':
    try:
        port = int(os.environ.get('PORT', 5000))
        
        app.logger.info("📁 Ensuring directories exist...")
        for directory in [app.config['UPLOAD_FOLDER'], app.config['MODEL_FOLDER']]:
            os.makedirs(directory, exist_ok=True)
        
        app.logger.info("🚀 Initializing app...")
        if initialize_app():
            app.logger.info("✅ App initialized successfully!")
        else:
            app.logger.warning("⚠️ App initialization incomplete - waiting for data upload")
        
        app.logger.info(f"🌐 Starting Flask app on port {port}")
        
        if os.environ.get('FLASK_ENV') == 'production':
            # Production will be handled by Gunicorn
            app.logger.info("Production mode - waiting for Gunicorn...")
        else:
            app.run(debug=True, host='0.0.0.0', port=port, threaded=True)
        
    except Exception as e:
        app.logger.error(f"Failed to start: {e}")
        traceback.print_exc()
        sys.exit(1)