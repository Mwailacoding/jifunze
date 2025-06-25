import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  BookOpen, 
  Award, 
  Target, 
  TrendingUp,
  Clock,
  CheckCircle2,
  Star,
  Calendar,
  Play
} from 'lucide-react';
import { Layout } from '../../components/layout/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { apiClient } from '../../utils/api';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { AchievementPopup } from '../../components/ui/AchievementPopup';
import { ProgressSummary, Module, Assignment } from '../../types';

export const LearnerDashboard: React.FC = () => {
  const { user } = useAuth();
  const { showError } = useNotification();
  const [progressSummary, setProgressSummary] = useState<ProgressSummary | null>(null);
  const [recentModules, setRecentModules] = useState<Module[]>([]);
  const [upcomingAssignments, setUpcomingAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [achievement, setAchievement] = useState<any>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);

        // Fetch progress summary
        const progressData = await apiClient.getProgressSummary();
        setProgressSummary(progressData);

        // Fetch recent modules
        const modulesData = await apiClient.getRecentModules();
        setRecentModules(modulesData);

        // Fetch assignments
        const assignmentsData = await apiClient.getAssignments();
        setUpcomingAssignments(assignmentsData.slice(0, 3));

      } catch (error) {
        showError('Error', 'Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [showError]);

  const handleAchievementClose = () => {
    setAchievement(null);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const quickActions = [
    {
      title: 'Browse Modules',
      description: 'Explore available training content',
      icon: BookOpen,
      href: '/modules',
      color: 'from-primary-500 to-primary-600'
    },
    {
      title: 'View Assignments',
      description: 'Check your assigned tasks',
      icon: Target,
      href: '/assignments',
      color: 'from-secondary-500 to-secondary-600'
    },
    {
      title: 'Achievements',
      description: 'See your progress',
      icon: Award,
      href: '/achievements',
      color: 'from-accent-500 to-accent-600'
    },
    {
      title: 'Certificates',
      description: 'Download your achievements',
      icon: Star,
      href: '/certificates',
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
              {getGreeting()}, {user?.first_name}! 👋
            </h1>
            <p className="text-neutral-600 mt-1">
              Ready to continue your learning journey?
            </p>
          </div>
          <div className="hidden md:flex items-center space-x-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-600">
                {progressSummary?.total_points || 0}
              </div>
              <div className="text-sm text-neutral-600">Total Points</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-accent-600">
                {progressSummary?.badges_count || 0}
              </div>
              <div className="text-sm text-neutral-600">Badges Earned</div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900">Learning Progress</h3>
                <p className="text-sm text-neutral-600">Modules completed</p>
              </div>
            </div>
            <div className="text-2xl font-bold text-primary-600">
              {progressSummary?.completion_percentage || 0}%
            </div>
          </div>
          <ProgressBar 
            value={progressSummary?.completion_percentage || 0} 
            className="mb-2"
            animated 
          />
          <p className="text-sm text-neutral-600">
            {progressSummary?.completed_modules || 0} of {progressSummary?.total_modules || 0} modules
          </p>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-accent-100 rounded-lg flex items-center justify-center">
                <Star className="w-5 h-5 text-accent-600" />
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900">Points Earned</h3>
                <p className="text-sm text-neutral-600">Total achievement points</p>
              </div>
            </div>
            <div className="text-2xl font-bold text-accent-600">
              {progressSummary?.total_points || 0}
            </div>
          </div>
          <div className="text-sm text-neutral-600">
            Keep learning to earn more points!
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-secondary-100 rounded-lg flex items-center justify-center">
                <Award className="w-5 h-5 text-secondary-600" />
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900">Badges</h3>
                <p className="text-sm text-neutral-600">Achievement badges</p>
              </div>
            </div>
            <div className="text-2xl font-bold text-secondary-600">
              {progressSummary?.badges_count || 0}
            </div>
          </div>
          <div className="text-sm text-neutral-600">
            Unlock more by completing modules
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
        {/* Recent Activity & Continue Learning */}
        <div className="lg:col-span-2 space-y-6">
          {/* Continue Learning */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-neutral-900">Continue Learning</h2>
              <Link to="/modules" className="text-primary-600 hover:text-primary-700 font-medium">
                View All
              </Link>
            </div>
            
            {recentModules.length > 0 ? (
              <div className="space-y-4">
                {recentModules.map((module) => (
                  <div key={module.id} className="flex items-center space-x-4 p-4 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition-colors">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center">
                      <BookOpen className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-neutral-900">{module.title}</h3>
                      <p className="text-sm text-neutral-600 mb-2">{module.category}</p>
                      <ProgressBar 
                        value={module.completion_percentage || 0} 
                        size="sm" 
                        className="w-full"
                      />
                    </div>
                    <Link
                      to={`/modules/${module.id}`}
                      className="btn-primary flex items-center space-x-2"
                    >
                      <Play className="w-4 h-4" />
                      <span>Continue</span>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <BookOpen className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
                <p className="text-neutral-600">No modules started yet</p>
                <Link to="/modules" className="btn-primary mt-4">
                  Explore Modules
                </Link>
              </div>
            )}
          </div>

          {/* Recent Activity */}
          {progressSummary?.recent_activity && progressSummary.recent_activity.length > 0 && (
            <div className="card p-6">
              <h2 className="text-xl font-semibold text-neutral-900 mb-4">Recent Activity</h2>
              <div className="space-y-3">
                {progressSummary.recent_activity.map((activity, index) => (
                  <div key={index} className="flex items-center space-x-3 py-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      activity.status === 'completed' ? 'bg-primary-100' : 'bg-neutral-100'
                    }`}>
                      {activity.status === 'completed' ? (
                        <CheckCircle2 className="w-4 h-4 text-primary-600" />
                      ) : (
                        <Clock className="w-4 h-4 text-neutral-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-neutral-900">
                        {activity.content_title}
                      </p>
                      <p className="text-xs text-neutral-600">
                        in {activity.module_title}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      activity.status === 'completed' 
                        ? 'bg-primary-100 text-primary-700' 
                        : 'bg-neutral-100 text-neutral-700'
                    }`}>
                      {activity.status === 'completed' ? 'Completed' : 'In Progress'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Upcoming Assignments */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-neutral-900">Upcoming Assignments</h3>
              <Link to="/assignments" className="text-primary-600 hover:text-primary-700 text-sm">
                View All
              </Link>
            </div>
            
            {upcomingAssignments.length > 0 ? (
              <div className="space-y-3">
                {upcomingAssignments.map((assignment) => (
                  <div key={assignment.id} className="p-3 bg-neutral-50 rounded-lg">
                    <h4 className="font-medium text-neutral-900 text-sm mb-1">
                      {assignment.module_title}
                    </h4>
                    {assignment.due_date && (
                      <div className="flex items-center space-x-1 text-xs text-neutral-600">
                        <Calendar className="w-3 h-3" />
                        <span>Due: {new Date(assignment.due_date).toLocaleDateString()}</span>
                      </div>
                    )}
                    <div className="mt-2">
                      <ProgressBar 
                        value={assignment.completion_percentage || 0} 
                        size="sm"
                        className="w-full"
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-neutral-600">No upcoming assignments</p>
            )}
          </div>

          {/* Achievement Showcase */}
          <div className="card p-6">
            <h3 className="font-semibold text-neutral-900 mb-4">Recent Achievements</h3>
            <div className="grid grid-cols-3 gap-3">
              <Badge level="bronze" size="sm" earned name="First Steps" />
              <Badge level="silver" size="sm" earned={false} name="Quick Learner" />
              <Badge level="gold" size="sm" earned={false} name="Expert" />
            </div>
            <Link 
              to="/achievements" 
              className="block text-center text-primary-600 hover:text-primary-700 text-sm mt-4 font-medium"
            >
              View All Achievements
            </Link>
          </div>

          {/* Learning Streak */}
          <div className="card p-6 bg-gradient-to-br from-accent-50 to-accent-100">
            <div className="text-center">
              <div className="w-16 h-16 bg-accent-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-semibold text-neutral-900 mb-1">Learning Streak</h3>
              <div className="text-2xl font-bold text-accent-600 mb-1">
                {progressSummary?.current_streak || 0} Days
              </div>
              <p className="text-sm text-neutral-600">Keep it up! 🔥</p>
            </div>
          </div>
        </div>
      </div>

      {/* Achievement Popup */}
      {achievement && (
        <AchievementPopup
          achievement={achievement}
          isVisible={!!achievement}
          onClose={handleAchievementClose}
        />
      )}
    </Layout>
  );
};
