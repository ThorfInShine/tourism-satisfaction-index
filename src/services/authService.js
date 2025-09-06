// FILE: src/services/authService.js
class AuthService {
  constructor() {
    this.currentUser = null;
    // Determine environment
    this.isDevelopment = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1';
    
    // Use appropriate URL based on environment
    this.baseURL = this.isDevelopment 
      ? 'http://localhost:5000' 
      : 'https://apibatas.bpskotabatu.com';
  }

  async login(email, password) {
    try {
      const response = await fetch(`${this.baseURL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        // Disable credentials for now due to CORS issues
        credentials: 'omit', // Changed from 'include' to 'omit'
        body: JSON.stringify({
          email,
          password
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Store user data and token
        this.currentUser = data.user;
        
        // Store token if provided
        if (data.token) {
          localStorage.setItem('auth_token', data.token);
        }
        
        // Store user data
        localStorage.setItem('user', JSON.stringify(data.user));
        
        return data.user;
      } else {
        throw new Error(data.error || 'Login gagal');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async logout() {
    try {
      const token = localStorage.getItem('auth_token');
      
      const response = await fetch(`${this.baseURL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        credentials: 'omit' // Changed from 'include'
      });

      const data = await response.json();
      
      // Clear local storage regardless of response
      this.currentUser = null;
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      sessionStorage.clear();
      
      return data;
    } catch (error) {
      console.error('Logout error:', error);
      // Clear data anyway
      this.currentUser = null;
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      sessionStorage.clear();
      throw error;
    }
  }

  async getCurrentUser() {
    try {
      // First check local storage
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          this.currentUser = JSON.parse(storedUser);
          return this.currentUser;
        } catch (e) {
          console.error('Error parsing stored user:', e);
        }
      }
      
      const token = localStorage.getItem('auth_token');
      
      const response = await fetch(`${this.baseURL}/api/auth/user`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        credentials: 'omit' // Changed from 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.user) {
          this.currentUser = data.user;
          localStorage.setItem('user', JSON.stringify(data.user));
          return data.user;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Get current user error:', error);
      // Try to get from local storage as fallback
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          this.currentUser = JSON.parse(storedUser);
          return this.currentUser;
        } catch (e) {
          return null;
        }
      }
      return null;
    }
  }

  isAuthenticated() {
    // Check both memory and local storage
    if (this.currentUser) return true;
    
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('auth_token');
    
    return !!(storedUser || token);
  }

  isAdmin() {
    // Check memory first
    if (this.currentUser?.role === 'admin') return true;
    
    // Check local storage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        return user.role === 'admin' || user.is_admin === true;
      } catch (e) {
        return false;
      }
    }
    
    return false;
  }

  getUser() {
    if (this.currentUser) return this.currentUser;
    
    // Try to get from local storage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        return JSON.parse(storedUser);
      } catch (e) {
        return null;
      }
    }
    
    return null;
  }
}

export const authService = new AuthService();