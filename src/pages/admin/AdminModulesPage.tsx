import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Search, 
  Filter, 
  Plus,
  Edit,
  Eye,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Users,
  BarChart3,
  Calendar
} from 'lucide-react';
import { Layout } from '../../components/layout/Layout';
import { useNotification } from '../../contexts/NotificationContext';
import { apiClient } from '../../utils/api';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ProgressBar } from '../../components/ui/ProgressBar';

export const AdminModulesPage: React.FC = () => {
  const { showError, showSuccess } = useNotification();
  const [modules, setModules] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const fetchModules = async () => {
      try {
        setIsLoading(true);
        const data = await apiClient.getModules();
        setModules(data);
      } catch (error) {
        showError('Error', 'Failed to load modules');
      } finally {
        setIsLoading(false);
      }
    };

    fetchModules();
  }, [showError]);

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
      const data = await apiClient.getModules();
      setModules(data);
    } catch (error) {
      showError('Error', 'Failed to update module status');
    }
  };

  const categories = Array.from(new Set(modules.map(module => module.category)));

  const filteredModules = modules.filter(module => {
    const matchesSearch = 
      module.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      module.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || module.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && module.is_active) ||
      (statusFilter === 'inactive' && !module.is_active);
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-primary-100 text-primary-700';
      case 'intermediate':
        return 'bg-accent-100 text-accent-700';
      case 'advanced':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-neutral-100 text-neutral-700';
    }
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
            <h1 className="text-3xl font-bold text-neutral-900 mb-2">Content Management</h1>
            <p className="text-neutral-600">
              Oversee and manage all training modules across the platform.
            </p>
          </div>
          <button className="btn-primary flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>Create Module</span>
          </button>
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
            <ToggleRight className="w-6 h-6 text-secondary-600" />
          </div>
          <div className="text-2xl font-bold text-secondary-600 mb-1">
            {modules.filter(module => module.is_active).length}
          </div>
          <div className="text-sm text-neutral-600">Active Modules</div>
        </div>

        <div className="card p-6 text-center">
          <div className="w-12 h-12 bg-accent-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <Users className="w-6 h-6 text-accent-600" />
          </div>
          <div className="text-2xl font-bold text-accent-600 mb-1">
            {modules.reduce((total, module) => total + (module.learner_count || 0), 0)}
          </div>
          <div className="text-sm text-neutral-600">Total Enrollments</div>
        </div>

        <div className="card p-6 text-center">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <BarChart3 className="w-6 h-6 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-purple-600 mb-1">
            {categories.length}
          </div>
          <div className="text-sm text-neutral-600">Categories</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card p-6 mb-8">
        <div className="grid md:grid-cols-4 gap-4">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search modules..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>

          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="input-field"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
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
                    <span className={`text-xs px-2 py-1 rounded-full ${getDifficultyColor(module.difficulty_level)}`}>
                      {module.difficulty_level}
                    </span>
                  </div>
                  
                  <button
                    onClick={() => handleToggleModule(module.id, module.is_active)}
                    className={`p-1 rounded ${
                      module.is_active ? 'text-primary-600' : 'text-neutral-400'
                    }`}
                  >
                    {module.is_active ? (
                      <ToggleRight className="w-5 h-5" />
                    ) : (
                      <ToggleLeft className="w-5 h-5" />
                    )}
                  </button>
                </div>

                <h3 className="text-lg font-semibold text-neutral-900 mb-2 line-clamp-2">
                  {module.title}
                </h3>

                {module.description && (
                  <p className="text-neutral-600 text-sm mb-3 line-clamp-2">
                    {module.description}
                  </p>
                )}

                <div className="flex items-center space-x-4 text-sm text-neutral-500 mb-4">
                  <span>{module.category}</span>
                  <span>{module.content_count || 0} lessons</span>
                  {module.estimated_duration && (
                    <span>{module.estimated_duration} min</span>
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
                <div className="flex items-center space-x-1 text-xs text-neutral-500 mb-4">
                  <Calendar className="w-3 h-3" />
                  <span>Created {new Date(module.created_at).toLocaleDateString()}</span>
                </div>

                {/* Status */}
                <div className="flex items-center justify-between">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    module.is_active 
                      ? 'bg-primary-100 text-primary-700' 
                      : 'bg-neutral-100 text-neutral-700'
                  }`}>
                    {module.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <div className="text-xs text-neutral-500">
                    by {module.created_by_name || 'System'}
                  </div>
                </div>
              </div>

              {/* Module Actions */}
              <div className="px-6 pb-6">
                <div className="flex space-x-2">
                  <button className="btn-outline flex-1 flex items-center justify-center space-x-2">
                    <Eye className="w-4 h-4" />
                    <span>View</span>
                  </button>
                  <button className="btn-primary flex-1 flex items-center justify-center space-x-2">
                    <Edit className="w-4 h-4" />
                    <span>Edit</span>
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
            {modules.length === 0 ? 'No modules available' : 'No modules found'}
          </h3>
          <p className="text-neutral-600 mb-4">
            {modules.length === 0 
              ? 'Modules will appear here once trainers create them.'
              : 'Try adjusting your search terms or filters.'
            }
          </p>
        </div>
      )}
    </Layout>
  );
};