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
  Award,
  Lock,
  AlertCircle
} from 'lucide-react';
import { Layout } from '../../components/layout/Layout';
import { useNotification } from '../../contexts/NotificationContext';
import { apiClient } from '../../utils/api';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Button } from '../../components/ui/Button';

// If 'Module' does not exist, define it here temporarily:
export type Module = {
  id: number;
  title: string;
  description?: string;
  category: string;
  difficulty_level: string;
  estimated_duration?: number;
  content_count?: number;
  quiz_count?: number;
  completion_percentage?: number;
  content_completed?: number;
  quiz_passed?: boolean;
  is_locked?: boolean;
  prerequisite_module_id?: number;
  is_completed?: boolean;
};
import { useAuth } from '../../contexts/AuthContext';

interface ModuleLockScreenProps {
  module: {
    id: number;
    title: string;
  };
  previousModuleId: number;
  prerequisite?: {
    id: number;
    title: string;
    content_completed?: number;
    content_count?: number;
    quiz_passed?: boolean;
    quiz_count?: number;
    last_quiz_score?: number; // Optional: show last score
  };
}

export const ModuleLockScreen: React.FC<ModuleLockScreenProps> = ({
  module,
  previousModuleId,
  prerequisite
}) => {
  if (!prerequisite) {
    return (
      <div className="card p-8 text-center">
        <h3 className="text-xl font-semibold mb-2">Module Locked</h3>
        <p className="text-neutral-600 mb-6">
          This module is locked due to an unknown prerequisite. Please contact support.
        </p>
        <Button asChild variant="outline">
          <Link to="/modules">Browse Available Modules</Link>
        </Button>
      </div>
    );
  }

  const contentIncomplete = prerequisite.content_count
    ? (prerequisite.content_completed ?? 0) < prerequisite.content_count
    : false;

  const quizNotPassed = prerequisite.quiz_count
    ? prerequisite.quiz_count > 0 && !prerequisite.quiz_passed
    : false;

  const progress =
    prerequisite.content_count && prerequisite.content_completed
      ? Math.round(
          (prerequisite.content_completed / prerequisite.content_count) * 100
        )
      : 0;

  return (
    <div className="card p-8 text-center">
      <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 text-red-600 mb-4">
        <Lock className="h-8 w-8" />
      </div>

      <h3 className="text-xl font-semibold mb-2">Module Locked</h3>
      <p className="text-neutral-600 mb-6">
        You need to complete the &quot;{prerequisite.title}&quot; module to access this content.
      </p>

      <div className="max-w-md mx-auto mb-8">
        <div className="space-y-3 text-left">
          {contentIncomplete && (
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-accent-600 mr-2 mt-0.5" />
              <div>
                <p className="font-medium">Complete all content in &quot;{prerequisite.title}&quot;</p>
                <p className="text-sm text-neutral-600">
                  {prerequisite.content_completed} of {prerequisite.content_count} lessons completed
                </p>
                {/* Progress Bar */}
                <div className="mt-2">
                  <ProgressBar value={progress} />
                </div>
              </div>
            </div>
          )}

          {quizNotPassed && (
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-accent-600 mr-2 mt-0.5" />
              <div>
                <p className="font-medium">Pass the quiz in &quot;{prerequisite.title}&quot;</p>
                <p className="text-sm text-neutral-600">
                  You need to score at least 80% to pass
                  {prerequisite.last_quiz_score !== undefined && (
                    <>
                      <br />
                      Your last score: <b>{prerequisite.last_quiz_score}%</b>
                    </>
                  )}
                </p>
                <Button
                  asChild
                  variant="secondary"
                  className="mt-2"
                >
                  <Link to={`/modules/${prerequisite.id}/quiz`}>Go to Quiz</Link>
                </Button>
              </div>
            </div>
          )}

          {!contentIncomplete && !quizNotPassed && (
            <div className="flex items-start">
              <CheckCircle2 className="w-5 h-5 text-green-600 mr-2 mt-0.5" />
              <div>
                <p className="font-medium">Prerequisite module completed!</p>
                <p className="text-sm text-neutral-600">
                  You should now have access to this module
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-center gap-3">
        <Button asChild variant="default">
          <Link to={`/modules/${previousModuleId}`}>
            Go to &quot;{prerequisite.title || 'Previous'}&quot; Module
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/modules">Browse Available Modules</Link>
        </Button>
      </div>
    </div>
  );
};

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [modulesData] = await Promise.all([
          apiClient.getModules()
        ]);
        
        setModules(modulesData);
        setFilteredModules(modulesData);
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
            <span>Completed</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 rounded-full bg-accent-500"></div>
            <span>In progress</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 rounded-full bg-neutral-400"></div>
            <span>Locked</span>
          </div>
        </div>
      </div>

      {/* Modules Grid */}
      {filteredModules.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredModules.map((module) => {
            const status = getModuleStatus(module);
            const isLocked = module.is_locked;
            const isCompleted = module.is_completed;
            
            return (
              <div key={module.id} className={`card card-hover overflow-hidden relative ${isLocked || isCompleted ? 'opacity-75' : ''}`}>
                {/* Lock Overlay */}
                {isLocked && (
                  <div className="absolute inset-0 bg-neutral-900/50 flex items-center justify-center z-20">
                    <div className="text-center text-white">
                      <Lock className="w-12 h-12 mx-auto mb-2" />
                      <p className="text-sm font-medium">Module Locked</p>
                      <p className="text-xs opacity-75">Complete previous module to unlock</p>
                    </div>
                  </div>
                )}

                {/* Completion Overlay */}
                {isCompleted && !isLocked && (
                  <div className="absolute inset-0 bg-green-900/50 flex items-center justify-center z-20">
                    <div className="text-center text-white">
                      <CheckCircle2 className="w-12 h-12 mx-auto mb-2" />
                      <p className="text-sm font-medium">Module Completed!</p>
                      <p className="text-xs opacity-75">You have successfully completed this module</p>
                    </div>
                  </div>
                )}

                {/* Module Header */}
                <div className="p-6 pb-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        isLocked ? 'bg-neutral-100' :
                        isCompleted ? 'bg-green-100' :
                        status === 'completed' ? 'bg-neutral-100' :
                        status === 'in-progress' ? 'bg-accent-100' : 'bg-neutral-100'
                      }`}>
                        {isLocked ? (
                          <Lock className="w-5 h-5 text-neutral-600" />
                        ) : isCompleted ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
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
                    {status === 'completed' && !isLocked && !isCompleted && (
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

                  {/* Progress - Only show if not locked and not completed */}
                  {!isLocked && !isCompleted && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-neutral-700">Progress</span>
                      </div>
                      <ProgressBar 
                        value={module.completion_percentage || 0}
                        color={getProgressColor(module.completion_percentage || 0)}
                        animated
                      />
                    </div>
                  )}

                  {/* Completion Status */}
                  {isCompleted && !isLocked && (
                    <div className="mb-4">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-green-800">Completed</span>
                        </div>
                        <ProgressBar 
                          value={100}
                          color="green"
                          animated={false}
                        />
                      </div>
                    </div>
                  )}

                  {/* Requirements - Only show if not locked and not completed */}
                  {!isLocked && !isCompleted && (
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
                        {(module.quiz_count !== undefined && module.quiz_count > 0) && (
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
                  )}

                  {/* Category */}
                  <div className="mb-4">
                    <span className="text-xs text-neutral-500 uppercase tracking-wide">
                      {module.category}
                    </span>
                  </div>
                </div>

                {/* Module Footer */}
                <div className="px-6 pb-6">
                  {isLocked ? (
                    <div className="w-full flex items-center justify-center space-x-2 btn-disabled cursor-not-allowed">
                      <Lock className="w-4 h-4" />
                      <span>Locked</span>
                    </div>
                  ) : (
                    <Link
                      to={`/modules/${module.id}`}
                      className={`w-full flex items-center justify-center space-x-2 ${
                        status === 'completed' ? 'btn-secondary' :
                        status === 'in-progress' ? 'btn-accent' : 'btn-primary'
                      }`}
                    >
                      <Play className="w-4 h-4" />
                      <span>
                        {status === 'completed' ? 'Take Quiz' :
                         status === 'in-progress' ? 'Continue' : 'Start'}
                      </span>
                    </Link>
                  )}
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