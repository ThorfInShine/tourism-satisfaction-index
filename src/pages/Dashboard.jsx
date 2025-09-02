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
  Activity
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

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentFilter, setCurrentFilter] = useState('all');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [quadrantData, setQuadrantData] = useState(null);

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

        {/* Quadrant Analysis - Positioned right before Refresh Button, only for 'all' filter */}
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

        {/* Refresh Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
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