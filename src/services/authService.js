// FILE: src/services/authService.js
class AuthService {
constructor() {
  this.currentUser = null;
  // Gunakan URL API production
  this.baseURL = 'https://apibatas.bpskotabatu.com';
}

  async login(email, password) {
    try {
      const response = await fetch(`${this.baseURL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Important for cookies
        body: JSON.stringify({
          email,
          password
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Login successful
        this.currentUser = data.user;
        return data.user;
      } else {
        // Login failed
        throw new Error(data.error || 'Login gagal');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async logout() {
    try {
      const response = await fetch(`${this.baseURL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });

      const data = await response.json();
      
      if (data.success) {
        this.currentUser = null;
      }
      
      return data;
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  async getCurrentUser() {
    try {
      const response = await fetch(`${this.baseURL}/api/auth/user`, {
        method: 'GET',
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.user) {
          this.currentUser = data.user;
          return data.user;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  isAuthenticated() {
    return this.currentUser !== null;
  }

  isAdmin() {
    return this.currentUser?.role === 'admin';
  }

  getUser() {
    return this.currentUser;
  }
}

export const authService = new AuthService();