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
  Users,
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
<<<<<<< HEAD
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [sortBy, setSortBy] = useState<SortBy>('points');
  const [showFilters, setShowFilters] = useState(false);

  const fetchLeaderboard = async () => {
    try {
      setIsLoading(true);
      
      // Check if user has an employer_id
      if (!user?.employer_id) {
        showError('Error', 'You need to be associated with an employer to view the leaderboard');
        setLeaderboard([]);
        return;
      }

      const params = {
        timeRange,
        employerId: String(user.employer_id) // Convert to string
      };

      const queryParams = new URLSearchParams(params).toString();
      const response = await apiClient.get<LeaderboardEntry[]>(`/api/leaderboard?${queryParams}`);
           
      if (!response) {
        throw new Error('Empty response from server');
      }

      // Sort the data based on selected criteria
      const sortedData = [...response].sort((a, b) => {
        switch (sortBy) {
          case 'modules':
            return b.modules_completed - a.modules_completed;
          case 'quizzes':
            return b.quizzes_passed - a.quizzes_passed;
          case 'badges':
            return b.badges_count - a.badges_count;
          case 'points':
          default:
            return b.total_points - a.total_points;
        }
      });

      // Update ranks based on current sort
      const rankedData = sortedData.map((entry, index) => ({
        ...entry,
        rank: index + 1
      }));

      setLeaderboard(rankedData);
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);

      if (typeof error === 'object' && error !== null && 'response' in error) {
        const err = error as { response?: { status: number } };
        if (err.response?.status === 400) {
          showError('Error', 'You need to be associated with an employer to view the leaderboard');
        } else if (err.response?.status === 404) {
          showError('Error', 'Leaderboard endpoint not found');
        } else {
          showError('Error', 'Failed to load leaderboard data');
        }
      } else if (typeof error === 'object' && error !== null && 'request' in error) {
        showError('Network Error', 'Could not connect to the server');
      } else {
        showError('Error', 'Failed to make request');
      }

      setLeaderboard([]);
    } finally {
      setIsLoading(false);
    }
  };
=======
  const [achievement, setAchievement] = useState<any>(null);
>>>>>>> 7c0ba4748d034f97036f37d35ed6934215ae8379

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);

        // Fetch progress summary
        const progressData = await apiClient.getProgressSummary();
        setProgressSummary(progressData);

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
      title: 'Leaderboard',
      description: 'See how you rank',
      icon: Award,
      href: '/leaderboard',
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

<<<<<<< HEAD
      {/* Your Position Card */}
      {currentUserEntry && currentUserEntry.rank > 3 && (
        <div className="card p-6 mb-8 bg-gradient-to-r from-primary-50 to-secondary-50 border-primary-200">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center space-x-2">
            <Trophy className="w-5 h-5 text-primary-600" />
            <span>Your Position</span>
          </h3>
          
          <div className="flex items-center space-x-4">
            <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${getRankBadgeColor(currentUserEntry.rank)} flex items-center justify-center`}>
              <span className="text-white font-bold text-lg">#{currentUserEntry.rank}</span>
            </div>
            
            <div className={`w-16 h-16 bg-gradient-to-br ${getAvatarGradient(currentUserEntry.rank)} rounded-full flex items-center justify-center`}>
              <span className="text-white text-lg font-medium">
                {user?.first_name[0]}{user?.last_name[0]}
              </span>
            </div>
            
            <div className="flex-1">
              <h4 className="text-xl font-semibold text-neutral-900">
                {currentUserEntry.first_name} {currentUserEntry.last_name}
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 text-sm">
                <div className="text-center">
                  <div className="font-bold text-primary-600">{currentUserEntry.total_points}</div>
                  <div className="text-neutral-600">Points</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-green-600">{currentUserEntry.modules_completed}</div>
                  <div className="text-neutral-600">Modules</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-blue-600">{currentUserEntry.quizzes_passed}</div>
                  <div className="text-neutral-600">Quizzes</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-amber-600">{currentUserEntry.badges_count}</div>
                  <div className="text-neutral-600">Badges</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top 3 Podium */}
      {topThree.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-neutral-900 mb-6 flex items-center space-x-2">
            <Crown className="w-5 h-5 text-yellow-500" />
            <span>Top Performers</span>
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            {/* Second Place */}
            {topThree[1] && (
              <div className="card p-6 text-center order-1 md:order-1 relative">
                <div className="absolute top-2 right-2">
                  <div className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs font-medium">
                    2nd
                  </div>
                </div>
                <div className="relative mb-4">
                  <div className={`w-20 h-20 bg-gradient-to-br ${getAvatarGradient(2)} rounded-full flex items-center justify-center mx-auto mb-2`}>
                    <span className="text-white text-lg font-bold">
                      {topThree[1].first_name[0]}{topThree[1].last_name[0]}
                    </span>
                  </div>
                  <div className="absolute -top-2 -right-2">
                    <Medal className="w-8 h-8 text-gray-400" />
                  </div>
                </div>
                
                <h3 className="font-semibold text-neutral-900 mb-1">
                  {topThree[1].first_name} {topThree[1].last_name}
                </h3>
                
                <div className="text-2xl font-bold text-gray-600 mb-2">
                  {topThree[1].total_points}
                </div>
                <div className="text-sm text-neutral-600 mb-3">points</div>
                
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="text-center">
                    <div className="font-bold">{topThree[1].modules_completed}</div>
                    <div className="text-neutral-600">Modules</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold">{topThree[1].quizzes_passed}</div>
                    <div className="text-neutral-600">Quizzes</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold">{topThree[1].badges_count}</div>
                    <div className="text-neutral-600">Badges</div>
                  </div>
                </div>
                
                <div className="flex justify-center mt-3">
                  <Badge level="silver" size="sm" earned />
                </div>
              </div>
            )}

            {/* First Place */}
            {topThree[0] && (
              <div className="card p-6 text-center order-2 md:order-2 transform md:scale-110 md:-mt-4 relative">
                <div className="absolute top-2 right-2">
                  <div className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-xs font-medium">
                    1st
                  </div>
                </div>
                <div className="relative mb-4">
                  <div className={`w-24 h-24 bg-gradient-to-br ${getAvatarGradient(1)} rounded-full flex items-center justify-center mx-auto mb-2`}>
                    <span className="text-white text-xl font-bold">
                      {topThree[0].first_name[0]}{topThree[0].last_name[0]}
                    </span>
                  </div>
                  <div className="absolute -top-2 -right-2">
                    <Crown className="w-10 h-10 text-yellow-500" />
                  </div>
                </div>
                
                <h3 className="font-semibold text-neutral-900 mb-1">
                  {topThree[0].first_name} {topThree[0].last_name}
                </h3>
                
                <div className="text-3xl font-bold text-yellow-600 mb-2">
                  {topThree[0].total_points}
                </div>
                <div className="text-sm text-neutral-600 mb-3">points</div>
                
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="text-center">
                    <div className="font-bold">{topThree[0].modules_completed}</div>
                    <div className="text-neutral-600">Modules</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold">{topThree[0].quizzes_passed}</div>
                    <div className="text-neutral-600">Quizzes</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold">{topThree[0].badges_count}</div>
                    <div className="text-neutral-600">Badges</div>
                  </div>
                </div>
                
                <div className="flex justify-center mt-3">
                  <Badge level="gold" size="sm" earned />
                </div>
              </div>
            )}

            {/* Third Place */}
            {topThree[2] && (
              <div className="card p-6 text-center order-3 md:order-3 relative">
                <div className="absolute top-2 right-2">
                  <div className="bg-amber-100 text-amber-700 px-2 py-1 rounded-full text-xs font-medium">
                    3rd
                  </div>
                </div>
                <div className="relative mb-4">
                  <div className={`w-20 h-20 bg-gradient-to-br ${getAvatarGradient(3)} rounded-full flex items-center justify-center mx-auto mb-2`}>
                    <span className="text-white text-lg font-bold">
                      {topThree[2].first_name[0]}{topThree[2].last_name[0]}
                    </span>
                  </div>
                  <div className="absolute -top-2 -right-2">
                    <Award className="w-8 h-8 text-amber-600" />
                  </div>
                </div>
                
                <h3 className="font-semibold text-neutral-900 mb-1">
                  {topThree[2].first_name} {topThree[2].last_name}
                </h3>
                
                <div className="text-2xl font-bold text-amber-600 mb-2">
                  {topThree[2].total_points}
                </div>
                <div className="text-sm text-neutral-600 mb-3">points</div>
                
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="text-center">
                    <div className="font-bold">{topThree[2].modules_completed}</div>
                    <div className="text-neutral-600">Modules</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold">{topThree[2].quizzes_passed}</div>
                    <div className="text-neutral-600">Quizzes</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold">{topThree[2].badges_count}</div>
                    <div className="text-neutral-600">Badges</div>
                  </div>
                </div>
                
                <div className="flex justify-center mt-3">
                  <Badge level="bronze" size="sm" earned />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Full Leaderboard */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold text-neutral-900 mb-6 flex items-center space-x-2">
          <Trophy className="w-5 h-5 text-primary-600" />
          <span>Full Rankings</span>
          <span className="text-sm font-normal text-neutral-600">
            (Sorted by {sortBy === 'points' ? 'Total Points' : 
                        sortBy === 'modules' ? 'Modules Completed' :
                        sortBy === 'quizzes' ? 'Quizzes Passed' : 'Badges Earned'})
          </span>
        </h2>
        
        <div className="space-y-3">
          {/* Only show users after the top 3 */}
          {restOfLeaderboard.map((entry) => (
            <div
              key={entry.id}
              className={`flex items-center space-x-4 p-4 rounded-lg transition-all ${
                entry.id === user?.id 
                  ? 'bg-primary-50 border border-primary-200 ring-2 ring-primary-100' 
                  : 'bg-neutral-50 hover:bg-neutral-100'
              }`}
=======
      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-neutral-900 mb-4">Quick Actions</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <Link
              key={index}
              to={action.href}
              className="card p-4 hover:shadow-xl transition-all duration-300 transform hover:scale-105 group"
>>>>>>> 7c0ba4748d034f97036f37d35ed6934215ae8379
            >
              <div className={`w-12 h-12 bg-gradient-to-br ${action.color} rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                <action.icon className="w-6 h-6 text-white" />
              </div>
<<<<<<< HEAD

              {/* Avatar */}
              <div className={`w-12 h-12 bg-gradient-to-br ${getAvatarGradient(entry.rank)} rounded-full flex items-center justify-center`}>
                <span className="text-white text-sm font-medium">
                  {entry.first_name[0]}{entry.last_name[0]}
                </span>
              </div>

              {/* User Info */}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-neutral-900 flex items-center space-x-2">
                  <span>{entry.first_name} {entry.last_name}</span>
                  {entry.id === user?.id && (
                    <Badge level="primary" size="sm">You</Badge>
                  )}
                </h4>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 text-sm text-neutral-600">
                  <div className="flex items-center space-x-1">
                    <Star className="w-3 h-3" />
                    <span>{entry.total_points} points</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <BookOpen className="w-3 h-3" />
                    <span>{entry.modules_completed} modules</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Target className="w-3 h-3" />
                    <span>{entry.quizzes_passed}/{entry.quizzes_taken} quizzes</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Award className="w-3 h-3" />
                    <span>{entry.badges_count} badges</span>
                  </div>
                </div>
                
                {/* Quiz Performance Bar */}
                {entry.quizzes_taken > 0 && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs text-neutral-500 mb-1">
                      <span>Quiz Success Rate</span>
                      <span>{Math.round((entry.quizzes_passed / entry.quizzes_taken) * 100)}%</span>
                    </div>
                    <ProgressBar 
                      value={(entry.quizzes_passed / entry.quizzes_taken) * 100} 
                      size="sm"
                      color="secondary"
                    />
                  </div>
                )}
              </div>

              {/* Points Display */}
              <div className="text-right">
                <div className={`text-lg font-bold ${
                  sortBy === 'points' ? 'text-primary-600' :
                  sortBy === 'modules' ? 'text-green-600' :
                  sortBy === 'quizzes' ? 'text-blue-600' : 'text-amber-600'
                }`}>
                  {sortBy === 'points' ? entry.total_points :
                   sortBy === 'modules' ? entry.modules_completed :
                   sortBy === 'quizzes' ? entry.quizzes_passed : entry.badges_count}
                </div>
                <div className="text-sm text-neutral-600">
                  {sortBy === 'points' ? 'points' :
                   sortBy === 'modules' ? 'modules' :
                   sortBy === 'quizzes' ? 'quizzes' : 'badges'}
                </div>
              </div>
            </div>
          ))}
        </div>

        {restOfLeaderboard.length === 0 && (
          <div className="text-center py-12">
            <Trophy className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-neutral-900 mb-2">No Leaderboard Data</h3>
            <p className="text-neutral-600">Start learning and taking quizzes to appear on the leaderboard!</p>
          </div>
        )}
=======
              <h3 className="font-semibold text-neutral-900 mb-1">{action.title}</h3>
              <p className="text-sm text-neutral-600">{action.description}</p>
            </Link>
          ))}
        </div>
>>>>>>> 7c0ba4748d034f97036f37d35ed6934215ae8379
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
              {/* Show some sample badges - you can replace with actual earned badges */}
              <Badge level="bronze" size="sm" earned name="First Steps" />
              <Badge level="silver" size="sm" earned={false} name="Quick Learner" />
              <Badge level="gold" size="sm" earned={false} name="Expert" />
            </div>
            <Link 
              to="/certificates" 
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
              <div className="text-2xl font-bold text-accent-600 mb-1">7 Days</div>
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


