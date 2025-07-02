import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Trash2, 
  HardDrive,
  Wifi,
  WifiOff,
  FileText,
  Video,
  BookOpen,
  AlertCircle
} from 'lucide-react';
import { Layout } from '../../components/layout/Layout';
import { useNotification } from '../../contexts/NotificationContext';
import { apiClient } from '../../utils/api';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ProgressBar } from '../../components/ui/ProgressBar';

interface OfflineContent {
  id: number;
  title: string;
  content_type: string;
  size: number;
}

interface OfflineData {
  offline_content: OfflineContent[];
  total_size: number;
  max_size: number;
}

export const OfflineContentPage: React.FC = () => {
  const { showError, showSuccess } = useNotification();
  const [offlineData, setOfflineData] = useState<OfflineData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const fetchOfflineContent = async () => {
      try {
        setIsLoading(true);
        const data = await apiClient.getOfflineContent();
        setOfflineData(data);
      } catch (error) {
        showError('Error', 'Failed to load offline content');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOfflineContent();

    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [showError]);

  const handleDeleteContent = async (contentId: number) => {
    try {
      await apiClient.deleteOfflineContent(contentId);
      showSuccess('Content Removed', 'Content has been removed from offline storage');
      
      // Refresh offline content
      const data = await apiClient.getOfflineContent();
      setOfflineData(data);
    } catch (error) {
      showError('Error', 'Failed to remove content from offline storage');
    }
  };

  const handleDownloadContent = async (contentId: number) => {
    try {
      setIsLoading(true);

      // First check if content is already downloaded
      const offlineCheck = await apiClient.checkOfflineContent(contentId);
      if (offlineCheck.isAvailable) {
        showSuccess('Content Available', 'This content is already available offline');
        return;
      }

      // Check storage space
      if (offlineData &&
          (offlineData.total_size + offlineCheck.estimatedSize) > offlineData.max_size) {
        showError('Storage Full', 'Not enough space to download this content');
        return;
      }

      // Download the content
      await apiClient.downloadContentForOffline(contentId);
      showSuccess('Download Complete', 'Content is now available offline');

      // Refresh offline content list
      const data = await apiClient.getOfflineContent();
      setOfflineData(data);
    } catch (error) {
      showError('Download Failed', 'Could not download content for offline use');
    } finally {
      setIsLoading(false);
    }
  };

  // Example usage of handleDownloadContent

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getContentIcon = (contentType: string) => {
    switch (contentType) {
      case 'video':
        return Video;
      case 'document':
        return FileText;
      default:
        return BookOpen;
    }
  };

  const getContentTypeColor = (contentType: string) => {
    switch (contentType) {
      case 'video':
        return 'text-red-600 bg-red-100';
      case 'document':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-primary-600 bg-primary-100';
    }
  };

  const storagePercentage = offlineData 
    ? Math.round((offlineData.total_size / offlineData.max_size) * 100)
    : 0;

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 mb-2">Offline Content</h1>
            <p className="text-neutral-600">
              Manage your downloaded content for offline learning.
            </p>
          </div>
          
          {/* Connection Status */}
          <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
            isOnline ? 'bg-primary-100 text-primary-700' : 'bg-red-100 text-red-700'
          }`}>
            {isOnline ? (
              <Wifi className="w-5 h-5" />
            ) : (
              <WifiOff className="w-5 h-5" />
            )}
            <span className="font-medium">
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
      </div>

      {/* Storage Overview */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="card p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <HardDrive className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900">Storage Used</h3>
              <p className="text-sm text-neutral-600">Local device storage</p>
            </div>
          </div>
          <div className="mb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-neutral-600">
                {formatFileSize(offlineData?.total_size || 0)}
              </span>
              <span className="text-sm text-neutral-600">
                {formatFileSize(offlineData?.max_size || 0)}
              </span>
            </div>
            <ProgressBar 
              value={storagePercentage} 
              color={storagePercentage > 80 ? 'secondary' : 'primary'}
            />
          </div>
          <p className="text-xs text-neutral-500">
            {storagePercentage}% of available storage used
          </p>
        </div>

        <div className="card p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-secondary-100 rounded-lg flex items-center justify-center">
              <Download className="w-5 h-5 text-secondary-600" />
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900">Downloaded Items</h3>
              <p className="text-sm text-neutral-600">Available offline</p>
            </div>
          </div>
          <div className="text-2xl font-bold text-secondary-600">
            {offlineData?.offline_content.length || 0}
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              isOnline ? 'bg-primary-100' : 'bg-accent-100'
            }`}>
              {isOnline ? (
                <Wifi className="w-5 h-5 text-primary-600" />
              ) : (
                <WifiOff className="w-5 h-5 text-accent-600" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900">Connection</h3>
              <p className="text-sm text-neutral-600">Network status</p>
            </div>
          </div>
          <div className={`text-lg font-medium ${
            isOnline ? 'text-primary-600' : 'text-accent-600'
          }`}>
            {isOnline ? 'Connected' : 'Offline Mode'}
          </div>
        </div>
      </div>

      {/* Storage Warning */}
      {storagePercentage > 80 && (
        <div className="card p-4 mb-6 bg-accent-50 border-accent-200">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-accent-600" />
            <div>
              <h4 className="font-medium text-accent-800">Storage Almost Full</h4>
              <p className="text-sm text-accent-700">
                Consider removing some offline content to free up space.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Offline Content List */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-neutral-900">Downloaded Content</h2>
          {!isOnline && (
            <div className="text-sm text-accent-600 font-medium">
              Offline Mode - Content available without internet
            </div>
          )}
        </div>

        {offlineData && offlineData.offline_content.length > 0 ? (
          <div className="space-y-3">
            {offlineData.offline_content.map((content) => {
              const Icon = getContentIcon(content.content_type);
              const colorClasses = getContentTypeColor(content.content_type);

              return (
                <div key={content.id} className="flex items-center space-x-4 p-4 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition-colors">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses}`}>
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="flex-1">
                    <h3 className="font-medium text-neutral-900 mb-1">
                      {content.title}
                    </h3>
                    <div className="flex items-center space-x-4 text-sm text-neutral-600">
                      <span className="capitalize">{content.content_type}</span>
                      <span>{formatFileSize(content.size)}</span>
                      <span className="text-primary-600">Available offline</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteContent(content.id)}
                    className="p-2 text-neutral-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                    title="Remove from offline storage"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <Download className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-neutral-900 mb-2">No offline content</h3>
            <p className="text-neutral-600 mb-4">
              Download content from modules to access them offline.
            </p>
            <a href="/modules" className="btn-primary">
              Browse Modules
            </a>
          </div>
        )}
      </div>

      {/* Offline Learning Tips */}
      <div className="mt-8 card p-6 bg-gradient-to-br from-primary-50 to-secondary-50">
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">Offline Learning Tips</h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm text-neutral-700">
          <div className="flex items-start space-x-2">
            <div className="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0"></div>
            <span>Download content when you have a stable internet connection</span>
          </div>
          <div className="flex items-start space-x-2">
            <div className="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0"></div>
            <span>Progress is saved locally and synced when you're back online</span>
          </div>
          <div className="flex items-start space-x-2">
            <div className="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0"></div>
            <span>Manage storage space by removing content you've completed</span>
          </div>
          <div className="flex items-start space-x-2">
            <div className="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0"></div>
            <span>Some interactive features require an internet connection</span>
          </div>
        </div>
      </div>
    </Layout>
  );
};