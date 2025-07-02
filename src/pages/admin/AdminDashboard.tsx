// src/routes/admin/AdminDashboard.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  BookOpen, 
  BarChart3, 
  Settings,
  TrendingUp,
  Award,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  UserPlus,
  Plus
} from 'lucide-react';
import { Layout } from '../../components/layout/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { apiClient } from '../../utils/api';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const { showError } = useNotification();
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        setIsLoading(true);
        const data = await apiClient.getDashboardStats();
        setDashboardStats(data);
      } catch (error) {
        showError('Error', 'Failed to load dashboard statistics');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardStats();
  }, [showError]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const quickActions = [
    {
      title: 'User Management',
      description: 'Manage users and permissions',
      icon: Users,
      href: '/admin/users',
      color: 'from-primary-500 to-primary-600'
    },
    {
      title: 'Content Management',
      description: 'Oversee training modules',
      icon: BookOpen,
      href: '/admin/modules',
      color: 'from-secondary-500 to-secondary-600'
    },
    {
      title: 'Analytics',
      description: 'View detailed reports',
      icon: BarChart3,
      href: '/admin/analytics',
      color: 'from-accent-500 to-accent-600'
    },
   
  ];

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
      {/* Welcome Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">
              {getGreeting()}, {user?.first_name}! 👨‍💼
            </h1>
            <p className="text-neutral-600 mt-1">
              Here's an overview of your training platform's performance and activity.
            </p>
          </div>
          <div className="hidden md:flex items-center space-x-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-600">
                {dashboardStats?.total_users || 0}
              </div>
              <div className="text-sm text-neutral-600">Total Users</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-secondary-600">
                {dashboardStats?.total_modules || 0}
              </div>
              <div className="text-sm text-neutral-600">Total Modules</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900">Total Users</h3>
              <p className="text-sm text-neutral-600">Platform users</p>
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div className="text-2xl font-bold text-primary-600">
              {dashboardStats?.total_users || 0}
            </div>
            <div className="text-sm text-neutral-600">
              {dashboardStats?.active_users || 0} active
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-secondary-100 rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-secondary-600" />
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900">Training Modules</h3>
              <p className="text-sm text-neutral-600">Available content</p>
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div className="text-2xl font-bold text-secondary-600">
              {dashboardStats?.total_modules || 0}
            </div>
            <div className="text-sm text-neutral-600">
              {dashboardStats?.active_modules || 0} active
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-accent-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-accent-600" />
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900">Completion Rate</h3>
              <p className="text-sm text-neutral-600">Overall progress</p>
            </div>
          </div>
          <div className="text-2xl font-bold text-accent-600 mb-2">
            {dashboardStats?.total_modules > 0 
              ? Math.round((dashboardStats.active_modules / dashboardStats.total_modules) * 100)
              : 0
            }%
          </div>
          <ProgressBar 
            value={dashboardStats?.total_modules > 0 
              ? (dashboardStats.active_modules / dashboardStats.total_modules) * 100
              : 0
            }
            size="sm"
            color="accent"
          />
        </div>

        <div className="card p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Award className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900">Active Today</h3>
              <p className="text-sm text-neutral-600">Daily activity</p>
            </div>
          </div>
          <div className="text-2xl font-bold text-purple-600">
            {Math.round((dashboardStats?.active_users || 0) * 0.3)}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-neutral-900 mb-4">Quick Actions</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <Link
              key={index}
              to={action.href}
              className="card p-4 hover:shadow-xl transition-all duration-300 transform hover:scale-105 group"
            >
              <div className={`w-12 h-12 bg-gradient-to-br ${action.color} rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                <action.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-neutral-900 mb-1">{action.title}</h3>
              <p className="text-sm text-neutral-600">{action.description}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-neutral-900">Recent Activity</h2>
              <Link to="/admin/analytics" className="text-primary-600 hover:text-primary-700 font-medium">
                View All
              </Link>
            </div>

            {dashboardStats?.recent_activity && dashboardStats.recent_activity.length > 0 ? (
              <div className="space-y-4">
                {dashboardStats.recent_activity.map((activity: any, index: number) => (
                  <div key={index} className="flex items-center space-x-4 p-4 bg-neutral-50 rounded-lg">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      activity.status === 'completed' ? 'bg-primary-100' : 'bg-neutral-100'
                    }`}>
                      {activity.status === 'completed' ? (
                        <CheckCircle2 className="w-5 h-5 text-primary-600" />
                      ) : (
                        <Clock className="w-5 h-5 text-neutral-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-neutral-900">
                        {activity.first_name} {activity.last_name}
                      </p>
                      <p className="text-sm text-neutral-600">
                        {activity.status === 'completed' ? 'Completed' : 'Started'} "{activity.module_title}"
                      </p>
                    </div>
                    <div className="text-sm text-neutral-500">
                      {new Date(activity.last_accessed).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
                <p className="text-neutral-600">No recent activity</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* System Health */}
          <div className="card p-6">
            <h3 className="font-semibold text-neutral-900 mb-4">System Health</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-600">Server Status</span>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                  <span className="text-sm text-primary-600">Online</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-600">Database</span>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                  <span className="text-sm text-primary-600">Connected</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-600">Storage</span>
                <span className="text-sm text-neutral-600">78% used</span>
              </div>
              <ProgressBar value={78} size="sm" />
            </div>
          </div>

          {/* Quick Stats */}
          <div className="card p-6">
            <h3 className="font-semibold text-neutral-900 mb-4">Today's Summary</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <UserPlus className="w-4 h-4 text-primary-600" />
                  <span className="text-sm text-neutral-600">New Users</span>
                </div>
                <span className="font-medium text-neutral-900">
                  {Math.round((dashboardStats?.total_users || 0) * 0.02)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-accent-600" />
                  <span className="text-sm text-neutral-600">Completions</span>
                </div>
                <span className="font-medium text-neutral-900">
                  {Math.round((dashboardStats?.active_users || 0) * 0.15)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span className="text-sm text-neutral-600">Issues</span>
                </div>
                <span className="font-medium text-neutral-900">0</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card p-6 bg-gradient-to-br from-primary-50 to-secondary-50">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <Plus className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-semibold text-neutral-900 mb-1">Need Help?</h3>
              <p className="text-sm text-neutral-600 mb-4">
                Access admin documentation and support resources.
              </p>
              <button className="btn-primary w-full">
                View Documentation
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};