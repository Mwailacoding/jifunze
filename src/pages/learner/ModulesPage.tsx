import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  BookOpen, 
  Clock, 
  Play,
  CheckCircle2,
  Star,
  Users,
  ChevronDown,
  Award
} from 'lucide-react';
import { Layout } from '../../components/layout/Layout';
import { useNotification } from '../../contexts/NotificationContext';
import { apiClient } from '../../utils/api';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Module } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { CertificateBadge } from '../../components/certificates/CertificateBadge';

export const ModulesPage: React.FC = () => {
  const { showError } = useNotification();
  const { currentUser } = useAuth();
  const [modules, setModules] = useState<Module[]>([]);
  const [filteredModules, setFilteredModules] = useState<Module[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [certificates, setCertificates] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [modulesData, certificatesData] = await Promise.all([
          apiClient.getModules(),
          apiClient.getUserCertificates(currentUser.id)
        ]);
        
        setModules(modulesData);
        setFilteredModules(modulesData);
        
        // Create a map of module IDs to certificate status
        const certMap = certificatesData.reduce((acc, cert) => {
          acc[cert.module_id] = true;
          return acc;
        }, {} as Record<number, boolean>);
        
        setCertificates(certMap);
      } catch (error) {
        showError('Error', 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [currentUser.id, showError]);

  useEffect(() => {
    let filtered = modules;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(module =>
        module.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        module.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        module.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(module => module.category === selectedCategory);
    }

    // Filter by difficulty
    if (selectedDifficulty !== 'all') {
      filtered = filtered.filter(module => module.difficulty_level === selectedDifficulty);
    }

    setFilteredModules(filtered);
  }, [modules, searchTerm, selectedCategory, selectedDifficulty]);

  const categories = Array.from(new Set(modules.map(module => module.category)));
  const difficulties = ['beginner', 'intermediate', 'advanced'];

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

  const getProgressColor = (percentage: number) => {
    if (percentage === 100) return 'primary';
    if (percentage > 50) return 'accent';
    return 'secondary';
  };

  const getModuleStatus = (module: Module): 'certified' | 'completed' | 'in-progress' | 'not-started' => {
      if (module.completion_percentage === 100) {
        return certificates[module.id] ? 'certified' : 'completed';
      }
      return module.completion_percentage > 0 ? 'in-progress' : 'not-started';
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
        <h1 className="text-3xl font-bold text-neutral-900 mb-2">Training Modules</h1>
        <p className="text-neutral-600">
          Complete all content and pass the quiz to earn certificates for each module.
        </p>
      </div>

      {/* Search and Filters */}
      <div className="card p-6 mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
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

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn-outline flex items-center space-x-2"
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
            <ChevronDown className={`w-4 h-4 transform transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Filter Options */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-neutral-200">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
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

              {/* Difficulty Filter */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Difficulty
                </label>
                <select
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value)}
                  className="input-field"
                >
                  <option value="all">All Levels</option>
                  {difficulties.map(difficulty => (
                    <option key={difficulty} value={difficulty}>
                      {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results Summary */}
      <div className="mb-6 flex justify-between items-center">
        <p className="text-neutral-600">
          Showing {filteredModules.length} of {modules.length} modules
        </p>
        <div className="flex items-center space-x-2 text-sm text-neutral-600">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 rounded-full bg-primary-500"></div>
            <span>Completed with certificate</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 rounded-full bg-accent-500"></div>
            <span>In progress</span>
          </div>
        </div>
      </div>

      {/* Modules Grid */}
      {filteredModules.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredModules.map((module) => {
            const status = getModuleStatus(module);
            const hasCertificate = certificates[module.id];
            
            return (
              <div key={module.id} className="card card-hover overflow-hidden relative">
                {/* Certificate Badge */}
                {hasCertificate && (
                  <div className="absolute top-4 right-4 z-10">
                    <CertificateBadge />
                  </div>
                )}

                {/* Module Header */}
                <div className="p-6 pb-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        status === 'certified' ? 'bg-gradient-to-br from-primary-500 to-secondary-500' :
                        status === 'completed' ? 'bg-neutral-100' :
                        status === 'in-progress' ? 'bg-accent-100' : 'bg-neutral-100'
                      }`}>
                        {status === 'certified' ? (
                          <Award className="w-5 h-5 text-white" />
                        ) : (
                          <BookOpen className={`w-5 h-5 ${
                          status === 'completed' ? 'text-neutral-600' :
                          status === 'in-progress' ? 'text-accent-600' : 'text-neutral-600'
                          }`} />
                        )}
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${getDifficultyColor(module.difficulty_level)}`}>
                        {module.difficulty_level}
                      </span>
                    </div>
                    {status === 'completed' && (
                      <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-primary-600" />
                      </div>
                    )}
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
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>{module.estimated_duration || 30} min</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Users className="w-4 h-4" />
                      <span>{module.content_count || 0} lessons</span>
                    </div>
                    {module.quiz_count && module.quiz_count > 0 && (
                      <div className="flex items-center space-x-1">
                        <Star className="w-4 h-4" />
                        <span>{module.quiz_count} quiz{module.quiz_count > 1 ? 'es' : ''}</span>
                      </div>
                    )}
                  </div>

                  {/* Progress */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-neutral-700">Progress</span>
                      <span className="text-sm text-neutral-600">
                        {module.completion_percentage || 0}%
                        {hasCertificate && (
                          <span className="ml-1 text-primary-600">+ Certificate</span>
                        )}
                      </span>
                    </div>
                    <ProgressBar 
                      value={module.completion_percentage || 0}
                      color={getProgressColor(module.completion_percentage || 0)}
                      animated
                    />
                  </div>

                  {/* Requirements */}
                  <div className="mb-4">
                    <div className="text-xs text-neutral-600 mb-1">
                      Requirements to complete:
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <CheckCircle2 className={`w-4 h-4 ${
                          module.content_completed === module.content_count ? 
                          'text-primary-600' : 'text-neutral-300'
                        }`} />
                        <span className={`text-xs ${
                          module.content_completed === module.content_count ?
                          'text-neutral-700' : 'text-neutral-400'
                        }`}>
                          Complete all content ({module.content_completed || 0}/{module.content_count || 0})
                        </span>
                      </div>
                      {module.quiz_count > 0 && (
                        <div className="flex items-center space-x-2">
                          <CheckCircle2 className={`w-4 h-4 ${
                            module.quiz_passed ? 'text-primary-600' : 'text-neutral-300'
                          }`} />
                          <span className={`text-xs ${
                            module.quiz_passed ? 'text-neutral-700' : 'text-neutral-400'
                          }`}>
                            Pass the quiz
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Category */}
                  <div className="mb-4">
                    <span className="text-xs text-neutral-500 uppercase tracking-wide">
                      {module.category}
                    </span>
                  </div>
                </div>

                {/* Module Footer */}
                <div className="px-6 pb-6">
                  <Link
                    to={`/modules/${module.id}`}
                    className={`w-full flex items-center justify-center space-x-2 ${
                      status === 'certified' ? 'btn-primary' :
                      status === 'completed' ? 'btn-secondary' :
                      status === 'in-progress' ? 'btn-accent' : 'btn-primary'
                    }`}
                  >
                    <Play className="w-4 h-4" />
                    <span>
                      {status === 'certified' ? 'View Certificate' : 
                       status === 'completed' ? 'Take Quiz' :
                       status === 'in-progress' ? 'Continue' : 'Start'}
                    </span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <BookOpen className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-neutral-900 mb-2">No modules found</h3>
          <p className="text-neutral-600 mb-4">
            Try adjusting your search terms or filters to find what you're looking for.
          </p>
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedCategory('all');
              setSelectedDifficulty('all');
            }}
            className="btn-primary"
          >
            Clear Filters
          </button>
        </div>
      )}
    </Layout>
  );
};