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

// Define the TrainerDashboard type within the component file
interface TrainerDashboard {
  total_modules: number;
  active_modules: number;
  total_learners: number;
  recent_modules: {
    id: number;
    title: string;
    created_at: string;
    learners: number;
    category?: string;
    completion_rate?: number;
  }[];
  assignment_stats: {
    module_title: string;
    assigned_to: number;
    completed_by: number;
  }[];
  recent_quiz_results: {
    first_name: string;
    last_name: string;
    quiz_title: string;
    score: number;
    max_score: number;
    passed: boolean;
    completed_at: string;
  }[];
}

export const TrainerDashboard: React.FC = () => {
  const { user } = useAuth();
  const { showError } = useNotification();
  const [dashboardData, setDashboardData] = useState<TrainerDashboard>({
    total_modules: 0,
    active_modules: 0,
    total_learners: 0,
    recent_modules: [],
    assignment_stats: [],
    recent_quiz_results: []
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const data = await apiClient.getTrainerDashboard();
        const transformedData: TrainerDashboard = {
          ...data,
          recent_quiz_results: data.recent_quiz_results.map(result => ({
            ...result,
            max_score: (result as any).max_score ?? 0, // Type assertion to ensure max_score is handled
            passed: (result as any).passed ?? false // Type assertion to ensure passed is handled
          })),
          recent_modules: data.recent_modules.map(module => ({
            ...module,
            completion_rate: (module as any).completion_rate ?? 0, // Type assertion to ensure completion_rate is handled
            category: (module as any).category ?? 'Unknown Category' // Type assertion to ensure category is handled
          }))
        };
        setDashboardData(transformedData || {
          total_modules: 0,
          active_modules: 0,
          total_learners: 0,
          recent_modules: [],
          assignment_stats: [],
          recent_quiz_results: []
        });
      } catch (error) {
        setDashboardData({
          total_modules: 0,
          active_modules: 0,
          total_learners: 0,
          recent_modules: [],
          assignment_stats: [],
          recent_quiz_results: []
        });
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
      color: 'from-blue-500 to-blue-600'
    },
    {
      title: 'View Learners',
      description: 'Monitor learner progress',
      icon: Users,
      href: '/trainer/learners',
      color: 'from-teal-500 to-teal-600'
    },
    {
      title: 'Create Assignment',
      description: 'Assign modules to learners',
      icon: Target,
      href: '/trainer/assignments',
      color: 'from-orange-500 to-orange-600'
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
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {getGreeting()}, {user?.first_name}! 👨‍🏫
            </h1>
            <p className="text-gray-600 mt-1">
              Here's an overview of your training programs and learner progress.
            </p>
          </div>
          <div className="hidden md:flex items-center space-x-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {dashboardData.recent_modules.length}
              </div>
              <div className="text-sm text-gray-600">Active Modules</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-teal-600">
                {dashboardData.assignment_stats.length}
              </div>
              <div className="text-sm text-gray-600">Assignments</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">My Modules</h3>
              <p className="text-sm text-gray-600">Created content</p>
            </div>
          </div>
          <div className="text-2xl font-bold text-blue-600">
            {dashboardData.recent_modules.length}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Active Learners</h3>
              <p className="text-sm text-gray-600">Enrolled students</p>
            </div>
          </div>
          <div className="text-2xl font-bold text-teal-600">
            {dashboardData.recent_modules.reduce((total, module) => total + (module.learners || 0), 0)}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Avg. Completion</h3>
              <p className="text-sm text-gray-600">Module completion rate</p>
            </div>
          </div>
          <div className="text-2xl font-bold text-orange-600">
            {dashboardData.recent_modules.length 
              ? Math.round(dashboardData.recent_modules.reduce((total, module) => total + (module.completion_rate || 0), 0) / dashboardData.recent_modules.length)
              : 0
            }%
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Award className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Recent Quizzes</h3>
              <p className="text-sm text-gray-600">Quiz submissions</p>
            </div>
          </div>
          <div className="text-2xl font-bold text-purple-600">
            {dashboardData.recent_quiz_results.length}
          </div>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <Link
              key={index}
              to={action.href}
              className="bg-white rounded-lg shadow-sm p-4 border border-gray-200 hover:shadow-xl transition-all duration-300 transform hover:scale-105 group"
            >
              <div className={`w-12 h-12 bg-gradient-to-br ${action.color} rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                <action.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{action.title}</h3>
              <p className="text-sm text-gray-600">{action.description}</p>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">My Recent Modules</h2>
              <Link to="/trainer/modules" className="text-blue-600 hover:text-blue-700 font-medium">
                View All
              </Link>
            </div>

            {dashboardData.recent_modules.length > 0 ? (
              <div className="space-y-4">
                {dashboardData.recent_modules.map((module) => (
                  <div key={module.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-teal-500 rounded-lg flex items-center justify-center">
                      <BookOpen className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 mb-1">{module.title}</h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                        <span>{module.category || 'Unknown Category'}</span>
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
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Edit
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">No modules created yet</p>
                <Link to="/trainer/modules/new" className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  Create Your First Module
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Recent Quiz Results</h3>
              <Link to="/trainer/reports" className="text-blue-600 hover:text-blue-700 text-sm">
                View All
              </Link>
            </div>

            {dashboardData.recent_quiz_results.length > 0 ? (
              <div className="space-y-3">
                {dashboardData.recent_quiz_results.slice(0, 5).map((result, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      result.passed ? 'bg-blue-100' : 'bg-red-100'
                    }`}>
                      {result.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Clock className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {result.first_name} {result.last_name}
                      </p>
                      <p className="text-xs text-gray-600">
                        {result.score}/{result.max_score}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      result.passed 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-red-100 text-red-700'
                    }`}>
                      {result.passed ? 'Passed' : 'Failed'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-600">No recent quiz submissions</p>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4">Assignment Status</h3>
            
            {dashboardData.assignment_stats.length > 0 ? (
              <div className="space-y-3">
                {dashboardData.assignment_stats.slice(0, 3).map((assignment, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 text-sm mb-1">
                      {assignment.module_title}
                    </h4>
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
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
              <p className="text-sm text-gray-600">No active assignments</p>
            )}
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-teal-50 rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <Calendar className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">This Week</h3>
              <div className="text-2xl font-bold text-blue-600 mb-1">
                {dashboardData.recent_quiz_results.filter((result) => {
                  const resultDate = new Date(result.completed_at);
                  const weekAgo = new Date();
                  weekAgo.setDate(weekAgo.getDate() - 7);
                  return resultDate >= weekAgo;
                }).length}
              </div>
              <p className="text-sm text-gray-600">Quiz submissions</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

// Export the TrainerDashboard type
// Removed duplicate definition as it is already defined above.