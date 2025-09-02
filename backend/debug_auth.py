#!/usr/bin/env python3
"""
Debug authentication system
"""
import os
import sys
import logging
import bcrypt
from dotenv import load_dotenv

# Load environment
load_dotenv()

# Setup logging
logging.basicConfig(level=logging.DEBUG)

def debug_supabase_connection():
    """Debug Supabase connection"""
    try:
        from supabase import create_client
        
        url = os.getenv('SUPABASE_URL')
        anon_key = os.getenv('SUPABASE_ANON_KEY')
        service_key = os.getenv('SUPABASE_SERVICE_KEY')
        
        print("=== SUPABASE CONNECTION DEBUG ===")
        print(f"URL: {url[:20] + '...' if url else 'NOT SET'}")
        print(f"Anon Key: {anon_key[:20] + '...' if anon_key else 'NOT SET'}")
        print(f"Service Key: {service_key[:20] + '...' if service_key else 'NOT SET'}")
        
        if not url or not anon_key:
            print("❌ Missing Supabase credentials!")
            return False
        
        # Test connection with anon key
        supabase = create_client(url, anon_key)
        print("✅ Supabase client created with anon key")
        
        # Test service key if available
        if service_key:
            admin_supabase = create_client(url, service_key)
            print("✅ Supabase client created with service key")
        else:
            print("⚠️ Service key not available")
            admin_supabase = supabase
        
        return supabase, admin_supabase
        
    except Exception as e:
        print(f"❌ Supabase connection error: {e}")
        return False

def debug_user_in_database(supabase):
    """Check if user exists in database"""
    try:
        print("\n=== DATABASE USER CHECK ===")
        
        # Check if users table exists and get all users
        response = supabase.table('users').select('*').execute()
        
        print(f"Database response: {response}")
        print(f"Users found: {len(response.data) if response.data else 0}")
        
        if response.data:
            for user in response.data:
                print(f"User: {user.get('email')} | Role: {user.get('role')} | Active: {user.get('is_active')}")
                print(f"Password hash starts with: {user.get('password_hash', '')[:20]}...")
        
        return response.data
        
    except Exception as e:
        print(f"❌ Database check error: {e}")
        return None

def test_password_hash():
    """Test password hashing"""
    try:
        print("\n=== PASSWORD HASH TEST ===")
        
        password = "Adminbpsbatu"
        
        # Generate new hash
        new_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        print(f"New hash generated: {new_hash}")
        
        # Test verification
        is_valid = bcrypt.checkpw(password.encode('utf-8'), new_hash.encode('utf-8'))
        print(f"Hash verification: {'✅ VALID' if is_valid else '❌ INVALID'}")
        
        return new_hash
        
    except Exception as e:
        print(f"❌ Password hash error: {e}")
        return None

def create_admin_user_fixed(admin_supabase, correct_hash):
    """Create admin user with correct hash"""
    try:
        print("\n=== CREATING ADMIN USER ===")
        
        # Delete existing user first
        try:
            admin_supabase.table('users').delete().eq('email', 'admin@gmail.com').execute()
            print("🗑️ Deleted existing user")
        except:
            print("ℹ️ No existing user to delete")
        
        # Insert new user with correct hash
        response = admin_supabase.table('users').insert({
            'email': 'admin@gmail.com',
            'password_hash': correct_hash,
            'name': 'Admin',
            'role': 'admin',
            'is_active': True
        }).execute()
        
        print(f"Insert response: {response}")
        print("✅ Admin user created successfully!")
        
        return True
        
    except Exception as e:
        print(f"❌ Create user error: {e}")
        return False

def test_authentication(supabase):
    """Test authentication process"""
    try:
        print("\n=== AUTHENTICATION TEST ===")
        
        email = "admin@gmail.com"
        password = "Adminbpsbatu"
        
        # Get user from database
        response = supabase.table('users').select('*').eq('email', email).eq('is_active', True).execute()
        
        print(f"Auth query response: {response}")
        
        if not response.data:
            print("❌ No user found with that email")
            return False
        
        user_data = response.data[0]
        stored_hash = user_data.get('password_hash')
        
        print(f"User found: {user_data.get('email')}")
        print(f"Stored hash: {stored_hash[:30]}...")
        
        # Test password verification
        is_valid = bcrypt.checkpw(password.encode('utf-8'), stored_hash.encode('utf-8'))
        
        print(f"Password verification: {'✅ SUCCESS' if is_valid else '❌ FAILED'}")
        
        return is_valid
        
    except Exception as e:
        print(f"❌ Authentication test error: {e}")
        return False

def main():
    """Main debug function"""
    print("🔍 Starting authentication debug...\n")
    
    # Test Supabase connection
    connection_result = debug_supabase_connection()
    if not connection_result:
        print("❌ Cannot proceed without Supabase connection")
        return
    
    supabase, admin_supabase = connection_result
    
    # Check existing users
    existing_users = debug_user_in_database(supabase)
    
    # Test password hashing
    correct_hash = test_password_hash()
    if not correct_hash:
        print("❌ Cannot proceed without password hash")
        return
    
    # Create/fix admin user
    create_success = create_admin_user_fixed(admin_supabase, correct_hash)
    if not create_success:
        print("❌ Failed to create admin user")
        return
    
    # Test authentication
    auth_success = test_authentication(supabase)
    
    if auth_success:
        print("\n🎉 SUCCESS! Authentication should work now.")
        print("Try logging in with:")
        print("Email: admin@gmail.com")
        print("Password: Adminbpsbatu")
    else:
        print("\n❌ Authentication still failing. Check logs above for issues.")

if __name__ == "__main__":
    main()