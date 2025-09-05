import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  PieChart,
  Lightbulb,
  TreePine,
  ChevronDown
} from 'lucide-react';
import { apiService } from '../services/apiService';
import LoadingSpinner from '../components/LoadingSpinner';

// Images
const tourismImage = "https://res.cloudinary.com/dk2tex4to/image/upload/v1755629984/Desain_tanpa_judul-removebg-preview_izdxie.png";
const statsImage = "https://res.cloudinary.com/dk2tex4to/image/upload/v1755625548/ChatGPT_Image_Aug_20__2025__12_35_04_AM-removebg-preview_gttvad.png";

const HomePage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    loadStats();
    setupScrollListener();
  }, []);

  const loadStats = async () => {
    try {
      const data = await apiService.getStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
      setStats({
        total_reviews: 22000,
        total_destinations: 30
      });
    } finally {
      setLoading(false);
    }
  };

  const setupScrollListener = () => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      const heroHeight = window.innerHeight;
      
      if (scrollPosition > heroHeight * 0.8) {
        setShowContent(true);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    
    return () => window.removeEventListener('scroll', handleScroll);
  };

  const scrollToContent = () => {
    window.scrollTo({
      top: window.innerHeight,
      behavior: 'smooth'
    });
  };

  const features = [
    {
      icon: PieChart,
      title: 'Dashboard Interaktif',
      description: 'Visualisasi data real-time dengan charts dan statistik yang mudah dipahami, untuk pengambilan keputusan cepat.',
      gradient: 'from-blue-500 to-blue-700'
    },
    {
      icon: TreePine,
      title: 'Analisis Sentimen AI',
      description: 'Teknologi Natural Language Processing untuk menganalisis sentimen dan emosi dari review wisatawan secara otomatis.',
      gradient: 'from-green-500 to-green-700'
    },
    {
      icon: Lightbulb,
      title: 'Rekomendasi Cerdas',
      description: 'Saran perbaikan prioritas berdasarkan analisis data untuk meningkatkan kualitas destinasi wisata.',
      gradient: 'from-amber-500 to-orange-600'
    }
  ];

  return (
    <div 
      className="min-h-screen" 
      style={{
        background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #ec4899 100%)',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
      }}
    >
      <HeroSection 
        tourismImage={tourismImage} 
        scrollToContent={scrollToContent} 
      />
      
      <FeaturesSection 
        features={features} 
        showContent={showContent} 
      />
      
      <StatsSection 
        stats={stats} 
        loading={loading} 
        showContent={showContent} 
        statsImage={statsImage} 
      />
      
      <Footer showContent={showContent} />
    </div>
  );
};

// Hero Section Component
const HeroSection = ({ tourismImage, scrollToContent }) => (
  <section className="h-screen relative overflow-hidden flex items-center">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid lg:grid-cols-2 gap-12 items-center">
        
        {/* Hero Image */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="flex justify-center items-center lg:order-1 order-2"
        >
          <div className="relative h-[500px] flex items-center justify-center p-8">
            <motion.img 
              src={tourismImage}
              alt="Travel Illustration" 
              className="w-full max-w-[450px] h-auto"
              animate={{ y: [0, -15, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              style={{ filter: 'drop-shadow(0 10px 30px rgba(0, 0, 0, 0.2))' }}
            />
          </div>
        </motion.div>

        {/* Hero Content */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="lg:order-2 order-1"
        >
          <HeroTitle />
          <HeroDescription />
          <HeroActions scrollToContent={scrollToContent} />
        </motion.div>
      </div>
    </div>

    <ScrollIndicator onClick={scrollToContent} />
  </section>
);

// Hero Title Component
const HeroTitle = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.3, duration: 0.6 }}
    className="mb-8"
  >
    <h1 className="text-2xl lg:text-6xl font-extrabold text-white leading-tight">
      Data Bicara: 
      <span className="block text-xl lg:text-3xl mt-2 text-white/90">
        Bagaimana Tingkat Kepuasan di Kota Batu?
      </span>
    </h1>
  </motion.div>
);

// Hero Description Component
const HeroDescription = () => (
  <motion.p
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.5, duration: 0.6 }}
    className="text-lg text-white/95 mb-10 leading-relaxed max-w-[550px] text-justify"
  >
    Platform canggih untuk menganalisis kepuasan wisatawan menggunakan 
    Machine Learning dan Natural Language Processing. Dapatkan insights mendalam 
    dari review wisatawan untuk meningkatkan kualitas destinasi wisata.
  </motion.p>
);

// Hero Actions Component
const HeroActions = ({ scrollToContent }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.7, duration: 0.6 }}
    className="space-y-6"
  >
    <Link
      to="/dashboard"
      className="inline-flex items-center px-12 py-5 bg-gradient-to-r from-orange-500 to-yellow-600 text-white font-semibold rounded-full text-xl shadow-2xl hover:shadow-orange-500/30 transform hover:scale-105 hover:-translate-y-1 transition-all duration-300"
    >
      <BarChart3 className="w-6 h-6 mr-3" />
      Mulai Analisis
    </Link>
    
    <div>
      <button
        onClick={scrollToContent}
        className="inline-flex items-center text-white/80 hover:text-white transition-colors duration-300 group"
      >
        <span className="mr-2">Lihat Fitur Lengkap</span>
        <ChevronDown className="w-5 h-5 group-hover:translate-y-1 transition-transform duration-300" />
      </button>
    </div>
  </motion.div>
);

// Scroll Indicator Component
const ScrollIndicator = ({ onClick }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: 1.5, duration: 0.8 }}
    className="absolute bottom-8 left-1/2 transform -translate-x-1/2 cursor-pointer"
    onClick={onClick}
  >
    <motion.div
      animate={{ y: [0, 10, 0] }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center hover:border-white/80 transition-colors duration-300"
    >
      <motion.div
        animate={{ y: [0, 12, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="w-1 h-3 bg-white/70 rounded-full mt-2"
      />
    </motion.div>
  </motion.div>
);

// Features Section Component
const FeaturesSection = ({ features, showContent }) => (
  <motion.section 
    className="py-16 relative z-2"
    initial={{ opacity: 0, y: 50 }}
    animate={showContent ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
    transition={{ duration: 0.8 }}
  >
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={showContent ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
        transition={{ duration: 0.8 }}
        className="text-center mb-16"
      >
        <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
          Fitur Unggulan
        </h2>
        <p className="text-white/80 text-xl max-w-3xl mx-auto leading-relaxed">
          Teknologi terdepan untuk analisis kepuasan wisatawan
        </p>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-8">
        {features.map((feature, index) => (
          <FeatureCard 
            key={index}
            feature={feature}
            index={index}
            showContent={showContent}
          />
        ))}
      </div>
    </div>
  </motion.section>
);

// Feature Card Component
const FeatureCard = ({ feature, index, showContent }) => (
  <motion.div
    initial={{ opacity: 0, y: 50 }}
    animate={showContent ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
    transition={{ duration: 0.6, delay: showContent ? index * 0.2 : 0 }}
    whileHover={{ y: -10, scale: 1.02 }}
    className="bg-white/95 backdrop-blur-md border border-white/20 rounded-3xl p-8 text-center shadow-2xl hover:shadow-3xl transition-all duration-300 h-full"
  >
    <div className={`w-20 h-20 bg-gradient-to-r ${feature.gradient} rounded-2xl flex items-center justify-center mx-auto mb-6 text-white shadow-lg`}>
      <feature.icon className="w-10 h-10" />
    </div>
    <h3 className="text-2xl font-bold text-gray-900 mb-4">
      {feature.title}
    </h3>
    <p className="text-gray-600 leading-relaxed">
      {feature.description}
    </p>
  </motion.div>
);

// Animated Number Component
const AnimatedNumber = ({ value, suffix = '', showContent }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!value || !showContent) return;
    
    const duration = 2000;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const current = Math.floor(value * easeOutQuart);
      
      setDisplayValue(current);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [value, showContent]);

  const formatNumber = (num) => {
    if (num >= 1000) {
      const thousands = Math.floor(num / 1000);
      const remainder = num % 1000;
      return remainder === 0 || num >= 10000 
        ? `${thousands}k`
        : `${thousands}.${Math.floor(remainder / 100)}k`;
    }
    return num.toString();
  };

  return <span>{formatNumber(displayValue)}{suffix}</span>;
};

// Stats Section Component
const StatsSection = ({ stats, loading, showContent, statsImage }) => (
  <motion.section 
    className="py-12 relative z-2"
    initial={{ opacity: 0, y: 50 }}
    animate={showContent ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
    transition={{ duration: 0.8, delay: 0.3 }}
  >
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <motion.div
        className="bg-white/95 backdrop-blur-md rounded-3xl p-12 shadow-2xl border border-white/10"
        initial={{ opacity: 0, y: 50 }}
        animate={showContent ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
        transition={{ duration: 0.8 }}
      >
        <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
          <StatsContent stats={stats} loading={loading} showContent={showContent} />
          <StatsIllustration statsImage={statsImage} showContent={showContent} />
        </div>
      </motion.div>
    </div>
  </motion.section>
);

// Stats Content Component
const StatsContent = ({ stats, loading, showContent }) => (
  <div className="flex flex-col sm:flex-row gap-16 flex-1 justify-center">
    {loading ? (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="large" />
      </div>
    ) : (
      <>
        <StatItem
          value={stats?.total_reviews || 22000}
          title="Review Diproses"
          subtitle="Total review yang telah dianalisis"
          showContent={showContent}
          delay={0}
        />
        <StatItem
          value={stats?.total_destinations || 30}
          title="Destinasi Wisata"
          subtitle="Destinasi yang telah dianalisis"
          showContent={showContent}
          delay={0.2}
        />
      </>
    )}
  </div>
);

// Stat Item Component - UKURAN DIPERKECIL
const StatItem = ({ value, title, subtitle, showContent, delay }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.8 }}
    animate={showContent ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
    transition={{ duration: 0.6, delay }}
    className="text-center flex-1"
  >
    <div className="text-4xl lg:text-6xl font-extrabold text-blue-600 mb-3 leading-none">
      <AnimatedNumber value={value} showContent={showContent} />
    </div>
    <div className="text-lg lg:text-xl font-bold text-gray-900 mb-2">
      {title}
    </div>
    <div className="text-gray-600 text-sm lg:text-base">
      {subtitle}
    </div>
  </motion.div>
);

// Stats Illustration Component
const StatsIllustration = ({ statsImage, showContent }) => (
  <motion.div
    initial={{ opacity: 0, x: 50 }}
    animate={showContent ? { opacity: 1, x: 0 } : { opacity: 0, x: 50 }}
    transition={{ duration: 0.8 }}
    className="flex-shrink-0 flex items-center justify-center"
  >
    <motion.img 
      src={statsImage}
      alt="Tourist Stats" 
      className="w-64 h-auto"
      animate={{ y: [0, -10, 0] }}
      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      style={{ filter: 'drop-shadow(0 5px 20px rgba(0, 0, 0, 0.1))' }}
    />
  </motion.div>
);

// Footer Component
const Footer = ({ showContent }) => (
  <motion.footer 
    className="bg-black/20 backdrop-blur-md py-8 text-white/80 text-center mt-16"
    initial={{ opacity: 0 }}
    animate={showContent ? { opacity: 1 } : { opacity: 0 }}
    transition={{ duration: 0.8, delay: 0.5 }}
  >
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-lg">
        © 2025 Analisis Kepuasan Wisatawan Kota Batu
      </div>
    </div>
  </motion.footer>
);

export default HomePage;