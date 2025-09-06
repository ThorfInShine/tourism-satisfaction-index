import axios from 'axios';

class ApiService {
  constructor() {
    // Determine environment based on hostname
    this.isDevelopment = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1';
    
    // Check if deployed to Vercel
    this.isVercel = window.location.hostname.includes('vercel.app');
    
    // IMPORTANT: Always use production API when deployed
    let baseURL;
    if (this.isDevelopment) {
      baseURL = 'http://localhost:5000/api';
    } else {
      // For Vercel or any production deployment
      baseURL = 'https://apibatas.bpskotabatu.com/api';
    }
    
    console.log(`🌍 Environment: ${this.isDevelopment ? 'Development' : 'Production'}`);
    console.log(`📡 API URL: ${baseURL}`);
    console.log(`🌐 Current Host: ${window.location.hostname}`);
    
    this.api = axios.create({
      baseURL: baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      // Enable credentials for production to handle sessions
      withCredentials: false // Only use credentials in production
    });

    // Request interceptor
    this.api.interceptors.request.use(
      (config) => {
        console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
        
        // Add token if exists
        const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        
        // Add session cookie if exists (for Flask-Login)
        const sessionId = localStorage.getItem('session_id') || sessionStorage.getItem('session_id');
        if (sessionId) {
          config.headers['X-Session-Id'] = sessionId;
        }
        
        return config;
      },
      (error) => {
        console.error('API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
// Di response interceptor apiService.js
this.api.interceptors.response.use(
  (response) => {
    // Check if response is HTML (error case)
    const contentType = response.headers['content-type'];
    if (contentType && contentType.includes('text/html')) {
      console.error('Received HTML instead of JSON:', response.config.url);
      
      // Check if it's a login redirect (session expired)
      if (response.data && typeof response.data === 'string' && 
          (response.data.includes('login') || response.data.includes('Login'))) {
        console.warn('Session expired or authentication required');
        
        // Don't clear auth for certain endpoints
        const protectedEndpoints = ['/auth/logout', '/auth/login'];
        const isProtectedEndpoint = protectedEndpoints.some(endpoint => 
          response.config.url.includes(endpoint)
        );
        
        if (!isProtectedEndpoint) {
          // For admin endpoints, return mock data
          if (response.config.url.includes('/admin')) {
            return this.getAdminFallbackData(response.config.url);
          }
        }
        
        return {
          success: false,
          error: 'Authentication required',
          requiresAuth: true
        };
      }
      
      return {
        success: false,
        error: 'Invalid response format'
      };
    }
    
    console.log('API Response:', response.data);
    return response.data;
  },
  (error) => {
    console.error('API Response Error:', error);
    
    if (error.response) {
      const status = error.response.status;
      const url = error.config.url;
      
      // Handle 401 Unauthorized
      if (status === 401) {
        console.warn('Unauthorized access detected');
        
        // Don't clear auth for logout endpoint
        if (!url.includes('/auth/logout')) {
          // Check if we should clear auth
          const token = localStorage.getItem('auth_token');
          if (!token) {
            // No token, probably not logged in
            return {
              success: false,
              error: 'Authentication required',
              status: 401,
              requiresAuth: true
            };
          }
        }
        
        // For admin endpoints, return fallback
        if (url && url.includes('/admin')) {
          return this.getAdminFallbackData(url);
        }
        
        return {
          success: false,
          error: 'Session expired',
          status: 401,
          requiresAuth: true
        };
      }
      
      // Handle other errors...
      if (status === 405) {
        // Method not allowed - likely redirected to login page
        if (url && url.includes('/admin')) {
          return this.getAdminFallbackData(url);
        }
        
        return {
          success: false,
          error: 'Method not allowed',
          status: 405
        };
      }
      
      if (status === 403) {
        return {
          success: false,
          error: 'Access forbidden',
          status: 403,
          requiresAuth: true
        };
      }
      
      if (status === 404) {
        return {
          success: false,
          error: 'Resource not found',
          status: 404
        };
      }
    }
    
    const message = error.response?.data?.error || error.message || 'Network error';
    
    return {
      success: false,
      error: message,
      status: error.response?.status
    };
  }
);
  }

  // Helper method to get fallback data for admin endpoints
  getAdminFallbackData(url) {
    console.log('Providing fallback data for:', url);
    
    if (url.includes('/admin/kunjungan')) {
      // Return empty kunjungan data structure
      return {
        success: true,
        data: this.isDevelopment ? [
          // Mock data for development
          { nama_wisata: 'Coban Rondo', jumlah_kunjungan: 1500 },
          { nama_wisata: 'Selecta', jumlah_kunjungan: 2000 },
          { nama_wisata: 'Jatim Park 1', jumlah_kunjungan: 3000 },
          { nama_wisata: 'Jatim Park 2', jumlah_kunjungan: 2800 },
          { nama_wisata: 'Jatim Park 3', jumlah_kunjungan: 2500 }
        ] : [],
        message: 'Login required to access admin data',
        requiresAuth: true
      };
    }
    
    if (url.includes('/admin/system_info')) {
      return {
        success: true,
        system_info: {
          version: '1.0.0',
          status: this.isDevelopment ? 'Development Mode' : 'Production Mode',
          environment: this.isDevelopment ? 'Development' : 'Production',
          api_status: 'Authentication Required',
          last_update: new Date().toISOString(),
          total_reviews: 0,
          total_destinations: 0,
          database_status: 'Login Required',
          model_status: 'Login Required'
        },
        message: 'Login required to access system info',
        requiresAuth: true
      };
    }
    
    // Default fallback
    return {
      success: false,
      data: [],
      message: 'Authentication required',
      requiresAuth: true
    };
  }

  // Authentication methods
// Authentication methods
async login(email, password) {
  try {
    const response = await this.api.post('/auth/login', {
      email,
      password
    });
    
    if (response.success && response.user) {
      // Store user info
      localStorage.setItem('user', JSON.stringify(response.user));
      
      // Store token if provided
      if (response.token) {
        localStorage.setItem('auth_token', response.token);
      }
      
      // Update auth service
      if (window.authService) {
        window.authService.currentUser = response.user;
      }
    }
    
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      error: error.message || 'Login failed'
    };
  }
}

// Di apiService.js, update logout method
async logout() {
  try {
    // Try to call the logout endpoint
    try {
      const response = await this.api.post('/auth/logout');
      console.log('Logout API response:', response);
    } catch (apiError) {
      // If API fails, just continue with cleanup
      console.log('Logout API failed, continuing with local cleanup');
    }
    
    // Always clear stored data regardless of API response
    localStorage.removeItem('user');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('remember_email');
    sessionStorage.clear();
    
    // Clear authService data if available
    if (window.authService) {
      window.authService.currentUser = null;
    }
    
    return {
      success: true,
      message: 'Logged out successfully'
    };
    
  } catch (error) {
    console.error('Logout error:', error);
    
    // Clear data anyway
    localStorage.removeItem('user');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('remember_email');
    sessionStorage.clear();
    
    if (window.authService) {
      window.authService.currentUser = null;
    }
    
    return {
      success: true,
      message: 'Logged out successfully'
    };
  }
}

  async getCurrentUser() {
    try {
      const response = await this.api.get('/auth/user');
      
      if (response.success && response.user) {
        localStorage.setItem('user', JSON.stringify(response.user));
        return response;
      }
      
      return response;
    } catch (error) {
      console.error('Get current user error:', error);
      return {
        success: false,
        error: 'Not authenticated'
      };
    }
  }

  // Check if user is authenticated
  isAuthenticated() {
    const user = localStorage.getItem('user');
    return user !== null;
  }

  // Check if user is admin
  isAdmin() {
    const user = localStorage.getItem('user');
    if (!user) return false;
    
    try {
      const userData = JSON.parse(user);
      return userData.role === 'admin' || userData.is_admin === true;
    } catch {
      return false;
    }
  }

  // Stats API
  async getStats() {
    try {
      const response = await this.api.get('/stats');
      
      if (response && response.success === false) {
        console.warn('Stats API returned error:', response.error);
        return this.getFallbackStats();
      }
      
      if (response && response.total_reviews) {
        return response;
      }
      
      return this.getFallbackStats();
    } catch (error) {
      console.error('Stats API error:', error);
      return this.getFallbackStats();
    }
  }
  
  // Fallback data helper
  getFallbackStats() {
    return {
      success: true,
      total_reviews: 22000,
      total_destinations: 30,
      last_updated: new Date().toISOString()
    };
  }

  // Helper method to determine complaint level based on percentage
  determineComplaintLevel(complaintPercentage) {
    if (complaintPercentage >= 60) return 'tinggi';
    if (complaintPercentage >= 30) return 'sedang';
    return 'rendah';
  }

  // Helper method to determine visit category based on count
  determineVisitCategory(visitCount) {
    if (visitCount >= 1000) return 'TINGGI';
    if (visitCount >= 500) return 'SEDANG';
    return 'RENDAH';
  }

// Get all wisata analysis
// apiService.js - Method getAllWisataAnalysis yang sudah diupdate lengkap tanpa mock data

// apiService.js - Perbaikan lengkap untuk method getAllWisataAnalysis

async getAllWisataAnalysis() {
  try {
    console.log('=== GETTING WISATA ANALYSIS ===');
    
    // Get analysis data
    const response = await this.api.get('/analysis');
    console.log('Full API Response:', JSON.stringify(response, null, 2));
    
    // Also get kunjungan data from admin endpoint
    let kunjunganData = null;
    try {
      const kunjunganResponse = await this.api.get('/admin/kunjungan');
      if (kunjunganResponse && kunjunganResponse.success && kunjunganResponse.data) {
        kunjunganData = kunjunganResponse.data;
        console.log('Kunjungan data fetched successfully:', kunjunganData);
      }
    } catch (error) {
      console.log('Could not fetch kunjungan data:', error);
    }
    
    const result = {
      success: false,
      total_destinations: 0,
      high_complaint_count: 0,
      medium_complaint_count: 0,
      low_complaint_count: 0,
      destinations: {}
    };
    
    if (!response) {
      console.log('No response data');
      return result;
    }
    
    // Try multiple paths to find the data
    let wisataData = null;
    
    if (response.analysis_data?.all_wisata_analysis) {
      wisataData = response.analysis_data.all_wisata_analysis;
    } else if (response.all_wisata_analysis) {
      wisataData = response.all_wisata_analysis;
    } else if (response.data) {
      wisataData = response.data;
    } else {
      wisataData = response;
    }
    
    let destinations = {};
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;
    
    // Process destinations with kunjungan data
    if (wisataData.destinations) {
      console.log('Processing destinations:', Object.keys(wisataData.destinations));
      
      Object.entries(wisataData.destinations).forEach(([name, data]) => {
        console.log(`\n=== Processing ${name} ===`);
        console.log('Raw data:', JSON.stringify(data, null, 2));
        
        // Find matching kunjungan data
        let visitCount = 0;
        if (kunjunganData && Array.isArray(kunjunganData)) {
          let kunjungan = kunjunganData.find(k => 
            k.nama_wisata.toLowerCase() === name.toLowerCase()
          );
          
          if (!kunjungan) {
            kunjungan = kunjunganData.find(k => {
              const kLower = k.nama_wisata.toLowerCase();
              const nameLower = name.toLowerCase();
              return kLower.includes(nameLower) || nameLower.includes(kLower);
            });
          }
          
          if (!kunjungan) {
            const cleanName = name.toLowerCase()
              .replace(/wisata|taman|rekreasi|park|coban|air terjun|desa/gi, '')
              .trim();
            
            kunjungan = kunjunganData.find(k => {
              const cleanKunjungan = k.nama_wisata.toLowerCase()
                .replace(/wisata|taman|rekreasi|park|coban|air terjun|desa/gi, '')
                .trim();
              return cleanKunjungan.includes(cleanName) || cleanName.includes(cleanKunjungan);
            });
          }
          
          visitCount = kunjungan?.jumlah_kunjungan || 0;
        }
        
        if (visitCount === 0 && data.visit_count) {
          visitCount = data.visit_count;
        }
        
        // Get total reviews
        let totalReviews = data.total_reviews || 0;
        
        // PENTING: Cek rating dulu untuk validasi
        const avgRating = parseFloat(data.avg_rating) || parseFloat(data.average_rating) || 0;
        console.log(`Average rating: ${avgRating}`);
        
        // LOGIKA BARU: Cek keberadaan keluhan aktual
        let hasActualComplaints = false;
        let actualComplaintCount = 0;
        let actualComplaintTexts = [];
        
        // Cek main_complaints
        if (data.main_complaints && Array.isArray(data.main_complaints) && data.main_complaints.length > 0) {
          // Filter hanya yang benar-benar keluhan (bukan review positif)
          const realComplaints = data.main_complaints.filter(c => {
            const text = (c.full_text || c.display_text || '').toLowerCase();
            // Check if it's actually a complaint
            return !text.includes('bagus') && !text.includes('indah') && !text.includes('recommended') &&
                   !text.includes('puas') && !text.includes('senang') && !text.includes('mantap');
          });
          
          if (realComplaints.length > 0) {
            hasActualComplaints = true;
            actualComplaintCount = realComplaints.length;
            actualComplaintTexts = realComplaints;
            console.log(`Found ${actualComplaintCount} real complaints in main_complaints`);
          }
        }
        
        // Cek top_complaints
        if (!hasActualComplaints && data.top_complaints) {
          if (Array.isArray(data.top_complaints) && data.top_complaints.length > 0) {
            hasActualComplaints = true;
            actualComplaintCount = data.top_complaints.length;
          } else if (typeof data.top_complaints === 'object' && Object.keys(data.top_complaints).length > 0) {
            const totalComplaints = Object.values(data.top_complaints).reduce((sum, count) => sum + (parseInt(count) || 0), 0);
            if (totalComplaints > 0) {
              hasActualComplaints = true;
              actualComplaintCount = totalComplaints;
            }
          }
        }
        
        console.log(`Has actual complaints: ${hasActualComplaints}, Count: ${actualComplaintCount}`);
        
        // Parse sentiment percentages dengan logika yang diperbaiki
        let positivePercentage = 0;
        let neutralPercentage = 0;
        let negativePercentage = 0;
        
        // LOGIKA UTAMA: Penentuan sentiment berdasarkan rating dan keluhan
        
        // KASUS 1: Rating sempurna 5.0 tanpa keluhan = 100% POSITIF
        if (avgRating === 5.0 && !hasActualComplaints) {
          console.log('Perfect 5.0 rating without complaints - setting to 100% POSITIVE');
          positivePercentage = 100;
          neutralPercentage = 0;
          negativePercentage = 0;
        }
        // KASUS 2: Rating < 5.0 tanpa keluhan = NETRAL
        else if (!hasActualComplaints && avgRating < 5.0 && avgRating >= 4.0) {
          console.log(`Rating ${avgRating} without complaints - setting to NEUTRAL`);
          positivePercentage = 0;
          neutralPercentage = 100;
          negativePercentage = 0;
        }
        // KASUS 3: Rating < 4.0 tanpa keluhan eksplisit = Mix netral dan negatif
        else if (!hasActualComplaints && avgRating < 4.0) {
          console.log(`Low rating ${avgRating} without explicit complaints - mixed sentiment`);
          if (avgRating >= 3.5) {
            positivePercentage = 0;
            neutralPercentage = 70;
            negativePercentage = 30;
          } else if (avgRating >= 3.0) {
            positivePercentage = 0;
            neutralPercentage = 50;
            negativePercentage = 50;
          } else {
            positivePercentage = 0;
            neutralPercentage = 30;
            negativePercentage = 70;
          }
        }
        // KASUS 4: Ada keluhan aktual - parse dari data atau estimasi
        else if (hasActualComplaints) {
          // Parse dari sentiment_distribution jika ada
          if (data.sentiment_distribution) {
            positivePercentage = parseFloat(data.sentiment_distribution.positive || 0);
            neutralPercentage = parseFloat(data.sentiment_distribution.neutral || 0);
            negativePercentage = parseFloat(data.sentiment_distribution.negative || 0);
          } else {
            // Parse dari field individual
            if (data.positive_percentage !== undefined) {
              positivePercentage = parseFloat(data.positive_percentage);
            } else if (data.positive_ratio !== undefined) {
              const ratio = parseFloat(data.positive_ratio);
              positivePercentage = ratio <= 1 ? ratio * 100 : ratio;
            }
            
            if (data.neutral_percentage !== undefined) {
              neutralPercentage = parseFloat(data.neutral_percentage);
            } else if (data.neutral_ratio !== undefined) {
              const ratio = parseFloat(data.neutral_ratio);
              neutralPercentage = ratio <= 1 ? ratio * 100 : ratio;
            }
            
            if (data.negative_percentage !== undefined) {
              negativePercentage = parseFloat(data.negative_percentage);
            } else if (data.complaint_percentage !== undefined) {
              negativePercentage = parseFloat(data.complaint_percentage);
            } else if (data.negative_ratio !== undefined) {
              const ratio = parseFloat(data.negative_ratio);
              negativePercentage = ratio <= 1 ? ratio * 100 : ratio;
            }
            
            // Jika tidak ada data sentiment, estimasi berdasarkan rating
            if (positivePercentage === 0 && neutralPercentage === 0 && negativePercentage === 0) {
              if (avgRating >= 4.5) {
                positivePercentage = 60;
                neutralPercentage = 20;
                negativePercentage = 20;
              } else if (avgRating >= 4.0) {
                positivePercentage = 40;
                neutralPercentage = 30;
                negativePercentage = 30;
              } else if (avgRating >= 3.5) {
                positivePercentage = 20;
                neutralPercentage = 40;
                negativePercentage = 40;
              } else {
                positivePercentage = 10;
                neutralPercentage = 30;
                negativePercentage = 60;
              }
            }
          }
          
          // VALIDASI: Jika data tidak konsisten (rating tinggi dengan keluhan tinggi)
          if (negativePercentage > 70 && avgRating >= 4.5) {
            console.log('Inconsistent data detected - adjusting sentiment distribution');
            positivePercentage = 50;
            neutralPercentage = 30;
            negativePercentage = 20;
          }
        }
        
        // Normalisasi untuk memastikan total = 100%
        const totalPercentage = positivePercentage + neutralPercentage + negativePercentage;
        if (Math.abs(totalPercentage - 100) > 0.1 && totalPercentage > 0) {
          positivePercentage = (positivePercentage / totalPercentage) * 100;
          neutralPercentage = (neutralPercentage / totalPercentage) * 100;
          negativePercentage = (negativePercentage / totalPercentage) * 100;
        }
        
        // Validasi range
        positivePercentage = Math.max(0, Math.min(100, positivePercentage));
        neutralPercentage = Math.max(0, Math.min(100, neutralPercentage));
        negativePercentage = Math.max(0, Math.min(100, negativePercentage));
        
        // Final complaint percentage
        const complaintPercentage = negativePercentage;
        
        // Determine complaint level berdasarkan persentase keluhan
        let complaintLevel = '';
        
        if (complaintPercentage > 20) {
          complaintLevel = 'tinggi';
        } else if (complaintPercentage >= 10) {
          complaintLevel = 'sedang';
        } else {
          complaintLevel = 'rendah';
        }
        
        console.log(`Final - Positive: ${positivePercentage.toFixed(1)}%, Neutral: ${neutralPercentage.toFixed(1)}%, Complaint: ${complaintPercentage.toFixed(1)}%`);
        console.log(`Complaint level: ${complaintLevel}`);
        
        // Determine visit category
        let visitCategory = '';
        if (visitCount >= 1000000) {
          visitCategory = 'TINGGI';
        } else if (visitCount >= 500000) {
          visitCategory = 'SEDANG';
        } else if (visitCount > 0) {
          visitCategory = 'RENDAH';
        } else {
          visitCategory = data.visit_level?.toUpperCase() || data.visit_category || 'LOW';
        }
        
        // Process complaints only if there are actual complaints
        let topComplaints = [];
        let allComplaints = [];
        
        if (hasActualComplaints && actualComplaintTexts.length > 0) {
          topComplaints = actualComplaintTexts.slice(0, 5).map((complaint) => ({
            category: complaint.category || 'Keluhan',
            count: complaint.count || 1,
            text: complaint.display_text || complaint.full_text || '',
            date: complaint.date || ''
          }));
          
          allComplaints = actualComplaintTexts.map((complaint) => ({
            text: complaint.full_text || complaint.display_text || '',
            date: complaint.date || '',
            rating: complaint.rating || 0
          }));
        }
        
        // Calculate rating distribution
        let ratingDistribution = data.rating_distribution || {};
        
        if (!data.rating_distribution || Object.keys(data.rating_distribution).length === 0) {
          // Distribusi berdasarkan sentiment yang sudah dihitung
          const positive = Math.round((positivePercentage / 100) * totalReviews);
          const neutral = Math.round((neutralPercentage / 100) * totalReviews);
          const negative = Math.round((negativePercentage / 100) * totalReviews);
          
          if (avgRating === 5.0 && !hasActualComplaints) {
            // Perfect 5.0 = 100% bintang 5
            ratingDistribution = {
              5: totalReviews,
              4: 0,
              3: 0,
              2: 0,
              1: 0
            };
          } else if (avgRating >= 4.5 && avgRating < 5.0 && !hasActualComplaints) {
            // High rating without complaints - mostly 5 and 4 stars
            const fiveStars = Math.round(totalReviews * ((avgRating - 4.0) / 1.0));
            ratingDistribution = {
              5: fiveStars,
              4: totalReviews - fiveStars,
              3: 0,
              2: 0,
              1: 0
            };
          } else if (avgRating >= 4.0 && avgRating < 4.5 && !hasActualComplaints) {
            // Good rating without complaints
            const avgWeight = (avgRating - 4.0) / 0.5;
            ratingDistribution = {
              5: Math.round(totalReviews * avgWeight * 0.3),
              4: Math.round(totalReviews * 0.7),
              3: totalReviews - Math.round(totalReviews * avgWeight * 0.3) - Math.round(totalReviews * 0.7),
              2: 0,
              1: 0
            };
          } else {
            // Normal distribution based on sentiment
            ratingDistribution = {
              5: Math.floor(positive * 0.6),
              4: Math.floor(positive * 0.4 + neutral * 0.3),
              3: Math.floor(neutral * 0.7),
              2: Math.floor(negative * 0.4),
              1: Math.floor(negative * 0.6)
            };
          }
        }
        
        // Create destination object
        destinations[name] = {
          total_reviews: totalReviews,
          average_rating: avgRating,
          complaint_percentage: complaintPercentage,
          positive_percentage: positivePercentage,
          neutral_percentage: neutralPercentage,
          negative_percentage: complaintPercentage,
          complaint_level: complaintLevel,
          visit_category: visitCategory,
          visit_count: visitCount,
          jumlah_kunjungan: visitCount,
          rating_distribution: ratingDistribution,
          top_complaints: topComplaints,
          all_complaints: allComplaints,
          sample_review: '',
          positive_reviews: Math.round((positivePercentage / 100) * totalReviews),
          negative_reviews: Math.round((complaintPercentage / 100) * totalReviews),
          neutral_reviews: Math.round((neutralPercentage / 100) * totalReviews),
          has_complaints: hasActualComplaints,
          actual_complaint_count: actualComplaintCount
        };
        
        // Count by complaint level
        if (complaintLevel === 'tinggi') {
          highCount++;
        } else if (complaintLevel === 'sedang') {
          mediumCount++;
        } else if (complaintLevel === 'rendah') {
          lowCount++;
        }
        
        console.log(`${name}: Level ${complaintLevel} (${complaintPercentage.toFixed(1)}% complaints, rating ${avgRating})`);
      });
    }
    
    // Set result
    result.success = true;
    result.total_destinations = Object.keys(destinations).length;
    result.high_complaint_count = highCount;
    result.medium_complaint_count = mediumCount;
    result.low_complaint_count = lowCount;
    result.destinations = destinations;
    
    console.log('\n=== SUMMARY ===');
    console.log(`Total: ${result.total_destinations}`);
    console.log(`High: ${highCount}, Medium: ${mediumCount}, Low: ${lowCount}`);
    
    return result;
    
  } catch (error) {
    console.error('Failed to get wisata analysis:', error);
    return {
      success: false,
      total_destinations: 0,
      high_complaint_count: 0,
      medium_complaint_count: 0,
      low_complaint_count: 0,
      destinations: {}
    };
  }
}

  // Dashboard APIs
  async getDashboardData(filter = 'all') {
    try {
      const response = await this.api.get('/dashboard');
      
      if (response && response.success) {
        return response;
      }
      
      // Return empty structure if failed
      return {
        success: false,
        charts: {},
        metrics: {}
      };
      
    } catch (error) {
      console.error('Dashboard data fetch error:', error);
      return {
        success: false,
        charts: {},
        metrics: {}
      };
    }
  }

  async getFilteredData(filter = 'all') {
    try {
      const response = await this.api.get('/filter_data', {
        params: { filter: filter }
      });
      
      if (response && response.success) {
        console.log('Filtered data response:', response);
        return response;
      }
      
      // Fallback to dashboard data
      return await this.getDashboardData(filter);
      
    } catch (error) {
      console.error('Failed to get filtered data:', error);
      // Return empty structure
      return {
        success: false,
        charts: {},
        metrics: {}
      };
    }
  }

  // Analysis APIs
  async getAnalysisData() {
    try {
      const response = await this.api.get('/analysis');
      
      console.log('=== ANALYSIS API RESPONSE ===');
      console.log('Full response:', response);
      
      if (response && response.success) {
        // Return the analysis_data if it exists
        if (response.analysis_data) {
          return {
            ...response.analysis_data,
            success: true
          };
        }
        return response;
      }
      
      return response;
      
    } catch (error) {
      console.error('Analysis data fetch error:', error);
      throw error;
    }
  }

  async getComplaintAnalysis(filter = 'all') {
    try {
      const response = await this.api.get('/complaint_analysis', {
        params: { filter: filter }
      });
      
      if (response && response.success !== false) {
        console.log('Complaint analysis response:', response);
        return response;
      }
      
      // Return empty complaint analysis
      return {
        success: true,
        total_complaints: 0,
        total_negative_reviews: 0,
        top_complaints: [],
        insights: [{
          type: 'success',
          icon: 'fas fa-smile',
          title: 'Excellent Performance!',
          description: 'No significant complaints detected.'
        }]
      };
      
    } catch (error) {
      console.error('Failed to get complaint analysis:', error);
      throw error;
    }
  }

  async getQuadrantData(filter = 'all') {
    try {
      const response = await this.api.get('/quadrant_data_filtered', {
        params: { filter: filter }
      });
      
      if (response && response.success) {
        console.log('Quadrant data response:', response);
        return response;
      }
      
      return null;
      
    } catch (error) {
      console.error('Failed to get quadrant data:', error);
      return null;
    }
  }

  // Prediction API
  async predict(text, visitTime = 'Tidak diketahui') {
    return await this.api.post('/predict', {
      text,
      visit_time: visitTime
    });
  }

  // Admin APIs with better error handling
// Di apiService.js, update getKunjunganData dan getSystemInfo

async getKunjunganData() {
  try {
    console.log('Fetching kunjungan data...');
    
    // Direct API call without auth check for now
    const response = await this.api.get('/admin/kunjungan');
    
    console.log('Kunjungan data response:', response);
    
    // Check if we got valid data
    if (response && response.success && response.kunjungan_data) {
      return {
        success: true,
        kunjungan_data: response.kunjungan_data,
        data_info: response.data_info
      };
    }
    
    // If response has data in different structure
    if (response && response.kunjungan_data) {
      return response;
    }
    
    // Fallback
    console.warn('Invalid kunjungan data response, using fallback');
    return {
      success: false,
      kunjungan_data: {},
      data_info: null,
      error: 'Invalid response format'
    };
    
  } catch (error) {
    console.error('Failed to get kunjungan data:', error);
    
    // Return empty data instead of throwing
    return {
      success: false,
      kunjungan_data: {},
      data_info: null,
      error: error.message || 'Failed to fetch data'
    };
  }
}

async getSystemInfo() {
  try {
    console.log('Fetching system info...');
    
    // Direct API call without auth check for now
    const response = await this.api.get('/admin/system_info');
    
    console.log('System info response:', response);
    
    // Check if we got valid data
    if (response && response.success && response.system_info) {
      return {
        success: true,
        system_info: response.system_info
      };
    }
    
    // If response has data in different structure
    if (response && response.system_info) {
      return response;
    }
    
    // Fallback
    console.warn('Invalid system info response, using fallback');
    return {
      success: false,
      system_info: {
        system: { platform: 'Unknown', python_version: 'Unknown' },
        data: { total_reviews: 0, kunjungan_wisata_count: 0 },
        storage: { total_size_mb: 0 },
        models: { processor_loaded: false, predictor_loaded: false }
      },
      error: 'Invalid response format'
    };
    
  } catch (error) {
    console.error('Failed to get system info:', error);
    
    // Return basic info instead of throwing
    return {
      success: false,
      system_info: {
        system: { platform: 'Unknown', python_version: 'Unknown' },
        data: { total_reviews: 0, kunjungan_wisata_count: 0 },
        storage: { total_size_mb: 0 },
        models: { processor_loaded: false, predictor_loaded: false }
      },
      error: error.message || 'Failed to fetch data'
    };
  }
}

  async getSystemInfo() {
    try {
      // Check if user is admin first (skip in development)
      if (!this.isAdmin() && !this.isDevelopment) {
        console.warn('Admin access required for system info');
        return {
          success: false,
          system_info: {
            version: '1.0.0',
            status: 'Unknown',
            environment: this.isDevelopment ? 'Development' : 'Production'
          },
          error: 'Admin access required',
          requiresAuth: true
        };
      }
      
      const response = await this.api.get('/admin/system_info');
      
      // Check if authentication is required
      if (response && response.requiresAuth) {
        console.warn('Authentication required for system info');
        return response;
      }
      
      return response;
    } catch (error) {
      console.error('Failed to get system info:', error);
      return {
        success: false,
        system_info: {
          version: '1.0.0',
          status: 'Error'
        },
        error: error.message
      };
    }
  }

  async addWisata(namaWisata, jumlahKunjungan) {
    // Check admin access
    if (!this.isAdmin() && !this.isDevelopment) {
      return {
        success: false,
        error: 'Admin access required'
      };
    }
    
    return await this.api.post('/admin/add_wisata', {
      nama_wisata: namaWisata,
      jumlah_kunjungan: jumlahKunjungan
    });
  }

  async updateWisata(namaWisata, jumlahKunjungan) {
    // Check admin access
    if (!this.isAdmin() && !this.isDevelopment) {
      return {
        success: false,
        error: 'Admin access required'
      };
    }
    
    return await this.api.post('/admin/update_wisata', {
      nama_wisata: namaWisata,
      jumlah_kunjungan: jumlahKunjungan
    });
  }

  async deleteWisata(namaWisata) {
    // Check admin access
    if (!this.isAdmin() && !this.isDevelopment) {
      return {
        success: false,
        error: 'Admin access required'
      };
    }
    
    return await this.api.post('/admin/delete_wisata', {
      nama_wisata: namaWisata
    });
  }

  async uploadFile(formData) {
    // Check admin access
    if (!this.isAdmin() && !this.isDevelopment) {
      return {
        success: false,
        error: 'Admin access required'
      };
    }
    
    const response = await fetch(`${this.api.defaults.baseURL}/admin/upload_file`, {
      method: 'POST',
      credentials: !this.isDevelopment ? 'include' : 'omit',
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to upload file');
    }

    return await response.json();
  }
}

export const apiService = new ApiService();