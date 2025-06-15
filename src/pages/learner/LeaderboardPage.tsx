import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Medal, 
  Award, 
  Crown,
  TrendingUp,
  Users,
  Star
} from 'lucide-react';
import { Layout } from '../../components/layout/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { apiClient } from '../../utils/api';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Badge } from '../../components/ui/Badge';
import { LeaderboardEntry } from '../../types';

export const LeaderboardPage: React.FC = () => {
  const { user } = useAuth();
  const { showError } = useNotification();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('all');

 // In your LeaderboardPage component
useEffect(() => {
  const fetchLeaderboard = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.get<LeaderboardEntry[]>('/leaderboard');
      setLeaderboard(data);
    } catch (error) {
      showError('Error', 'Failed to load leaderboard');
    } finally {
      setIsLoading(false);
    }
  };

  fetchLeaderboard();
}, [showError, timeRange]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-6 h-6 text-accent-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-neutral-400" />;
      case 3:
        return <Award className="w-6 h-6 text-amber-600" />;
      default:
        return <span className="text-lg font-bold text-neutral-600">#{rank}</span>;
    }
  };

  const getRankBadgeColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'from-accent-400 to-accent-600';
      case 2:
        return 'from-neutral-300 to-neutral-500';
      case 3:
        return 'from-amber-400 to-amber-600';
      default:
        return 'from-neutral-200 to-neutral-300';
    }
  };

  const currentUserEntry = leaderboard.find(entry => entry.id === user?.id);
  const topThree = leaderboard.slice(0, 3);
  const restOfLeaderboard = leaderboard.slice(3);

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
        <h1 className="text-3xl font-bold text-neutral-900 mb-2">Leaderboard</h1>
        <p className="text-neutral-600">
          See how you rank among your peers in learning achievements.
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="card p-6 text-center">
          <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <Users className="w-6 h-6 text-primary-600" />
          </div>
          <div className="text-2xl font-bold text-neutral-900 mb-1">
            {leaderboard.length}
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
      </div>

      {/* Your Position Card */}
      {currentUserEntry && currentUserEntry.rank > 3 && (
        <div className="card p-6 mb-8 bg-gradient-to-r from-primary-50 to-secondary-50 border-primary-200">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">Your Position</h3>
          <div className="flex items-center space-x-4">
            <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${getRankBadgeColor(currentUserEntry.rank)} flex items-center justify-center`}>
              <span className="text-white font-bold">#{currentUserEntry.rank}</span>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {user?.first_name[0]}{user?.last_name[0]}
              </span>
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-neutral-900">
                {currentUserEntry.first_name} {currentUserEntry.last_name}
              </h4>
              <div className="flex items-center space-x-4 text-sm text-neutral-600">
                <span>{currentUserEntry.total_points} points</span>
                <span>{currentUserEntry.badges_count} badges</span>
                <span>{currentUserEntry.modules_completed} modules</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top 3 Podium */}
      {topThree.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-neutral-900 mb-6">Top Performers</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {/* Second Place */}
            {topThree[1] && (
              <div className="card p-6 text-center order-1 md:order-1">
                <div className="relative mb-4">
                  <div className="w-20 h-20 bg-gradient-to-br from-neutral-300 to-neutral-500 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-white text-lg font-bold">
                      {topThree[1].first_name[0]}{topThree[1].last_name[0]}
                    </span>
                  </div>
                  <div className="absolute -top-2 -right-2">
                    <Medal className="w-8 h-8 text-neutral-400" />
                  </div>
                </div>
                <h3 className="font-semibold text-neutral-900 mb-1">
                  {topThree[1].first_name} {topThree[1].last_name}
                </h3>
                <div className="text-2xl font-bold text-neutral-600 mb-2">
                  {topThree[1].total_points}
                </div>
                <div className="text-sm text-neutral-600">points</div>
                <div className="flex justify-center space-x-2 mt-3">
                  <Badge level="silver" size="sm" earned />
                </div>
              </div>
            )}

            {/* First Place */}
            {topThree[0] && (
              <div className="card p-6 text-center order-2 md:order-2 transform md:scale-110 md:-mt-4">
                <div className="relative mb-4">
                  <div className="w-24 h-24 bg-gradient-to-br from-accent-400 to-accent-600 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-white text-xl font-bold">
                      {topThree[0].first_name[0]}{topThree[0].last_name[0]}
                    </span>
                  </div>
                  <div className="absolute -top-2 -right-2">
                    <Crown className="w-10 h-10 text-accent-500" />
                  </div>
                </div>
                <h3 className="font-semibold text-neutral-900 mb-1">
                  {topThree[0].first_name} {topThree[0].last_name}
                </h3>
                <div className="text-3xl font-bold text-accent-600 mb-2">
                  {topThree[0].total_points}
                </div>
                <div className="text-sm text-neutral-600">points</div>
                <div className="flex justify-center space-x-2 mt-3">
                  <Badge level="gold" size="sm" earned />
                </div>
              </div>
            )}

            {/* Third Place */}
            {topThree[2] && (
              <div className="card p-6 text-center order-3 md:order-3">
                <div className="relative mb-4">
                  <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center mx-auto mb-2">
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
                <div className="text-sm text-neutral-600">points</div>
                <div className="flex justify-center space-x-2 mt-3">
                  <Badge level="bronze" size="sm" earned />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Full Leaderboard */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold text-neutral-900 mb-6">Full Rankings</h2>
        
        <div className="space-y-3">
          {leaderboard.map((entry, index) => (
            <div
              key={entry.id}
              className={`flex items-center space-x-4 p-4 rounded-lg transition-all ${
                entry.id === user?.id 
                  ? 'bg-primary-50 border border-primary-200' 
                  : 'bg-neutral-50 hover:bg-neutral-100'
              }`}
            >
              {/* Rank */}
              <div className="w-12 flex justify-center">
                {getRankIcon(entry.rank)}
              </div>

              {/* Avatar */}
              <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {entry.first_name[0]}{entry.last_name[0]}
                </span>
              </div>

              {/* User Info */}
              <div className="flex-1">
                <h4 className="font-medium text-neutral-900">
                  {entry.first_name} {entry.last_name}
                  {entry.id === user?.id && (
                    <span className="ml-2 text-sm text-primary-600 font-medium">(You)</span>
                  )}
                </h4>
                <div className="flex items-center space-x-4 text-sm text-neutral-600">
                  <span>{entry.modules_completed} modules completed</span>
                  <span>{entry.badges_count} badges earned</span>
                </div>
              </div>

              {/* Points */}
              <div className="text-right">
                <div className="text-lg font-bold text-neutral-900">
                  {entry.total_points}
                </div>
                <div className="text-sm text-neutral-600">points</div>
              </div>
            </div>
          ))}
        </div>

        {leaderboard.length === 0 && (
          <div className="text-center py-8">
            <Trophy className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
            <p className="text-neutral-600">No leaderboard data available</p>
          </div>
        )}
      </div>
    </Layout>
  );
};