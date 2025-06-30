import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Download, 
  Filter, 
  Calendar, 
  Users, 
  BookOpen, 
  TrendingUp,
  Award,
  Target,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { Layout } from '../../components/layout/Layout';
import { useNotification } from '../../contexts/NotificationContext';
import { apiClient, Module } from '../../utils/api';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ProgressBar } from '../../components/ui/ProgressBar';

export const TrainerReportsPage: React.FC = () => {
  const { showSuccess, showError } = useNotification();
  const [isLoading, setIsLoading] = useState(false);
  const [modules, setModules] = useState<Module[]>([]);
  const [reportData, setReportData] = useState<any>(null);
  const [selectedModule, setSelectedModule] = useState<string>('');
  const [timeRange, setTimeRange] = useState('all');
  const [reportType, setReportType] = useState('module_progress');

  const reportTypes = [
    { value: 'module_progress', label: 'Module Progress', icon: BookOpen },
    { value: 'learner_activity', label: 'Learner Activity', icon: Users },
    { value: 'quiz_performance', label: 'Quiz Performance', icon: Award },
    { value: 'completion_rate', label: 'Completion Rates', icon: Target }
  ];

  const timeRanges = [
    { value: 'week', label: 'This Week' },
    { value: 'month',  label: 'This Month' },
    { value: 'quarter', label: 'This Quarter' },
    { value: 'year', label: 'This Year' },
    { value: 'all', label: 'All Time' }
  ];

  useEffect(() => {
    fetchModules();
  }, []);

  useEffect(() => {
    if (reportType) {
      generateReport();
    }
  }, [reportType, selectedModule, timeRange]);

  const fetchModules = async () => {
    try {
      const data = await apiClient.getTrainerModules();
      setModules(data);
    } catch (error) {
      showError('Error', 'Failed to load modules');
    }
  };

  const generateReport = async () => {
    try {
      setIsLoading(true);
      const moduleId = selectedModule ? parseInt(selectedModule) : undefined;
      const data = await apiClient.getTrainerReports(reportType, moduleId, timeRange);
      setReportData(data);
    } catch (error) {
      showError('Error', 'Failed to generate report');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadReport = async (format: 'json' | 'pdf' = 'pdf') => {
    try {
      const moduleId = selectedModule ? parseInt(selectedModule) : undefined;
      const response = await apiClient.getTrainerReports(reportType, moduleId, timeRange, format);
      
      if (format === 'pdf') {
        // Handle PDF download
        const blob = new Blob([response], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${reportType}_report_${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        // Handle JSON download
        const blob = new Blob([JSON.stringify(response, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${reportType}_report_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
      
      showSuccess('Report downloaded successfully');
    } catch (error) {
      showError('Error', 'Failed to download report');
    }
  };

  const ModuleProgressReport = ({ data }: { data: any }) => {
    if (!data?.data) return null;

    if (data.data.module) {
      // Single module report
      const { module, learner_progress } = data.data;
      return (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Module: {module.title}
            </h3>
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-600">{learner_progress.length}</div>
                <div className="text-sm text-gray-600">Total Learners</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-600">
                  {learner_progress.filter((p: any) => p.completed_content === p.total_content).length}
                </div>
                <div className="text-sm text-gray-600">Completed</div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-yellow-600">
                  {Math.round(learner_progress.reduce((acc: number, p: any) => 
                    acc + (p.total_content > 0 ? (p.completed_content / p.total_content) * 100 : 0), 0
                  ) / learner_progress.length) || 0}%
                </div>
                <div className="text-sm text-gray-600">Avg. Progress</div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Learner Progress</h4>
              {learner_progress.map((progress: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">
                      {progress.first_name} {progress.last_name}
                    </div>
                    <div className="text-sm text-gray-600">{progress.email}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {progress.completed_content}/{progress.total_content} completed
                    </div>
                    <ProgressBar
                      value={progress.total_content > 0 ? (progress.completed_content / progress.total_content) * 100 : 0}
                      size="sm"
                      className="w-24 mt-1"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    } else if (data.data.modules) {
      // All modules report
      const { modules } = data.data;
      return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">All Modules Progress</h3>
            <div className="space-y-4">
              {modules.map((module: any) => (
                <div key={module.id} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{module.title}</h4>
                    <span className="text-sm text-gray-600">{module.category}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Content Items:</span>
                      <span className="ml-1 font-medium">{module.total_content}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Learners:</span>
                      <span className="ml-1 font-medium">{module.total_learners}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Completed:</span>
                      <span className="ml-1 font-medium">{module.completed_learners}</span>
                    </div>
                  </div>
                  <div className="mt-3">
                    <ProgressBar
                      value={module.total_learners > 0 ? (module.completed_learners / module.total_learners) * 100 : 0}
                      size="sm"
                      className="w-full"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  const LearnerActivityReport = ({ data }: { data: any }) => {
    if (!data?.data?.learner_activity) return null;

    const { learner_activity } = data.data;

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Learner Activity</h3>
          <div className="space-y-4">
            {learner_activity.map((activity: any, index: number) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {activity.first_name} {activity.last_name}
                    </h4>
                    <p className="text-sm text-gray-600">{activity.email}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">
                      Last login: {activity.last_login ? new Date(activity.last_login).toLocaleDateString() : 'Never'}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-600">{activity.total_content_accessed}</div>
                    <div className="text-gray-600">Content Accessed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">{activity.completed_content}</div>
                    <div className="text-gray-600">Completed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-purple-600">{activity.quizzes_taken}</div>
                    <div className="text-gray-600">Quizzes Taken</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-yellow-600">{activity.quizzes_passed}</div>
                    <div className="text-gray-600">Quizzes Passed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-orange-600">{activity.total_score}</div>
                    <div className="text-gray-600">Total Score</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const QuizPerformanceReport = ({ data }: { data: any }) => {
    if (!data?.data?.quizzes) return null;

    const { quizzes } = data.data;

    return (
      <div className="space-y-6">
        {quizzes.map((quiz: any) => (
          <div key={quiz.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{quiz.title}</h3>
                <p className="text-sm text-gray-600">Module: {quiz.module_title}</p>
              </div>
            </div>

            <div className="grid md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{quiz.total_attempts}</div>
                <div className="text-sm text-gray-600">Total Attempts</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{quiz.passed_attempts}</div>
                <div className="text-sm text-gray-600">Passed</div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {quiz.total_attempts > 0 ? Math.round((quiz.passed_attempts / quiz.total_attempts) * 100) : 0}%
                </div>
                <div className="text-sm text-gray-600">Pass Rate</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {Math.round(quiz.avg_score || 0)}%
                </div>
                <div className="text-sm text-gray-600">Avg. Score</div>
              </div>
            </div>

            {quiz.questions && quiz.questions.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Question Performance</h4>
                <div className="space-y-3">
                  {quiz.questions.map((question: any, index: number) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 line-clamp-2">
                            {question.question_text}
                          </p>
                          <p className="text-xs text-gray-600 mt-1 capitalize">
                            {question.question_type}
                          </p>
                        </div>
                        <div className="text-right ml-4">
                          <div className="text-sm font-medium">
                            {Math.round((question.correct_rate || 0) * 100)}% correct
                          </div>
                          <div className="text-xs text-gray-600">
                            {question.total_attempts} attempts
                          </div>
                        </div>
                      </div>
                      <ProgressBar
                        value={(question.correct_rate || 0) * 100}
                        size="sm"
                        className="w-full"
                        color={
                          question.correct_rate > 0.7
                            ? 'secondary'
                            : question.correct_rate > 0.5
                            ? 'accent'
                            : 'primary'
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const CompletionRateReport = ({ data }: { data: any }) => {
    if (!data?.data?.modules) return null;

    const { modules } = data.data;

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Module Completion Rates</h3>
          <div className="space-y-4">
            {modules.map((module: any) => (
              <div key={module.id} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900">{module.title}</h4>
                  <span className="text-lg font-bold text-blue-600">
                    {module.completion_rate}%
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                  <div className="text-center">
                    <div className="font-medium text-gray-900">{module.total_content}</div>
                    <div className="text-gray-600">Content Items</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-gray-900">{module.total_learners}</div>
                    <div className="text-gray-600">Total Learners</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-gray-900">{module.completed_learners}</div>
                    <div className="text-gray-600">Completed</div>
                  </div>
                </div>
                <ProgressBar
                  value={module.completion_rate}
                  size="sm"
                  className="w-full"
                  color={
                    module.completion_rate > 70
                      ? 'secondary'
                      : module.completion_rate > 40
                      ? 'accent'
                      : 'primary'
                  }
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderReport = () => {
    if (!reportData) return null;

    switch (reportType) {
      case 'module_progress':
        return <ModuleProgressReport data={reportData} />;
      case 'learner_activity':
        return <LearnerActivityReport data={reportData} />;
      case 'quiz_performance':
        return <QuizPerformanceReport data={reportData} />;
      case 'completion_rate':
        return <CompletionRateReport data={reportData} />;
      default:
        return null;
    }
  };

  return (
    <Layout>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
            <p className="text-gray-600 mt-1">
              Analyze learner performance and training effectiveness
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => downloadReport('json')}
              className="flex items-center space-x-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export JSON</span>
            </button>
            <button
              onClick={() => downloadReport('pdf')}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Report Type Selection */}
      <div className="mb-6">
        <div className="grid md:grid-cols-4 gap-4">
          {reportTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => setReportType(type.value)}
              className={`p-4 rounded-lg border-2 transition-all ${
                reportType === type.value
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              <type.icon className="w-6 h-6 mx-auto mb-2" />
              <div className="text-sm font-medium">{type.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 bg-white rounded-lg shadow-sm p-4 border border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Module (Optional)
              </label>
              <select
                value={selectedModule}
                onChange={(e) => setSelectedModule(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Modules</option>
                {modules.map((module) => (
                  <option key={module.id} value={module.id}>
                    {module.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Time Range
              </label>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {timeRanges.map((range) => (
                  <option key={range.value} value={range.value}>
                    {range.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={generateReport}
            disabled={isLoading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isLoading && <LoadingSpinner size="sm" />}
            <BarChart3 className="w-4 h-4" />
            <span>Generate Report</span>
          </button>
        </div>
      </div>

      {/* Report Content */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      ) : reportData ? (
        renderReport()
      ) : (
        <div className="text-center py-12">
          <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Report Generated</h3>
          <p className="text-gray-600">
            Select your report parameters and click "Generate Report" to view analytics
          </p>
        </div>
      )}
    </Layout>
  );
};
