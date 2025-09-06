import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  Database,
  Upload,
  Download,
  Settings,
  Users,
  BarChart3,
  FileText,
  Plus,
  Edit,
  Trash2,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Info,
  HardDrive,
  Server,
  Activity
} from 'lucide-react';
import toast from 'react-hot-toast';

// Components
import LoadingSpinner from '../../components/LoadingSpinner';

// Services
import { apiService } from '../../services/apiService';

// Utils
import { cn } from '../../utils/cn';

const AdminPanel = ({ user }) => {
  const [activeTab, setActiveTab] = useState('kunjungan');
  const [loading, setLoading] = useState(false);
  const [kunjunganData, setKunjunganData] = useState({});
  const [systemInfo, setSystemInfo] = useState(null);
  
  // Form states
  const [editingWisata, setEditingWisata] = useState(null);
  const [newWisata, setNewWisata] = useState({ nama: '', jumlah: '' });
  const [uploadFile, setUploadFile] = useState(null);

  const tabs = [
    { id: 'kunjungan', label: 'Data Kunjungan', icon: BarChart3 },
    { id: 'upload', label: 'Upload Data', icon: Upload },
    { id: 'system', label: 'System Info', icon: Settings }
  ];

  useEffect(() => {
    loadInitialData();
  }, []);

// Di AdminPanel index.jsx, update loadInitialData

const loadInitialData = async () => {
  try {
    setLoading(true);
    console.log('Loading admin data...');
    
    const [kunjunganResponse, systemResponse] = await Promise.all([
      apiService.getKunjunganData(),
      apiService.getSystemInfo()
    ]);
    
    console.log('Admin data loaded:', { kunjunganResponse, systemResponse });
    
    // Handle kunjungan data
    if (kunjunganResponse && kunjunganResponse.kunjungan_data) {
      setKunjunganData(kunjunganResponse.kunjungan_data);
      console.log('Kunjungan data set:', kunjunganResponse.kunjungan_data);
    } else {
      console.warn('No kunjungan data received');
      setKunjunganData({});
    }
    
    // Handle system info
    if (systemResponse && systemResponse.system_info) {
      setSystemInfo(systemResponse.system_info);
      console.log('System info set:', systemResponse.system_info);
    } else {
      console.warn('No system info received');
      setSystemInfo(null);
    }
    
    // Show success message if we got data
    if ((kunjunganResponse && kunjunganResponse.success) || 
        (systemResponse && systemResponse.success)) {
      toast.success('Data admin berhasil dimuat');
    } else {
      toast.warning('Sebagian data admin tidak dapat dimuat');
    }
    
  } catch (error) {
    console.error('Failed to load admin data:', error);
    toast.error('Gagal memuat data admin');
    
    // Set empty data
    setKunjunganData({});
    setSystemInfo(null);
  } finally {
    setLoading(false);
  }
};

  const handleAddWisata = async () => {
    if (!newWisata.nama.trim() || !newWisata.jumlah) {
      toast.error('Nama wisata dan jumlah kunjungan harus diisi');
      return;
    }

    try {
      setLoading(true);
      await apiService.addWisata(newWisata.nama.trim(), parseInt(newWisata.jumlah));
      
      setKunjunganData(prev => ({
        ...prev,
        [newWisata.nama.trim()]: parseInt(newWisata.jumlah)
      }));
      
      setNewWisata({ nama: '', jumlah: '' });
      toast.success('Wisata berhasil ditambahkan');
    } catch (error) {
      toast.error(error.message || 'Gagal menambahkan wisata');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateWisata = async (nama, jumlah) => {
    try {
      setLoading(true);
      await apiService.updateWisata(nama, parseInt(jumlah));
      
      setKunjunganData(prev => ({
        ...prev,
        [nama]: parseInt(jumlah)
      }));
      
      setEditingWisata(null);
      toast.success('Data wisata berhasil diupdate');
    } catch (error) {
      toast.error(error.message || 'Gagal mengupdate wisata');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWisata = async (nama) => {
    // Fixed: Use window.confirm instead of confirm
    if (!window.confirm(`Yakin ingin menghapus data wisata "${nama}"?`)) {
      return;
    }

    try {
      setLoading(true);
      await apiService.deleteWisata(nama);
      
      setKunjunganData(prev => {
        const newData = { ...prev };
        delete newData[nama];
        return newData;
      });
      
      toast.success('Wisata berhasil dihapus');
    } catch (error) {
      toast.error(error.message || 'Gagal menghapus wisata');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async () => {
    if (!uploadFile) {
      toast.error('Pilih file terlebih dahulu');
      return;
    }

    const formData = new FormData();
    formData.append('file', uploadFile);

    try {
      setLoading(true);
      await apiService.uploadFile(formData);
      
      setUploadFile(null);
      toast.success('File berhasil diupload dan diproses');
      
      // Reload data after upload
      await loadInitialData();
    } catch (error) {
      toast.error(error.message || 'Gagal mengupload file');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch('/api/download/template');
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'template_upload.csv';
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success('Template berhasil didownload');
      } else {
        throw new Error('Failed to download template');
      }
    } catch (error) {
      toast.error('Gagal mendownload template');
    }
  };

  const handleExportData = async () => {
    try {
      const response = await fetch('/api/admin/export_kunjungan', {
        credentials: 'include'
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `data_kunjungan_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success('Data berhasil diekspor');
      } else {
        throw new Error('Failed to export data');
      }
    } catch (error) {
      toast.error('Gagal mengekspor data');
    }
  };

  const handleBackupData = async () => {
    try {
      const response = await fetch('/api/admin/backup_data', {
        credentials: 'include'
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup_${new Date().toISOString().split('T')[0]}.zip`;
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success('Backup berhasil dibuat');
      } else {
        throw new Error('Failed to create backup');
      }
    } catch (error) {
      toast.error('Gagal membuat backup');
    }
  };

  const renderKunjunganTab = () => (
    <div className="space-y-6">
      {/* Add New Wisata */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-green-600" />
          Tambah Wisata Baru
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Nama Wisata"
            value={newWisata.nama}
            onChange={(e) => setNewWisata(prev => ({ ...prev, nama: e.target.value }))}
            className="form-input"
          />
          <input
            type="number"
            placeholder="Jumlah Kunjungan"
            value={newWisata.jumlah}
            onChange={(e) => setNewWisata(prev => ({ ...prev, jumlah: e.target.value }))}
            className="form-input"
          />
          <button
            onClick={handleAddWisata}
            disabled={loading}
            className="btn-success"
          >
            <Plus className="w-4 h-4 mr-2" />
            Tambah
          </button>
        </div>
      </div>

      {/* Export Actions */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Download className="w-5 h-5 text-blue-600" />
          Export Data
        </h3>
        
        <div className="flex flex-wrap gap-4">
          <button onClick={handleExportData} className="btn-primary">
            <Download className="w-4 h-4 mr-2" />
            Export Kunjungan
          </button>
          <button onClick={handleBackupData} className="btn-secondary">
            <Database className="w-4 h-4 mr-2" />
            Backup Semua Data
          </button>
        </div>
      </div>

      {/* Kunjungan Data Table */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            Data Kunjungan Wisata ({Object.keys(kunjunganData).length} destinasi)
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nama Wisata
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Jumlah Kunjungan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(kunjunganData)
                .sort(([,a], [,b]) => b - a)
                .map(([nama, jumlah]) => (
                <tr key={nama} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{nama}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingWisata === nama ? (
                      <input
                        type="number"
                        defaultValue={jumlah}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleUpdateWisata(nama, parseInt(e.target.value));
                          }
                        }}
                        className="w-32 px-2 py-1 border border-gray-300 rounded text-sm"
                        autoFocus
                      />
                    ) : (
                      <div className="text-sm text-gray-900">{jumlah.toLocaleString()}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      {editingWisata === nama ? (
                        <>
                          <button
                            onClick={() => {
                              const input = document.querySelector(`input[defaultValue="${jumlah}"]`);
                              handleUpdateWisata(nama, parseInt(input.value));
                            }}
                            className="text-green-600 hover:text-green-900"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingWisata(null)}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            ✕
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => setEditingWisata(nama)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteWisata(nama)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderUploadTab = () => (
    <div className="space-y-6">
      {/* Upload Instructions */}
      <div className="bg-blue-50 rounded-2xl p-6 border border-blue-200">
        <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
          <Info className="w-5 h-5" />
          Instruksi Upload
        </h3>
        <div className="space-y-2 text-blue-800">
          <p>• File harus berformat CSV atau Excel (.xlsx, .xls)</p>
          <p>• Kolom yang diperlukan: wisata, rating, review_text, date</p>
          <p>• Kolom opsional: visit_time</p>
          <p>• Maksimal ukuran file: 50MB</p>
        </div>
      </div>

      {/* Download Template */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Download className="w-5 h-5 text-green-600" />
          Download Template
        </h3>
        <p className="text-gray-600 mb-4">
          Download template CSV untuk memastikan format data yang benar.
        </p>
        <button onClick={handleDownloadTemplate} className="btn-success">
          <Download className="w-4 h-4 mr-2" />
          Download Template CSV
        </button>
      </div>

      {/* File Upload */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Upload className="w-5 h-5 text-blue-600" />
          Upload File Data
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-center w-full">
            <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-10 h-10 mb-3 text-gray-400" />
                <p className="mb-2 text-sm text-gray-500">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500">CSV or Excel files (MAX. 50MB)</p>
              </div>
              <input
                type="file"
                className="hidden"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => setUploadFile(e.target.files[0])}
              />
            </label>
          </div>

          {uploadFile && (
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">{uploadFile.name}</span>
                <span className="text-xs text-blue-700">
                  ({(uploadFile.size / 1024 / 1024).toFixed(2)} MB)
                </span>
              </div>
              <button
                onClick={() => setUploadFile(null)}
                className="text-red-600 hover:text-red-800"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}

          <button
            onClick={handleFileUpload}
            disabled={!uploadFile || loading}
            className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <LoadingSpinner size="small" />
                <span className="ml-2">Processing...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload & Process File
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  const renderSystemTab = () => (
    <div className="space-y-6">
      {systemInfo && (
        <>
          {/* System Status */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Server className="w-5 h-5 text-green-600" />
              System Status
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <Activity className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <div className="text-sm font-medium text-green-900">Platform</div>
                <div className="text-xs text-green-700">{systemInfo.system?.platform}</div>
              </div>
              
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <Database className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <div className="text-sm font-medium text-blue-900">Python</div>
                <div className="text-xs text-blue-700">{systemInfo.system?.python_version}</div>
              </div>
              
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <CheckCircle className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <div className="text-sm font-medium text-purple-900">Environment</div>
                <div className="text-xs text-purple-700">{systemInfo.system?.flask_env}</div>
              </div>
              
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <HardDrive className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                <div className="text-sm font-medium text-orange-900">Storage</div>
                <div className="text-xs text-orange-700">{systemInfo.storage?.total_size_mb} MB</div>
              </div>
            </div>
          </div>

          {/* Data Statistics */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              Data Statistics
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg">
                <div className="text-2xl font-bold">{systemInfo.data?.total_reviews?.toLocaleString() || '0'}</div>
                <div className="text-sm opacity-90">Total Reviews</div>
              </div>
              
              <div className="p-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg">
                <div className="text-2xl font-bold">{systemInfo.data?.kunjungan_wisata_count || '0'}</div>
                <div className="text-sm opacity-90">Destinasi Wisata</div>
              </div>
              
              <div className="p-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg">
                <div className="text-2xl font-bold">{systemInfo.data?.total_kunjungan?.toLocaleString() || '0'}</div>
                <div className="text-sm opacity-90">Total Kunjungan</div>
              </div>
            </div>
          </div>

          {/* Models Status */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-purple-600" />
              Models & Components
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium">TensorFlow</span>
                  <span className={cn(
                    "px-2 py-1 rounded text-xs font-medium",
                    systemInfo.system?.tensorflow_available 
                      ? "bg-green-100 text-green-800" 
                      : "bg-red-100 text-red-800"
                  )}>
                    {systemInfo.system?.tensorflow_available ? 'Available' : 'Not Available'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium">Scikit-learn</span>
                  <span className={cn(
                    "px-2 py-1 rounded text-xs font-medium",
                    systemInfo.system?.sklearn_available 
                      ? "bg-green-100 text-green-800" 
                      : "bg-red-100 text-red-800"
                  )}>
                    {systemInfo.system?.sklearn_available ? 'Available' : 'Not Available'}
                  </span>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium">Processor</span>
                  <span className={cn(
                    "px-2 py-1 rounded text-xs font-medium",
                    systemInfo.models?.processor_loaded 
                      ? "bg-green-100 text-green-800" 
                      : "bg-red-100 text-red-800"
                  )}>
                    {systemInfo.models?.processor_loaded ? 'Loaded' : 'Not Loaded'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium">Predictor</span>
                  <span className={cn(
                    "px-2 py-1 rounded text-xs font-medium",
                    systemInfo.models?.predictor_loaded 
                      ? "bg-green-100 text-green-800" 
                      : "bg-red-100 text-red-800"
                  )}>
                    {systemInfo.models?.predictor_loaded ? 'Loaded' : 'Not Loaded'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl p-8 text-white mb-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.05%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%224%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] animate-pulse" />
            
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                  <Shield className="w-8 h-8" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">Admin Panel</h1>
                  <p className="text-lg opacity-90">Selamat datang, {user?.name}</p>
                </div>
              </div>
              <p className="text-white/80">Kelola data kunjungan wisata dan sistem analisis</p>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors",
                    activeTab === tab.id
                      ? "border-indigo-500 text-indigo-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  )}
                >
                  <tab.icon className="w-5 h-5" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          {loading && (
            <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl p-6 shadow-xl">
                <LoadingSpinner size="large" />
                <p className="mt-4 text-center text-gray-600">Processing...</p>
              </div>
            </div>
          )}

          {activeTab === 'kunjungan' && renderKunjunganTab()}
          {activeTab === 'upload' && renderUploadTab()}
          {activeTab === 'system' && renderSystemTab()}
        </motion.div>

        {/* Refresh Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex justify-center mt-8"
        >
          <button
            onClick={loadInitialData}
            disabled={loading}
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            <RefreshCw className={cn("w-5 h-5 mr-2", loading && "animate-spin")} />
            {loading ? 'Loading...' : 'Refresh Data'}
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminPanel;