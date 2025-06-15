import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, 
  BookOpen, 
  Users, 
  BarChart3, 
  Edit,
  Eye,
  MoreVertical,
  Search,
  Filter,
  Calendar,
  TrendingUp
} from 'lucide-react';
import { Layout } from '../../components/layout/Layout';
import { useNotification } from '../../contexts/NotificationContext';
import { apiClient } from '../../utils/api';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Modal } from '../../components/ui/Modal';

export const TrainerModulesPage: React.FC = () => {
  const { showError, showSuccess } = useNotification();
  const [modules, setModules] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModule, setSelectedModule] = useState<any>(null);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [moduleStats, setModuleStats] = useState<any>(null);

  useEffect(() => {
    const fetchModules = async () => {
      try {
        setIsLoading(true);
        const data = await apiClient.getTrainerModules();
        setModules(data.modules);
      } catch (error) {
        showError('Error', 'Failed to load modules');
      } finally {
        setIsLoading(false);
      }
    };

    fetchModules();
  }, [showError]);

  const handleViewStats = async (module: any) => {
    try {
      setSelectedModule(module);
      const stats = await apiClient.getModuleStats(module.id);
      setModuleStats(stats);
      setIsStatsModalOpen(true);
    } catch (error) {
      showError('Error', 'Failed to load module statistics');
    }
  };

  const handleToggleModule = async (moduleId: number, isActive: boolean) => {
    try {
      if (isActive) {
        await apiClient.deactivateModule(moduleId);
        showSuccess('Module Deactivated', 'Module has been deactivated');
      } else {
        await apiClient.activateModule(moduleId);
        showSuccess('Module Activated', 'Module has been activated');
      }
      
      // Refresh modules
      const data = await apiClient.getTrainerModules();
      setModules(data.modules);
    } catch (error) {
      showError('Error', 'Failed to update module status');
    }
  };

  const filteredModules = modules.filter(module =>
    module.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    module.category.toLowerCase().includes(searchTerm.toLowerCase())
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 mb-2">My Modules</h1>
            <p className="text-neutral-600">
              Manage your training modules and track learner progress.
            </p>
          </div>
          <Link to="/trainer/modules/new" className="btn-primary flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>Create Module</span>
          </Link>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="card p-6 text-center">
          <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <BookOpen className="w-6 h-6 text-primary-600" />
          </div>
          <div className="text-2xl font-bold text-neutral-900 mb-1">
            {modules.length}
          </div>
          <div className="text-sm text-neutral-600">Total Modules</div>
        </div>

        <div className="card p-6 text-center">
          <div className="w-12 h-12 bg-secondary-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <Users className="w-6 h-6 text-secondary-600" />
          </div>
          <div className="text-2xl font-bold text-secondary-600 mb-1">
            {modules.reduce((total, module) => total + (module.learner_count || 0), 0)}
          </div>
          <div className="text-sm text-neutral-600">Total Learners</div>
        </div>

        <div className="card p-6 text-center">
          <div className="w-12 h-12 bg-accent-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <TrendingUp className="w-6 h-6 text-accent-600" />
          </div>
          <div className="text-2xl font-bold text-accent-600 mb-1">
            {modules.length > 0 
              ? Math.round(modules.reduce((total, module) => total + (module.completion_rate || 0), 0) / modules.length)
              : 0
            }%
          </div>
          <div className="text-sm text-neutral-600">Avg. Completion</div>
        </div>

        <div className="card p-6 text-center">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <BarChart3 className="w-6 h-6 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-purple-600 mb-1">
            {modules.filter(module => module.is_active).length}
          </div>
          <div className="text-sm text-neutral-600">Active Modules</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card p-6 mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search modules..."
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

      {/* Modules Grid */}
      {filteredModules.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredModules.map((module) => (
            <div key={module.id} className="card overflow-hidden">
              {/* Module Header */}
              <div className="p-6 pb-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-white" />
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      module.is_active 
                        ? 'bg-primary-100 text-primary-700' 
                        : 'bg-neutral-100 text-neutral-700'
                    }`}>
                      {module.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  
                  <div className="relative">
                    <button className="p-1 text-neutral-400 hover:text-neutral-600 rounded">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-neutral-900 mb-2 line-clamp-2">
                  {module.title}
                </h3>

                <div className="flex items-center space-x-4 text-sm text-neutral-500 mb-4">
                  <span>{module.category}</span>
                  <span>{module.content_count || 0} lessons</span>
                  {module.quiz_count > 0 && (
                    <span>{module.quiz_count} quiz{module.quiz_count > 1 ? 'es' : ''}</span>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center p-3 bg-neutral-50 rounded-lg">
                    <div className="text-lg font-bold text-secondary-600">
                      {module.learner_count || 0}
                    </div>
                    <div className="text-xs text-neutral-600">Learners</div>
                  </div>
                  <div className="text-center p-3 bg-neutral-50 rounded-lg">
                    <div className="text-lg font-bold text-accent-600">
                      {Math.round(module.completion_rate || 0)}%
                    </div>
                    <div className="text-xs text-neutral-600">Completion</div>
                  </div>
                </div>

                {/* Progress */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-neutral-700">Completion Rate</span>
                    <span className="text-sm text-neutral-600">
                      {Math.round(module.completion_rate || 0)}%
                    </span>
                  </div>
                  <ProgressBar 
                    value={module.completion_rate || 0}
                    color="accent"
                    animated
                  />
                </div>

                {/* Created Date */}
                <div className="flex items-center space-x-1 text-xs text-neutral-500">
                  <Calendar className="w-3 h-3" />
                  <span>Created {new Date(module.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Module Actions */}
              <div className="px-6 pb-6">
                <div className="flex space-x-2">
                  <Link
                    to={`/trainer/modules/${module.id}/edit`}
                    className="btn-outline flex-1 flex items-center justify-center space-x-2"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Edit</span>
                  </Link>
                  <button
                    onClick={() => handleViewStats(module)}
                    className="btn-primary flex-1 flex items-center justify-center space-x-2"
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span>Stats</span>
                  </button>
                </div>
                
                <div className="mt-2">
                  <button
                    onClick={() => handleToggleModule(module.id, module.is_active)}
                    className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                      module.is_active
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-primary-100 text-primary-700 hover:bg-primary-200'
                    }`}
                  >
                    {module.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <BookOpen className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-neutral-900 mb-2">
            {modules.length === 0 ? 'No modules created yet' : 'No modules found'}
          </h3>
          <p className="text-neutral-600 mb-4">
            {modules.length === 0 
              ? 'Create your first training module to get started.'
              : 'Try adjusting your search terms.'
            }
          </p>
          {modules.length === 0 && (
            <Link to="/trainer/modules/new" className="btn-primary">
              Create Your First Module
            </Link>
          )}
        </div>
      )}

      {/* Module Stats Modal */}
      <Modal
        isOpen={isStatsModalOpen}
        onClose={() => setIsStatsModalOpen(false)}
        title={`${selectedModule?.title} - Statistics`}
        size="lg"
      >
        {moduleStats && (
          <div className="space-y-6">
            {/* Overview Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-neutral-50 rounded-lg">
                <div className="text-2xl font-bold text-primary-600">
                  {moduleStats.learner_progress?.length || 0}
                </div>
                <div className="text-sm text-neutral-600">Total Learners</div>
              </div>
              <div className="text-center p-4 bg-neutral-50 rounded-lg">
                <div className="text-2xl font-bold text-accent-600">
                  {moduleStats.learner_progress?.filter((p: any) => p.completed_content === p.total_content).length || 0}
                </div>
                <div className="text-sm text-neutral-600">Completed</div>
              </div>
              <div className="text-center p-4 bg-neutral-50 rounded-lg">
                <div className="text-2xl font-bold text-secondary-600">
                  {moduleStats.quiz_results?.length || 0}
                </div>
                <div className="text-sm text-neutral-600">Quiz Attempts</div>
              </div>
            </div>

            {/* Learner Progress */}
            <div>
              <h4 className="font-semibold text-neutral-900 mb-3">Learner Progress</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {moduleStats.learner_progress?.map((learner: any) => (
                  <div key={learner.id} className="flex items-center space-x-3 p-3 bg-neutral-50 rounded-lg">
                    <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-medium">
                        {learner.first_name[0]}{learner.last_name[0]}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-neutral-900 text-sm">
                        {learner.first_name} {learner.last_name}
                      </p>
                      <div className="flex items-center space-x-2">
                        <ProgressBar 
                          value={learner.total_content > 0 ? (learner.completed_content / learner.total_content) * 100 : 0}
                          size="sm"
                          className="flex-1"
                        />
                        <span className="text-xs text-neutral-600">
                          {learner.completed_content}/{learner.total_content}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </Layout>
  );
};