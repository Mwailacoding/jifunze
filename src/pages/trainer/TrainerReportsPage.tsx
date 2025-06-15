import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  BookOpen,
  Calendar,
  Download,
  Filter,
  RefreshCw
} from 'lucide-react';
import { Layout } from '../../components/layout/Layout';
import { useNotification } from '../../contexts/NotificationContext';
import { apiClient } from '../../utils/api';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ProgressBar } from '../../components/ui/ProgressBar';

export const TrainerReportsPage: React.FC = () => {
  const { showError } = useNotification();
  const [moduleReport, setModuleReport] = useState<any>(null);
  const [quizReport, setQuizReport] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');
  const [selectedModule, setSelectedModule] = useState('');
  const [selectedQuiz, setSelectedQuiz] = useState('');
  const [modules, setModules] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch modules first
        const modulesData = await apiClient.getTrainerModules();
        setModules(modulesData.modules);

        // Fetch reports
        const [moduleReportData, quizReportData] = await Promise.all([
          apiClient.getModuleProgressReport(selectedModule || undefined, timeRange),
          apiClient.getQuizPerformanceReport(selectedQuiz || undefined, timeRange)
        ]);

        setModuleReport(moduleReportData);
        setQuizReport(quizReportData);
      } catch (error) {
        showError('Error', 'Failed to load reports');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [showError, timeRange, selectedModule, selectedQuiz]);

  const handleRefresh = () => {
    setIsLoading(true);
    // Trigger useEffect by updating a dependency
    setTimeRange(prev => prev);
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
            <h1 className="text-3xl font-bold text-neutral-900 mb-2">Reports & Analytics</h1>
            <p className="text-neutral-600">
              Analyze learner progress and performance across your training modules.
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleRefresh}
              className="btn-outline flex items-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
            <button className="btn-primary flex items-center space-x-2">
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-6 mb-8">
        <div className="grid md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Time Range
            </label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="input-field"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="all">All time</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Module Filter
            </label>
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="input-field"
            >
              <option value="">All Modules</option>
              {modules.map(module => (
                <option key={module.id} value={module.id}>
                  {module.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Quiz Filter
            </label>
            <select
              value={selectedQuiz}
              onChange={(e) => setSelectedQuiz(e.target.value)}
              className="input-field"
            >
              <option value="">All Quizzes</option>
              {/* Quiz options would be populated based on selected module */}
            </select>
          </div>

          <div className="flex items-end">
            <button className="btn-outline w-full flex items-center justify-center space-x-2">
              <Filter className="w-4 h-4" />
              <span>Apply Filters</span>
            </button>
          </div>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="card p-6 text-center">
          <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <BookOpen className="w-6 h-6 text-primary-600" />
          </div>
          <div className="text-2xl font-bold text-neutral-900 mb-1">
            {Array.isArray(moduleReport) ? moduleReport.length : (moduleReport?.progress_data?.length || 0)}
          </div>
          <div className="text-sm text-neutral-600">Active Modules</div>
        </div>

        <div className="card p-6 text-center">
          <div className="w-12 h-12 bg-secondary-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <Users className="w-6 h-6 text-secondary-600" />
          </div>
          <div className="text-2xl font-bold text-secondary-600 mb-1">
            {Array.isArray(moduleReport) 
              ? moduleReport.reduce((total, module) => total + (module.learners || 0), 0)
              : (moduleReport?.progress_data?.length || 0)
            }
          </div>
          <div className="text-sm text-neutral-600">Active Learners</div>
        </div>

        <div className="card p-6 text-center">
          <div className="w-12 h-12 bg-accent-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <TrendingUp className="w-6 h-6 text-accent-600" />
          </div>
          <div className="text-2xl font-bold text-accent-600 mb-1">
            {Array.isArray(quizReport) 
              ? Math.round(quizReport.reduce((total, quiz) => total + (quiz.avg_score || 0), 0) / Math.max(quizReport.length, 1))
              : Math.round(quizReport?.quiz_results?.reduce((total: number, result: any) => total + result.percentage, 0) / Math.max(quizReport?.quiz_results?.length || 1, 1) || 0)
            }%
          </div>
          <div className="text-sm text-neutral-600">Avg. Quiz Score</div>
        </div>

        <div className="card p-6 text-center">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <BarChart3 className="w-6 h-6 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-purple-600 mb-1">
            {Array.isArray(quizReport) 
              ? Math.round(quizReport.reduce((total, quiz) => total + (quiz.pass_rate || 0), 0) / Math.max(quizReport.length, 1) * 100)
              : Math.round((quizReport?.quiz_results?.filter((result: any) => result.passed).length || 0) / Math.max(quizReport?.quiz_results?.length || 1, 1) * 100)
            }%
          </div>
          <div className="text-sm text-neutral-600">Pass Rate</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Module Progress Report */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-neutral-900">Module Progress</h2>
            <Calendar className="w-5 h-5 text-neutral-400" />
          </div>

          {Array.isArray(moduleReport) ? (
            // Summary view for all modules
            <div className="space-y-4">
              {moduleReport.map((module: any) => (
                <div key={module.id} className="p-4 bg-neutral-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-neutral-900">{module.title}</h3>
                    <span className="text-sm text-neutral-600">
                      {module.completers || 0}/{module.learners || 0} completed
                    </span>
                  </div>
                  <ProgressBar 
                    value={module.learners > 0 ? (module.completers / module.learners) * 100 : 0}
                    className="mb-2"
                  />
                  <div className="text-xs text-neutral-600">
                    {module.learners > 0 ? Math.round((module.completers / module.learners) * 100) : 0}% completion rate
                  </div>
                </div>
              ))}
            </div>
          ) : moduleReport?.progress_data ? (
            // Detailed view for specific module
            <div className="space-y-3">
              {moduleReport.progress_data.map((learner: any) => (
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
                    <div className="flex items-center space-x-2 mt-1">
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
                  {learner.last_accessed && (
                    <div className="text-xs text-neutral-500">
                      {new Date(learner.last_accessed).toLocaleDateString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <BookOpen className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
              <p className="text-neutral-600">No module progress data available</p>
            </div>
          )}
        </div>

        {/* Quiz Performance Report */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-neutral-900">Quiz Performance</h2>
            <BarChart3 className="w-5 h-5 text-neutral-400" />
          </div>

          {Array.isArray(quizReport) ? (
            // Summary view for all quizzes
            <div className="space-y-4">
              {quizReport.map((quiz: any) => (
                <div key={quiz.id} className="p-4 bg-neutral-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="font-medium text-neutral-900">{quiz.title}</h3>
                      <p className="text-xs text-neutral-600">{quiz.module_title}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-neutral-900">
                        {Math.round(quiz.avg_score || 0)}%
                      </div>
                      <div className="text-xs text-neutral-600">Avg. Score</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="text-center p-2 bg-white rounded">
                      <div className="font-medium text-secondary-600">{quiz.attempts || 0}</div>
                      <div className="text-neutral-600">Attempts</div>
                    </div>
                    <div className="text-center p-2 bg-white rounded">
                      <div className="font-medium text-primary-600">
                        {Math.round((quiz.pass_rate || 0) * 100)}%
                      </div>
                      <div className="text-neutral-600">Pass Rate</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : quizReport?.quiz_results ? (
            // Detailed view for specific quiz
            <div className="space-y-3">
              {quizReport.quiz_results.slice(0, 10).map((result: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      result.passed ? 'bg-primary-100' : 'bg-red-100'
                    }`}>
                      <span className={`text-xs font-medium ${
                        result.passed ? 'text-primary-600' : 'text-red-600'
                      }`}>
                        {result.first_name[0]}{result.last_name[0]}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-neutral-900 text-sm">
                        {result.first_name} {result.last_name}
                      </p>
                      <p className="text-xs text-neutral-600">
                        {new Date(result.completed_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-medium ${
                      result.passed ? 'text-primary-600' : 'text-red-600'
                    }`}>
                      {result.score}/{result.max_score}
                    </div>
                    <div className="text-xs text-neutral-600">
                      {result.percentage}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <BarChart3 className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
              <p className="text-neutral-600">No quiz performance data available</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};