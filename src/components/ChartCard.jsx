import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';
import { Info, Star, Users } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const ChartCard = ({ title, icon: Icon, data, type = 'bar', className }) => {
  const chartRef = useRef();
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // Parse data if it's a string
  let chartData = typeof data === 'string' ? JSON.parse(data) : data;

  // Check if this is quadrant data
  const isQuadrantData = type === 'scatter' || (chartData && chartData.quadrant_data);

  // Render Quadrant Chart
  if (isQuadrantData && chartData) {
    const quadrantInfo = chartData;
    
    if (!quadrantInfo || !quadrantInfo.quadrant_data) {
      return (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 px-6 py-4">
            <div className="flex items-center gap-3">
              {Icon && (
                <div className="w-10 h-10 bg-white/15 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg border border-white/10">
                  <Icon className="w-5 h-5 text-white" />
                </div>
              )}
              <h3 className="text-lg font-bold text-white drop-shadow-sm">{title}</h3>
            </div>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-500">Tidak ada data kuadran tersedia</p>
            </div>
          </div>
        </div>
      );
    }

    const { quadrant_data, avg_visits, avg_rating, x_min, x_max, y_min, y_max } = quadrantInfo;
    
    // Normalize data points for visualization
    const normalizeX = (value) => ((value - x_min) / (x_max - x_min)) * 100;
    const normalizeY = (value) => ((value - y_min) / (y_max - y_min)) * 100;
    
    // Calculate normalized averages for quadrant lines
    const normalizedAvgX = normalizeX(avg_visits);
    const normalizedAvgY = normalizeY(avg_rating);
    
    // Prepare data points with quadrant classification
    const dataPoints = quadrant_data.names.map((name, index) => {
      const x = quadrant_data.visits[index];
      const y = quadrant_data.ratings[index];
      const normalizedX = normalizeX(x);
      const normalizedY = normalizeY(y);
      
      // Determine quadrant
      let quadrant = '';
      let color = '';
      if (x >= avg_visits && y >= avg_rating) {
        quadrant = 'Kuadran I (Kanan Atas)';
        color = '#10B981'; // Green
      } else if (x < avg_visits && y >= avg_rating) {
        quadrant = 'Kuadran II (Kiri Atas)';
        color = '#F59E0B'; // Orange
      } else if (x < avg_visits && y < avg_rating) {
        quadrant = 'Kuadran III (Kiri Bawah)';
        color = '#EF4444'; // Red
      } else {
        quadrant = 'Kuadran IV (Kanan Bawah)';
        color = '#3B82F6'; // Blue
      }
      
      return {
        name,
        visits: x,
        rating: y,
        normalizedX,
        normalizedY,
        quadrant,
        color
      };
    });

    return (
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 px-6 py-4">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="w-10 h-10 bg-white/15 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg border border-white/10">
                <Icon className="w-5 h-5 text-white" />
              </div>
            )}
            <h3 className="text-lg font-bold text-white drop-shadow-sm">{title}</h3>
          </div>
        </div>
        
        <div className="p-6">
          {/* Header Info */}
          <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start gap-2">
              <Info className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-gray-700">
                <p className="font-semibold text-blue-900 mb-1">Analisis Kuadran: Rating vs Jumlah Kunjungan</p>
                <p>Posisi strategis wisata berdasarkan rating dan data kunjungan manual admin</p>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-4 gap-6">
            {/* Chart Area */}
            <div className="lg:col-span-3">
              <div className="relative bg-white rounded-xl border border-gray-200 p-6" style={{ height: '500px' }}>
                {/* Quadrant Background */}
                <div className="absolute inset-6">
                  {/* Quadrant II - Top Left */}
                  <div 
                    className="absolute bg-yellow-50 border-r-2 border-b-2 border-dashed border-gray-400"
                    style={{
                      left: 0,
                      top: 0,
                      width: `${normalizedAvgX}%`,
                      height: `${100 - normalizedAvgY}%`
                    }}
                  />
                  {/* Quadrant I - Top Right */}
                  <div 
                    className="absolute bg-green-50 border-l-2 border-b-2 border-dashed border-gray-400"
                    style={{
                      right: 0,
                      top: 0,
                      width: `${100 - normalizedAvgX}%`,
                      height: `${100 - normalizedAvgY}%`
                    }}
                  />
                  {/* Quadrant III - Bottom Left */}
                  <div 
                    className="absolute bg-red-50 border-r-2 border-t-2 border-dashed border-gray-400"
                    style={{
                      left: 0,
                      bottom: 0,
                      width: `${normalizedAvgX}%`,
                      height: `${normalizedAvgY}%`
                    }}
                  />
                  {/* Quadrant IV - Bottom Right */}
                  <div 
                    className="absolute bg-blue-50 border-l-2 border-t-2 border-dashed border-gray-400"
                    style={{
                      right: 0,
                      bottom: 0,
                      width: `${100 - normalizedAvgX}%`,
                      height: `${normalizedAvgY}%`
                    }}
                  />
                  
                  {/* Quadrant Labels */}
                  <div className="absolute top-2 right-2 text-xs font-semibold text-green-700 bg-green-100 px-2 py-1 rounded">
                    Champions
                  </div>
                  <div className="absolute top-2 left-2 text-xs font-semibold text-yellow-700 bg-yellow-100 px-2 py-1 rounded">
                    Hidden Gems
                  </div>
                  <div className="absolute bottom-2 left-2 text-xs font-semibold text-red-700 bg-red-100 px-2 py-1 rounded">
                    Action Required
                  </div>
                  <div className="absolute bottom-2 right-2 text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-1 rounded">
                    Needs Improvement
                  </div>
                </div>

                {/* Data Points */}
                <div className="absolute inset-6">
                  {dataPoints.map((point, index) => (
                    <motion.div
                      key={point.name}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className="absolute transform -translate-x-1/2 -translate-y-1/2"
                      style={{
                        left: `${point.normalizedX}%`,
                        bottom: `${point.normalizedY}%`,
                      }}
                      onMouseEnter={() => setHoveredPoint(point)}
                      onMouseLeave={() => setHoveredPoint(null)}
                    >
                      <div 
                        className="w-3 h-3 rounded-full cursor-pointer hover:scale-150 transition-transform shadow-lg"
                        style={{ backgroundColor: point.color }}
                      />
                      
                      {/* Tooltip */}
                      {hoveredPoint?.name === point.name && (
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50">
                          <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap shadow-xl">
                            <div className="font-bold mb-1">{point.name}</div>
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3" />
                              Rating: {point.rating.toFixed(2)}
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              Kunjungan: {point.visits.toLocaleString('id-ID')}
                            </div>
                            <div className="text-xs mt-1 opacity-80">{point.quadrant}</div>
                          </div>
                          <div className="absolute left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>

                {/* Axes Labels */}
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 text-sm font-semibold text-gray-600">
                  Jumlah Kunjungan (Data Manual Admin) →
                </div>
                <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -rotate-90 text-sm font-semibold text-gray-600">
                  Rating Rata-rata →
                </div>

                {/* Axes Values */}
                <div className="absolute bottom-0 left-6 text-xs text-gray-500">
                  {x_min.toLocaleString('id-ID')}
                </div>
                <div className="absolute bottom-0 right-6 text-xs text-gray-500">
                  {x_max.toLocaleString('id-ID')}
                </div>
                <div className="absolute left-0 bottom-6 text-xs text-gray-500">
                  {y_min.toFixed(1)}
                </div>
                <div className="absolute left-0 top-6 text-xs text-gray-500">
                  {y_max.toFixed(1)}
                </div>
              </div>
            </div>

            {/* Legend & Info Panel */}
            <div className="lg:col-span-1 space-y-4">
              {/* Interpretasi Kuadran */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Interpretasi Kuadran
                </h4>
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500 mt-1" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Kuadran I (Kanan Atas)</p>
                      <p className="text-xs text-gray-500">Rating Tinggi • Kunjungan Tinggi</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500 mt-1" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Kuadran II (Kiri Atas)</p>
                      <p className="text-xs text-gray-500">Rating Tinggi • Kunjungan Rendah</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500 mt-1" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Kuadran III (Kiri Bawah)</p>
                      <p className="text-xs text-gray-500">Rating Rendah • Kunjungan Rendah</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500 mt-1" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Kuadran IV (Kanan Bawah)</p>
                      <p className="text-xs text-gray-500">Rating Rendah • Kunjungan Tinggi</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tips */}
              <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-4">
                <h4 className="font-semibold text-yellow-900 mb-2 flex items-center gap-2">
                  💡 KLIK pada titik untuk detail wisata
                </h4>
                <p className="text-xs text-yellow-700">
                  Hover pada legend untuk highlight kuadran
                </p>
              </div>

              {/* Statistics */}
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Statistik</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Rata-rata Rating:</span>
                    <span className="font-semibold">{avg_rating.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Rata-rata Kunjungan:</span>
                    <span className="font-semibold">{avg_visits.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Destinasi:</span>
                    <span className="font-semibold">{dataPoints.length}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Define vibrant and modern color palettes
  const colorPalettes = {
    rating: {
      // Vibrant gradient from red to green for ratings
      distribution: [
        '#FF4757', // Vibrant red for rating 1
        '#FF6B6B', // Coral red for rating 2  
        '#FFB347', // Orange for rating 3
        '#8CE563', // Light green for rating 4
        '#26DE81'  // Vibrant green for rating 5
      ],
      // Sunset gradient for top ratings (orange to pink)
      top10: [
        '#FFB347', // Vibrant orange
        '#FFAB76', // Light orange
        '#FFA3A5', // Peachy pink
        '#FF9FB4', // Light pink
        '#FF9DC3', // Pink
        '#FF9BD2', // Light purple-pink
        '#FF99E1', // Purple-pink
        '#FF97F0', // Light purple
        '#FF95FF', // Purple
        '#FFA5FF'  // Light magenta
      ]
    },
    visits: {
      // Ocean gradient for visits (deep blue to cyan)
      top10: [
        '#3B82F6', // Vibrant blue
        '#4C8BFA', // Lighter blue
        '#5D94FE', // Sky blue
        '#6E9DFF', // Light sky blue
        '#7FA6FF', // Pale blue
        '#90AFFF', // Very light blue
        '#A1B8FF', // Powder blue
        '#B2C1FF', // Ice blue
        '#C3CAFF', // Very pale blue
        '#D4D3FF'  // Almost white blue
      ]
    },
    sentiment: {
      // Clear, vibrant colors for sentiment pie chart
      pie: [
        '#26DE81', // Vibrant green for positive
        '#FFB347', // Orange for neutral  
        '#FF4757'  // Vibrant red for negative
      ]
    },
    default: {
      // Modern vibrant palette
      bar: [
        '#3B82F6', // Blue
        '#8B5CF6', // Purple
        '#EC4899', // Pink
        '#10B981', // Emerald
        '#F59E0B', // Amber
        '#EF4444', // Red
        '#14B8A6', // Teal
        '#F97316', // Orange
        '#6366F1', // Indigo
        '#84CC16'  // Lime
      ]
    }
  };

  // Process the data based on the structure
  const processChartData = () => {
    // Check if data has the Plotly structure
    if (chartData?.data && Array.isArray(chartData.data)) {
      const dataset = chartData.data[0];
      
      // For horizontal bar charts (Top 10 charts)
      if (type === 'horizontalBar' && dataset?.x && dataset?.y) {
        // Create array of objects for easier sorting
        const dataPoints = dataset.y.map((label, index) => ({
          label: label,
          value: dataset.x[index]
        }));
        
        // Sort data points in descending order (largest to smallest)
        dataPoints.sort((a, b) => b.value - a.value);
        
        // Extract sorted labels and values
        const sortedLabels = dataPoints.map(point => point.label);
        const sortedValues = dataPoints.map(point => point.value);
        
        // Determine which color palette to use
        let colors;
        if (title.includes('Rating')) {
          colors = colorPalettes.rating.top10;
        } else if (title.includes('Kunjungan')) {
          colors = colorPalettes.visits.top10;
        } else {
          colors = colorPalettes.default.bar;
        }
        
        return {
          labels: sortedLabels,
          datasets: [{
            label: dataset.name || title,
            data: sortedValues,
            backgroundColor: colors.slice(0, sortedValues.length),
            borderColor: 'rgba(255, 255, 255, 0.5)',
            borderWidth: 1,
            borderRadius: 8,
            barPercentage: 0.85,
            categoryPercentage: 0.9,
            hoverBackgroundColor: colors.slice(0, sortedValues.length).map(color => {
              // Make colors slightly darker on hover
              return color.replace('#', '#').substring(0, 7) + 'DD';
            })
          }]
        };
      }
      
      // For regular bar charts
      if (dataset?.x && dataset?.y) {
        // Check if this is a rating distribution chart
        if (title.includes('Distribusi Rating')) {
          // Create array of objects for sorting
          const dataPoints = dataset.x.map((label, index) => ({
            label: label,
            value: dataset.y[index],
            sortKey: parseFloat(label)
          }));
          
          // Sort by rating value (ascending for rating distribution)
          dataPoints.sort((a, b) => a.sortKey - b.sortKey);
          
          // Extract sorted labels and values
          const sortedLabels = dataPoints.map(point => point.label);
          const sortedValues = dataPoints.map(point => point.value);
          
          return {
            labels: sortedLabels,
            datasets: [{
              label: dataset.name || title,
              data: sortedValues,
              backgroundColor: colorPalettes.rating.distribution,
              borderColor: 'rgba(255, 255, 255, 0.5)',
              borderWidth: 1,
              borderRadius: 10,
              barPercentage: 0.8,
              categoryPercentage: 0.85
            }]
          };
        }
        
        // Default bar chart
        return {
          labels: dataset.x,
          datasets: [{
            label: dataset.name || title,
            data: dataset.y,
            backgroundColor: colorPalettes.default.bar.slice(0, dataset.y.length),
            borderColor: 'rgba(255, 255, 255, 0.5)',
            borderWidth: 1,
            borderRadius: 8,
            barPercentage: 0.7,
            categoryPercentage: 0.8
          }]
        };
      }
      
      // For pie charts
      if (dataset?.labels && dataset?.values) {
        // Sort pie chart data by value (descending)
        const dataPoints = dataset.labels.map((label, index) => ({
          label: label,
          value: dataset.values[index]
        }));
        
        dataPoints.sort((a, b) => b.value - a.value);
        
        const sortedLabels = dataPoints.map(point => point.label);
        const sortedValues = dataPoints.map(point => point.value);
        
        // Custom colors for sentiment
        let pieColors;
        if (title.includes('Sentimen')) {
          // Map labels to appropriate colors
          pieColors = sortedLabels.map(label => {
            if (label.toLowerCase().includes('positive')) return '#26DE81';
            if (label.toLowerCase().includes('negative')) return '#FF4757';
            if (label.toLowerCase().includes('neutral')) return '#FFB347';
            // Default fallback
            return colorPalettes.sentiment.pie[0];
          });
        } else {
          pieColors = [
            '#3B82F6', // Blue
            '#8B5CF6', // Purple
            '#EC4899', // Pink
            '#10B981', // Emerald
            '#F59E0B', // Amber
            '#EF4444', // Red
            '#14B8A6', // Teal
            '#F97316', // Orange
            '#6366F1', // Indigo
            '#84CC16'  // Lime
          ];
        }
        
        return {
          labels: sortedLabels,
          datasets: [{
            label: title,
            data: sortedValues,
            backgroundColor: pieColors.slice(0, sortedValues.length),
            borderColor: 'white',
            borderWidth: 3,
            hoverOffset: 10,
            hoverBorderWidth: 4,
            hoverBorderColor: 'white'
          }]
        };
      }
    }

    // Fallback for simple data structure
    if (chartData?.labels && chartData?.values) {
      // Sort simple data structure if it's for horizontal bar
      if (type === 'horizontalBar') {
        const dataPoints = chartData.labels.map((label, index) => ({
          label: label,
          value: chartData.values[index]
        }));
        
        dataPoints.sort((a, b) => b.value - a.value);
        
        let colors = title.includes('Rating') 
          ? colorPalettes.rating.top10 
          : title.includes('Kunjungan')
          ? colorPalettes.visits.top10
          : colorPalettes.default.bar;
        
        return {
          labels: dataPoints.map(point => point.label),
          datasets: [{
            label: title,
            data: dataPoints.map(point => point.value),
            backgroundColor: colors.slice(0, dataPoints.length),
            borderColor: 'rgba(255, 255, 255, 0.5)',
            borderWidth: 1,
            borderRadius: 8
          }]
        };
      }
      
      return {
        labels: chartData.labels,
        datasets: [{
          label: title,
          data: chartData.values,
          backgroundColor: type === 'pie' 
            ? colorPalettes.sentiment.pie
            : colorPalettes.default.bar.slice(0, chartData.values.length),
          borderColor: type === 'pie' ? 'white' : 'rgba(255, 255, 255, 0.5)',
          borderWidth: type === 'pie' ? 3 : 1,
          borderRadius: type !== 'pie' ? 8 : undefined
        }]
      };
    }

    // Default empty data
    return {
      labels: [],
      datasets: [{
        label: title,
        data: [],
        backgroundColor: '#3B82F6'
      }]
    };
  };

  const processedData = processChartData();

  // Chart options
  const getChartOptions = () => {
    const baseOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          enabled: true,
          backgroundColor: 'rgba(17, 24, 39, 0.95)',
          titleColor: 'white',
          bodyColor: 'white',
          titleFont: {
            family: 'Inter, system-ui, sans-serif',
            size: 14,
            weight: '600'
          },
          bodyFont: {
            family: 'Inter, system-ui, sans-serif',
            size: 13
          },
          padding: 14,
          cornerRadius: 10,
          displayColors: true,
          boxPadding: 4,
          callbacks: {
            label: function(context) {
              try {
                const label = context.label || '';
                let value;
                
                // Safely get the value
                if (context.parsed !== undefined && context.parsed !== null) {
                  if (typeof context.parsed === 'object') {
                    value = context.parsed.x !== undefined ? context.parsed.x : context.parsed.y;
                  } else {
                    value = context.parsed;
                  }
                } else if (context.raw !== undefined && context.raw !== null) {
                  value = context.raw;
                } else {
                  return label;
                }
                
                // Check if value is valid
                if (value === undefined || value === null || isNaN(value)) {
                  return label;
                }
                
                // Format based on chart type
                if (title.includes('Rating')) {
                  return `⭐ Rating: ${Number(value).toFixed(2)}`;
                } else if (title.includes('Kunjungan')) {
                  return `👥 Kunjungan: ${Number(value).toLocaleString('id-ID')}`;
                } else if (title.includes('Sentimen') && context.dataset) {
                  const dataset = context.dataset;
                  const dataArray = dataset.data || [];
                  const total = dataArray.reduce((a, b) => (a || 0) + (b || 0), 0);
                  if (total > 0) {
                    const percentage = ((value / total) * 100).toFixed(1);
                    let emoji = '';
                    if (label.toLowerCase().includes('positive')) emoji = '😊';
                    else if (label.toLowerCase().includes('negative')) emoji = '😔';
                    else if (label.toLowerCase().includes('neutral')) emoji = '😐';
                    return `${emoji} ${label}: ${Number(value).toLocaleString('id-ID')} (${percentage}%)`;
                  }
                  return `${label}: ${Number(value).toLocaleString('id-ID')}`;
                } else if (title.includes('Distribusi')) {
                  return `📊 Rating ${label}: ${Number(value).toLocaleString('id-ID')} reviews`;
                }
                
                return `${label}: ${Number(value).toLocaleString('id-ID')}`;
              } catch (error) {
                console.error('Tooltip error:', error);
                return '';
              }
            }
          }
        }
      },
      layout: {
        padding: {
          top: 10,
          bottom: 10,
          left: 10,
          right: 10
        }
      },
      animation: {
        duration: 1200,
        easing: 'easeInOutQuart',
        delay: (context) => {
          let delay = 0;
          if (context.type === 'data' && context.mode === 'default' && context.dataIndex !== undefined) {
            delay = context.dataIndex * 60;
          }
          return delay;
        }
      }
    };

    if (type === 'horizontalBar') {
      return {
        ...baseOptions,
        indexAxis: 'y',
        scales: {
          x: {
            display: true,
            grid: {
              display: true,
              color: 'rgba(0, 0, 0, 0.04)',
              drawBorder: false,
              lineWidth: 1
            },
            ticks: {
              font: {
                family: 'Inter, system-ui, sans-serif',
                size: 11,
                weight: '500'
              },
              color: '#6B7280',
              padding: 5,
              callback: function(value) {
                if (value === undefined || value === null) return '';
                
                if (title.includes('Rating')) {
                  return Number(value).toFixed(1);
                } else if (title.includes('Kunjungan')) {
                  const numValue = Number(value);
                  if (numValue >= 1000000) {
                    return (numValue / 1000000).toFixed(1) + 'M';
                  } else if (numValue >= 1000) {
                    return (numValue / 1000).toFixed(0) + 'K';
                  }
                  return numValue.toLocaleString('id-ID');
                }
                return value;
              }
            },
            beginAtZero: true
          },
          y: {
            display: true,
            grid: {
              display: false,
              drawBorder: false
            },
            ticks: {
              font: {
                family: 'Inter, system-ui, sans-serif',
                size: 11,
                weight: '500'
              },
              color: '#374151',
              padding: 8,
              autoSkip: false,
              callback: function(value, index) {
                const label = this.getLabelForValue(value);
                if (label && label.length > 25) {
                  return label.substring(0, 25) + '...';
                }
                return label;
              }
            }
          }
        }
      };
    } else if (type === 'pie') {
      return {
        ...baseOptions,
        plugins: {
          ...baseOptions.plugins,
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              padding: 15,
              usePointStyle: true,
              pointStyle: 'circle',
              font: {
                family: 'Inter, system-ui, sans-serif',
                size: 12,
                weight: '500'
              },
              color: '#374151',
              generateLabels: function(chart) {
                const data = chart.data;
                if (data.labels.length && data.datasets.length) {
                  return data.labels.map((label, i) => {
                    const dataset = data.datasets[0];
                    const value = dataset.data[i];
                    if (value === undefined || value === null) {
                      return {
                        text: label,
                        fillStyle: dataset.backgroundColor[i],
                        strokeStyle: dataset.borderColor,
                        lineWidth: dataset.borderWidth,
                        hidden: false,
                        index: i
                      };
                    }
                    
                    const total = dataset.data.reduce((a, b) => (a || 0) + (b || 0), 0);
                    const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                    
                    let emoji = '';
                    if (label.toLowerCase().includes('positive')) emoji = '😊';
                    else if (label.toLowerCase().includes('negative')) emoji = '😔';
                    else if (label.toLowerCase().includes('neutral')) emoji = '😐';
                    
                    return {
                      text: `${emoji} ${label} (${percentage}%)`,
                      fillStyle: dataset.backgroundColor[i],
                      strokeStyle: dataset.borderColor,
                      lineWidth: dataset.borderWidth,
                      hidden: false,
                      index: i
                    };
                  });
                }
                return [];
              }
            }
          }
        }
      };
    } else {
      // Regular bar chart
      return {
        ...baseOptions,
        scales: {
          x: {
            display: true,
            grid: {
              display: false,
              drawBorder: false
            },
            ticks: {
              font: {
                family: 'Inter, system-ui, sans-serif',
                size: 11,
                weight: '500'
              },
              color: '#6B7280',
              padding: 5,
              autoSkip: true,
              maxRotation: 45,
              minRotation: 0
            }
          },
          y: {
            display: true,
            grid: {
              color: 'rgba(0, 0, 0, 0.04)',
              drawBorder: false,
              lineWidth: 1
            },
            ticks: {
              font: {
                family: 'Inter, system-ui, sans-serif',
                size: 11,
                weight: '500'
              },
              color: '#6B7280',
              padding: 5,
              callback: function(value) {
                if (value === undefined || value === null) return '';
                return Number(value).toLocaleString('id-ID');
              }
            },
            beginAtZero: true
          }
        }
      };
    }
  };

  const chartOptions = getChartOptions();

  // Function to get dynamic header gradient based on chart type
  const getHeaderGradient = () => {
    // Distribusi Rating - Pink ke Rose
    if (title.includes('Distribusi Rating')) {
      return 'bg-gradient-to-r from-pink-500 via-pink-600 to-rose-600';
    } 
    // Distribusi Sentimen - Hijau Emerald ke Teal
    else if (title.includes('Distribusi Sentimen')) {
      return 'bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600';
    } 
    // Top 10 Rating - Ungu ke Purple
    else if (title.includes('Top') && title.includes('Rating')) {
      return 'bg-gradient-to-r from-purple-500 via-purple-600 to-violet-600';
    } 
    // Top 10 Kunjungan - Pink ke Rose
    else if (title.includes('Top') && title.includes('Kunjungan')) {
      return 'bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600';
    }
    // Default gradient
    return 'bg-gradient-to-r from-gray-700 via-gray-800 to-gray-900';
  };

  // Render the appropriate chart type
  const renderChart = () => {
    const commonProps = {
      ref: chartRef,
      data: processedData,
      options: chartOptions
    };

    if (!processedData.labels || processedData.labels.length === 0) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="text-gray-400 mb-2">
              {Icon && <Icon className="w-12 h-12 mx-auto" />}
            </div>
            <p className="text-gray-500 text-sm">Tidak ada data untuk ditampilkan</p>
          </div>
        </div>
      );
    }

    switch (type) {
      case 'pie':
        return <Pie {...commonProps} />;
      case 'line':
        return <Line {...commonProps} />;
      case 'horizontalBar':
      case 'bar':
      default:
        return <Bar {...commonProps} />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden ${className || ''}`}
    >
      {/* Header with dynamic gradient based on chart type */}
      <div className={`${getHeaderGradient()} px-6 py-4`}>
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="w-10 h-10 bg-white/15 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg border border-white/10">
              <Icon className="w-5 h-5 text-white" />
            </div>
          )}
          <h3 className="text-lg font-bold text-white drop-shadow-sm">{title}</h3>
        </div>
      </div>

      {/* Chart Container */}
      <div className="p-6 bg-gradient-to-br from-gray-50 to-white">
        <div className="h-80 relative">
          {renderChart()}
        </div>
      </div>
    </motion.div>
  );
};

export default ChartCard;