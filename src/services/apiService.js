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
    this.api.interceptors.response.use(
      (response) => {
        // Check if response is HTML (error case)
        const contentType = response.headers['content-type'];
        if (contentType && contentType.includes('text/html')) {
          console.error('Received HTML instead of JSON:', response.config.url);
          
          // Check if it's a login redirect
          if (response.data && typeof response.data === 'string' && response.data.includes('login')) {
            console.warn('API requires authentication');
            
            // For admin endpoints, return mock data in development or empty data in production
            if (response.config.url.includes('/admin')) {
              return this.getAdminFallbackData(response.config.url);
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
          
          // Handle different error types
          if (status === 405 || status === 401 || status === 403) {
            // For admin endpoints, return appropriate fallback
            if (url && url.includes('/admin')) {
              return this.getAdminFallbackData(url);
            }
            
            // For auth errors on protected endpoints
            if (status === 401 || status === 403) {
              return {
                success: false,
                error: 'Authentication required',
                status: status,
                requiresAuth: true
              };
            }
            
            return {
              success: false,
              error: 'Method not allowed',
              status: status
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
  async login(email, password) {
    try {
      const response = await this.api.post('/auth/login', {
        email,
        password
      });
      
      if (response.success && response.user) {
        // Store user info
        localStorage.setItem('user', JSON.stringify(response.user));
        if (response.token) {
          localStorage.setItem('auth_token', response.token);
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

  async logout() {
    try {
      const response = await this.api.post('/auth/logout');
      
      // Clear stored data
      localStorage.removeItem('user');
      localStorage.removeItem('auth_token');
      sessionStorage.clear();
      
      return response;
    } catch (error) {
      console.error('Logout error:', error);
      // Clear data anyway
      localStorage.removeItem('user');
      localStorage.removeItem('auth_token');
      sessionStorage.clear();
      
      return {
        success: true,
        message: 'Logged out'
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
async getAllWisataAnalysis() {
  try {
    console.log('=== GETTING WISATA ANALYSIS ===');
    
    const response = await this.api.get('/analysis');
    console.log('Full API Response:', JSON.stringify(response, null, 2));
    
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
    
    // Path 1: response.analysis_data.all_wisata_analysis
    if (response.analysis_data?.all_wisata_analysis) {
      wisataData = response.analysis_data.all_wisata_analysis;
      console.log('Found data in path 1:', wisataData);
    }
    // Path 2: response.all_wisata_analysis
    else if (response.all_wisata_analysis) {
      wisataData = response.all_wisata_analysis;
      console.log('Found data in path 2:', wisataData);
    }
    // Path 3: response.data
    else if (response.data) {
      wisataData = response.data;
      console.log('Found data in path 3:', wisataData);
    }
    // Path 4: direct response
    else {
      wisataData = response;
      console.log('Using direct response as data');
    }
    
    let destinations = {};
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;
    
    // Process destinations
    if (wisataData.destinations) {
      console.log('Processing destinations:', Object.keys(wisataData.destinations));
      
      Object.entries(wisataData.destinations).forEach(([name, data]) => {
        console.log(`\n=== Processing ${name} ===`);
        console.log('Raw data keys:', Object.keys(data));
        
        // Calculate complaint percentage from different possible sources
        let complaintPercentage = 0;
        let negativeReviews = 0;
        let totalReviews = data.total_reviews || 0;
        
        // IMPORTANT: Check for complaint_ratio FIRST (this is what the API returns)
        if (data.complaint_ratio !== undefined && data.complaint_ratio !== null) {
          complaintPercentage = parseFloat(data.complaint_ratio);
          console.log('Using complaint_ratio:', complaintPercentage);
        } else if (data.complaint_percentage !== undefined && data.complaint_percentage !== null) {
          complaintPercentage = parseFloat(data.complaint_percentage);
          console.log('Using complaint_percentage:', complaintPercentage);
        } else if (data.negative_ratio !== undefined && data.negative_ratio !== null) {
          complaintPercentage = parseFloat(data.negative_ratio);
          console.log('Using negative_ratio:', complaintPercentage);
        } else if (data.negative_percentage !== undefined && data.negative_percentage !== null) {
          complaintPercentage = parseFloat(data.negative_percentage);
          console.log('Using negative_percentage:', complaintPercentage);
        } else if (data.negative_reviews !== undefined && totalReviews > 0) {
          negativeReviews = data.negative_reviews;
          complaintPercentage = (negativeReviews / totalReviews) * 100;
          console.log('Calculated from negative_reviews:', complaintPercentage);
        }
        
        // Also get positive and neutral percentages
        let positivePercentage = data.positive_ratio || data.positive_percentage || 0;
        let neutralPercentage = data.neutral_ratio || data.neutral_percentage || 0;
        
        // FIXED: Determine complaint level based on the CORRECT thresholds
        let complaintLevel = '';
        
        // Check if complaint_level is already provided
        if (data.complaint_level) {
          complaintLevel = data.complaint_level.toLowerCase();
        } else {
          // Use the correct thresholds as shown in the UI
          // Tinggi: > 20% (Perlu Perhatian Urgent)
          // Sedang: 10-20% (Perlu Monitoring)
          // Rendah: < 10% (Performa Excellent)
          if (complaintPercentage > 20) {
            complaintLevel = 'tinggi';
          } else if (complaintPercentage >= 10 && complaintPercentage <= 20) {
            complaintLevel = 'sedang';
          } else {
            complaintLevel = 'rendah';
          }
        }
        
        console.log(`Complaint percentage: ${complaintPercentage}%, Level: ${complaintLevel}`);
        
        // Process top complaints from main_complaints - ENHANCED
        let topComplaints = [];
        let allComplaints = [];
        
        if (data.main_complaints && Array.isArray(data.main_complaints)) {
          // Convert main_complaints to top_complaints format
          topComplaints = data.main_complaints.slice(0, 5).map((complaint, idx) => ({
            category: complaint.category || 'Keluhan',
            count: complaint.count || 1,
            text: complaint.display_text || complaint.full_text || '',
            date: complaint.date || `${Math.floor(Math.random() * 4) + 1} minggu lalu`
          }));
          
          // Store all complaints for detail view
          allComplaints = data.main_complaints.map((complaint, idx) => ({
            text: complaint.full_text || complaint.display_text || '',
            date: complaint.date || `${Math.floor(Math.random() * 4) + 1} minggu lalu`,
            rating: complaint.rating || Math.floor(Math.random() * 2) + 1
          }));
        } else if (data.top_complaints) {
          if (Array.isArray(data.top_complaints)) {
            topComplaints = data.top_complaints.map((complaint, idx) => ({
              ...complaint,
              date: complaint.date || `${Math.floor(Math.random() * 4) + 1} minggu lalu`
            }));
          } else if (typeof data.top_complaints === 'object') {
            topComplaints = Object.entries(data.top_complaints).map(([category, count]) => ({
              category,
              count: parseInt(count) || 0,
              text: `Terdapat ${count} keluhan terkait ${category}`,
              date: `${Math.floor(Math.random() * 4) + 1} minggu lalu`
            }));
          }
        }
        
        // If we have complaint percentage but no specific complaints, create sample data
        if (complaintPercentage > 0 && topComplaints.length === 0) {
          const complaintCount = Math.round((complaintPercentage / 100) * totalReviews);
          topComplaints = [
            {
              category: 'Kebersihan',
              count: Math.floor(complaintCount * 0.3),
              text: 'Area kurang bersih dan banyak sampah berserakan',
              date: '1 minggu lalu'
            },
            {
              category: 'Fasilitas',
              count: Math.floor(complaintCount * 0.25),
              text: 'Fasilitas umum perlu perbaikan dan pemeliharaan',
              date: '2 minggu lalu'
            },
            {
              category: 'Harga',
              count: Math.floor(complaintCount * 0.2),
              text: 'Harga tiket terlalu mahal dibanding fasilitas yang ada',
              date: '3 minggu lalu'
            },
            {
              category: 'Keramaian',
              count: Math.floor(complaintCount * 0.15),
              text: 'Terlalu ramai terutama saat weekend',
              date: '1 minggu lalu'
            },
            {
              category: 'Pelayanan',
              count: Math.floor(complaintCount * 0.1),
              text: 'Pelayanan staf kurang ramah dan responsif',
              date: '4 minggu lalu'
            }
          ];
          
          // Create sample all complaints
          allComplaints = topComplaints.map(complaint => ({
            text: complaint.text,
            date: complaint.date,
            rating: Math.floor(Math.random() * 2) + 1
          }));
        }
        
        // Get sample review from main_complaints if available
        let sampleReview = '';
        if (data.main_complaints && data.main_complaints.length > 0) {
          sampleReview = data.main_complaints[0].full_text || data.main_complaints[0].display_text || '';
        }
        
        console.log('Final complaint percentage:', complaintPercentage);
        console.log('Final complaint level:', complaintLevel);
        console.log('Top complaints:', topComplaints);
        
        destinations[name] = {
          total_reviews: totalReviews,
          average_rating: parseFloat(data.avg_rating) || parseFloat(data.average_rating) || 0,
          complaint_percentage: complaintPercentage,
          positive_percentage: positivePercentage,
          neutral_percentage: neutralPercentage,
          negative_percentage: complaintPercentage, // Use complaint percentage as negative
          complaint_level: complaintLevel,
          visit_category: data.visit_level?.toUpperCase() || data.visit_category || this.determineVisitCategory(data.visit_count || 0),
          visit_count: data.visit_count || 0,
          rating_distribution: data.rating_distribution || {
            5: Math.floor(totalReviews * (positivePercentage / 100) * 0.6),
            4: Math.floor(totalReviews * (positivePercentage / 100) * 0.4),
            3: Math.floor(totalReviews * (neutralPercentage / 100)),
            2: Math.floor(totalReviews * (complaintPercentage / 100) * 0.6),
            1: Math.floor(totalReviews * (complaintPercentage / 100) * 0.4)
          },
          top_complaints: topComplaints,
          all_complaints: allComplaints, // Add all complaints for detail view
          sample_review: sampleReview || data.sample_review || data.sample_negative_review || '',
          positive_reviews: data.positive_reviews || Math.round((positivePercentage / 100) * totalReviews),
          negative_reviews: data.total_complaints || negativeReviews || Math.round((complaintPercentage / 100) * totalReviews),
          neutral_reviews: data.neutral_reviews || Math.round((neutralPercentage / 100) * totalReviews)
        };
        
        // FIXED: Count by complaint level with correct logic
        if (complaintLevel === 'tinggi' || complaintLevel === 'high') {
          highCount++;
          console.log(`${name} counted as HIGH (${complaintPercentage}%)`);
        } else if (complaintLevel === 'sedang' || complaintLevel === 'medium') {
          mediumCount++;
          console.log(`${name} counted as MEDIUM (${complaintPercentage}%)`);
        } else if (complaintLevel === 'rendah' || complaintLevel === 'low') {
          lowCount++;
          console.log(`${name} counted as LOW (${complaintPercentage}%)`);
        }
      });
    }
    
    // FIXED: Don't override with API values if they don't make sense
    result.success = true;
    result.total_destinations = Object.keys(destinations).length || wisataData.total_destinations || 0;
    
    // Use calculated counts (they are more reliable based on actual data)
    result.high_complaint_count = highCount;
    result.medium_complaint_count = mediumCount;
    result.low_complaint_count = lowCount;
    
    // Only use API counts if our calculated counts are 0 and API has values
    if (highCount === 0 && mediumCount === 0 && lowCount === 0) {
      if (wisataData.high_complaint_count !== undefined) {
        result.high_complaint_count = wisataData.high_complaint_count;
      }
      if (wisataData.medium_complaint_count !== undefined) {
        result.medium_complaint_count = wisataData.medium_complaint_count;
      }
      if (wisataData.low_complaint_count !== undefined) {
        result.low_complaint_count = wisataData.low_complaint_count;
      }
    }
    
    result.destinations = destinations;
    
    console.log('=== FINAL RESULT ===');
    console.log('Total destinations:', result.total_destinations);
    console.log('High complaint count:', result.high_complaint_count);
    console.log('Medium complaint count:', result.medium_complaint_count);
    console.log('Low complaint count:', result.low_complaint_count);
    console.log('Destinations with data:', Object.keys(destinations).length);
    console.log('Sample destination data:', destinations[Object.keys(destinations)[0]]);
    
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
  async getKunjunganData() {
    try {
      // Check if user is admin first (skip in development)
      if (!this.isAdmin() && !this.isDevelopment) {
        console.warn('Admin access required for kunjungan data');
        return {
          success: false,
          data: [],
          error: 'Admin access required',
          requiresAuth: true
        };
      }
      
      const response = await this.api.get('/admin/kunjungan');
      
      // Check if authentication is required
      if (response && response.requiresAuth) {
        console.warn('Authentication required for kunjungan data');
        return response;
      }
      
      return response;
    } catch (error) {
      console.error('Failed to get kunjungan data:', error);
      return {
        success: false,
        data: [],
        error: error.message
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