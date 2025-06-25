import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Medal, 
  Award, 
  Crown,
  TrendingUp,
  Users,
  Star,
  Target,
  BookOpen,
  Zap,
  Filter,
  ChevronDown
} from 'lucide-react';
import { Layout } from '../../components/layout/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { apiClient } from '../../utils/api';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Badge } from '../../components/ui/Badge';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { LeaderboardEntry } from '../../types';

type TimeRange = 'all' | 'week' | 'month' | 'quarter';
type SortBy = 'points' | 'modules' | 'quizzes' | 'badges';

export const LeaderboardPage: React.FC = () => {
  const { user } = useAuth();
  const { showError } = useNotification();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
        timeRange: String(timeRange), // ensure string
        employerId: String(user.employer_id) // ensure string
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
      
      // Enhanced error handling
      if (typeof error === 'object' && error !== null && 'response' in error) {
        // If using Axios or similar, error.response is likely present
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

  useEffect(() => {
    fetchLeaderboard();
  }, [timeRange, sortBy, user]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Award className="w-6 h-6 text-amber-600" />;
      default:
        return <span className="text-lg font-bold text-neutral-600">#{rank}</span>;
    }
  };

  const getRankBadgeColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'from-yellow-400 to-yellow-600';
      case 2:
        return 'from-gray-300 to-gray-500';
      case 3:
        return 'from-amber-400 to-amber-600';
      default:
        return 'from-neutral-200 to-neutral-300';
    }
  };

  const getAvatarGradient = (rank: number) => {
    switch (rank) {
      case 1:
        return 'from-yellow-400 to-yellow-600';
      case 2:
        return 'from-gray-300 to-gray-500';
      case 3:
        return 'from-amber-400 to-amber-600';
      default:
        return 'from-primary-500 to-secondary-500';
    }
  };

  const currentUserEntry = leaderboard.find(entry => entry.id === user?.id);
  const topThree = leaderboard.slice(0, 3);
  const restOfLeaderboard = leaderboard.slice(3);

  // Statistics calculations
  const totalUsers = leaderboard.length;
  const averagePoints = totalUsers > 0 ? Math.round(leaderboard.reduce((sum, entry) => sum + entry.total_points, 0) / totalUsers) : 0;
  const topScorer = leaderboard[0];

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
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 mb-2">Leaderboard</h1>
            <p className="text-neutral-600">
              See how you rank among your peers in learning achievements.
            </p>
          </div>
          
          {/* Filters */}
          <div className="relative">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="btn-outline flex items-center space-x-2"
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
              <ChevronDown className="w-4 h-4" />
            </button>
            
            {showFilters && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-10">
                <div className="p-4 space-y-4">
                  <div>
                    <label className="text-sm font-medium text-neutral-700 mb-2 block">
                      Sort by
                    </label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortBy)}
                      className="w-full p-2 border rounded-md text-sm"
                    >
                      <option value="points">Total Points</option>
                      <option value="modules">Modules Completed</option>
                      <option value="quizzes">Quizzes Passed</option>
                      <option value="badges">Badges Earned</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-neutral-700 mb-2 block">
                      Time Range
                    </label>
                    <select
                      value={timeRange}
                      onChange={(e) => setTimeRange(e.target.value as TimeRange)}
                      className="w-full p-2 border rounded-md text-sm"
                    >
                      <option value="all">All Time</option>
                      <option value="week">This Week</option>
                      <option value="month">This Month</option>
                      <option value="quarter">This Quarter</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="card p-6 text-center">
          <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <Users className="w-6 h-6 text-primary-600" />
          </div>
          <div className="text-2xl font-bold text-neutral-900 mb-1">
            {totalUsers}
          </div>
          <div className="text-sm text-neutral-600">Active Learners</div>
        </div>

        <div className="card p-6 text-center">
          <div className="w-12 h-12 bg-accent-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <TrendingUp className="w-6 h-6 text-accent-600" />
          </div>
          <div className="text-2xl font-bold text-accent-600 mb-1">
            {currentUserEntry?.rank || '-'}
          </div>
          <div className="text-sm text-neutral-600">Your Rank</div>
        </div>

        <div className="card p-6 text-center">
          <div className="w-12 h-12 bg-secondary-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <Star className="w-6 h-6 text-secondary-600" />
          </div>
          <div className="text-2xl font-bold text-secondary-600 mb-1">
            {currentUserEntry?.total_points || 0}
          </div>
          <div className="text-sm text-neutral-600">Your Points</div>
        </div>

        <div className="card p-6 text-center">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <Zap className="w-6 h-6 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-green-600 mb-1">
            {averagePoints}
          </div>
          <div className="text-sm text-neutral-600">Average Points</div>
        </div>
      </div>

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
          {leaderboard.map((entry) => (
            <div
              key={entry.id}
              className={`flex items-center space-x-4 p-4 rounded-lg transition-all ${
                entry.id === user?.id 
                  ? 'bg-primary-50 border border-primary-200 ring-2 ring-primary-100' 
                  : 'bg-neutral-50 hover:bg-neutral-100'
              }`}
            >
              {/* Rank */}
              <div className="w-12 flex justify-center">
                {getRankIcon(entry.rank)}
              </div>

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
                  {entry.rank <= 3 && (
                    <Badge 
                      level={entry.rank === 1 ? 'gold' : entry.rank === 2 ? 'silver' : 'bronze'} 
                      size="sm"
                      earned
                    >
                      Top {entry.rank}
                    </Badge>
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

        {leaderboard.length === 0 && (
          <div className="text-center py-12">
            <Trophy className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-neutral-900 mb-2">No Leaderboard Data</h3>
            <p className="text-neutral-600">Start learning and taking quizzes to appear on the leaderboard!</p>
          </div>
        )}
      </div>

      {/* Achievement Tips */}
      <div className="mt-8 card p-6 bg-gradient-to-r from-primary-50 to-secondary-50 border-primary-200">
        <h3 className="text-lg font-semibold text-primary-900 mb-3 flex items-center space-x-2">
          <Zap className="w-5 h-5" />
          <span>Climb the Leaderboard</span>
        </h3>
        <div className="grid md:grid-cols-2 gap-4 text-primary-800">
          <ul className="space-y-2">
            <li className="flex items-start space-x-2">
              <div className="w-1.5 h-1.5 bg-primary-600 rounded-full mt-2 flex-shrink-0"></div>
              <span>Complete modules to earn points and badges</span>
            </li>
            <li className="flex items-center space-x-2">
              <div className="w-1.5 h-1.5 bg-primary-600 rounded-full flex-shrink-0"></div>
              <span>Pass quizzes to demonstrate your knowledge</span>
            </li>
          </ul>
          <ul className="space-y-2">
            <li className="flex items-center space-x-2">
              <div className="w-1.5 h-1.5 bg-primary-600 rounded-full flex-shrink-0"></div>
              <span>Retake quizzes to improve your scores</span>
            </li>
            <li className="flex items-center space-x-2">
              <div className="w-1.5 h-1.5 bg-primary-600 rounded-full flex-shrink-0"></div>
              <span>Earn badges for special achievements</span>
            </li>
          </ul>
        </div>
      </div>
    </Layout>
  );
};
