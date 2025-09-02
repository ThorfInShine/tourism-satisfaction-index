import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../utils/cn';

const MetricCard = ({ 
  title, 
  value, 
  icon: Icon, 
  color = 'blue', 
  progress = 0, 
  subtitle,
  className 
}) => {
  const colorClasses = {
    blue: {
      gradient: 'from-blue-500 to-blue-600',
      bg: 'bg-blue-50',
      text: 'text-blue-600',
      border: 'border-blue-200'
    },
    green: {
      gradient: 'from-green-500 to-green-600',
      bg: 'bg-green-50',
      text: 'text-green-600',
      border: 'border-green-200'
    },
    yellow: {
      gradient: 'from-yellow-500 to-yellow-600',
      bg: 'bg-yellow-50',
      text: 'text-yellow-600',
      border: 'border-yellow-200'
    },
    red: {
      gradient: 'from-red-500 to-red-600',
      bg: 'bg-red-50',
      text: 'text-red-600',
      border: 'border-red-200'
    },
    cyan: {
      gradient: 'from-cyan-500 to-cyan-600',
      bg: 'bg-cyan-50',
      text: 'text-cyan-600',
      border: 'border-cyan-200'
    }
  };

  const colors = colorClasses[color] || colorClasses.blue;

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className={cn(
        "bg-white rounded-2xl p-6 shadow-xl border border-gray-100 relative overflow-hidden",
        className
      )}
    >
      {/* Top border gradient */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${colors.gradient}`} />
      
      {/* Icon */}
      <div className={`w-12 h-12 rounded-xl ${colors.bg} flex items-center justify-center mb-4`}>
        <Icon className={`w-6 h-6 ${colors.text}`} />
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">
        {title}
      </h3>

      {/* Value */}
      <div className="text-3xl font-bold text-gray-900 mb-3">
        {value}
      </div>

      {/* Progress Bar */}
      {progress !== undefined && (
        <div className="mb-3">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(progress, 100)}%` }}
              transition={{ duration: 1, delay: 0.5 }}
              className={`h-full bg-gradient-to-r ${colors.gradient} rounded-full`}
            />
          </div>
        </div>
      )}

      {/* Subtitle */}
      {subtitle && (
        <div className={`flex items-center text-sm font-medium ${colors.text}`}>
          <span>{subtitle}</span>
        </div>
      )}
    </motion.div>
  );
};

export default MetricCard;