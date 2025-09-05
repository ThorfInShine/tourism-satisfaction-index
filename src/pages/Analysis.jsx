import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  AlertTriangle,
  Users,
  MessageSquare,
  Filter,
  ChevronDown,
  BarChart3,
  PieChart,
  Target,
  Lightbulb,
  RefreshCw,
  ExternalLink,
  MapPin,
  Search,
  X,
  Star,
  ThumbsUp,
  ThumbsDown,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Eye,
  Clock,
  TrendingDown,
  Activity,
  Info,
  CheckCircle,
  AlertCircle,
  XCircle,
  UserCheck,
  UserX,
  CalendarDays,
  Briefcase,
  Palmtree,
  SortDesc,
  Award
} from 'lucide-react';
import toast from 'react-hot-toast';

// Components
import LoadingSpinner from '../components/LoadingSpinner';
import MetricCard from '../components/MetricCard';
import ChartCard from '../components/ChartCard';

// Services
import { apiService } from '../services/apiService';

// Utils
import { cn } from '../utils/cn';

// Helper Functions
const getComplaintLevelColor = (level) => {
  switch(level?.toLowerCase()) {
    case 'tinggi':
      return 'from-red-500 to-pink-500';
    case 'sedang':
      return 'from-yellow-500 to-orange-500';
    case 'rendah':
      return 'from-green-500 to-emerald-500';
    default:
      return 'from-gray-500 to-gray-600';
  }
};

const getComplaintLevelIcon = (level) => {
  switch(level?.toLowerCase()) {
    case 'tinggi':
      return 'fas fa-exclamation-triangle';
    case 'sedang':
      return 'fas fa-exclamation-circle';
    case 'rendah':
      return 'fas fa-check-circle';
    default:
      return 'fas fa-question-circle';
  }
};

// Modal Component for Detail View
const DetailModal = ({ isOpen, onClose, destination }) => {
  if (!isOpen || !destination) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`bg-gradient-to-r ${getComplaintLevelColor(destination.complaint_level)} p-6 text-white`}>
              <button
                onClick={onClose}
                className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 rounded-full p-2 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex items-start gap-3">
                <MapPin className="w-6 h-6 mt-1" />
                <div>
                  <h2 className="text-2xl font-bold mb-2">{destination.name}</h2>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Star className="w-5 h-5" />
                      <span className="font-semibold">{destination.average_rating?.toFixed(1)}/5</span>
                    </div>
                    <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
                      {destination.total_reviews} Reviews
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Statistics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-green-50 rounded-xl p-4">
                  <ThumbsUp className="w-5 h-5 text-green-600 mb-2" />
                  <div className="text-2xl font-bold text-green-600">
                    {destination.positive_percentage?.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600">Positif</div>
                </div>
                <div className="bg-yellow-50 rounded-xl p-4">
                  <MessageSquare className="w-5 h-5 text-yellow-600 mb-2" />
                  <div className="text-2xl font-bold text-yellow-600">
                    {destination.neutral_percentage?.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600">Netral</div>
                </div>
                <div className="bg-red-50 rounded-xl p-4">
                  <ThumbsDown className="w-5 h-5 text-red-600 mb-2" />
                  <div className="text-2xl font-bold text-red-600">
                    {destination.complaint_percentage?.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600">Keluhan</div>
                </div>
                <div className="bg-purple-50 rounded-xl p-4">
                  <Target className="w-5 h-5 text-purple-600 mb-2" />
                  <div className="text-2xl font-bold text-purple-600">
                    {destination.visit_category}
                  </div>
                  <div className="text-sm text-gray-600">Kunjungan</div>
                </div>
              </div>

              {/* All Complaints Section */}
              {destination.all_complaints && destination.all_complaints.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    Semua Keluhan ({destination.all_complaints.length})
                  </h3>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {destination.all_complaints.map((complaint, idx) => (
                      <div key={idx} className="bg-red-50 rounded-lg p-4 border border-red-100">
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-sm font-semibold text-red-600">
                            Keluhan #{idx + 1}
                          </span>
                          {complaint.date && (
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {complaint.date}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-700">{complaint.text}</p>
                        {complaint.rating && (
                          <div className="mt-2 flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={cn(
                                  "w-3 h-3",
                                  i < complaint.rating ? "text-yellow-500 fill-current" : "text-gray-300"
                                )}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rating Distribution */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4">Distribusi Rating</h3>
                <div className="space-y-2">
                  {[5, 4, 3, 2, 1].map((rating) => {
                    const count = destination.rating_distribution?.[rating] || 0;
                    const percentage = destination.total_reviews > 0 
                      ? (count / destination.total_reviews * 100).toFixed(0)
                      : 0;
                    return (
                      <div key={rating} className="flex items-center gap-3">
                        <div className="flex items-center gap-1 w-12">
                          <span className="text-sm font-medium">{rating}</span>
                          <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        </div>
                        <div className="flex-1 bg-gray-200 rounded-full h-6 overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ duration: 0.5, delay: rating * 0.1 }}
                            className={cn(
                              "h-full flex items-center justify-end pr-2",
                              rating >= 4 ? "bg-green-500" : rating === 3 ? "bg-yellow-500" : "bg-red-500"
                            )}
                          >
                            {percentage > 10 && (
                              <span className="text-xs text-white font-medium">{percentage}%</span>
                            )}
                          </motion.div>
                        </div>
                        <span className="text-sm text-gray-600 w-12 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Complaint Carousel Component
const ComplaintCarousel = ({ complaints, destinationName }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!complaints || complaints.length === 0) return null;

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? complaints.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === complaints.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <span className="text-sm font-semibold text-gray-700">Keluhan Utama</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevious}
            className="p-1 rounded-full bg-red-100 hover:bg-red-200 transition-colors"
            aria-label="Previous complaint"
          >
            <ChevronLeft className="w-4 h-4 text-red-600" />
          </button>
          <span className="text-xs text-gray-600 font-medium">
            {currentIndex + 1}/{complaints.length}
          </span>
          <button
            onClick={handleNext}
            className="p-1 rounded-full bg-red-100 hover:bg-red-200 transition-colors"
            aria-label="Next complaint"
          >
            <ChevronRight className="w-4 h-4 text-red-600" />
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="bg-red-50 rounded-lg p-3 border border-red-100"
        >
          <div className="mb-2">
            {complaints[currentIndex].category && (
              <span className="inline-block bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full font-medium">
                {complaints[currentIndex].category}
              </span>
            )}
            {complaints[currentIndex].count && (
              <span className="ml-2 text-xs text-red-600 font-bold">
                {complaints[currentIndex].count} keluhan
              </span>
            )}
          </div>
          
          {complaints[currentIndex].text && (
            <p className="text-sm text-gray-700 italic line-clamp-3">
              "{complaints[currentIndex].text}"
            </p>
          )}
          
          {complaints[currentIndex].date && (
            <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
              <Clock className="w-3 h-3" />
              {complaints[currentIndex].date}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

// New Methodology Section Component
const MethodologySection = () => {
  const [visitPatternData, setVisitPatternData] = useState({
    weekend: 14329,
    weekday: 11345,
    holiday: 6369
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="mt-8"
    >
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-4">
          <div className="flex items-center gap-3">
            <Info className="w-6 h-6 text-white" />
            <h2 className="text-xl font-bold text-white">Metodologi Analisis</h2>
          </div>
        </div>

        {/* Content */}
        <div className="bg-gradient-to-br from-cyan-50 to-blue-50 p-6">
          {/* Title */}
          <div className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-4 py-3 rounded-xl mb-6 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            <h3 className="font-bold">Penjelasan Metrik dan Kategori</h3>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div>
              {/* Performance Level */}
              <div className="mb-6">
                <h4 className="text-gray-800 font-bold mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-cyan-600" />
                  Performance Level (Berdasarkan Tingkat Keluhan):
                </h4>
                <div className="space-y-3">
                  <motion.div 
                    whileHover={{ x: 4 }}
                    className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-3"
                  >
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <div>
                      <span className="font-bold text-gray-800">Perlu Perhatian Urgent</span>
                      <span className="text-gray-600 ml-2">Keluhan {'>'} 20%</span>
                    </div>
                  </motion.div>
                  <motion.div 
                    whileHover={{ x: 4 }}
                    className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-3"
                  >
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <div>
                      <span className="font-bold text-gray-800">Perlu Monitoring</span>
                      <span className="text-gray-600 ml-2">Keluhan 10-20%</span>
                    </div>
                  </motion.div>
                  <motion.div 
                    whileHover={{ x: 4 }}
                    className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-3"
                  >
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <div>
                      <span className="font-bold text-gray-800">Performa Excellent</span>
                      <span className="text-gray-600 ml-2">Keluhan {'<'} 10%</span>
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Visit Level - FIXED POSITION */}
              <div className="mb-6">
                <h4 className="text-gray-800 font-bold mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-cyan-600" />
                  Tingkat Kunjungan:
                </h4>
                <div className="flex flex-wrap gap-3">
                  <div className="inline-flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-full text-sm font-bold">
                    <Users className="w-4 h-4" />
                    KUNJUNGAN TINGGI
                  </div>
                  <div className="inline-flex items-center gap-2 bg-yellow-500 text-white px-4 py-2 rounded-full text-sm font-bold">
                    <UserCheck className="w-4 h-4" />
                    KUNJUNGAN SEDANG
                  </div>
                  <div className="inline-flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-full text-sm font-bold">
                    <UserX className="w-4 h-4" />
                    KUNJUNGAN RENDAH
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div>
              {/* Visit Pattern Analysis */}
              <div className="mb-6">
                <h4 className="text-gray-800 font-bold mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-cyan-600" />
                  Analisis Pola Kunjungan:
                </h4>
                <div className="space-y-3">
                  {/* Weekend */}
                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-green-500"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="w-5 h-5 text-green-600" />
                        <span className="font-bold text-gray-800">Weekend</span>
                      </div>
                      <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">
                        {visitPatternData.weekend.toLocaleString()} reviews
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Kunjungan terbanyak di akhir pekan. Wisatawan lebih aktif saat libur kerja.
                    </p>
                  </motion.div>

                  {/* Weekday */}
                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-yellow-500"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-5 h-5 text-yellow-600" />
                        <span className="font-bold text-gray-800">Weekday</span>
                      </div>
                      <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-bold">
                        {visitPatternData.weekday.toLocaleString()} reviews
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Kunjungan di hari kerja. Biasanya wisatawan lokal atau grup terorganisir.
                    </p>
                  </motion.div>

                  {/* Holiday */}
                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-blue-500"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <Palmtree className="w-5 h-5 text-blue-600" />
                        <span className="font-bold text-gray-800">Holiday</span>
                      </div>
                      <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">
                        {visitPatternData.holiday.toLocaleString()} reviews
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Kunjungan saat hari libur nasional. Peak season dengan volume tertinggi.
                    </p>
                  </motion.div>
                </div>
              </div>

              {/* Filter Info */}
              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                <h5 className="font-bold text-green-800 mb-2 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Filter Waktu Keluhan:
                </h5>
                <div className="bg-green-100 rounded-lg p-3">
                  <p className="text-sm text-green-700 font-medium mb-1">Keluhan Utama:</p>
                  <p className="text-sm text-green-600">
                    Menampilkan semua keluhan dalam rentang waktu 1 tahun terakhir untuk memberikan 
                    gambaran yang lebih komprehensif tentang masalah yang dialami wisatawan.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const Analysis = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentFilter, setCurrentFilter] = useState('all');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [wisataAnalysis, setWisataAnalysis] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDestination, setSelectedDestination] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const itemsPerPage = 6;

  const filterOptions = [
    { value: 'all', label: '🌍 Semua Kunjungan', description: 'Seluruh destinasi wisata' },
    { value: 'high', label: '⬆️ Kunjungan Tinggi', description: 'Destinasi populer' },
    { value: 'medium', label: '➖ Kunjungan Sedang', description: 'Destinasi menengah' },
    { value: 'low', label: '⬇️ Kunjungan Rendah', description: 'Destinasi emerging' }
  ];

  useEffect(() => {
    loadAnalysisData();
  }, []);

  const loadAnalysisData = async () => {
    try {
      setLoading(true);
      const [analysisData, wisataData] = await Promise.all([
        apiService.getAnalysisData(),
        apiService.getAllWisataAnalysis()
      ]);
      
      setData(analysisData);
      setWisataAnalysis(wisataData);
      
    } catch (error) {
      console.error('Failed to load analysis data:', error);
      toast.error('Gagal memuat data analisis');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = async (filterValue) => {
    try {
      setCurrentFilter(filterValue);
      setShowFilterDropdown(false);
      
      const selectedFilter = filterOptions.find(f => f.value === filterValue);
      toast.success(`Filter diterapkan: ${selectedFilter?.label}`);
    } catch (error) {
      console.error('Failed to apply filter:', error);
      toast.error('Gagal menerapkan filter');
    }
  };

  const handleViewDetail = (name, destination) => {
    setSelectedDestination({ name, ...destination });
    setShowDetailModal(true);
  };

  // Filter destinations based on search and category
  const getFilteredDestinations = () => {
    if (!wisataAnalysis || !wisataAnalysis.destinations) return [];
    
    let destinations = Object.entries(wisataAnalysis.destinations);
    
    // Filter by category
    if (selectedCategory !== 'all') {
      destinations = destinations.filter(([_, dest]) => 
        dest.complaint_level?.toLowerCase() === selectedCategory
      );
    }
    
    // Filter by search term
    if (searchTerm) {
      destinations = destinations.filter(([name, _]) => 
        name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return destinations;
  };

  const filteredDestinations = getFilteredDestinations();
  const totalPages = Math.ceil(filteredDestinations.length / itemsPerPage);
  const paginatedDestinations = filteredDestinations.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const currentFilterOption = filterOptions.find(f => f.value === currentFilter);

  if (loading && !data) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="large" />
          <p className="mt-4 text-gray-600">Memuat analisis...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          {/* Hero Section */}
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl p-8 text-white mb-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.05%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%224%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] animate-pulse" />
            
            <div className="relative z-10 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              >
                <TrendingUp className="w-16 h-16 mx-auto mb-4" />
              </motion.div>
              <h1 className="text-4xl font-bold mb-2">Analisis Mendalam</h1>
              <p className="text-xl opacity-90">Insights & Rekomendasi untuk Peningkatan Destinasi Wisata</p>
            </div>
          </div>
        </motion.div>

        {/* Wisata Analysis Overview */}
        {wisataAnalysis && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="mb-8"
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <MapPin className="w-8 h-8 text-purple-600" />
                  <span className="text-3xl font-bold text-gray-900">
                    {wisataAnalysis.total_destinations || 0}
                  </span>
                </div>
                <p className="text-sm text-gray-600 font-medium">TOTAL DESTINASI</p>
              </div>

              <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-2xl p-6 shadow-lg border border-red-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                    <i className="fas fa-exclamation text-white"></i>
                  </div>
                  <span className="text-3xl font-bold text-red-600">
                    {wisataAnalysis.high_complaint_count || 0}
                  </span>
                </div>
                <p className="text-sm text-gray-600 font-medium">KELUHAN TINGGI</p>
              </div>

              <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-6 shadow-lg border border-yellow-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                    <i className="fas fa-minus text-white"></i>
                  </div>
                  <span className="text-3xl font-bold text-yellow-600">
                    {wisataAnalysis.medium_complaint_count || 0}
                  </span>
                </div>
                <p className="text-sm text-gray-600 font-medium">KELUHAN SEDANG</p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 shadow-lg border border-green-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <i className="fas fa-check text-white"></i>
                  </div>
                  <span className="text-3xl font-bold text-green-600">
                    {wisataAnalysis.low_complaint_count || 0}
                  </span>
                </div>
                <p className="text-sm text-gray-600 font-medium">KELUHAN RENDAH</p>
              </div>
            </div>

            {/* Search and Filter Bar */}
            <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100 mb-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Cari destinasi wisata..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => {
                        setSearchTerm('');
                        setCurrentPage(1);
                      }}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedCategory('all');
                      setCurrentPage(1);
                    }}
                    className={cn(
                      "px-4 py-2 rounded-xl font-medium transition-all",
                      selectedCategory === 'all' 
                        ? "bg-purple-600 text-white" 
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    )}
                  >
                    Semua
                  </button>
                  <button
                    onClick={() => {
                      setSelectedCategory('tinggi');
                      setCurrentPage(1);
                    }}
                    className={cn(
                      "px-4 py-2 rounded-xl font-medium transition-all",
                      selectedCategory === 'tinggi' 
                        ? "bg-red-500 text-white" 
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    )}
                  >
                    Tinggi
                  </button>
                  <button
                    onClick={() => {
                      setSelectedCategory('sedang');
                      setCurrentPage(1);
                    }}
                    className={cn(
                      "px-4 py-2 rounded-xl font-medium transition-all",
                      selectedCategory === 'sedang' 
                        ? "bg-yellow-500 text-white" 
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    )}
                  >
                    Sedang
                  </button>
                  <button
                    onClick={() => {
                      setSelectedCategory('rendah');
                      setCurrentPage(1);
                    }}
                    className={cn(
                      "px-4 py-2 rounded-xl font-medium transition-all",
                      selectedCategory === 'rendah' 
                        ? "bg-green-500 text-white" 
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    )}
                  >
                    Rendah
                  </button>
                </div>
              </div>

              {filteredDestinations.length > 0 && (
                <div className="mt-4 text-sm text-gray-600 text-center">
                  Menampilkan {Math.min((currentPage - 1) * itemsPerPage + 1, filteredDestinations.length)}-
                  {Math.min(currentPage * itemsPerPage, filteredDestinations.length)} dari {filteredDestinations.length} destinasi
                </div>
              )}
            </div>

            {/* Destination Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              <AnimatePresence mode="wait">
                {paginatedDestinations.map(([name, destination], index) => (
                  <motion.div
                    key={`${name}-${currentPage}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 hover:shadow-2xl transition-shadow"
                  >
                    {/* Header with gradient */}
                    <div className={`bg-gradient-to-r ${getComplaintLevelColor(destination.complaint_level)} p-4 text-white`}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-5 h-5 mt-1 flex-shrink-0" />
                          <h3 className="font-bold text-lg leading-tight">{name}</h3>
                        </div>
                        <div className="flex items-center gap-1 bg-white/20 px-2 py-1 rounded-full">
                          <Star className="w-4 h-4" />
                          <span className="text-sm font-bold">
                            {destination.average_rating?.toFixed(1) || 'N/A'}/5
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <i className="fas fa-map-marker-alt text-sm"></i>
                        <span className="text-sm">
                          {destination.complaint_level === 'tinggi' ? 'Perlu Perhatian Urgent' :
                           destination.complaint_level === 'sedang' ? 'Perlu Monitoring' :
                           'Performa Excellent'}
                        </span>
                        <div className="ml-auto bg-white/20 px-3 py-1 rounded-full text-xs font-bold uppercase">
                          <i className={`${getComplaintLevelIcon(destination.complaint_level)} mr-1`}></i>
                          KUNJUNGAN {destination.visit_category || 'N/A'}
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="p-4 grid grid-cols-3 gap-4 border-b border-gray-100">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">
                          {destination.total_reviews || 0}
                        </div>
                        <div className="text-xs text-gray-500 uppercase">Reviews</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-500">
                          {destination.complaint_percentage?.toFixed(1) || 0}%
                        </div>
                        <div className="text-xs text-gray-500 uppercase">Keluhan</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-500">
                          {destination.positive_percentage?.toFixed(1) || 0}%
                        </div>
                        <div className="text-xs text-gray-500 uppercase">Positif</div>
                      </div>
                    </div>

                    {/* Rating Distribution */}
                    {destination.rating_distribution && (
                      <div className="p-4 border-b border-gray-100">
                        <div className="flex items-center gap-2 mb-2">
                          <Star className="w-4 h-4 text-yellow-500" />
                          <span className="text-sm font-semibold text-gray-700">Distribusi Rating</span>
                        </div>
                        <div className="space-y-2">
                          {[5, 4, 3, 2, 1].map((rating) => {
                            const count = destination.rating_distribution[rating] || 0;
                            const percentage = destination.total_reviews > 0 
                              ? (count / destination.total_reviews * 100).toFixed(0)
                              : 0;
                            return (
                              <div key={rating} className="flex items-center gap-2">
                                <span className="text-xs text-gray-600 w-3">{rating}★</span>
                                <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                                  <div 
                                    className={cn(
                                      "h-full transition-all duration-500",
                                      rating >= 4 ? "bg-green-500" : rating === 3 ? "bg-yellow-500" : "bg-red-500"
                                    )}
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                                <span className="text-xs text-gray-600 w-10 text-right">{percentage}%</span>
                                <span className="text-xs text-gray-500 w-8 text-right">{count}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Top Complaints with Carousel */}
                    {destination.complaint_percentage > 0 && (
                      <div className="p-4">
                        <ComplaintCarousel 
                          complaints={destination.top_complaints || [
                            {
                              category: 'Keluhan Umum',
                              count: Math.round((destination.complaint_percentage / 100) * destination.total_reviews),
                              text: destination.sample_review || 'Terdapat beberapa keluhan dari pengunjung'
                            }
                          ]}
                          destinationName={name}
                        />
                        
                        {/* View All Button */}
                        <button
                          onClick={() => handleViewDetail(name, destination)}
                          className="mt-3 w-full flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg py-2 px-3 text-sm font-medium transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          Lihat Selengkapnya
                        </button>
                      </div>
                    )}

                    {/* Sentiment Bar */}
                    <div className="px-4 pb-4">
                      <div className="flex gap-1 text-xs font-medium">
                        <div 
                          className="bg-green-500 text-white px-2 py-1 rounded-l-lg text-center transition-all"
                          style={{ width: `${destination.positive_percentage || 0}%` }}
                        >
                          {destination.positive_percentage > 10 && `${destination.positive_percentage?.toFixed(0)}%`}
                        </div>
                        <div 
                          className="bg-yellow-500 text-white px-2 py-1 text-center transition-all"
                          style={{ width: `${destination.neutral_percentage || 0}%` }}
                        >
                          {destination.neutral_percentage > 10 && `${destination.neutral_percentage?.toFixed(0)}%`}
                        </div>
                        <div 
                          className="bg-red-500 text-white px-2 py-1 rounded-r-lg text-center transition-all"
                          style={{ width: `${destination.negative_percentage || 0}%` }}
                        >
                          {destination.negative_percentage > 10 && `${destination.negative_percentage?.toFixed(0)}%`}
                        </div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Positif</span>
                        <span>Netral</span>
                        <span>Negatif</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={cn(
                      "w-10 h-10 rounded-lg font-medium transition-all",
                      currentPage === page
                        ? "bg-purple-600 text-white"
                        : "bg-white border border-gray-200 hover:bg-gray-50"
                    )}
                  >
                    {page}
                  </button>
                ))}
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* Methodology Section - WITHOUT SORTING INFO */}
        <MethodologySection />

        {/* Detail Modal */}
        <DetailModal
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          destination={selectedDestination}
        />

        {/* Refresh Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex justify-center mt-8"
        >
          <button
            onClick={loadAnalysisData}
            disabled={loading}
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            <RefreshCw className={cn("w-5 h-5 mr-2", loading && "animate-spin")} />
            {loading ? 'Memuat...' : 'Refresh Analisis'}
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default Analysis;