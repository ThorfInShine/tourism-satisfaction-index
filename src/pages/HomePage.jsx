import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  PieChart,
  Lightbulb,
  TreePine,
  ChevronDown,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { apiService } from '../services/apiService';
import LoadingSpinner from '../components/LoadingSpinner';

// Images
import tourismImage from '../assets/images/tourism-illustration.png';
const statsImage = "https://res.cloudinary.com/dk2tex4to/image/upload/v1755625548/ChatGPT_Image_Aug_20__2025__12_35_04_AM-removebg-preview_gttvad.png";

const HomePage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showContent, setShowContent] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    loadStats();
    setupScrollListener();
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const checkMobile = () => {
    setIsMobile(window.innerWidth < 768);
  };

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
        isMobile={isMobile}
      />
      
      <FeaturesSection 
        features={features} 
        showContent={showContent}
        isMobile={isMobile}
      />
      
      <StatsSection 
        stats={stats} 
        loading={loading} 
        showContent={showContent} 
        statsImage={statsImage}
        isMobile={isMobile}
      />
      
      <Footer showContent={showContent} />
    </div>
  );
};

// Hero Section Component - DESKTOP LAYOUT PRESERVED
const HeroSection = ({ tourismImage, scrollToContent, isMobile }) => {
  // Mobile Layout
  if (isMobile) {
    return (
      <section className="min-h-screen relative overflow-hidden flex items-center py-16 px-4">
        <div className="relative z-10 max-w-7xl mx-auto w-full">
          <div className="flex flex-col items-center text-center space-y-6">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center px-4 py-2 bg-white/20 backdrop-blur-md rounded-full text-white text-sm"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              <span>Powered by AI & ML</span>
            </motion.div>

            {/* Title */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              <h1 className="text-4xl font-extrabold text-white leading-tight mb-3">
                Data Bicara:
              </h1>
              <p className="text-xl text-white/90 font-medium">
                Bagaimana Tingkat Kepuasan di Kota Batu?
              </p>
            </motion.div>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="text-white/90 text-base leading-relaxed max-w-md"
            >
              Platform canggih untuk menganalisis kepuasan wisatawan menggunakan 
              Machine Learning dan Natural Language Processing.
            </motion.p>

            {/* Image */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="relative w-full max-w-sm"
            >
              <motion.img 
                src={tourismImage}
                alt="Travel Illustration" 
                className="w-full h-auto"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                style={{ filter: 'drop-shadow(0 20px 40px rgba(0, 0, 0, 0.3))' }}
              />
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.6 }}
              className="flex flex-col w-full max-w-sm space-y-3"
            >
              <Link
                to="/dashboard"
                className="w-full flex items-center justify-center px-6 py-4 bg-gradient-to-r from-orange-500 to-yellow-600 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
              >
                <BarChart3 className="w-5 h-5 mr-2" />
                Mulai Analisis
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
              
              <button
                onClick={scrollToContent}
                className="w-full flex items-center justify-center px-6 py-4 bg-white/20 backdrop-blur-md text-white font-medium rounded-2xl border border-white/30 hover:bg-white/30 transition-all duration-300"
              >
                Lihat Fitur Lengkap
                <ChevronDown className="w-5 h-5 ml-2" />
              </button>
            </motion.div>
          </div>
        </div>

        <ScrollIndicator onClick={scrollToContent} />
      </section>
    );
  }

  // Desktop Layout - PRESERVED AS ORIGINAL
  return (
    <section className="h-screen relative overflow-hidden flex items-center">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          
          {/* Hero Image - DESKTOP */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="flex justify-center items-center lg:order-1 order-2"
          >
            <div className="relative h-[700px] w-full flex items-center justify-center">
              <motion.img 
                src={tourismImage}
                alt="Travel Illustration" 
                className="w-full max-w-[850px] h-auto scale-110"
                animate={{ y: [0, -15, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                style={{ filter: 'drop-shadow(0 10px 30px rgba(0, 0, 0, 0.2))' }}
              />
            </div>
          </motion.div>

          {/* Hero Content - DESKTOP */}
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
};

// Desktop Hero Components - PRESERVED AS ORIGINAL
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
const FeaturesSection = ({ features, showContent, isMobile }) => {
  // Mobile Layout
  if (isMobile) {
    return (
      <motion.section 
        className="py-16 relative z-2"
        initial={{ opacity: 0, y: 50 }}
        animate={showContent ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
        transition={{ duration: 0.8 }}
      >
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={showContent ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-10"
          >
            <h2 className="text-3xl font-bold text-white mb-4">
              Fitur Unggulan
            </h2>
            <p className="text-white/80 text-base max-w-2xl mx-auto">
              Teknologi terdepan untuk analisis kepuasan wisatawan
            </p>
          </motion.div>

          <div className="space-y-4">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -50 }}
                animate={showContent ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
                transition={{ duration: 0.5, delay: showContent ? index * 0.1 : 0 }}
                className="bg-white/95 backdrop-blur-md rounded-2xl p-6 shadow-xl"
              >
                <div className="flex items-start space-x-4">
                  <div className={`w-14 h-14 bg-gradient-to-r ${feature.gradient} rounded-xl flex items-center justify-center flex-shrink-0 text-white shadow-lg`}>
                    <feature.icon className="w-7 h-7" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>
    );
  }

  // Desktop Layout - PRESERVED AS ORIGINAL
  return (
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
};

// Feature Card Component - DESKTOP
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
const StatsSection = ({ stats, loading, showContent, statsImage, isMobile }) => {
  // Mobile Layout
  if (isMobile) {
    return (
      <motion.section 
        className="py-12 relative z-2"
        initial={{ opacity: 0, y: 50 }}
        animate={showContent ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
        transition={{ duration: 0.8, delay: 0.3 }}
      >
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            className="bg-white/95 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-white/10"
            initial={{ opacity: 0, y: 50 }}
            animate={showContent ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
            transition={{ duration: 0.8 }}
          >
            <div className="space-y-8">
              {/* Stats Image */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={showContent ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.6 }}
                className="flex justify-center"
              >
                <motion.img 
                  src={statsImage}
                  alt="Tourist Stats" 
                  className="w-48 h-auto"
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  style={{ filter: 'drop-shadow(0 10px 25px rgba(0, 0, 0, 0.1))' }}
                />
              </motion.div>

              {/* Stats Numbers */}
              <div className="grid grid-cols-2 gap-6">
                {loading ? (
                  <div className="col-span-2 flex justify-center py-8">
                    <LoadingSpinner size="large" />
                  </div>
                ) : (
                  <>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={showContent ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.6 }}
                      className="text-center bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-4"
                    >
                      <div className="text-3xl font-extrabold text-blue-600 mb-1">
                        <AnimatedNumber value={stats?.total_reviews || 22000} showContent={showContent} />
                      </div>
                      <div className="text-sm font-semibold text-gray-700">Review</div>
                      <div className="text-xs text-gray-500">Diproses</div>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={showContent ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.6, delay: 0.1 }}
                      className="text-center bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-4"
                    >
                      <div className="text-3xl font-extrabold text-green-600 mb-1">
                        <AnimatedNumber value={stats?.total_destinations || 30} showContent={showContent} />
                      </div>
                      <div className="text-sm font-semibold text-gray-700">Destinasi</div>
                      <div className="text-xs text-gray-500">Wisata</div>
                    </motion.div>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </motion.section>
    );
  }

  // Desktop Layout - PRESERVED AS ORIGINAL
  return (
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
};

// Stats Content Component - DESKTOP
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

// Stat Item Component - DESKTOP
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

// Stats Illustration Component - DESKTOP
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
      <div className="text-sm sm:text-lg">
        © 2025 Analisis Kepuasan Wisatawan Kota Batu
      </div>
    </div>
  </motion.footer>
);

export default HomePage;