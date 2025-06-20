import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  Search, 
  Filter, 
  Eye, 
  Mail, 
  Phone,
  Calendar,
  BookOpen,
  Award,
  TrendingUp,
  User
} from 'lucide-react';
import { Layout } from '../../components/layout/Layout';
import { useNotification } from '../../contexts/NotificationContext';
import { apiClient, User as UserType, LearnerDetails } from '../../utils/api';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ProgressBar } from '../../components/ui/ProgressBar';

// TrainerLearnersPage component
// This page allows trainers to view and manage their learners
// It includes a search bar, learner list, and detailed learner stats
// Learner details modal shows progress, quiz results, and badges

export const TrainerLearnersPage: React.FC = () => {
  const { showError } = useNotification();
  const [learners, setLearners] = useState<UserType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLearner, setSelectedLearner] = useState<LearnerDetails | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  useEffect(() => {
    fetchLearners();
  }, []);

  const fetchLearners = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.getTrainerLearners();
      setLearners(data);
    } catch (error) {
      showError('Error', 'Failed to load learners');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewLearnerDetails = async (learnerId: number) => {
    try {
      setIsLoadingDetails(true);
      setShowDetailsModal(true);
      const details = await apiClient.getLearnerDetails(learnerId);
      setSelectedLearner(details);
    } catch (error) {
      showError('Error', 'Failed to load learner details');
      setShowDetailsModal(false);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const filteredLearners = learners.filter(learner => {
    const searchString = `${learner.first_name} ${learner.last_name} ${learner.email}`.toLowerCase();
    return searchString.includes(searchTerm.toLowerCase());
  });

  const LearnerDetailsModal = () => {
    if (!selectedLearner) return null;

    const { learner, modules_progress, quiz_results, badges } = selectedLearner;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900">
                    {learner.first_name} {learner.last_name}
                  </h2>
                  <p className="text-gray-600">{learner.email}</p>
                  {learner.phone && (
                    <p className="text-gray-600 flex items-center space-x-1">
                      <Phone className="w-4 h-4" />
                      <span>{learner.phone}</span>
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
          </div>

          {isLoadingDetails ? (
            <div className="flex items-center justify-center p-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <div className="p-6">
              {/* Stats Overview */}
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Modules</h3>
                      <p className="text-2xl font-bold text-blue-600">
                        {modules_progress.length}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Quizzes</h3>
                      <p className="text-2xl font-bold text-green-600">
                        {quiz_results.length}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                      <Award className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Badges</h3>
                      <p className="text-2xl font-bold text-purple-600">
                        {badges.length}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-8">
                {/* Module Progress */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Module Progress</h3>
                  <div className="space-y-4">
                    {modules_progress.map((module) => (
                      <div key={module.id} className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-2">{module.title}</h4>
                        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                          <span>Progress</span>
                          <span>
                            {module.completed_content}/{module.total_content} completed
                          </span>
                        </div>
                        <ProgressBar
                          value={module.total_content > 0 ? (module.completed_content / module.total_content) * 100 : 0}
                          size="sm"
                          className="w-full"
                        />
                      </div>
                    ))}
                    {modules_progress.length === 0 && (
                      <p className="text-gray-500 text-center py-4">No modules assigned yet</p>
                    )}
                  </div>
                </div>

                {/* Quiz Results */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Quiz Results</h3>
                  <div className="space-y-3">
                    {quiz_results.slice(0, 5).map((result, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900">Quiz #{result.quiz_id}</h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            result.passed 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {result.passed ? 'Passed' : 'Failed'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm text-gray-600">
                          <span>Score: {result.score}/{result.max_score}</span>
                          <span>{result.percentage}%</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(result.completed_at).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                    {quiz_results.length === 0 && (
                      <p className="text-gray-500 text-center py-4">No quiz results yet</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Badges */}
              {badges.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Earned Badges</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {badges.map((badge) => (
                      <div key={badge.id} className="bg-gray-50 rounded-lg p-4 text-center">
                        <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-2">
                          <Award className="w-6 h-6 text-white" />
                        </div>
                        <h4 className="font-medium text-gray-900 text-sm">{badge.name}</h4>
                        <p className="text-xs text-gray-600 mt-1">{badge.description}</p>
                        {badge.earned_at && (
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(badge.earned_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
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
            <h1 className="text-3xl font-bold text-gray-900">My Learners</h1>
            <p className="text-gray-600 mt-1">
              Monitor progress and performance of your students
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">
              {filteredLearners.length}
            </div>
            <div className="text-sm text-gray-600">Active Learners</div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6 bg-white rounded-lg shadow-sm p-4 border border-gray-200">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search learners..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Learners List */}
      {filteredLearners.length > 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-1 divide-y divide-gray-200">
            {filteredLearners.map((learner) => (
              <div key={learner.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {learner.first_name} {learner.last_name}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                        <div className="flex items-center space-x-1">
                          <Mail className="w-4 h-4" />
                          <span>{learner.email}</span>
                        </div>
                        {learner.phone && (
                          <div className="flex items-center space-x-1">
                            <Phone className="w-4 h-4" />
                            <span>{learner.phone}</span>
                          </div>
                        )}
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>
                            Joined {new Date(learner.created_at || '').toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        learner.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {learner.is_active ? 'Active' : 'Inactive'}
                      </div>
                      {learner.last_login && (
                        <p className="text-xs text-gray-500 mt-1">
                          Last login: {new Date(learner.last_login).toLocaleDateString()}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => handleViewLearnerDetails(learner.id)}
                      className="flex items-center space-x-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      <span>View Details</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm ? 'No learners found' : 'No learners yet'}
          </h3>
          <p className="text-gray-600">
            {searchTerm 
              ? 'Try adjusting your search criteria'
              : 'Learners will appear here once they start engaging with your modules'
            }
          </p>
        </div>
      )}

      {/* Learner Details Modal */}
      {showDetailsModal && <LearnerDetailsModal />}
    </Layout>
  );
};