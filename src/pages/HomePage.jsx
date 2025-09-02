import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  MapPin,
  ArrowRight,
  Star,
  BarChart, // Changed from ChartBar to BarChart
  Brain
} from 'lucide-react';
import { apiService } from '../services/apiService';
import LoadingSpinner from '../components/LoadingSpinner';

const HomePage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await apiService.getStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
      // Fallback stats
      setStats({
        total_reviews: 22000,
        total_destinations: 30
      });
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      icon: BarChart3, // Changed from ChartBar to BarChart3
      title: 'Dashboard Interaktif',
      description: 'Visualisasi data real-time dengan charts dan statistik yang mudah dipahami untuk pengambilan keputusan cepat.',
      gradient: 'from-blue-500 to-cyan-500'
    },
    {
      icon: Brain,
      title: 'Analisis Sentimen AI',
      description: 'Teknologi Natural Language Processing untuk menganalisis sentimen dan emosi dari review wisatawan secara otomatis.',
      gradient: 'from-green-500 to-emerald-500'
    },
    {
      icon: TrendingUp,
      title: 'Rekomendasi Cerdas',
      description: 'Saran perbaikan prioritas berdasarkan analisis data untuk meningkatkan kualitas destinasi wisata.',
      gradient: 'from-orange-500 to-yellow-500'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Hero Section */}
      <section className="relative pt-20 pb-16 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600" />
        <div className="absolute inset-0 bg-black/20" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center lg:text-left"
            >
              {/* Speech Bubble */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="relative bg-green-500 rounded-3xl p-6 mb-8 shadow-2xl"
              >
                <h1 className="text-2xl lg:text-3xl font-bold text-white leading-tight">
                  Bagaimana Tingkat Kepuasan Wisatawan di Kota Batu?
                </h1>
                {/* Speech bubble tail */}
                <div className="absolute -bottom-3 left-12 w-0 h-0 border-l-[15px] border-r-[15px] border-t-[15px] border-l-transparent border-r-transparent border-t-green-500" />
              </motion.div>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.6 }}
                className="text-xl text-white/90 mb-8 leading-relaxed"
              >
                Platform canggih untuk menganalisis kepuasan wisatawan menggunakan 
                Machine Learning dan Natural Language Processing. Dapatkan insights mendalam 
                dari review wisatawan untuk meningkatkan kualitas destinasi wisata.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.6 }}
              >
                <Link
                  to="/dashboard"
                  className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-full text-lg shadow-2xl hover:shadow-orange-500/25 transform hover:scale-105 transition-all duration-300"
                >
                  <BarChart3 className="w-6 h-6 mr-3" />
                  Mulai Analisis
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </motion.div>
            </motion.div>

            {/* Right Illustration - Placeholder */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              <div className="w-full max-w-md mx-auto h-96 bg-white/10 rounded-3xl flex items-center justify-center backdrop-blur-sm border border-white/20">
                <div className="text-center text-white">
                  <BarChart3 className="w-24 h-24 mx-auto mb-4 opacity-50" />
                  <p className="text-lg opacity-75">Tourism Analytics</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Fitur Unggulan Platform
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Teknologi terdepan untuk analisis kepuasan wisatawan yang komprehensif
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                whileHover={{ y: -10 }}
                className="bg-white rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 border border-gray-100"
              >
                <div className={`w-16 h-16 bg-gradient-to-r ${feature.gradient} rounded-2xl flex items-center justify-center mb-6 shadow-lg`}>
                  <feature.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-3xl p-8 lg:p-12 shadow-xl border border-blue-100"
          >
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Stats Content */}
              <div>
                <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-8">
                  Data Terkini Platform
                </h2>
                
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <LoadingSpinner size="large" />
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-8">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6 }}
                      className="text-center"
                    >
                      <div className="text-5xl font-bold text-blue-600 mb-2">
                        {stats?.total_reviews?.toLocaleString() || '22,000'}
                      </div>
                      <div className="text-lg font-semibold text-gray-900 mb-2">
                        Review Diproses
                      </div>
                      <div className="text-gray-600">
                        Total review yang telah dianalisis
                      </div>
                    </motion.div>
                    
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, delay: 0.2 }}
                      className="text-center"
                    >
                      <div className="text-5xl font-bold text-purple-600 mb-2">
                        {stats?.total_destinations || '30'}
                      </div>
                      <div className="text-lg font-semibold text-gray-900 mb-2">
                        Destinasi Wisata
                      </div>
                      <div className="text-gray-600">
                        Destinasi yang telah dianalisis
                      </div>
                    </motion.div>
                  </div>
                )}
              </div>

              {/* Illustration Placeholder */}
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="relative"
              >
                <div className="w-full max-w-sm mx-auto h-64 bg-gradient-to-br from-blue-100 to-purple-100 rounded-3xl flex items-center justify-center">
                  <div className="text-center">
                    <Users className="w-16 h-16 mx-auto mb-4 text-blue-600" />
                    <p className="text-gray-700 font-medium">Tourist Analytics</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl font-bold text-white mb-6">
              Siap untuk Menganalisis Data Wisatawan?
            </h2>
            <p className="text-xl text-white/90 mb-8">
              Mulai journey Anda dalam memahami kepuasan wisatawan dengan teknologi AI terdepan
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/dashboard"
                className="inline-flex items-center px-8 py-4 bg-white text-blue-600 font-semibold rounded-full text-lg shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
              >
                <BarChart3 className="w-6 h-6 mr-3" />
                Lihat Dashboard
              </Link>
              <Link
                to="/analysis"
                className="inline-flex items-center px-8 py-4 bg-transparent border-2 border-white text-white font-semibold rounded-full text-lg hover:bg-white hover:text-blue-600 transition-all duration-300"
              >
                <BarChart className="w-6 h-6 mr-3" />
                Mulai Analisis
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg">Tourism Analytics</span>
            </div>
            <div className="text-gray-400 text-sm">
              © 2024 Analisis Kepuasan Wisatawan Kota Batu. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;