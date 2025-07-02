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
  ChevronDown,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { apiClient } from '../../utils/api';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Badge } from '../../components/ui/Badge';
import { ProgressBar } from '../../components/ui/ProgressBar';

type TimeRange = 'all' | 'week' | 'month';
type SortBy = 'points' | 'modules' | 'quizzes' | 'badges';

type LeaderboardEntry = {
  id: number;
  first_name: string;
  last_name: string;
  profile_picture?: string;
  total_points: number;
  modules_completed: number;
  quizzes_taken: number;
  quizzes_passed: number;
  badges_count: number;
  avg_quiz_score: number;
  rank: number;
};

export const LeaderboardPage: React.FC = () => {
  const { user } = useAuth();
  const { showError } = useNotification();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userStats, setUserStats] = useState<LeaderboardEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [sortBy, setSortBy] = useState<SortBy>('points');
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams({
        time_range: timeRange,
        limit: '20'
      });

      const response = await apiClient.get<{
        leaderboard: LeaderboardEntry[];
        user_stats: LeaderboardEntry  | null;
      }>(`/leaderboard?${params.toString()}`);

      if (!response) {
        throw new Error('No response from server');
      }

      // Add this to your LeaderboardPage component
if (leaderboard.length === 0 && !isLoading) {
  return (
    <div className="card p-6 text-center">
      <Trophy className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
      <h3 className="text-lg font-medium mb-2">Leaderboard is empty</h3>
      <p className="text-neutral-600">Complete training activities to appear on the leaderboard</p>
      {user?.role === 'admin' && (
        <button 
          onClick={updateLeaderboard}
          className="btn-primary mt-4"
        >
          Initialize Leaderboard
        </button>
      )}
    </div>
  );
}

      // Process and validate data
      const processedLeaderboard = response.leaderboard?.map(entry => ({
        ...entry,
        total_points: entry.total_points || 0,
        modules_completed: entry.modules_completed || 0,
        quizzes_taken: entry.quizzes_taken || 0,
        quizzes_passed: entry.quizzes_passed || 0,
        badges_count: entry.badges_count || 0,
        rank: entry.rank || 0
      })) || [];

      setLeaderboard(processedLeaderboard);
      setUserStats(response.user_stats || null);
    } catch (err) {
      console.error('Leaderboard fetch error:', err);
      setError('Failed to load leaderboard data');
      showError('Error', 'Could not load leaderboard');
    } finally {
      setIsLoading(false);
    }
  };

  const updateLeaderboard = async () => {
    try {
      await apiClient.post('/leaderboard/update', {});
      fetchLeaderboard();
    } catch (err) {
      showError('Error', 'Failed to update leaderboard');
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [timeRange]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="w-6 h-6 text-yellow-500" />;
      case 2: return <Medal className="w-6 h-6 text-gray-400" />;
      case 3: return <Award className="w-6 h-6 text-amber-600" />;
      default: return <span className="text-lg font-bold text-neutral-600">#{rank}</span>;
    }
  };

  const getRankBadgeColor = (rank: number) => {
    switch (rank) {
      case 1: return 'bg-gradient-to-br from-yellow-400 to-yellow-600';
      case 2: return 'bg-gradient-to-br from-gray-300 to-gray-500';
      case 3: return 'bg-gradient-to-br from-amber-400 to-amber-600';
      default: return 'bg-gradient-to-br from-neutral-200 to-neutral-300';
    }
  };

  const sortedLeaderboard = [...leaderboard].sort((a, b) => {
    switch (sortBy) {
      case 'modules': return b.modules_completed - a.modules_completed;
      case 'quizzes': return b.quizzes_passed - a.quizzes_passed;
      case 'badges': return b.badges_count - a.badges_count;
      case 'points':
      default: return b.total_points - a.total_points;
    }
  });

  const topThree = sortedLeaderboard.slice(0, 3);
  const restOfLeaderboard = sortedLeaderboard.slice(3);
  const currentUserEntry = userStats || sortedLeaderboard.find(e => e.id === user?.id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-neutral-900 mb-2">{error}</h3>
        <button 
          onClick={fetchLeaderboard}
          className="btn-primary mt-4"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Time Range Selector */}
      <div className="flex gap-2">
        {['all', 'week', 'month'].map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range as TimeRange)}
            className={`px-4 py-2 rounded-full text-sm ${
              timeRange === range 
                ? 'bg-primary-600 text-white' 
                : 'bg-neutral-100 text-neutral-700'
            }`}
          >
            {range.charAt(0).toUpperCase() + range.slice(1)}
          </button>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard 
          icon={<Users />}
          value={leaderboard.length}
          label="Active Learners"
          color="primary"
        />
        <StatCard 
          icon={<TrendingUp />}
          value={currentUserEntry?.rank || '-'}
          label="Your Rank"
          color="accent"
        />
        <StatCard 
          icon={<Star />}
          value={currentUserEntry?.total_points || 0}
          label="Your Points"
          color="secondary"
        />
        <StatCard 
          icon={<Zap />}
          value={Math.round(
            leaderboard.reduce((sum, e) => sum + e.total_points, 0) / 
            Math.max(1, leaderboard.length)
          )}
          label="Avg Points"
          color="green"
        />
      </div>

      {/* Top Performers */}
      {topThree.length > 0 && (
        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Crown className="text-yellow-500" />
            Top Performers
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {topThree.map((entry, index) => (
              <LeaderboardCard 
                key={entry.id}
                entry={entry}
                position={index + 1}
                isCurrentUser={entry.id === user?.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Full Rankings */}
      <div className="card p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Trophy className="text-primary-600" />
            Full Rankings
          </h2>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="p-2 border rounded-md text-sm"
          >
            <option value="points">By Points</option>
            <option value="modules">By Modules</option>
            <option value="quizzes">By Quizzes</option>
            <option value="badges">By Badges</option>
          </select>
        </div>

        {restOfLeaderboard.map(entry => (
          <LeaderboardRow 
            key={entry.id}
            entry={entry}
            isCurrentUser={entry.id === user?.id}
            sortBy={sortBy}
          />
        ))}

        {leaderboard.length === 0 && (
          <div className="text-center py-12">
            <Trophy className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Leaderboard Data</h3>
            <p className="text-neutral-600">Complete training to appear on the leaderboard</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper Components

const StatCard = ({ icon, value, label, color }: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  color: string;
}) => (
  <div className={`card p-4 bg-${color}-50 border-${color}-200`}>
    <div className="flex items-center gap-4">
      <div className={`p-3 rounded-lg bg-${color}-100 text-${color}-600`}>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-sm text-neutral-600">{label}</div>
      </div>
    </div>
  </div>
);

const LeaderboardCard = ({ entry, position, isCurrentUser }: {
  entry: LeaderboardEntry;
  position: number;
  isCurrentUser: boolean;
}) => (
  <div className={`card p-6 text-center relative ${
    isCurrentUser ? 'ring-2 ring-primary-500' : ''
  }`}>
    <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium ${
      position === 1 ? 'bg-yellow-100 text-yellow-700' :
      position === 2 ? 'bg-gray-100 text-gray-600' :
      'bg-amber-100 text-amber-700'
    }`}>
      {position === 1 ? '1st' : position === 2 ? '2nd' : '3rd'}
    </div>

    <div className="relative mb-4">
      <div className={`w-20 h-20 mx-auto rounded-full ${
        position === 1 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' :
        position === 2 ? 'bg-gradient-to-br from-gray-300 to-gray-500' :
        'bg-gradient-to-br from-amber-400 to-amber-600'
      } flex items-center justify-center text-white text-xl font-bold`}>
        {entry.first_name[0]}{entry.last_name[0]}
      </div>
    </div>

    <h3 className="font-semibold mb-1">
      {entry.first_name} {entry.last_name}
    </h3>
    
    <div className={`text-3xl font-bold mb-2 ${
      position === 1 ? 'text-yellow-600' :
      position === 2 ? 'text-gray-600' :
      'text-amber-600'
    }`}>
      {entry.total_points}
    </div>
    <div className="text-sm text-neutral-600 mb-3">points</div>
    
    <div className="grid grid-cols-3 gap-2 text-xs">
      <div className="text-center">
        <div className="font-bold">{entry.modules_completed}</div>
        <div className="text-neutral-600">Modules</div>
      </div>
      <div className="text-center">
        <div className="font-bold">{entry.quizzes_passed}</div>
        <div className="text-neutral-600">Quizzes</div>
      </div>
      <div className="text-center">
        <div className="font-bold">{entry.badges_count}</div>
        <div className="text-neutral-600">Badges</div>
      </div>
    </div>
  </div>
);

const LeaderboardRow = ({ entry, isCurrentUser, sortBy }: {
  entry: LeaderboardEntry;
  isCurrentUser: boolean;
  sortBy: SortBy;
}) => (
  <div className={`flex items-center p-4 mb-2 rounded-lg ${
    isCurrentUser ? 'bg-primary-50 border border-primary-200' : 'bg-neutral-50'
  }`}>
    <div className="w-10 flex justify-center mr-3">
      {entry.rank <= 3 ? (
        entry.rank === 1 ? <Crown className="w-5 h-5 text-yellow-500" /> :
        entry.rank === 2 ? <Medal className="w-5 h-5 text-gray-400" /> :
        <Award className="w-5 h-5 text-amber-600" />
      ) : (
        <span className="font-medium">#{entry.rank}</span>
      )}
    </div>

    <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center mr-4">
      <span className="text-primary-800 font-medium">
        {entry.first_name[0]}{entry.last_name[0]}
      </span>
    </div>

    <div className="flex-1 min-w-0">
      <h4 className="font-medium flex items-center gap-2">
        {entry.first_name} {entry.last_name}
        {isCurrentUser && (
          <span className="text-xs px-2 py-1 bg-primary-100 text-primary-800 rounded-full">
            You
          </span>
        )}
      </h4>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 text-sm">
        <StatPill icon={<Star size={14} />} value={`${entry.total_points} pts`} />
        <StatPill icon={<BookOpen size={14} />} value={`${entry.modules_completed} mods`} />
        <StatPill 
          icon={<Target size={14} />} 
          value={`${entry.quizzes_passed}/${entry.quizzes_taken}`} 
        />
        <StatPill icon={<Award size={14} />} value={`${entry.badges_count} badges`} />
      </div>
    </div>

    <div className="text-right min-w-[80px]">
      <div className={`text-lg font-bold ${
        sortBy === 'points' ? 'text-primary-600' :
        sortBy === 'modules' ? 'text-green-600' :
        sortBy === 'quizzes' ? 'text-blue-600' : 'text-amber-600'
      }`}>
        {sortBy === 'points' ? entry.total_points :
         sortBy === 'modules' ? entry.modules_completed :
         sortBy === 'quizzes' ? entry.quizzes_passed : entry.badges_count}
      </div>
    </div>
  </div>
);

const StatPill = ({ icon, value }: { icon: React.ReactNode; value: string }) => (
  <div className="flex items-center gap-1 text-neutral-600">
    {icon}
    <span>{value}</span>
  </div>
);