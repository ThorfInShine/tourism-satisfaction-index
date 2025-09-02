import bcrypt
from supabase import create_client, Client
from config import Config
from flask_login import UserMixin
import logging

class User(UserMixin):
    def __init__(self, user_data):
        self.id = user_data.get('id')
        self.email = user_data.get('email')
        self.name = user_data.get('name')
        self.role = user_data.get('role', 'user')
        self._is_active = user_data.get('is_active', True)  # Use private attribute
    
    def get_id(self):
        return str(self.id)
    
    def is_admin(self):
        return self.role == 'admin'
    
    # Override Flask-Login's is_active property
    @property
    def is_active(self):
        return self._is_active
    
    def is_authenticated(self):
        return True
    
    def is_anonymous(self):
        return False

class AuthService:
    def __init__(self):
        try:
            self.supabase: Client = create_client(
                Config.SUPABASE_URL, 
                Config.SUPABASE_ANON_KEY
            )
            self.admin_supabase: Client = create_client(
                Config.SUPABASE_URL, 
                Config.SUPABASE_SERVICE_KEY
            ) if hasattr(Config, 'SUPABASE_SERVICE_KEY') and Config.SUPABASE_SERVICE_KEY else self.supabase
            
            logging.info("✅ Supabase clients initialized")
        except Exception as e:
            logging.error(f"❌ Failed to initialize Supabase client: {e}")
            self.supabase = None
            self.admin_supabase = None
    
    def hash_password(self, password: str) -> str:
        """Hash password using bcrypt"""
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    def verify_password(self, password: str, hashed: str) -> bool:
        """Verify password against hash"""
        try:
            result = bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
            logging.info(f"🔐 Password verification: {'SUCCESS' if result else 'FAILED'}")
            return result
        except Exception as e:
            logging.error(f"❌ Password verification error: {e}")
            return False
    
    def authenticate_user(self, email: str, password: str) -> User:
        """Authenticate user with email and password"""
        if not self.supabase:
            logging.error("❌ Supabase client not initialized")
            return None
            
        try:
            logging.info(f"🔍 Auth attempt for: {email}")
            
            # Get user from database
            response = self.supabase.table('users').select('*').eq('email', email).eq('is_active', True).execute()
            
            logging.info(f"📊 Database query result: {len(response.data) if response.data else 0} users found")
            
            if not response.data:
                logging.warning(f"⚠️ No user found for email: {email}")
                return None
            
            user_data = response.data[0]
            stored_hash = user_data.get('password_hash')
            
            logging.info(f"👤 User found: {user_data.get('email')} | Role: {user_data.get('role')}")
            logging.info(f"🔑 Hash check: {stored_hash[:20]}... (length: {len(stored_hash)})")
            
            # Verify password
            if self.verify_password(password, stored_hash):
                logging.info("✅ Authentication successful")
                return User(user_data)
            else:
                logging.warning("❌ Password verification failed")
            
            return None
            
        except Exception as e:
            logging.error(f"❌ Authentication error: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def get_user_by_id(self, user_id: str) -> User:
        """Get user by ID"""
        if not self.supabase:
            return None
            
        try:
            response = self.supabase.table('users').select('*').eq('id', user_id).eq('is_active', True).execute()
            
            if response.data:
                return User(response.data[0])
            
            return None
            
        except Exception as e:
            logging.error(f"Get user error: {e}")
            return None
    
    def create_user(self, email: str, password: str, name: str, role: str = 'user') -> bool:
        """Create new user"""
        if not self.admin_supabase:
            logging.error("❌ Admin Supabase client not initialized")
            return False
            
        try:
            password_hash = self.hash_password(password)
            
            logging.info(f"🔄 Creating user: {email}")
            logging.info(f"🔑 Generated hash: {password_hash[:20]}... (length: {len(password_hash)})")
            
            response = self.admin_supabase.table('users').insert({
                'email': email,
                'password_hash': password_hash,
                'name': name,
                'role': role,
                'is_active': True
            }).execute()
            
            logging.info(f"✅ User creation response: {response}")
            return True
            
        except Exception as e:
            logging.error(f"❌ Create user error: {e}")
            import traceback
            traceback.print_exc()
            return False

# Global auth service instance
auth_service = AuthService()