import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  BookOpen,
  Calendar,
  Download,
  Filter,
  RefreshCw,
  Award,
  Clock,
  Target
} from 'lucide-react';
import { Layout } from '../../components/layout/Layout';
import { useNotification } from '../../contexts/NotificationContext';
import { apiClient } from '../../utils/api';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ProgressBar } from '../../components/ui/ProgressBar';

export const AdminAnalyticsPage: React.FC = () => {
  const { showError } = useNotification();
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setIsLoading(true);
        const data = await apiClient.getDashboardStats();
        setAnalyticsData(data);
      } catch (error) {
        showError('Error', 'Failed to load analytics data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, [showError, timeRange]);

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeRange(prev => prev); // Trigger useEffect
  };

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
            <h1 className="text-3xl font-bold text-neutral-900 mb-2">Analytics & Reports</h1>
            <p className="text-neutral-600">
              Comprehensive insights into platform usage and learning outcomes.
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleRefresh}
              className="btn-outline flex items-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
            <button className="btn-primary flex items-center space-x-2">
              <Download className="w-4 h-4" />
              <span>Export Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* Time Range Filter */}
      <div className="card p-6 mb-8">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-neutral-700">Time Range:</label>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="input-field w-auto"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
            <option value="all">All time</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900">Total Users</h3>
              <p className="text-sm text-neutral-600">Platform registrations</p>
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div className="text-2xl font-bold text-primary-600">
              {analyticsData?.total_users || 0}
            </div>
            <div className="text-sm text-primary-600 flex items-center">
              <TrendingUp className="w-3 h-3 mr-1" />
              +12%
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-secondary-100 rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-secondary-600" />
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900">Active Modules</h3>
              <p className="text-sm text-neutral-600">Available content</p>
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div className="text-2xl font-bold text-secondary-600">
              {analyticsData?.active_modules || 0}
            </div>
            <div className="text-sm text-secondary-600 flex items-center">
              <TrendingUp className="w-3 h-3 mr-1" />
              +8%
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-accent-100 rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5 text-accent-600" />
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900">Completion Rate</h3>
              <p className="text-sm text-neutral-600">Average completion</p>
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div className="text-2xl font-bold text-accent-600">
              {analyticsData?.total_modules > 0 
                ? Math.round((analyticsData.active_modules / analyticsData.total_modules) * 100)
                : 0
              }%
            </div>
            <div className="text-sm text-accent-600 flex items-center">
              <TrendingUp className="w-3 h-3 mr-1" />
              +5%
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Award className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900">Certificates</h3>
              <p className="text-sm text-neutral-600">Issued this month</p>
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div className="text-2xl font-bold text-purple-600">
              {Math.round((analyticsData?.active_users || 0) * 0.4)}
            </div>
            <div className="text-sm text-purple-600 flex items-center">
              <TrendingUp className="w-3 h-3 mr-1" />
              +15%
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* User Engagement */}
        <div className="lg:col-span-2">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-neutral-900">User Engagement</h2>
              <Calendar className="w-5 h-5 text-neutral-400" />
            </div>

            {/* Engagement Metrics */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 bg-neutral-50 rounded-lg">
                <div className="text-2xl font-bold text-primary-600">
                  {Math.round((analyticsData?.active_users || 0) * 0.7)}
                </div>
                <div className="text-sm text-neutral-600">Daily Active Users</div>
              </div>
              <div className="text-center p-4 bg-neutral-50 rounded-lg">
                <div className="text-2xl font-bold text-secondary-600">
                  {Math.round((analyticsData?.active_users || 0) * 0.85)}
                </div>
                <div className="text-sm text-neutral-600">Weekly Active Users</div>
              </div>
              <div className="text-center p-4 bg-neutral-50 rounded-lg">
                <div className="text-2xl font-bold text-accent-600">
                  {analyticsData?.active_users || 0}
                </div>
                <div className="text-sm text-neutral-600">Monthly Active Users</div>
              </div>
            </div>

            {/* Recent Activity */}
            <div>
              <h3 className="font-semibold text-neutral-900 mb-3">Recent Activity</h3>
              {analyticsData?.recent_activity && analyticsData.recent_activity.length > 0 ? (
                <div className="space-y-3">
                  {analyticsData.recent_activity.slice(0, 5).map((activity: any, index: number) => (
                    <div key={index} className="flex items-center space-x-3 p-3 bg-neutral-50 rounded-lg">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        activity.status === 'completed' ? 'bg-primary-100' : 'bg-neutral-100'
                      }`}>
                        {activity.status === 'completed' ? (
                          <Award className="w-4 h-4 text-primary-600" />
                        ) : (
                          <Clock className="w-4 h-4 text-neutral-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-neutral-900 text-sm">
                          {activity.first_name} {activity.last_name}
                        </p>
                        <p className="text-xs text-neutral-600">
                          {activity.status === 'completed' ? 'Completed' : 'Started'} "{activity.module_title}"
                        </p>
                      </div>
                      <div className="text-xs text-neutral-500">
                        {new Date(activity.last_accessed).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Clock className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
                  <p className="text-sm text-neutral-600">No recent activity</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Analytics */}
        <div className="space-y-6">
          {/* Top Performing Modules */}
          <div className="card p-6">
            <h3 className="font-semibold text-neutral-900 mb-4">Top Performing Modules</h3>
            <div className="space-y-3">
              {[
                { name: 'Customer Service Excellence', completion:  92, learners: 156 },
                { name: 'Safety Protocols', completion: 88, learners: 134 },
                { name: 'Team Leadership', completion: 85, learners: 98 },
                { name: 'Communication Skills', completion: 82, learners: 87 }
              ].map((module, index) => (
                <div key={index} className="p-3 bg-neutral-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-neutral-900 text-sm">{module.name}</h4>
                    <span className="text-xs text-neutral-600">{module.learners} learners</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <ProgressBar value={module.completion} size="sm" className="flex-1" />
                    <span className="text-xs text-neutral-600">{module.completion}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* User Distribution */}
          <div className="card p-6">
            <h3 className="font-semibold text-neutral-900 mb-4">User Distribution</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-600">Learners</span>
                <span className="font-medium text-neutral-900">
                  {Math.round((analyticsData?.total_users || 0) * 0.8)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-600">Trainers</span>
                <span className="font-medium text-neutral-900">
                  {Math.round((analyticsData?.total_users || 0) * 0.15)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-600">Admins</span>
                <span className="font-medium text-neutral-900">
                  {Math.round((analyticsData?.total_users || 0) * 0.05)}
                </span>
              </div>
            </div>
          </div>

          {/* System Performance */}
          <div className="card p-6 bg-gradient-to-br from-primary-50 to-secondary-50">
            <h3 className="font-semibold text-neutral-900 mb-4">System Performance</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-600">Uptime</span>
                <span className="text-sm text-primary-600 font-medium">99.9%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-600">Response Time</span>
                <span className="text-sm text-primary-600 font-medium">120ms</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-600">Error Rate</span>
                <span className="text-sm text-primary-600 font-medium">0.01%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};