import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { apiClient, Notification as ApiNotification } from '../utils/api';

type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface NotificationData {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  duration?: number;
  timestamp: number;
  persistent?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
  onClose?: () => void;
}

interface SystemNotification extends ApiNotification {
  isRead: boolean;
}

interface NotificationContextType {
  notifications: NotificationData[];
  systemNotifications: SystemNotification[];
  unreadCount: number;
  addNotification: (notification: Omit<NotificationData, 'id' | 'timestamp'>) => string;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
  showNotification: (title: string, message?: string, type?: NotificationType, duration?: number) => string;
  showSuccess: (title: string, message?: string, duration?: number) => string;
  showError: (title: string, message?: string, duration?: number) => string;
  showWarning: (title: string, message?: string, duration?: number) => string;
  showInfo: (title: string, message?: string, duration?: number) => string;
  showPersistent: (title: string, message?: string, type?: NotificationType, action?: NotificationData['action']) => string;
  fetchSystemNotifications: () => Promise<void>;
  markSystemNotificationRead: (notificationId: number) => Promise<void>;

  markAllSystemNotificationsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
  defaultDuration?: number;
  maxNotifications?: number;
}

const NotificationComponent: React.FC<{
  notification: NotificationData;
  onRemove: (id: string) => void;
}> = ({ notification, onRemove }) => {
  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5" />;
      case 'error':
        return <AlertCircle className="w-5 h-5" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5" />;
      case 'info':
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  const getStyles = () => {
    const baseStyles = 'max-w-sm p-4 rounded-lg shadow-lg transition-all duration-300 border backdrop-blur-sm';
    
    switch (notification.type) {
      case 'success':
        return `${baseStyles} bg-green-50/95 border-green-200 text-green-800`;
      case 'error':
        return `${baseStyles} bg-red-50/95 border-red-200 text-red-800`;
      case 'warning':
        return `${baseStyles} bg-yellow-50/95 border-yellow-200 text-yellow-800`;
      case 'info':
      default:
        return `${baseStyles} bg-blue-50/95 border-blue-200 text-blue-800`;
    }
  };

  const handleClose = () => {
    if (notification.onClose) {
      notification.onClose();
    }
    onRemove(notification.id);
  };

  return (
    <div className={getStyles()}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 mt-0.5">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm">{notification.title}</h4>
          {notification.message && (
            <p className="text-sm mt-1 opacity-90">{notification.message}</p>
          )}
          {notification.action && (
            <button
              onClick={notification.action.onClick}
              className="mt-2 text-sm font-medium underline hover:no-underline focus:outline-none"
            >
              {notification.action.label}
            </button>
          )}
        </div>
        <button
          onClick={handleClose}
          className="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-600 focus:outline-none"
          aria-label="Close notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ 
  children, 
  defaultDuration = 5000,
  maxNotifications = 5
}) => {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [systemNotifications, setSystemNotifications] = useState<SystemNotification[]>([]);

  const unreadCount = systemNotifications.filter(n => !n.isRead).length;

  // Fetch system notifications on mount and periodically
  useEffect(() => {
    fetchSystemNotifications();
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchSystemNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchSystemNotifications = async () => {
    try {
      const response = await apiClient.getNotifications();
      const allNotifications = [
        ...response.unread.map(n => ({ ...n, isRead: false })),
        ...response.read.map(n => ({ ...n, isRead: true }))
      ];
      setSystemNotifications(allNotifications);
    } catch (error) {
      console.error('Failed to fetch system notifications:', error);
      
      // If it's an auth error, clear the notifications and let the auth system handle it
      if (error instanceof Error && error.message.includes('Session expired')) {
        setSystemNotifications([]);
        return;
      }
      
      // For other errors, show a notification
      showError('Error', 'Failed to load notifications');
    }
  };
  const markAllSystemNotificationsRead = async () => {
    try {
      await apiClient.markAllNotificationsRead();
      setSystemNotifications(prev => 
        prev.map(n => ({ ...n, isRead: true }))
      );
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      
      // If it's an auth error, let the auth system handle it
      if (error instanceof Error && error.message.includes('Session expired')) {
        return;
      }
      
      showError('Error', 'Failed to mark all notifications as read');
    }
  };
  const addNotification = useCallback((notification: Omit<NotificationData, 'id' | 'timestamp'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const timestamp = Date.now();
    const duration = notification.duration ?? defaultDuration;
    
    const newNotification: NotificationData = { 
      ...notification, 
      id, 
      timestamp,
      message: notification.message || '',
      duration
    };
    
    setNotifications(prev => {
      const updated = [...prev, newNotification];
      // Limit the number of notifications
      if (updated.length > maxNotifications) {
        return updated.slice(-maxNotifications);
      }
      return updated;
    });

    // Auto-remove notification after duration (unless persistent)
    if (!notification.persistent && duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }

    return id;
  }, [defaultDuration, maxNotifications]);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => {
      const notification = prev.find(n => n.id === id);
      if (notification?.onClose) {
        notification.onClose();
      }
      return prev.filter(n => n.id !== id);
    });
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications(prev => {
      // Call onClose for all notifications being removed
      prev.forEach(n => {
        if (n.onClose) {
          n.onClose();
        }
      });
      return [];
    });
  }, []);

  const showNotification = useCallback((
    title: string, 
    message: string = '', 
    type: NotificationType = 'info',
    duration?: number
  ) => {
    return addNotification({ type, title, message, duration });
  }, [addNotification]);

  const showSuccess = useCallback((title: string, message: string = '', duration?: number) => {
    return showNotification(title, message, 'success', duration);
  }, [showNotification]);

  const showError = useCallback((title: string, message: string = '', duration?: number) => {
    return showNotification(title, message, 'error', duration || 7000);
  }, [showNotification]);

  const showWarning = useCallback((title: string, message: string = '', duration?: number) => {
    return showNotification(title, message, 'warning', duration);
  }, [showNotification]);

  const showInfo = useCallback((title: string, message: string = '', duration?: number) => {
    return showNotification(title, message, 'info', duration);
  }, [showNotification]);

  const showPersistent = useCallback((
    title: string, 
    message: string = '', 
    type: NotificationType = 'info',
    action?: NotificationData['action']
  ) => {
    return addNotification({ 
      type, 
      title, 
      message, 
      persistent: true,
      action
    });
  }, [addNotification]);

  const value = {
    notifications,
    systemNotifications,
    unreadCount,
    addNotification,
    removeNotification,
    clearAllNotifications,
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showPersistent,
    fetchSystemNotifications,

    markSystemNotificationRead: async (notificationId: number) => {
      try {
        // Use markNotificationsRead with a single ID in an array
        await apiClient.markNotificationsRead([notificationId]);

        // Update the state to mark the notification as read
        setSystemNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId ? { ...n, isRead: true } : n
          )
        );
      } catch (error) {
        console.error('Failed to mark notification as read:', error);

        // Handle session expiration or other errors
        if (error instanceof Error && error.message.includes('Session expired')) {
          return;
        }

        showError('Error', 'Failed to mark notification as read');
      }
    },    
    markAllSystemNotificationsRead,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      
      {/* Toast Notifications Display */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map((notification) => (
          <NotificationComponent
            key={notification.id}
            notification={notification}
            onRemove={removeNotification}
          />
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const useAsyncNotification = () => {
  const { showSuccess, showError, showInfo, removeNotification } = useNotification();

  const executeWithNotification = useCallback(async <T,>(
    asyncFn: () => Promise<T>,
    {
      loadingMessage,
      successMessage,
      errorMessage,
      showLoading = true
    }: {
      loadingMessage?: string;
      successMessage?: string;
      errorMessage?: string;
      showLoading?: boolean;
    } = {}
  ): Promise<T> => {
    let loadingId: string | undefined;
    
    try {
      if (showLoading && loadingMessage) {
        loadingId = showInfo('Loading', loadingMessage, 0); // 0 duration = persistent
      }
      
      const result = await asyncFn();
      
      if (successMessage) {
        showSuccess('Success', successMessage);
      }
      
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred';
      showError('Error', errorMessage || message);
      throw error;
    } finally {
      if (loadingId) {
        removeNotification(loadingId);
      }
    }
  }, [showSuccess, showError, showInfo, removeNotification]);

  return { executeWithNotification };
};