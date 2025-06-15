import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  Search, 
  Filter, 
  Eye,
  Award,
  BookOpen,
  TrendingUp,
  Calendar,
  Mail,
  Phone
} from 'lucide-react';
import { Layout } from '../../components/layout/Layout';
import { useNotification } from '../../contexts/NotificationContext';
import { apiClient } from '../../utils/api';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Modal } from '../../components/ui/Modal';

export const TrainerLearnersPage: React.FC = () => {
  const { showError } = useNotification();
  const [learners, setLearners] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLearner, setSelectedLearner] = useState<any>(null);
  const [learnerDetails, setLearnerDetails] = useState<any>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  useEffect(() => {
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

    fetchLearners();
  }, [showError]);

  const handleViewDetails = async (learner: any) => {
    try {
      setSelectedLearner(learner);
      const details = await apiClient.getLearnerDetails(learner.id);
      setLearnerDetails(details);
      setIsDetailsModalOpen(true);
    } catch (error) {
      showError('Error', 'Failed to load learner details');
    }
  };

  const filteredLearners = learners.filter(learner =>
    learner.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    learner.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    learner.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        <h1 className="text-3xl font-bold text-neutral-900 mb-2">My Learners</h1>
        <p className="text-neutral-600">
          Monitor and track the progress of learners enrolled in your modules.
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="card p-6 text-center">
          <div className="w-12 h-12 bg-secondary-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <Users className="w-6 h-6 text-secondary-600" />
          </div>
          <div className="text-2xl font-bold text-neutral-900 mb-1">
            {learners.length}
          </div>
          <div className="text-sm text-neutral-600">Total Learners</div>
        </div>

        <div className="card p-6 text-center">
          <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <BookOpen className="w-6 h-6 text-primary-600" />
          </div>
          <div className="text-2xl font-bold text-primary-600 mb-1">
            {learners.reduce((total, learner) => total + (learner.completed_modules || 0), 0)}
          </div>
          <div className="text-sm text-neutral-600">Modules Completed</div>
        </div>

        <div className="card p-6 text-center">
          <div className="w-12 h-12 bg-accent-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <Award className="w-6 h-6 text-accent-600" />
          </div>
          <div className="text-2xl font-bold text-accent-600 mb-1">
            {learners.reduce((total, learner) => total + (learner.total_points || 0), 0)}
          </div>
          <div className="text-sm text-neutral-600">Total Points</div>
        </div>

        <div className="card p-6 text-center">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <TrendingUp className="w-6 h-6 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-purple-600 mb-1">
            {learners.length > 0 
              ? Math.round(learners.reduce((total, learner) => {
                  const completion = learner.assigned_modules > 0 ? (learner.completed_modules / learner.assigned_modules) * 100 : 0;
                  return total + completion;
                }, 0) / learners.length)
              : 0
            }%
          </div>
          <div className="text-sm text-neutral-600">Avg. Completion</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card p-6 mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search learners..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <button className="btn-outline flex items-center space-x-2">
            <Filter className="w-4 h-4" />
            <span>Filter</span>
          </button>
        </div>
      </div>

      {/* Learners List */}
      {filteredLearners.length > 0 ? (
        <div className="card p-6">
          <div className="space-y-4">
            {filteredLearners.map((learner) => (
              <div key={learner.id} className="flex items-center space-x-4 p-4 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition-colors">
                {/* Avatar */}
                <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium">
                    {learner.first_name[0]}{learner.last_name[0]}
                  </span>
                </div>

                {/* Learner Info */}
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-1">
                    <h3 className="font-medium text-neutral-900">
                      {learner.first_name} {learner.last_name}
                    </h3>
                    {learner.employer_name && (
                      <span className="text-xs px-2 py-1 bg-neutral-200 text-neutral-700 rounded-full">
                        {learner.employer_name}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm text-neutral-600 mb-2">
                    <div className="flex items-center space-x-1">
                      <Mail className="w-3 h-3" />
                      <span>{learner.email}</span>
                    </div>
                    {learner.last_login && (
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>Last active: {new Date(learner.last_login).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  {/* Progress */}
                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-neutral-600">Module Progress</span>
                        <span className="text-xs text-neutral-600">
                          {learner.completed_modules}/{learner.assigned_modules}
                        </span>
                      </div>
                      <ProgressBar 
                        value={learner.assigned_modules > 0 ? (learner.completed_modules / learner.assigned_modules) * 100 : 0}
                        size="sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex space-x-6 text-center">
                  <div>
                    <div className="text-lg font-bold text-primary-600">
                      {learner.total_points || 0}
                    </div>
                    <div className="text-xs text-neutral-600">Points</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-accent-600">
                      {learner.badge_count || 0}
                    </div>
                    <div className="text-xs text-neutral-600">Badges</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-secondary-600">
                      {learner.completed_modules || 0}
                    </div>
                    <div className="text-xs text-neutral-600">Completed</div>
                  </div>
                </div>

                {/* Actions */}
                <button
                  onClick={() => handleViewDetails(learner)}
                  className="btn-primary flex items-center space-x-2"
                >
                  <Eye className="w-4 h-4" />
                  <span>View Details</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-neutral-900 mb-2">
            {learners.length === 0 ? 'No learners yet' : 'No learners found'}
          </h3>
          <p className="text-neutral-600">
            {learners.length === 0 
              ? 'Learners will appear here once they enroll in your modules.'
              : 'Try adjusting your search terms.'
            }
          </p>
        </div>
      )}

      {/* Learner Details Modal */}
      <Modal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        title={selectedLearner ? `${selectedLearner.first_name} ${selectedLearner.last_name}` : ''}
        size="xl"
      >
        {learnerDetails && (
          <div className="space-y-6">
            {/* Learner Overview */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-neutral-900 mb-2">Contact Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <Mail className="w-4 h-4 text-neutral-400" />
                      <span>{learnerDetails.learner.email}</span>
                    </div>
                    {learnerDetails.learner.phone && (
                      <div className="flex items-center space-x-2">
                        <Phone className="w-4 h-4 text-neutral-400" />
                        <span>{learnerDetails.learner.phone}</span>
                      </div>
                    )}
                    {learnerDetails.learner.employer_name && (
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4 text-neutral-400" />
                        <span>{learnerDetails.learner.employer_name}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-neutral-900 mb-2">Learning Stats</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-3 bg-primary-50 rounded-lg">
                      <div className="text-lg font-bold text-primary-600">
                        {learnerDetails.modules_progress?.length || 0}
                      </div>
                      <div className="text-xs text-neutral-600">Modules</div>
                    </div>
                    <div className="text-center p-3 bg-accent-50 rounded-lg">
                      <div className="text-lg font-bold text-accent-600">
                        {learnerDetails.quiz_results?.length || 0}
                      </div>
                      <div className="text-xs text-neutral-600">Quizzes</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Module Progress */}
            <div>
              <h4 className="font-semibold text-neutral-900 mb-3">Module Progress</h4>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {learnerDetails.modules_progress?.map((module: any) => (
                  <div key={module.id} className="flex items-center space-x-3 p-3 bg-neutral-50 rounded-lg">
                    <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center">
                      <BookOpen className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <h5 className="font-medium text-neutral-900 text-sm">{module.title}</h5>
                      <div className="flex items-center space-x-2 mt-1">
                        <ProgressBar 
                          value={module.total_content > 0 ? (module.completed_content / module.total_content) * 100 : 0}
                          size="sm"
                          className="flex-1"
                        />
                        <span className="text-xs text-neutral-600">
                          {module.completed_content}/{module.total_content}
                        </span>
                      </div>
                    </div>
                    {module.last_accessed && (
                      <div className="text-xs text-neutral-500">
                        {new Date(module.last_accessed).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Quiz Results */}
            {learnerDetails.quiz_results && learnerDetails.quiz_results.length > 0 && (
              <div>
                <h4 className="font-semibold text-neutral-900 mb-3">Recent Quiz Results</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {learnerDetails.quiz_results.slice(0, 5).map((result: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                      <div>
                        <p className="font-medium text-neutral-900 text-sm">{result.quiz_title}</p>
                        <p className="text-xs text-neutral-600">{result.module_title}</p>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-medium ${
                          result.passed ? 'text-primary-600' : 'text-red-600'
                        }`}>
                          {result.score}/{result.max_score} ({result.percentage}%)
                        </div>
                        <div className="text-xs text-neutral-500">
                          {new Date(result.completed_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </Layout>
  );
};