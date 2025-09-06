import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  Menu, 
  X, 
  User, 
  LogOut, 
  Settings,
  ChevronDown
} from 'lucide-react';
import { cn } from '../utils/cn';

const Navbar = ({ user, isAuthenticated, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showUserMenu && !event.target.closest('.user-menu-container')) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserMenu]);

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: BarChart3 },
    { name: 'Analisis', path: '/analysis', icon: BarChart3 },
  ];

  const isActivePath = (path) => location.pathname === path;

  // Determine if current page should have transparent navbar
  const isHomePage = location.pathname === '/';
  const shouldBeTransparent = isHomePage && !isScrolled;

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        shouldBeTransparent
          ? "bg-transparent"
          : "bg-white/95 backdrop-blur-xl shadow-lg border-b border-gray-200/50"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <span className={cn(
              "font-bold text-lg transition-colors duration-300",
              shouldBeTransparent ? "text-white drop-shadow-lg" : "text-gray-900"
            )}>
              BATAS - Batu Tourism Analysis System
            </span>
          </Link>

          {/* Right Side Container - Desktop */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Navigation Items */}
            <div className="flex items-center space-x-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium transition-all duration-300",
                    isActivePath(item.path)
                      ? "bg-blue-600 text-white shadow-lg"
                      : shouldBeTransparent
                      ? "text-white/90 hover:text-white hover:bg-white/20 drop-shadow-sm"
                      : "text-gray-700 hover:text-blue-600 hover:bg-blue-50"
                  )}
                >
                  {item.name}
                </Link>
              ))}
            </div>

            {/* Divider */}
            <div className={cn(
              "h-6 w-px",
              shouldBeTransparent ? "bg-white/30" : "bg-gray-300"
            )} />

            {/* User Menu */}
            {isAuthenticated ? (
              <div className="relative user-menu-container">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className={cn(
                    "flex items-center space-x-2 px-3 py-2 rounded-full text-sm font-medium transition-all duration-300",
                    shouldBeTransparent
                      ? "text-white/90 hover:text-white hover:bg-white/20 drop-shadow-sm"
                      : "text-gray-700 hover:bg-gray-100"
                  )}
                >
                  <div className="w-6 h-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                    <User className="w-3 h-3 text-white" />
                  </div>
                  <span>{user?.name || 'User'}</span>
                  <ChevronDown className={cn(
                    "w-4 h-4 transition-transform duration-200",
                    showUserMenu && "rotate-180"
                  )} />
                </button>

                {showUserMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 py-2 overflow-hidden"
                  >
                    <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                      <p className="text-sm font-semibold text-gray-900">{user?.name || 'User'}</p>
                      <p className="text-xs text-gray-500">{user?.email || 'user@example.com'}</p>
                    </div>
                    
                    {user?.role === 'admin' && (
                      <Link
                        to="/admin"
                        className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <Settings className="w-4 h-4 mr-3 text-gray-500" />
                        Admin Panel
                      </Link>
                    )}
                    
                    <button
                      onClick={() => {
                        onLogout();
                        setShowUserMenu(false);
                      }}
                      className="flex items-center w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4 mr-3" />
                      Logout
                    </button>
                  </motion.div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className={cn(
                  "px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 shadow-md hover:shadow-lg",
                  shouldBeTransparent
                    ? "bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm border border-white/30"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                )}
              >
                Login
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              "md:hidden p-2 rounded-lg transition-colors duration-300",
              shouldBeTransparent
                ? "text-white hover:bg-white/20"
                : "text-gray-700 hover:bg-gray-100"
            )}
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={cn(
              "md:hidden py-4 border-t transition-colors duration-300",
              shouldBeTransparent
                ? "border-white/20 bg-black/20 backdrop-blur-md"
                : "border-gray-200 bg-white/95"
            )}
          >
            <div className="space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                    isActivePath(item.path)
                      ? "bg-blue-600 text-white"
                      : shouldBeTransparent
                      ? "text-white hover:bg-white/20"
                      : "text-gray-700 hover:bg-gray-100"
                  )}
                >
                  <item.icon className="w-4 h-4 mr-3" />
                  {item.name}
                </Link>
              ))}
              
              {isAuthenticated ? (
                <>
                  <div className={cn(
                    "px-4 py-3 border-t mt-2",
                    shouldBeTransparent
                      ? "border-white/20"
                      : "border-gray-200"
                  )}>
                    <p className={cn(
                      "text-sm font-medium",
                      shouldBeTransparent ? "text-white" : "text-gray-900"
                    )}>{user?.name || 'User'}</p>
                    <p className={cn(
                      "text-xs",
                      shouldBeTransparent ? "text-white/70" : "text-gray-500"
                    )}>{user?.email || 'user@example.com'}</p>
                  </div>
                  
                  {user?.role === 'admin' && (
                    <Link
                      to="/admin"
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        "flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                        shouldBeTransparent
                          ? "text-white hover:bg-white/20"
                          : "text-gray-700 hover:bg-gray-100"
                      )}
                    >
                      <Settings className="w-4 h-4 mr-3" />
                      Admin Panel
                    </Link>
                  )}
                  
                  <button
                    onClick={() => {
                      onLogout();
                      setIsOpen(false);
                    }}
                    className={cn(
                      "flex items-center w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                      shouldBeTransparent
                        ? "text-red-300 hover:bg-red-500/20"
                        : "text-red-600 hover:bg-red-50"
                    )}
                  >
                    <LogOut className="w-4 h-4 mr-3" />
                    Logout
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "block px-4 py-3 rounded-lg text-sm font-medium text-center transition-colors",
                    shouldBeTransparent
                      ? "bg-white/20 text-white border border-white/30"
                      : "bg-blue-600 text-white"
                  )}
                >
                  Login
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </motion.nav>
  );
};

export default Navbar;