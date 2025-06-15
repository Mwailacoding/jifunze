import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  BookOpen, 
  Users, 
  BarChart3, 
  Plus,
  TrendingUp,
  Award,
  Clock,
  CheckCircle2,
  Target,
  Calendar
} from 'lucide-react';
import { Layout } from '../../components/layout/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { apiClient } from '../../utils/api';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

export const TrainerDashboard: React.FC = () => {
  const { user } = useAuth();
  const { showError } = useNotification();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        const data = await apiClient.getTrainerDashboard();
        setDashboardData(data);
      } catch (error) {
        showError('Error', 'Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [showError]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const quickActions = [
    {
      title: 'Create Module',
      description: 'Build new training content',
      icon: Plus,
      href: '/trainer/modules/new',
      color: 'from-primary-500 to-primary-600'
    },
    {
      title: 'View Learners',
      description: 'Monitor learner progress',
      icon: Users,
      href: '/trainer/learners',
      color: 'from-secondary-500 to-secondary-600'
    },
    {
      title: 'Create Assignment',
      description: 'Assign modules to learners',
      icon: Target,
      href: '/trainer/assignments',
      color: 'from-accent-500 to-accent-600'
    },
    {
      title: 'View Reports',
      description: 'Analyze performance data',
      icon: BarChart3,
      href: '/trainer/reports',
      color: 'from-purple-500 to-purple-600'
    }
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
              {getGreeting()}, {user?.first_name}! 👨‍🏫
            </h1>
            <p className="text-neutral-600 mt-1">
              Here's an overview of your training programs and learner progress.
            </p>
          </div>
          <div className="hidden md:flex items-center space-x-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-600">
                {dashboardData?.recent_modules?.length || 0}
              </div>
              <div className="text-sm text-neutral-600">Active Modules</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-secondary-600">
                {dashboardData?.assignment_stats?.length || 0}
              </div>
              <div className="text-sm text-neutral-600">Assignments</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="card p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900">My Modules</h3>
              <p className="text-sm text-neutral-600">Created content</p>
            </div>
          </div>
          <div className="text-2xl font-bold text-primary-600">
            {dashboardData?.recent_modules?.length || 0}
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-secondary-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-secondary-600" />
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900">Active Learners</h3>
              <p className="text-sm text-neutral-600">Enrolled students</p>
            </div>
          </div>
          <div className="text-2xl font-bold text-secondary-600">
            {dashboardData?.recent_modules?.reduce((total: number, module: any) => total + (module.learners || 0), 0) || 0}
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-accent-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-accent-600" />
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900">Avg. Completion</h3>
              <p className="text-sm text-neutral-600">Module completion rate</p>
            </div>
          </div>
          <div className="text-2xl font-bold text-accent-600">
            {dashboardData?.recent_modules?.length > 0 
              ? Math.round(dashboardData.recent_modules.reduce((total: number, module: any) => total + (module.completion_rate || 0), 0) / dashboardData.recent_modules.length)
              : 0
            }%
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Award className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900">Recent Quizzes</h3>
              <p className="text-sm text-neutral-600">Quiz submissions</p>
            </div>
          </div>
          <div className="text-2xl font-bold text-purple-600">
            {dashboardData?.recent_quiz_results?.length || 0}
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
        {/* Recent Modules */}
        <div className="lg:col-span-2">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-neutral-900">My Recent Modules</h2>
              <Link to="/trainer/modules" className="text-primary-600 hover:text-primary-700 font-medium">
                View All
              </Link>
            </div>

            {dashboardData?.recent_modules && dashboardData.recent_modules.length > 0 ? (
              <div className="space-y-4">
                {dashboardData.recent_modules.map((module: any) => (
                  <div key={module.id} className="flex items-center space-x-4 p-4 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition-colors">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center">
                      <BookOpen className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-neutral-900 mb-1">{module.title}</h3>
                      <div className="flex items-center space-x-4 text-sm text-neutral-600 mb-2">
                        <span>{module.category}</span>
                        <span>{module.learners || 0} learners</span>
                        <span>{Math.round(module.completion_rate || 0)}% completion</span>
                      </div>
                      <ProgressBar 
                        value={module.completion_rate || 0} 
                        size="sm" 
                        className="w-full"
                      />
                    </div>
                    <Link
                      to={`/trainer/modules/${module.id}/edit`}
                      className="btn-outline text-sm"
                    >
                      Edit
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <BookOpen className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
                <p className="text-neutral-600 mb-4">No modules created yet</p>
                <Link to="/trainer/modules/new" className="btn-primary">
                  Create Your First Module
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Recent Quiz Results */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-neutral-900">Recent Quiz Results</h3>
              <Link to="/trainer/reports" className="text-primary-600 hover:text-primary-700 text-sm">
                View All
              </Link>
            </div>

            {dashboardData?.recent_quiz_results && dashboardData.recent_quiz_results.length > 0 ? (
              <div className="space-y-3">
                {dashboardData.recent_quiz_results.slice(0, 5).map((result: any, index: number) => (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-neutral-50 rounded-lg">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      result.passed ? 'bg-primary-100' : 'bg-red-100'
                    }`}>
                      {result.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-primary-600" />
                      ) : (
                        <Clock className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-neutral-900">
                        {result.first_name} {result.last_name}
                      </p>
                      <p className="text-xs text-neutral-600">
                        {result.quiz_title} - {result.score}/{result.max_score}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      result.passed 
                        ? 'bg-primary-100 text-primary-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {result.passed ? 'Passed' : 'Failed'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-neutral-600">No recent quiz submissions</p>
            )}
          </div>

          {/* Assignment Status */}
          <div className="card p-6">
            <h3 className="font-semibold text-neutral-900 mb-4">Assignment Status</h3>
            
            {dashboardData?.assignment_stats && dashboardData.assignment_stats.length > 0 ? (
              <div className="space-y-3">
                {dashboardData.assignment_stats.slice(0, 3).map((assignment: any, index: number) => (
                  <div key={index} className="p-3 bg-neutral-50 rounded-lg">
                    <h4 className="font-medium text-neutral-900 text-sm mb-1">
                      {assignment.module_title}
                    </h4>
                    <div className="flex items-center justify-between text-xs text-neutral-600 mb-2">
                      <span>{assignment.assigned_to || 0} assigned</span>
                      <span>{assignment.completed_by || 0} completed</span>
                    </div>
                    <ProgressBar 
                      value={assignment.assigned_to > 0 ? (assignment.completed_by / assignment.assigned_to) * 100 : 0}
                      size="sm"
                      className="w-full"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-neutral-600">No active assignments</p>
            )}
          </div>

          {/* Quick Stats */}
          <div className="card p-6 bg-gradient-to-br from-primary-50 to-secondary-50">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <Calendar className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-semibold text-neutral-900 mb-1">This Week</h3>
              <div className="text-2xl font-bold text-primary-600 mb-1">
                {dashboardData?.recent_quiz_results?.filter((result: any) => {
                  const resultDate = new Date(result.completed_at);
                  const weekAgo = new Date();
                  weekAgo.setDate(weekAgo.getDate() - 7);
                  return resultDate >= weekAgo;
                }).length || 0}
              </div>
              <p className="text-sm text-neutral-600">Quiz submissions</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};