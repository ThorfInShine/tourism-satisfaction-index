import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  Users,
  MessageSquare,
  Filter,
  ChevronDown,
  Star,
  ThumbsUp,
  ThumbsDown,
  Minus,
  RefreshCw,
  PieChart,
  Activity,
  AlertTriangle,
  Target,
  Lightbulb,
  TrendingDown,
  MapPin,
  ChevronRight
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

// Updated DestinationsList component with new design
const DestinationsList = ({ filter, data }) => {
  const [destinations, setDestinations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    loadDestinations();
  }, [filter]);

  const loadDestinations = async () => {
    try {
      setLoading(true);
      const analysisData = await apiService.getAllWisataAnalysis();
      
      if (analysisData.success && analysisData.destinations) {
        // Filter destinations based on visit category
        let filtered = Object.entries(analysisData.destinations);
        
        if (filter !== 'all') {
          filtered = filtered.filter(([name, dest]) => {
            const visitCategory = (
              dest.visit_category || 
              dest.visit_level || 
              dest.kunjungan_level || 
              dest.kunjungan_category ||
              ''
            ).toLowerCase();
            
            const visitCount = dest.visit_count || dest.jumlah_kunjungan || 0;
            
            if (visitCategory) {
              if (filter === 'high') return visitCategory === 'tinggi' || visitCategory === 'high';
              if (filter === 'medium') return visitCategory === 'sedang' || visitCategory === 'medium';
              if (filter === 'low') return visitCategory === 'rendah' || visitCategory === 'low';
            } 
            else if (visitCount > 0) {
              if (filter === 'high') return visitCount >= 1000;
              if (filter === 'medium') return visitCount >= 500 && visitCount < 1000;
              if (filter === 'low') return visitCount < 500;
            }
            
            return false;
          });
        }
        
        // Sort by visit count descending
        filtered.sort((a, b) => {
          const countA = a[1].visit_count || a[1].jumlah_kunjungan || 0;
          const countB = b[1].visit_count || b[1].jumlah_kunjungan || 0;
          return countB - countA;
        });
        
        setDestinations(filtered);
        setShowAll(false); // Reset to show limited items when filter changes
        
        console.log(`Filter: ${filter}, Found ${filtered.length} destinations`);
      }
    } catch (error) {
      console.error('Failed to load destinations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to determine visit category for display
  const getVisitCategory = (dest) => {
    const category = dest.visit_category || dest.visit_level || dest.kunjungan_level || dest.kunjungan_category;
    if (category) {
      return category.toLowerCase();
    }
    
    const visitCount = dest.visit_count || dest.jumlah_kunjungan || 0;
    if (visitCount >= 1000) return 'tinggi';
    if (visitCount >= 500) return 'sedang';
    return 'rendah';
  };

  // Component for the horizontal scroll list
  const HorizontalScrollList = () => {
    const topDestinations = destinations.slice(0, 10);
    
    if (topDestinations.length === 0) return null;
    
    return (
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-3 mb-6 overflow-hidden">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
          <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-sm">
            <MapPin className="w-4 h-4 text-blue-600" />
            <span className="font-semibold text-sm text-gray-700">
              Destinasi ({destinations.length}):
            </span>
          </div>
          
          {topDestinations.map(([name, dest], index) => {
            const rating = dest.average_rating?.toFixed(1) || dest.avg_rating?.toFixed(1) || '0.0';
            const visitCategory = getVisitCategory(dest);
            
            return (
              <motion.div
                key={name}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  "flex-shrink-0 px-3 py-2 bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer",
                  "hover:scale-105"
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">{name}</span>
                  <span className="text-sm font-bold text-yellow-500">{rating}★</span>
                </div>
              </motion.div>
            );
          })}
          
          {destinations.length > 10 && (
            <div className="flex-shrink-0 px-3 py-2">
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner size="medium" />
        </div>
      </div>
    );
  }

  if (destinations.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
        <div className="text-center py-8">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">Tidak ada destinasi untuk filter ini</p>
          <p className="text-sm text-gray-500 mt-2">
            {filter === 'high' && 'Destinasi dengan kunjungan ≥ 1000'}
            {filter === 'medium' && 'Destinasi dengan kunjungan 500-999'}
            {filter === 'low' && 'Destinasi dengan kunjungan < 500'}
          </p>
        </div>
      </div>
    );
  }

  // Determine how many items to show
  const itemsToShow = showAll ? destinations.length : Math.min(5, destinations.length);
  const displayedDestinations = destinations.slice(0, itemsToShow);

  return (
    <>
      {/* Horizontal Scroll List */}
      <HorizontalScrollList />

      {/* Main List */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6 text-white" />
              <h2 className="text-xl font-bold text-white">
                Daftar Destinasi Wisata
              </h2>
            </div>
            <span className="bg-white/20 px-3 py-1 rounded-full text-sm text-white font-medium">
              {destinations.length} Destinasi
            </span>
          </div>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            {displayedDestinations.map(([name, dest], index) => {
              const complaintLevel = dest.complaint_level?.toLowerCase();
              const visitCategory = getVisitCategory(dest);
              const visitCount = dest.visit_count || dest.jumlah_kunjungan || 0;
              const rating = dest.average_rating?.toFixed(1) || dest.avg_rating?.toFixed(1) || '0.0';
              const totalReviews = dest.total_reviews || 0;
              const positivePercentage = dest.positive_percentage || 0;
              const neutralPercentage = dest.neutral_percentage || 0;
              const negativePercentage = dest.complaint_percentage || dest.negative_percentage || 0;
              
              return (
                <motion.div
                  key={name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white rounded-xl border border-gray-200 hover:shadow-lg transition-all duration-200 overflow-hidden"
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-sm">
                          <span className="text-lg font-bold text-blue-600">
                            {index + 1}
                          </span>
                        </div>
                        
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 text-lg mb-2">
                            {name}
                          </h3>
                          
                          <div className="flex flex-wrap items-center gap-4">
                            {/* Rating */}
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 text-yellow-500 fill-current" />
                              <span className="text-sm font-semibold text-gray-700">
                                {rating}
                              </span>
                            </div>
                            
                            {/* Reviews */}
                            <div className="flex items-center gap-1">
                              <MessageSquare className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-600">
                                {totalReviews.toLocaleString()} reviews
                              </span>
                            </div>
                            
                            {/* Visits */}
                            <div className="flex items-center gap-1">
                              <Users className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-600">
                                {visitCount.toLocaleString()} kunjungan
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-2">
                        {/* Visit Level Badge */}
                        <span className={cn(
                          "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                          visitCategory === 'tinggi' && "bg-green-100 text-green-700",
                          visitCategory === 'sedang' && "bg-yellow-100 text-yellow-700",
                          visitCategory === 'rendah' && "bg-red-100 text-red-700"
                        )}>
                          {visitCategory === 'tinggi' ? 'HIGH' : 
                           visitCategory === 'sedang' ? 'MEDIUM' : 'LOW'}
                        </span>
                        
                        {/* Complaint Percentage */}
                        <div className="text-right">
                          <div className={cn(
                            "text-2xl font-bold",
                            negativePercentage >= 40 && "text-red-500",
                            negativePercentage >= 20 && negativePercentage < 40 && "text-orange-500",
                            negativePercentage < 20 && "text-green-500"
                          )}>
                            {negativePercentage.toFixed(1)}%
                          </div>
                          <div className="text-xs text-gray-500 font-medium">Keluhan</div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Sentiment Progress Bar */}
                    <div className="mt-4">
                      <div className="flex h-3 rounded-full overflow-hidden bg-gray-100">
                        <motion.div 
                          className="bg-gradient-to-r from-green-400 to-green-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${positivePercentage}%` }}
                          transition={{ duration: 0.8, delay: index * 0.1 }}
                        />
                        <motion.div 
                          className="bg-gradient-to-r from-yellow-400 to-yellow-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${neutralPercentage}%` }}
                          transition={{ duration: 0.8, delay: index * 0.1 + 0.1 }}
                        />
                        <motion.div 
                          className="bg-gradient-to-r from-red-400 to-red-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${negativePercentage}%` }}
                          transition={{ duration: 0.8, delay: index * 0.1 + 0.2 }}
                        />
                      </div>
                      
                      <div className="flex justify-between mt-2">
                        <span className="text-xs text-green-600 font-medium">
                          Positif: {positivePercentage.toFixed(1)}%
                        </span>
                        <span className="text-xs text-yellow-600 font-medium">
                          Netral: {neutralPercentage.toFixed(1)}%
                        </span>
                        <span className="text-xs text-red-600 font-medium">
                          Negatif: {negativePercentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Show More/Less Button */}
          {destinations.length > 5 && (
            <div className="mt-6 text-center">
              <button
                onClick={() => setShowAll(!showAll)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
              >
                {showAll ? (
                  <>
                    <span>Tampilkan Lebih Sedikit</span>
                    <ChevronDown className="w-4 h-4 rotate-180" />
                  </>
                ) : (
                  <>
                    <span>Tampilkan Semua ({destinations.length})</span>
                    <ChevronDown className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentFilter, setCurrentFilter] = useState('all');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [quadrantData, setQuadrantData] = useState(null);
  const [complaintData, setComplaintData] = useState(null);

  const filterOptions = [
    { value: 'all', label: '🌍 Semua Kunjungan', description: 'Seluruh destinasi wisata' },
    { value: 'high', label: '⬆️ Kunjungan Tinggi', description: 'Destinasi dengan tingkat kunjungan tinggi' },
    { value: 'medium', label: '➖ Kunjungan Sedang', description: 'Destinasi dengan tingkat kunjungan sedang' },
    { value: 'low', label: '⬇️ Kunjungan Rendah', description: 'Destinasi dengan tingkat kunjungan rendah' }
  ];

  // Load dashboard data on component mount with 'all' filter
  useEffect(() => {
    loadDashboardData('all');
  }, []);

  const loadDashboardData = async (filter = 'all') => {
    try {
      setLoading(true);
      
      // Always use getFilteredData to ensure we get the correct data structure
      const dashboardData = await apiService.getFilteredData(filter);
      
      // Fallback to getDashboardData if getFilteredData fails
      if (!dashboardData || (!dashboardData.charts && !dashboardData.metrics)) {
        const fallbackData = await apiService.getDashboardData(filter);
        setData(fallbackData);
      } else {
        setData(dashboardData);
      }
      
      // Load quadrant data only for 'all' filter
      if (filter === 'all') {
        try {
          const quadrant = await apiService.getQuadrantData('all');
          setQuadrantData(quadrant);
        } catch (error) {
          console.error('Quadrant data not available:', error);
          setQuadrantData(null);
        }
      } else {
        setQuadrantData(null);
      }

      // Load complaint analysis data
      try {
        const complaintAnalysis = await apiService.getComplaintAnalysis(filter);
        setComplaintData(complaintAnalysis);
      } catch (error) {
        console.error('Complaint analysis data not available:', error);
        setComplaintData(null);
      }
      
      // Update current filter
      setCurrentFilter(filter);
      
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      
      // Try to load default dashboard data as last resort
      try {
        const defaultData = await apiService.getDashboardData('all');
        setData(defaultData);
        setCurrentFilter('all');
        toast.error('Memuat data default dashboard');
      } catch (fallbackError) {
        console.error('Failed to load fallback data:', fallbackError);
        toast.error('Gagal memuat data dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = async (filterValue) => {
    try {
      setShowFilterDropdown(false);
      
      // Don't reload if it's the same filter
      if (filterValue === currentFilter) {
        return;
      }
      
      await loadDashboardData(filterValue);
      
      const selectedFilter = filterOptions.find(f => f.value === filterValue);
      toast.success(`Filter berhasil diterapkan: ${selectedFilter?.label}`);
    } catch (error) {
      console.error('Failed to apply filter:', error);
      toast.error('Gagal menerapkan filter');
    }
  };

  const handleRefresh = async () => {
    await loadDashboardData(currentFilter);
    toast.success('Data berhasil diperbarui');
  };

  const currentFilterOption = filterOptions.find(f => f.value === currentFilter);

  if (loading && !data) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="large" />
          <p className="mt-4 text-gray-600">Memuat dashboard...</p>
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
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-8 text-white mb-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.05%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%224%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] animate-pulse" />
            
            <div className="relative z-10 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              >
                <BarChart3 className="w-16 h-16 mx-auto mb-4" />
              </motion.div>
              <h1 className="text-4xl font-bold mb-2">Dashboard Kepuasan Wisatawan</h1>
              <p className="text-xl opacity-90">Analisis Real-time Indeks Kepuasan Wisatawan Kota Batu</p>
            </div>
          </div>

          {/* Filter Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100 mb-8"
          >
            <div className="flex flex-col lg:flex-row items-center justify-center gap-4">
              <div className="flex items-center gap-3">
                <Filter className="w-6 h-6 text-blue-600" />
                <span className="font-semibold text-gray-900 text-lg">Filter Berdasarkan Tingkat Kunjungan:</span>
              </div>
              
              <div className="relative">
                <button
                  onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                  className="flex items-center gap-3 bg-white border-2 border-gray-200 rounded-full px-6 py-3 font-semibold text-gray-700 hover:border-blue-500 hover:text-blue-600 transition-all duration-200 min-w-[280px] justify-between"
                >
                  <span>{currentFilterOption?.label}</span>
                  <ChevronDown className={cn(
                    "w-5 h-5 transition-transform duration-200",
                    showFilterDropdown && "rotate-180"
                  )} />
                </button>

                {showFilterDropdown && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 z-50"
                  >
                    {filterOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => handleFilterChange(option.value)}
                        className={cn(
                          "w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors",
                          currentFilter === option.value && "bg-blue-100 text-blue-600"
                        )}
                      >
                        <div className="font-medium">{option.label}</div>
                        <div className="text-sm text-gray-500">{option.description}</div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Active Filter Indicator */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className={cn(
              "rounded-2xl p-4 mb-8 text-center font-semibold shadow-lg",
              currentFilter === 'all' && "bg-gradient-to-r from-blue-500 to-purple-500 text-white",
              currentFilter === 'high' && "bg-gradient-to-r from-green-500 to-emerald-500 text-white",
              currentFilter === 'medium' && "bg-gradient-to-r from-yellow-500 to-orange-500 text-white",
              currentFilter === 'low' && "bg-gradient-to-r from-orange-500 to-red-500 text-white"
            )}
          >
            <div className="flex items-center justify-center gap-2">
              <Filter className="w-5 h-5" />
              <span>Menampilkan: {currentFilterOption?.label} - {currentFilterOption?.description}</span>
            </div>
          </motion.div>
        </motion.div>

        {/* Destinations List Section - NEW DESIGN */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="mb-8"
        >
          <DestinationsList filter={currentFilter} data={data} />
        </motion.div>

        {/* Metrics Cards */}
        {data?.metrics && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8"
          >
            <MetricCard
              title="Kepuasan Overall"
              value={data.metrics.overall_satisfaction?.toFixed(2) || '0.00'}
              icon={Star}
              color="blue"
              progress={((data.metrics.overall_satisfaction || 0) / 5) * 100}
              subtitle="Skala 1-5"
            />
            <MetricCard
              title="Total Review"
              value={data.metrics.total_reviews?.toLocaleString() || '0'}
              icon={MessageSquare}
              color="cyan"
              progress={95}
              subtitle="Ulasan Wisatawan"
            />
            <MetricCard
              title="Sentimen Positif"
              value={`${data.metrics.positive_percentage?.toFixed(1) || '0.0'}%`}
              icon={ThumbsUp}
              color="green"
              progress={data.metrics.positive_percentage || 0}
              subtitle="Feedback Positif"
            />
            <MetricCard
              title="Sentimen Netral"
              value={`${data.metrics.neutral_percentage?.toFixed(1) || '0.0'}%`}
              icon={Minus}
              color="yellow"
              progress={data.metrics.neutral_percentage || 0}
              subtitle="Feedback Netral"
            />
            <MetricCard
              title="Sentimen Negatif"
              value={`${data.metrics.negative_percentage?.toFixed(1) || '0.0'}%`}
              icon={ThumbsDown}
              color="red"
              progress={data.metrics.negative_percentage || 0}
              subtitle="Feedback Negatif"
            />
          </motion.div>
        )}

        {/* Charts Section */}
        {data?.charts && (
          <div className="grid lg:grid-cols-2 gap-8 mb-8">
            {/* Rating Distribution */}
            {data.charts.rating_dist && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
              >
                <ChartCard
                  title="Distribusi Rating"
                  icon={BarChart3}
                  data={data.charts.rating_dist}
                  type="bar"
                />
              </motion.div>
            )}

            {/* Sentiment Distribution */}
            {data.charts.sentiment_dist && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 }}
              >
                <ChartCard
                  title="Distribusi Sentimen"
                  icon={PieChart}
                  data={data.charts.sentiment_dist}
                  type="pie"
                />
              </motion.div>
            )}
          </div>
        )}

        {/* Top Charts */}
        {data?.charts && (
          <div className="grid lg:grid-cols-2 gap-8 mb-8">
            {/* Top Rating */}
            {data.charts.top_rating && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
              >
                <ChartCard
                  title={currentFilter === 'all' ? "Top 10 Rating Tertinggi" : `Top Rating - ${currentFilterOption?.label}`}
                  icon={Star}
                  data={data.charts.top_rating}
                  type="horizontalBar"
                />
              </motion.div>
            )}

            {/* Top Visits */}
            {data.charts.top_visits && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
              >
                <ChartCard
                  title={currentFilter === 'all' ? "Top 10 Kunjungan Terbanyak" : `Top Kunjungan - ${currentFilterOption?.label}`}
                  icon={Users}
                  data={data.charts.top_visits}
                  type="horizontalBar"
                />
              </motion.div>
            )}
          </div>
        )}

        {/* No Data Message */}
        {!data && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 mb-8"
          >
            <div className="bg-gray-100 rounded-2xl p-8">
              <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Tidak Ada Data</h3>
              <p className="text-gray-500">Data dashboard tidak tersedia saat ini.</p>
              <button
                onClick={handleRefresh}
                className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Coba Lagi
              </button>
            </div>
          </motion.div>
        )}

        {/* Quadrant Analysis - Positioned right before Complaint Analysis, only for 'all' filter */}
        {currentFilter === 'all' && quadrantData && quadrantData.success && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0 }}
            className="mb-8"
          >
            <ChartCard
              title="Analisis Kuadran: Rating vs Kunjungan"
              icon={PieChart}
              data={quadrantData}
              type="scatter"
            />
          </motion.div>
        )}

        {/* Complaint Analysis Section */}
        {complaintData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1 }}
            className="mb-8"
          >
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-red-500 to-orange-500 px-6 py-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6 text-white" />
                  <h2 className="text-xl font-bold text-white">Analisis Keluhan Wisatawan</h2>
                </div>
              </div>

              <div className="p-6">
                {complaintData.success && complaintData.total_complaints > 0 ? (
                  <div>
                    {/* Complaint Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <MessageSquare className="w-8 h-8 text-red-500" />
                          <span className="text-2xl font-bold text-gray-900">
                            {complaintData.total_complaints?.toLocaleString() || 0}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-gray-700">TOTAL KELUHAN</p>
                        <p className="text-xs text-gray-500 mt-1">Keywords Detected</p>
                      </div>

                      <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <TrendingDown className="w-8 h-8 text-yellow-500" />
                          <span className="text-2xl font-bold text-gray-900">
                            {complaintData.total_negative_reviews?.toLocaleString() || 0}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-gray-700">REVIEW NEGATIF</p>
                        <p className="text-xs text-gray-500 mt-1">Reviews Analyzed</p>
                      </div>

                      <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <BarChart3 className="w-8 h-8 text-cyan-500" />
                          <span className="text-2xl font-bold text-gray-900">
                            {complaintData.categories_found || 0}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-gray-700">KATEGORI KELUHAN</p>
                        <p className="text-xs text-gray-500 mt-1">Categories Found</p>
                      </div>

                      <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <Target className="w-8 h-8 text-red-500" />
                          <span className="text-2xl font-bold text-gray-900">
                            {complaintData.trend_analysis?.percentage?.toFixed(1) || 0}%
                          </span>
                        </div>
                        <p className="text-sm font-medium text-gray-700">TINGKAT KELUHAN</p>
                        <p className="text-xs text-gray-500 mt-1 uppercase">
                          {complaintData.trend_analysis?.trend || 'MODERATE'}
                        </p>
                        {/* Progress bar */}
                        <div className="mt-2 bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div 
                            className={cn(
                              "h-full transition-all duration-500",
                              complaintData.trend_analysis?.percentage >= 60 ? "bg-red-500" :
                              complaintData.trend_analysis?.percentage >= 30 ? "bg-yellow-500" :
                              "bg-green-500"
                            )}
                            style={{ width: `${complaintData.trend_analysis?.percentage || 0}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Top Complaints */}
                    {complaintData.top_complaints && complaintData.top_complaints.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Top Kategori Keluhan</h3>
                        <div className="grid gap-4">
                          {complaintData.top_complaints.slice(0, 5).map(([category, details], index) => {
                            const categoryInfo = details.category_info || {
                              display_name: category,
                              description: `Keluhan terkait ${category}`,
                              icon: 'fas fa-exclamation-circle',
                              color: '#EF4444'
                            };
                            
                            return (
                              <div
                                key={category}
                                className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200 hover:shadow-md transition-shadow"
                              >
                                <div className="flex items-center gap-4">
                                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-sm">
                                    <i className={`${categoryInfo.icon} text-lg`} style={{ color: categoryInfo.color }}></i>
                                  </div>
                                  <div>
                                    <h4 className="font-semibold text-gray-900">
                                      #{index + 1} {categoryInfo.display_name}
                                    </h4>
                                    <p className="text-sm text-gray-600">{categoryInfo.description}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-2xl font-bold" style={{ color: categoryInfo.color }}>
                                    {details.total_count || 0}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {details.percentage?.toFixed(1) || 0}%
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Insights */}
                    {complaintData.insights && complaintData.insights.length > 0 && (
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                          <Lightbulb className="w-5 h-5 text-yellow-500" />
                          Insights & Rekomendasi
                        </h3>
                        <div className="grid gap-4">
                          {complaintData.insights.map((insight, index) => (
                            <div
                              key={index}
                              className={cn(
                                "p-4 rounded-xl border-l-4",
                                insight.type === 'danger' && "bg-red-50 border-red-500",
                                insight.type === 'warning' && "bg-yellow-50 border-yellow-500",
                                insight.type === 'info' && "bg-blue-50 border-blue-500",
                                insight.type === 'success' && "bg-green-50 border-green-500"
                              )}
                            >
                              <div className="flex items-start gap-3">
                                <i className={`${insight.icon} text-lg mt-1`}></i>
                                <div>
                                  <h4 className="font-semibold text-gray-900 mb-1">
                                    {insight.title}
                                  </h4>
                                  <p className="text-gray-700">{insight.description}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Analysis Trend */}
                    {complaintData.trend_analysis && (
                      <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Activity className="w-5 h-5 text-blue-600" />
                          <h4 className="font-semibold text-gray-900">Analisis Trend:</h4>
                        </div>
                        <p className="text-gray-700">
                          Dari {complaintData.total_negative_reviews?.toLocaleString() || 0} review negatif, 
                          terdeteksi {complaintData.total_complaints?.toLocaleString() || 0} keyword keluhan 
                          dalam {complaintData.categories_found || 0} kategori. 
                          Top 3 kategori menyumbang {
                            complaintData.top_complaints?.slice(0, 3)
                              .reduce((acc, [_, details]) => acc + (details.percentage || 0), 0)
                              .toFixed(1) || 0
                          }% dari total keluhan.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <i className="fas fa-smile text-2xl text-green-600"></i>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Excellent Performance!</h3>
                    <p className="text-gray-600">
                      Tidak ada keluhan signifikan terdeteksi untuk filter {currentFilterOption?.label}.
                      Semua destinasi memiliki feedback yang positif.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Refresh Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="flex justify-center"
        >
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            <RefreshCw className={cn("w-5 h-5 mr-2", loading && "animate-spin")} />
            {loading ? 'Memuat...' : 'Refresh Data'}
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;