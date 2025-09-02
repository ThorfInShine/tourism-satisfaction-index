#!/usr/bin/env python3
"""
Script untuk membuat admin user pertama
"""
import os
import logging
from auth_service import auth_service

# Setup logging
logging.basicConfig(level=logging.INFO)

def create_admin_user():
    print("=== Setup Admin User ===")
    
    email = input("Masukkan email admin (default: admin@gmail.com): ").strip()
    if not email:
        email = "admin@gmail.com"
    
    password = input("Masukkan password admin (default: Adminbpsbatu): ").strip()
    if not password:
        password = "Adminbpsbatu"
    
    if len(password) < 8:
        print("❌ Password minimal 8 karakter")
        return
    
    name = input("Masukkan nama admin (default: Admin): ").strip()
    if not name:
        name = "Admin"
    
    # Create admin user
    try:
        print(f"🔄 Membuat user admin...")
        success = auth_service.create_user(email, password, name, 'admin')
        
        if success:
            print("✅ Admin user berhasil dibuat!")
            print(f"📧 Email: {email}")
            print(f"👤 Nama: {name}")
            print(f"🔑 Role: admin")
            print(f"🔐 Password: {password}")
        else:
            print("❌ Gagal membuat admin user")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    create_admin_user()