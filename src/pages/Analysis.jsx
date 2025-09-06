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
  Award,
  ImageIcon,
  Menu
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

// Import all images (keep existing imports)
import AlunAlunBatu from '../assets/images/wisata/Alunalunbatu.jpg';
import BatuLoveGarden from '../assets/images/wisata/batu love garden.jpg';
import BatuRafting from '../assets/images/wisata/batu rafting.jpeg';
import BNS from '../assets/images/wisata/BNS (Batu Night Spectacular).jpeg';
import CobanPutri from '../assets/images/wisata/coban putri.jpg';
import CobanRais from '../assets/images/wisata/coban rais.jpg';
import CobanTalun from '../assets/images/wisata/Coban-talun.jpg';
import DesaWisataBumiMulyo from '../assets/images/wisata/desa wisata bumimulyo.jpg';
import DesaWisataPunten from '../assets/images/wisata/desa wisata punten.jpg';
import DesaWisataTulungRejo from '../assets/images/wisata/desa wisata tulungrejo.jpg';
import DesaBumiAji from '../assets/images/wisata/desa-bumiaji-wisata-batu.jpg';
import EcoGreenPark from '../assets/images/wisata/eco-green-park.jpg';
import GoaPinus from '../assets/images/wisata/goa pinus.png';
import GunungBanyak from '../assets/images/wisata/gunung banyak.jpg';
import JalurPanderman from '../assets/images/wisata/jalur pendakian gunung panderman.jpg';
import JalurPanderman2 from '../assets/images/wisata/Jalur-Pendakian-Gunung-Panderman.jpg';
import JatimPark2 from '../assets/images/wisata/Jatim Park II.jpg';
import JatimPark3 from '../assets/images/wisata/Jatim Park III.jpg';
import JatimPark1 from '../assets/images/wisata/Jatim-Park-1.jpg';
import LumbungStroberi from '../assets/images/wisata/Lumbung stroberi.jpg';
import MilenialGlowGarden from '../assets/images/wisata/milenial-glow-garden.jpeg';
import MuseumAngkut from '../assets/images/wisata/Museum Angkut.jpg';
import PemandianCangar from '../assets/images/wisata/Pemandian Air Panas Alam Cangar.jpeg';
import PredatorFunPark from '../assets/images/wisata/predator-fun-park.jpg';
import SonggorotiHotSpring from '../assets/images/wisata/songgoriti hot spring.jpeg';
import TamanDolan from '../assets/images/wisata/taman dolan.jpg';
import TamanPinusCampervan from '../assets/images/wisata/taman pinus campervan.jpg';
import TamanSelecta from '../assets/images/wisata/Taman Rekreasi Selecta.jpeg';
import TirtaNirwana from '../assets/images/wisata/tirta-nirwana-songgoriti.jpeg';
import WisataPetikApel from '../assets/images/wisata/wisata petik apel mandiri.jpg';

// Keep existing getDestinationImage function
const getDestinationImage = (destinationName) => {
  const imageMap = {
    'Alun Alun Kota Wisata Batu': AlunAlunBatu,
    'Batu Love Garden': BatuLoveGarden,
    'Batu Rafting': BatuRafting,
    'BNS (Batu Night Spectacular)': BNS,
    'Coban Putri': CobanPutri,
    'Air Terjun Coban Rais': CobanRais,
    'Coban Talun': CobanTalun,
    'Desa Wisata Bumiaji': DesaBumiAji,
    'Desa Wisata Bumimulyo': DesaWisataBumiMulyo,
    'Desa Wisata Punten': DesaWisataPunten,
    'Desa Wisata Tulungrejo': DesaWisataTulungRejo,
    'Batu Economis Park': EcoGreenPark,
    'Eco Green Park': EcoGreenPark,
    'Goa Pinus': GoaPinus,
    'Gunung Banyak': GunungBanyak,
    'Jalur Pendakian Gunung Panderman': JalurPanderman,
    'Jatim Park 1': JatimPark1,
    'Jatim Park 2': JatimPark2,
    'Jatim Park II': JatimPark2,
    'Jatim Park 3': JatimPark3,
    'Jatim Park III': JatimPark3,
    'Lumbung Stroberi': LumbungStroberi,
    'Milenial Glow Garden': MilenialGlowGarden,
    'Museum Angkut': MuseumAngkut,
    'Pemandian Air Panas Alam Cangar': PemandianCangar,
    'Predator Fun Park': PredatorFunPark,
    'Songgoriti Hot Spring': SonggorotiHotSpring,
    'Taman Dolan': TamanDolan,
    'Taman Pinus Campervan': TamanPinusCampervan,
    'Taman Rekreasi Selecta': TamanSelecta,
    'Selecta': TamanSelecta,
    'Tirta Nirwana Songgoriti': TirtaNirwana,
    'Wisata Petik Apel Mandiri': WisataPetikApel,
  };

  if (imageMap[destinationName]) {
    return imageMap[destinationName];
  }

  const lowerName = destinationName.toLowerCase();
  
  if (lowerName.includes('alun') || lowerName.includes('aloon')) return AlunAlunBatu;
  if (lowerName.includes('love garden')) return BatuLoveGarden;
  if (lowerName.includes('rafting')) return BatuRafting;
  if (lowerName.includes('bns') || lowerName.includes('night spectacular')) return BNS;
  if (lowerName.includes('coban putri')) return CobanPutri;
  if (lowerName.includes('coban rais')) return CobanRais;
  if (lowerName.includes('coban talun')) return CobanTalun;
  if (lowerName.includes('bumiaji')) return DesaBumiAji;
  if (lowerName.includes('bumimulyo')) return DesaWisataBumiMulyo;
  if (lowerName.includes('punten')) return DesaWisataPunten;
  if (lowerName.includes('tulungrejo')) return DesaWisataTulungRejo;
  if (lowerName.includes('eco green') || lowerName.includes('economis')) return EcoGreenPark;
  if (lowerName.includes('goa pinus') || lowerName.includes('pinus')) return GoaPinus;
  if (lowerName.includes('gunung banyak')) return GunungBanyak;
  if (lowerName.includes('panderman')) return JalurPanderman;
  if (lowerName.includes('jatim park 1') || lowerName.includes('jatim park i')) return JatimPark1;
  if (lowerName.includes('jatim park 2') || lowerName.includes('jatim park ii')) return JatimPark2;
  if (lowerName.includes('jatim park 3') || lowerName.includes('jatim park iii')) return JatimPark3;
  if (lowerName.includes('lumbung') || lowerName.includes('stroberi')) return LumbungStroberi;
  if (lowerName.includes('milenial') || lowerName.includes('glow')) return MilenialGlowGarden;
  if (lowerName.includes('museum angkut')) return MuseumAngkut;
  if (lowerName.includes('cangar') || lowerName.includes('air panas')) return PemandianCangar;
  if (lowerName.includes('predator')) return PredatorFunPark;
  if (lowerName.includes('songgoriti') && lowerName.includes('hot')) return SonggorotiHotSpring;
  if (lowerName.includes('taman dolan')) return TamanDolan;
  if (lowerName.includes('campervan')) return TamanPinusCampervan;
  if (lowerName.includes('selecta')) return TamanSelecta;
  if (lowerName.includes('tirta nirwana')) return TirtaNirwana;
  if (lowerName.includes('petik apel')) return WisataPetikApel;

  return null;
};

// Keep existing helper functions
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

// Mobile-optimized Detail Modal
const DetailModal = ({ isOpen, onClose, destination }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isOpen || !destination) return null;

  const destinationImage = getDestinationImage(destination.name);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          
          <motion.div
            initial={isMobile ? { y: '100%' } : { scale: 0.9, opacity: 0 }}
            animate={isMobile ? { y: 0 } : { scale: 1, opacity: 1 }}
            exit={isMobile ? { y: '100%' } : { scale: 0.9, opacity: 0 }}
            className={cn(
              "relative bg-white shadow-2xl w-full",
              isMobile 
                ? "rounded-t-3xl max-h-[90vh]" 
                : "rounded-2xl max-w-4xl max-h-[90vh]"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Drag Handle */}
            {isMobile && (
              <div className="sticky top-0 z-10 bg-white rounded-t-3xl py-3">
                <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto" />
              </div>
            )}

            {/* Scrollable Content */}
            <div className="overflow-y-auto max-h-[85vh]">
              {/* Header with Image */}
              <div className={`bg-gradient-to-r ${getComplaintLevelColor(destination.complaint_level)} p-4 sm:p-6 text-white relative overflow-hidden`}>
                {destinationImage && (
                  <div 
                    className="absolute inset-0 bg-cover bg-center opacity-20"
                    style={{ backgroundImage: `url(${destinationImage})` }}
                  />
                )}
                
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 rounded-full p-2 transition-colors z-10"
                >
                  <X className="w-5 h-5" />
                </button>
                
                <div className="flex items-start gap-3 sm:gap-4 relative z-10">
                  <div className="flex-shrink-0">
                    {destinationImage ? (
                      <img
                        src={destinationImage}
                        alt={destination.name}
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover border-2 border-white/30 shadow-lg"
                      />
                    ) : (
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-white/20 flex items-center justify-center border-2 border-white/30">
                        <MapPin className="w-6 h-6 sm:w-8 sm:h-8" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <h2 className="text-lg sm:text-2xl font-bold mb-2">{destination.name}</h2>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span className="font-semibold text-sm sm:text-base">
                          {destination.average_rating?.toFixed(1)}/5
                        </span>
                      </div>
                      <span className="bg-white/20 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm">
                        {destination.total_reviews} Reviews
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 sm:p-6">
                {/* Statistics Grid - Mobile Optimized */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6">
                  <div className="bg-green-50 rounded-xl p-3 sm:p-4">
                    <ThumbsUp className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 mb-2" />
                    <div className="text-xl sm:text-2xl font-bold text-green-600">
                      {destination.positive_percentage?.toFixed(1)}%
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600">Positif</div>
                  </div>
                  <div className="bg-yellow-50 rounded-xl p-3 sm:p-4">
                    <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600 mb-2" />
                    <div className="text-xl sm:text-2xl font-bold text-yellow-600">
                      {destination.neutral_percentage?.toFixed(1)}%
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600">Netral</div>
                  </div>
                  <div className="bg-red-50 rounded-xl p-3 sm:p-4">
                    <ThumbsDown className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 mb-2" />
                    <div className="text-xl sm:text-2xl font-bold text-red-600">
                      {destination.complaint_percentage?.toFixed(1)}%
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600">Keluhan</div>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-3 sm:p-4">
                    <Target className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 mb-2" />
                    <div className="text-xl sm:text-2xl font-bold text-purple-600">
                      {destination.visit_category}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600">Kunjungan</div>
                  </div>
                </div>

                {/* All Complaints Section - Mobile Optimized */}
                {destination.all_complaints && destination.all_complaints.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
                      Semua Keluhan ({destination.all_complaints.length})
                    </h3>
                    <div className="space-y-2 sm:space-y-3 max-h-64 sm:max-h-96 overflow-y-auto">
                      {destination.all_complaints.map((complaint, idx) => (
                        <div key={idx} className="bg-red-50 rounded-lg p-3 sm:p-4 border border-red-100">
                          <div className="flex items-start justify-between mb-2">
                            <span className="text-xs sm:text-sm font-semibold text-red-600">
                              Keluhan #{idx + 1}
                            </span>
                            {complaint.date && (
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {complaint.date}
                              </span>
                            )}
                          </div>
                          <p className="text-xs sm:text-sm text-gray-700">{complaint.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Rating Distribution - Mobile Optimized */}
                <div className="mb-6">
                  <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Distribusi Rating</h3>
                  <div className="space-y-2">
                    {[5, 4, 3, 2, 1].map((rating) => {
                      const count = destination.rating_distribution?.[rating] || 0;
                      const percentage = destination.total_reviews > 0 
                        ? (count / destination.total_reviews * 100).toFixed(0)
                        : 0;
                      return (
                        <div key={rating} className="flex items-center gap-2 sm:gap-3">
                          <div className="flex items-center gap-1 w-10 sm:w-12">
                            <span className="text-xs sm:text-sm font-medium">{rating}</span>
                            <Star className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500 fill-current" />
                          </div>
                          <div className="flex-1 bg-gray-200 rounded-full h-5 sm:h-6 overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${percentage}%` }}
                              transition={{ duration: 0.5, delay: rating * 0.1 }}
                              className={cn(
                                "h-full flex items-center justify-end pr-1 sm:pr-2",
                                rating >= 4 ? "bg-green-500" : rating === 3 ? "bg-yellow-500" : "bg-red-500"
                              )}
                            >
                              {percentage > 10 && (
                                <span className="text-xs text-white font-medium">{percentage}%</span>
                              )}
                            </motion.div>
                          </div>
                          <span className="text-xs sm:text-sm text-gray-600 w-8 sm:w-12 text-right">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Mobile-optimized Complaint Carousel
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
          <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4 text-red-500" />
          <span className="text-xs sm:text-sm font-semibold text-gray-700">Keluhan Utama</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={handlePrevious}
            className="p-1 rounded-full bg-red-100 hover:bg-red-200 transition-colors"
          >
            <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4 text-red-600" />
          </button>
          <span className="text-xs text-gray-600 font-medium">
            {currentIndex + 1}/{complaints.length}
          </span>
          <button
            onClick={handleNext}
            className="p-1 rounded-full bg-red-100 hover:bg-red-200 transition-colors"
          >
            <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 text-red-600" />
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
          className="bg-red-50 rounded-lg p-2 sm:p-3 border border-red-100"
        >
          {complaints[currentIndex].text && (
            <p className="text-xs sm:text-sm text-gray-700 italic line-clamp-3">
              "{complaints[currentIndex].text}"
            </p>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

// Mobile-optimized Methodology Section
const MethodologySection = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const visitPatternData = {
    weekend: 14329,
    weekday: 11345,
    holiday: 6369
  };

  if (isMobile) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-6"
      >
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-3 flex items-center justify-between text-white"
          >
            <div className="flex items-center gap-2">
              <Info className="w-5 h-5" />
              <span className="font-semibold">Metodologi Analisis</span>
            </div>
            <ChevronDown className={cn(
              "w-5 h-5 transition-transform",
              isExpanded && "rotate-180"
            )} />
          </button>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 bg-gradient-to-br from-cyan-50 to-blue-50">
                  {/* Performance Level */}
                  <div className="mb-4">
                    <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
                      <Award className="w-4 h-4 text-cyan-600" />
                      Performance Level:
                    </h4>
                    <div className="space-y-2">
                      <div className="bg-white rounded-lg p-3 flex items-center gap-2 text-xs">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <span className="font-semibold">Urgent:</span>
                        <span className="text-gray-600">Keluhan &gt; 20%</span>
                      </div>
                      <div className="bg-white rounded-lg p-3 flex items-center gap-2 text-xs">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                        <span className="font-semibold">Monitoring:</span>
                        <span className="text-gray-600">10-20%</span>
                      </div>
                      <div className="bg-white rounded-lg p-3 flex items-center gap-2 text-xs">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="font-semibold">Excellent:</span>
                        <span className="text-gray-600">Keluhan &lt; 10%</span>
                      </div>
                    </div>
                  </div>

                  {/* Visit Pattern */}
                  <div>
                    <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-cyan-600" />
                      Pola Kunjungan:
                    </h4>
                    <div className="space-y-2">
                      <div className="bg-white rounded-lg p-3 border-l-3 border-green-500">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-semibold">Weekend</span>
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                            {visitPatternData.weekend.toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600">Kunjungan tertinggi</p>
                      </div>
                      <div className="bg-white rounded-lg p-3 border-l-3 border-yellow-500">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-semibold">Weekday</span>
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                            {visitPatternData.weekday.toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600">Hari kerja</p>
                      </div>
                      <div className="bg-white rounded-lg p-3 border-l-3 border-blue-500">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-semibold">Holiday</span>
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                            {visitPatternData.holiday.toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600">Libur nasional</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    );
  }

  // Desktop version (keep existing)
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="mt-8"
    >
      {/* Keep existing desktop methodology section */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-4">
          <div className="flex items-center gap-3">
            <Info className="w-6 h-6 text-white" />
            <h2 className="text-xl font-bold text-white">Metodologi Analisis</h2>
          </div>
        </div>
        {/* Rest of desktop content remains the same */}
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
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showMobileFilter, setShowMobileFilter] = useState(false);
  const itemsPerPage = isMobile ? 4 : 6;

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    loadAnalysisData();
  }, []);

  const loadAnalysisData = async () => {
    try {
      setLoading(true);
      
      const kunjunganResponse = await apiService.getKunjunganData();
      let kunjunganMap = {};
      
      if (kunjunganResponse && kunjunganResponse.success && kunjunganResponse.kunjungan_data) {
        kunjunganMap = kunjunganResponse.kunjungan_data;
      }
      
      const [analysisData, wisataData] = await Promise.all([
        apiService.getAnalysisData(),
        apiService.getAllWisataAnalysis()
      ]);
      
      if (wisataData && wisataData.destinations && kunjunganMap) {
        Object.keys(wisataData.destinations).forEach(name => {
          let visitCount = 0;
          
          if (kunjunganMap[name]) {
            visitCount = kunjunganMap[name];
          } else {
            Object.entries(kunjunganMap).forEach(([key, value]) => {
              const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
              const normalizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
              
              if (normalizedKey.includes(normalizedName) || normalizedName.includes(normalizedKey)) {
                visitCount = value;
              }
            });
          }
          
          if (visitCount > 0) {
            wisataData.destinations[name].visit_count = visitCount;
            wisataData.destinations[name].jumlah_kunjungan = visitCount;
            
            if (visitCount >= 500000) {
              wisataData.destinations[name].visit_category = 'TINGGI';
            } else if (visitCount >= 100000) {
              wisataData.destinations[name].visit_category = 'SEDANG';
            } else {
              wisataData.destinations[name].visit_category = 'RENDAH';
            }
          }
        });
      }
      
      setData(analysisData);
      setWisataAnalysis(wisataData);
      
    } catch (error) {
      console.error('Failed to load analysis data:', error);
      toast.error('Gagal memuat data analisis');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = (name, destination) => {
    setSelectedDestination({ name, ...destination });
    setShowDetailModal(true);
  };

  const getFilteredDestinations = () => {
    if (!wisataAnalysis || !wisataAnalysis.destinations) return [];
    
    let destinations = Object.entries(wisataAnalysis.destinations);
    
    if (selectedCategory !== 'all') {
      destinations = destinations.filter(([_, dest]) => 
        dest.complaint_level?.toLowerCase() === selectedCategory
      );
    }
    
    if (searchTerm) {
      destinations = destinations.filter(([name, _]) => 
        name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    destinations.sort((a, b) => {
      const visitA = a[1].visit_count || a[1].jumlah_kunjungan || 0;
      const visitB = b[1].visit_count || b[1].jumlah_kunjungan || 0;
      return visitB - visitA;
    });
    
    return destinations;
  };

  const filteredDestinations = getFilteredDestinations();
  const totalPages = Math.ceil(filteredDestinations.length / itemsPerPage);
  const paginatedDestinations = filteredDestinations.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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
    <div className="min-h-screen pt-16 sm:pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Mobile Header - Simplified */}
        {isMobile ? (
          <div className="mb-6">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-6 text-white">
              <TrendingUp className="w-10 h-10 mb-3" />
              <h1 className="text-2xl font-bold mb-1">Analisis Mendalam</h1>
              <p className="text-sm opacity-90">Insights untuk Peningkatan Wisata</p>
            </div>
          </div>
        ) : (
          // Desktop Header (keep existing)
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl p-8 text-white mb-8 relative overflow-hidden">
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
        )}

        {/* Overview Stats - Mobile Optimized */}
        {wisataAnalysis && (
          <div className={cn(
            "grid gap-3 mb-6",
            isMobile ? "grid-cols-2" : "grid-cols-4"
          )}>
            <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-100">
              <MapPin className="w-6 h-6 text-purple-600 mb-2" />
              <div className="text-2xl font-bold text-gray-900">
                {wisataAnalysis.total_destinations || 0}
              </div>
              <p className="text-xs text-gray-600">TOTAL DESTINASI</p>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-xl p-4 shadow-lg border border-red-100">
              <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center mb-2">
                <i className="fas fa-exclamation text-white text-xs"></i>
              </div>
              <div className="text-2xl font-bold text-red-600">
                {wisataAnalysis.high_complaint_count || 0}
              </div>
              <p className="text-xs text-gray-600">KELUHAN TINGGI</p>
            </div>

            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-4 shadow-lg border border-yellow-100">
              <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center mb-2">
                <i className="fas fa-minus text-white text-xs"></i>
              </div>
              <div className="text-2xl font-bold text-yellow-600">
                {wisataAnalysis.medium_complaint_count || 0}
              </div>
              <p className="text-xs text-gray-600">KELUHAN SEDANG</p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 shadow-lg border border-green-100">
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mb-2">
                <i className="fas fa-check text-white text-xs"></i>
              </div>
              <div className="text-2xl font-bold text-green-600">
                {wisataAnalysis.low_complaint_count || 0}
              </div>
              <p className="text-xs text-gray-600">KELUHAN RENDAH</p>
            </div>
          </div>
        )}

        {/* Mobile Filter Section */}
        {isMobile ? (
          <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-5 h-5 text-purple-600" />
              <h3 className="font-semibold text-gray-900">Filter Berdasarkan Tingkat Keluhan</h3>
            </div>

            {/* Search Bar */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Cari destinasi wisata..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-9 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              {searchTerm && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setCurrentPage(1);
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              <button
                onClick={() => {
                  setSelectedCategory('all');
                  setCurrentPage(1);
                }}
                className={cn(
                  "px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap flex items-center gap-1",
                  selectedCategory === 'all' 
                    ? "bg-purple-600 text-white" 
                    : "bg-gray-100 text-gray-700"
                )}
              >
                <Filter className="w-3 h-3" />
                Semua Level
              </button>
              <button
                onClick={() => {
                  setSelectedCategory('tinggi');
                  setCurrentPage(1);
                }}
                className={cn(
                  "px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap flex items-center gap-1",
                  selectedCategory === 'tinggi' 
                    ? "bg-red-500 text-white" 
                    : "bg-red-50 text-red-700 border border-red-200"
                )}
              >
                <AlertTriangle className="w-3 h-3" />
                Keluhan Tinggi
              </button>
              <button
                onClick={() => {
                  setSelectedCategory('sedang');
                  setCurrentPage(1);
                }}
                className={cn(
                  "px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap flex items-center gap-1",
                  selectedCategory === 'sedang' 
                    ? "bg-yellow-500 text-white" 
                    : "bg-yellow-50 text-yellow-700 border border-yellow-200"
                )}
              >
                <AlertCircle className="w-3 h-3" />
                Keluhan Sedang
              </button>
              <button
                onClick={() => {
                  setSelectedCategory('rendah');
                  setCurrentPage(1);
                }}
                className={cn(
                  "px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap flex items-center gap-1",
                  selectedCategory === 'rendah' 
                    ? "bg-green-500 text-white" 
                    : "bg-green-50 text-green-700 border border-green-200"
                )}
              >
                <CheckCircle className="w-3 h-3" />
                Keluhan Rendah
              </button>
            </div>

            {/* Results Summary */}
            {filteredDestinations.length > 0 && (
              <div className="mt-3 p-2 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">
                    Filter Aktif: 
                    <span className="font-semibold text-purple-600 ml-1">
                      {selectedCategory === 'all' ? 'Semua Level' :
                       selectedCategory === 'tinggi' ? 'Tinggi' :
                       selectedCategory === 'sedang' ? 'Sedang' : 'Rendah'}
                    </span>
                  </span>
                  <span className="text-gray-500">
                    Menampilkan {Math.min((currentPage - 1) * itemsPerPage + 1, filteredDestinations.length)}-
                    {Math.min(currentPage * itemsPerPage, filteredDestinations.length)} dari {filteredDestinations.length}
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          // Desktop Filter (keep existing)
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 mb-6">
            {/* Keep existing desktop filter */}
            <div className="mb-4">
              <div className="flex items-center gap-3 mb-2">
                <Filter className="w-6 h-6 text-purple-600" />
                <h3 className="text-lg font-bold text-gray-900">Filter Berdasarkan Tingkat Keluhan</h3>
              </div>
            </div>

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
                    "px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-2",
                    selectedCategory === 'all' 
                      ? "bg-purple-600 text-white shadow-lg" 
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  )}
                >
                  <Filter className="w-4 h-4" />
                  Semua Level
                </button>
                <button
                  onClick={() => {
                    setSelectedCategory('tinggi');
                    setCurrentPage(1);
                  }}
                  className={cn(
                    "px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-2",
                    selectedCategory === 'tinggi' 
                      ? "bg-red-500 text-white shadow-lg" 
                      : "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
                  )}
                >
                  <AlertTriangle className="w-4 h-4" />
                  Keluhan Tinggi
                </button>
                <button
                  onClick={() => {
                    setSelectedCategory('sedang');
                    setCurrentPage(1);
                  }}
                  className={cn(
                    "px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-2",
                    selectedCategory === 'sedang' 
                      ? "bg-yellow-500 text-white shadow-lg" 
                      : "bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border border-yellow-200"
                  )}
                >
                  <AlertCircle className="w-4 h-4" />
                  Keluhan Sedang
                </button>
                <button
                  onClick={() => {
                    setSelectedCategory('rendah');
                    setCurrentPage(1);
                  }}
                  className={cn(
                    "px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-2",
                    selectedCategory === 'rendah' 
                      ? "bg-green-500 text-white shadow-lg" 
                      : "bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
                  )}
                >
                  <CheckCircle className="w-4 h-4" />
                  Keluhan Rendah
                </button>
              </div>
            </div>

            {filteredDestinations.length > 0 && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-purple-600" />
                    <span className="text-gray-700 font-medium">
                      Filter Aktif: 
                      <span className="ml-1 font-bold text-purple-600">
                        {selectedCategory === 'all' ? 'Semua Level Keluhan' :
                         selectedCategory === 'tinggi' ? 'Keluhan Tinggi (>20%)' :
                         selectedCategory === 'sedang' ? 'Keluhan Sedang (10-20%)' :
                         'Keluhan Rendah (<10%)'}
                      </span>
                    </span>
                  </div>
                  <span className="text-gray-600">
                    Menampilkan {Math.min((currentPage - 1) * itemsPerPage + 1, filteredDestinations.length)}-
                    {Math.min(currentPage * itemsPerPage, filteredDestinations.length)} dari {filteredDestinations.length} destinasi
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Destination Cards - Mobile Optimized */}
        <div className={cn(
          "grid gap-4 mb-6",
          isMobile ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        )}>
          <AnimatePresence mode="wait">
            {paginatedDestinations.map(([name, destination], index) => {
              const destinationImage = getDestinationImage(name);
              
              // Mobile Card Design
              if (isMobile) {
                return (
                  <motion.div
                    key={`${name}-${currentPage}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100"
                  >
                    {/* Image and Header */}
                    <div className="relative h-40 overflow-hidden">
                      {destinationImage ? (
                        <img
                          src={destinationImage}
                          alt={name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                          <ImageIcon className="w-12 h-12 text-gray-400" />
                        </div>
                      )}
                      
                      <div className={`absolute inset-0 bg-gradient-to-t ${getComplaintLevelColor(destination.complaint_level)} opacity-80`} />
                      
                      <div className="absolute inset-0 p-4 flex flex-col justify-between text-white">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-1 bg-white/20 px-2 py-1 rounded-full">
                            <Star className="w-3 h-3" />
                            <span className="text-xs font-bold">
                              {destination.average_rating?.toFixed(1)}/5
                            </span>
                          </div>
                          <div className="bg-white/20 px-2 py-1 rounded-full text-xs font-bold">
                            KUNJUNGAN {destination.visit_category || 'N/A'}
                          </div>
                        </div>
                        
                        <div>
                          <h3 className="font-bold text-base leading-tight mb-1">{name}</h3>
                          <p className="text-xs opacity-90">
                            {destination.complaint_level === 'tinggi' ? 'Perlu Perhatian Urgent' :
                             destination.complaint_level === 'sedang' ? 'Perlu Monitoring' :
                             'Performa Excellent'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="p-3 grid grid-cols-3 gap-2 border-b border-gray-100">
                      <div className="text-center">
                        <div className="text-lg font-bold text-gray-900">
                          {destination.total_reviews || 0}
                        </div>
                        <div className="text-xs text-gray-500">REVIEWS</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-red-500">
                          {destination.complaint_percentage?.toFixed(1) || 0}%
                        </div>
                        <div className="text-xs text-gray-500">KELUHAN</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-500">
                          {destination.positive_percentage?.toFixed(1) || 0}%
                        </div>
                        <div className="text-xs text-gray-500">POSITIF</div>
                      </div>
                    </div>

                    {/* Rating Distribution - Simplified for Mobile */}
                    <div className="p-3 border-b border-gray-100">
                      <div className="flex items-center gap-2 mb-2">
                        <Star className="w-3 h-3 text-yellow-500" />
                        <span className="text-xs font-semibold text-gray-700">Distribusi Rating</span>
                      </div>
                      <div className="space-y-1">
                        {[5, 4, 3, 2, 1].map((rating) => {
                          const count = destination.rating_distribution?.[rating] || 0;
                          const percentage = destination.total_reviews > 0 
                            ? (count / destination.total_reviews * 100).toFixed(0)
                            : 0;
                          return (
                            <div key={rating} className="flex items-center gap-2">
                              <span className="text-xs text-gray-600 w-4">{rating}★</span>
                              <div className="flex-1 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                <div 
                                  className={cn(
                                    "h-full",
                                    rating >= 4 ? "bg-green-500" : rating === 3 ? "bg-yellow-500" : "bg-red-500"
                                  )}
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-500 w-10 text-right">{percentage}%</span>
                              <span className="text-xs text-gray-400 w-8 text-right">{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Complaints and Action */}
                    {destination.complaint_percentage > 0 && (
                      <div className="p-3">
                        <ComplaintCarousel 
                          complaints={destination.top_complaints || [
                            {
                              text: destination.sample_review || 'Terdapat beberapa keluhan dari pengunjung'
                            }
                          ]}
                          destinationName={name}
                        />
                        
                        <button
                          onClick={() => handleViewDetail(name, destination)}
                          className="mt-2 w-full flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg py-2 text-xs font-medium transition-colors"
                        >
                          <Eye className="w-3 h-3" />
                          Lihat Selengkapnya
                        </button>
                      </div>
                    )}
                  </motion.div>
                );
              }

              // Desktop Card (keep existing)
              return (
                <motion.div
                  key={`${name}-${currentPage}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 hover:shadow-2xl transition-shadow"
                >
                  {/* Keep existing desktop card content */}
                  <div className="relative h-48 overflow-hidden">
                    {destinationImage ? (
                      <img
                        src={destinationImage}
                        alt={name}
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                        <div className="text-center text-gray-500">
                          <ImageIcon className="w-16 h-16 mx-auto mb-2" />
                          <p className="text-sm font-medium">Foto Tidak Tersedia</p>
                        </div>
                      </div>
                    )}
                    
                    <div className={`absolute inset-0 bg-gradient-to-t ${getComplaintLevelColor(destination.complaint_level)} opacity-80`} />
                    
                    <div className="absolute inset-0 p-4 flex flex-col justify-between text-white">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-1 bg-white/20 px-2 py-1 rounded-full">
                          <Star className="w-4 h-4" />
                          <span className="text-sm font-bold">
                            {destination.average_rating?.toFixed(1) || 'N/A'}/5
                          </span>
                        </div>
                        <div className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold uppercase">
                          <i className={`${getComplaintLevelIcon(destination.complaint_level)} mr-1`}></i>
                          KUNJUNGAN {destination.visit_category || 'N/A'}
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="font-bold text-lg leading-tight mb-1">{name}</h3>
                        <p className="text-sm opacity-90">
                          {destination.complaint_level === 'tinggi' ? 'Perlu Perhatian Urgent' :
                           destination.complaint_level === 'sedang' ? 'Perlu Monitoring' :
                           'Performa Excellent'}
                        </p>
                      </div>
                    </div>
                  </div>

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
                      
                      <button
                        onClick={() => handleViewDetail(name, destination)}
                        className="mt-3 w-full flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg py-2 px-3 text-sm font-medium transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        Lihat Selengkapnya
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Pagination - Mobile Optimized */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1 sm:gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className={cn(
                "p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed",
                isMobile && "p-1.5"
              )}
            >
              <ChevronLeft className={cn("text-gray-600", isMobile ? "w-4 h-4" : "w-5 h-5")} />
            </button>
            
            {isMobile ? (
              // Mobile: Show current page of total
              <div className="px-3 py-1 bg-purple-600 text-white rounded-lg text-sm font-medium">
                {currentPage} / {totalPages}
              </div>
            ) : (
              // Desktop: Show page numbers
              Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
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
              ))
            )}
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className={cn(
                "p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed",
                isMobile && "p-1.5"
              )}
            >
              <ChevronRight className={cn("text-gray-600", isMobile ? "w-4 h-4" : "w-5 h-5")} />
            </button>
          </div>
        )}

        {/* Methodology Section */}
        <MethodologySection />

        {/* Detail Modal */}
        <DetailModal
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          destination={selectedDestination}
        />

        {/* Refresh Button - Mobile Optimized */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex justify-center mt-6 sm:mt-8"
        >
          <button
            onClick={loadAnalysisData}
            disabled={loading}
            className={cn(
              "inline-flex items-center bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none",
              isMobile ? "px-4 py-2.5 text-sm" : "px-6 py-3"
            )}
          >
            <RefreshCw className={cn("mr-2", loading && "animate-spin", isMobile ? "w-4 h-4" : "w-5 h-5")} />
            {loading ? 'Memuat...' : 'Refresh Analisis'}
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default Analysis;