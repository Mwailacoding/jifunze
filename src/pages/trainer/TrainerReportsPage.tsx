import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  BarChart2, 
  BookOpen, 
  CheckCircle, 
  Clock, 
  Award, 
  RotateCw,
  Users,
  PieChart,
  Download,
  Filter,
  Calendar,
  TrendingUp,
  Target,
  CheckCircle2,
  XCircle,
  AlertCircle,
  BarChart3
} from 'lucide-react';
import { Layout } from '../../components/layout/Layout';
import { useNotification } from '../../contexts/NotificationContext';
import { apiClient, Module } from '../../utils/api';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ProgressBar } from '../../components/ui/ProgressBar';

interface QuizAttempt {
  id: number;
  user_id: number;
  user_name: string;
  score: number;
  passed: boolean;
  attempt_number: number;
  completed_at: string;
}

interface ModuleCompletion {
  content_id: number;
  content_title: string;
  content_type: string;
  completed_count: number;
  total_users: number;
}

interface QuizAnalytics {
  average_score: number;
  pass_rate: number;
  attempts_distribution: { attempt_number: number; count: number }[];
  question_accuracy: { question_id: number; question_text: string; accuracy: number }[];
}

interface LearnerActivity {
  first_name: string;
  last_name: string;
  email: string;
  last_login: string;
  total_content_accessed: number;
  completed_content: number;
  quizzes_taken: number;
  quizzes_passed: number;
  total_score: number;
}

interface QuizPerformance {
  id: number;
  title: string;
  module_title: string;
  total_attempts: number;
  passed_attempts: number;
  avg_score: number;
  questions: {
    question_id: number;
    question_text: string;
    question_type: string;
    correct_rate: number;
    total_attempts: number;
  }[];
}

export const TrainerReportsPage: React.FC = () => {
  const { moduleId } = useParams<{ moduleId: string }>();
  const { showSuccess, showError } = useNotification();
  const [isLoading, setIsLoading] = useState(true);
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);
  const [moduleCompletions, setModuleCompletions] = useState<ModuleCompletion[]>([]);
  const [quizAnalytics, setQuizAnalytics] = useState<QuizAnalytics | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedModule, setSelectedModule] = useState<string>(moduleId || '');
  const [timeRange, setTimeRange] = useState('all');
  const [reportType, setReportType] = useState('module_progress');
  const [learnerActivity, setLearnerActivity] = useState<LearnerActivity[]>([]);
  const [quizPerformances, setQuizPerformances] = useState<QuizPerformance[]>([]);

  const reportTypes = [
    { value: 'module_progress', label: 'Module Progress', icon: BookOpen },
    { value: 'learner_activity', label: 'Learner Activity', icon: Users },
    { value: 'quiz_performance', label: 'Quiz Performance', icon: Award },
    { value: 'completion_rate', label: 'Completion Rates', icon: Target }
  ];

  const timeRanges = [
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'quarter', label: 'This Quarter' },
    { value: 'year', label: 'This Year' },
    { value: 'all', label: 'All Time' }
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        if (moduleId) {
          // Single module view
          const [attemptsRes, completionsRes, analyticsRes] = await Promise.all([
            apiClient.get<QuizAttempt[]>(`/modules/${moduleId}/quiz-attempts`),
            apiClient.get<ModuleCompletion[]>(`/modules/${moduleId}/completion-rates`),
            apiClient.get<QuizAnalytics>(`/modules/${moduleId}/quiz-analytics`)
          ]);

          setQuizAttempts(attemptsRes);
          setModuleCompletions(completionsRes);
          setQuizAnalytics(analyticsRes);
        } else {
          // All modules view
          const [modulesRes, activityRes, quizzesRes] = await Promise.all([
            apiClient.get<Module[]>('/modules'),
            apiClient.get<LearnerActivity[]>('/reports/learner-activity'),
            apiClient.get<QuizPerformance[]>('/reports/quiz-performance')
          ]);

          setModules(modulesRes);
          setLearnerActivity(activityRes);
          setQuizPerformances(quizzesRes);
        }
      } catch (error) {
        showError('Error', 'Failed to load report data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [moduleId, showError]);

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

  const calculateCompletionPercentage = (completed: number, total: number) => {
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  const renderModuleProgressReport = () => {
    if (moduleId) {
      // Single module view
      return (
        <div className="space-y-6">
          {/* Quiz Performance Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 rounded-full bg-green-100 text-green-600">
                <Award className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-semibold text-neutral-900">Quiz Performance</h2>
            </div>
            {quizAnalytics ? (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-neutral-600">Average Score</span>
                    <span className="font-medium">{quizAnalytics.average_score}%</span>
                  </div>
                  <div className="w-full bg-neutral-200 rounded-full h-2.5">
                    <div 
                      className="bg-green-500 h-2.5 rounded-full" 
                      style={{ width: `${quizAnalytics.average_score}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-neutral-600">Pass Rate</span>
                    <span className="font-medium">{quizAnalytics.pass_rate}%</span>
                  </div>
                  <div className="w-full bg-neutral-200 rounded-full h-2.5">
                    <div 
                      className="bg-blue-500 h-2.5 rounded-full" 
                      style={{ width: `${quizAnalytics.pass_rate}%` }}
                    ></div>
                  </div>
                </div>

                <div className="pt-2">
                  <h3 className="text-sm font-medium text-neutral-700 mb-2">Attempts Distribution</h3>
                  <div className="flex space-x-2">
                    {quizAnalytics.attempts_distribution.map((item) => (
                      <div key={item.attempt_number} className="flex-1">
                        <div className="text-xs text-neutral-600 mb-1">
                          {item.attempt_number === 1 ? '1st' : 
                           item.attempt_number === 2 ? '2nd' : 
                           item.attempt_number === 3 ? '3rd' : `${item.attempt_number}th`}
                        </div>
                        <div className="bg-blue-100 rounded h-2">
                          <div 
                            className="bg-blue-500 rounded h-2" 
                            style={{ 
                              width: `${(item.count / Math.max(1, quizAttempts.length)) * 100}%` 
                            }}
                          ></div>
                        </div>
                        <div className="text-xs text-neutral-500 mt-1">{item.count} learners</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-neutral-500">
                No quiz data available
              </div>
            )}
          </div>

          {/* Completion Rates Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-semibold text-neutral-900">Completion Rates</h2>
            </div>
            {moduleCompletions.length > 0 ? (
              <div className="space-y-4">
                {moduleCompletions.map((content) => (
                  <div key={content.content_id}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-neutral-600 truncate max-w-[180px]">
                        {content.content_title}
                      </span>
                      <span className="font-medium">
                        {calculateCompletionPercentage(content.completed_count, content.total_users)}%
                      </span>
                    </div>
                    <div className="w-full bg-neutral-200 rounded-full h-2.5">
                      <div 
                        className={`h-2.5 rounded-full ${
                          content.content_type === 'quiz' ? 'bg-accent-500' : 'bg-primary-500'
                        }`}
                        style={{ 
                          width: `${calculateCompletionPercentage(content.completed_count, content.total_users)}%` 
                        }}
                      ></div>
                    </div>
                    <div className="text-xs text-neutral-500 mt-1">
                      {content.completed_count} of {content.total_users} learners
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-neutral-500">
                No completion data available
              </div>
            )}
          </div>

          {/* Recent Attempts Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                <RotateCw className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-semibold text-neutral-900">Recent Quiz Attempts</h2>
            </div>
            {quizAttempts.length > 0 ? (
              <div className="space-y-3">
                {quizAttempts.slice(0, 4).map((attempt) => (
                  <div key={attempt.id} className="flex items-center justify-between p-2 hover:bg-neutral-50 rounded">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        attempt.passed ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                      }`}>
                        {attempt.passed ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <Clock className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{attempt.user_name}</div>
                        <div className="text-xs text-neutral-500">
                          Attempt #{attempt.attempt_number}
                        </div>
                      </div>
                    </div>
                    <div className={`font-medium ${
                      attempt.passed ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {attempt.score}%
                    </div>
                  </div>
                ))}
                {quizAttempts.length > 4 && (
                  <div className="text-center pt-2">
                    <button className="text-sm text-primary-600 hover:text-primary-800">
                      View all {quizAttempts.length} attempts
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4 text-neutral-500">
                No quiz attempts recorded
              </div>
            )}
          </div>

          {/* Question Accuracy Section */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-3 rounded-full bg-orange-100 text-orange-600">
                <PieChart className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-semibold text-neutral-900">Question Accuracy</h2>
            </div>
            {quizAnalytics?.question_accuracy && quizAnalytics.question_accuracy.length > 0 ? (
              <div className="space-y-4">
                {quizAnalytics.question_accuracy.map((question) => (
                  <div key={question.question_id}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-neutral-600">
                        {question.question_text.length > 60 
                          ? `${question.question_text.substring(0, 60)}...` 
                          : question.question_text}
                      </span>
                      <span className="font-medium">{Math.round(question.accuracy * 100)}%</span>
                    </div>
                    <div className="w-full bg-neutral-200 rounded-full h-2.5">
                      <div 
                        className={`h-2.5 rounded-full ${
                          question.accuracy >= 0.7 ? 'bg-green-500' : 
                          question.accuracy >= 0.4 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${question.accuracy * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-neutral-500">
                No question accuracy data available
              </div>
            )}
          </div>

          {/* Content vs Quiz Completion */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-3 rounded-full bg-indigo-100 text-indigo-600">
                <BarChart2 className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-semibold text-neutral-900">Content vs Quiz Completion</h2>
            </div>
            {moduleCompletions.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-neutral-700 mb-3">Content Completion</h3>
                  <div className="space-y-3">
                    {moduleCompletions
                      .filter(c => c.content_type !== 'quiz')
                      .map(content => (
                        <div key={content.content_id}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-neutral-600 truncate max-w-[180px]">
                              {content.content_title}
                            </span>
                            <span className="font-medium">
                              {calculateCompletionPercentage(content.completed_count, content.total_users)}%
                            </span>
                          </div>
                          <div className="w-full bg-neutral-200 rounded-full h-2">
                            <div 
                              className="bg-primary-500 h-2 rounded-full" 
                              style={{ 
                                width: `${calculateCompletionPercentage(content.completed_count, content.total_users)}%` 
                              }}
                            ></div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-neutral-700 mb-3">Quiz Completion</h3>
                  {moduleCompletions.filter(c => c.content_type === 'quiz').length > 0 ? (
                    <div className="space-y-3">
                      {moduleCompletions
                        .filter(c => c.content_type === 'quiz')
                        .map(content => (
                          <div key={content.content_id}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-neutral-600 truncate max-w-[180px]">
                                {content.content_title}
                              </span>
                              <span className="font-medium">
                                {calculateCompletionPercentage(content.completed_count, content.total_users)}%
                              </span>
                            </div>
                            <div className="w-full bg-neutral-200 rounded-full h-2">
                              <div 
                                className="bg-accent-500 h-2 rounded-full" 
                                style={{ 
                                  width: `${calculateCompletionPercentage(content.completed_count, content.total_users)}%` 
                                }}
                              ></div>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-neutral-500">
                      No quiz content in this module
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-neutral-500">
                No completion data available
              </div>
            )}
          </div>
        </div>
      );
    } else {
      // All modules view
      return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">All Modules Progress</h3>
            <div className="space-y-4">
              {modules.map((module) => (
                <div key={module.id} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{module.title}</h4>
                    <span className="text-sm text-gray-600">{module.category}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Content Items:</span>
                      <span className="ml-1 font-medium">{module.total_items}</span>
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
  };

  const renderLearnerActivityReport = () => {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Learner Activity</h3>
          <div className="space-y-4">
            {learnerActivity.map((activity, index) => (
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

  const renderQuizPerformanceReport = () => {
    return (
      <div className="space-y-6">
        {quizPerformances.map((quiz) => (
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
                  {quiz.questions.map((question, index) => (
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

  const renderCompletionRateReport = () => {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Module Completion Rates</h3>
          <div className="space-y-4">
            {modules.map((module) => (
              <div key={module.id} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900">{module.title}</h4>
                  <span className="text-lg font-bold text-blue-600">
                    {module.completion_rate}%
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                  <div className="text-center">
                    <div className="font-medium text-gray-900">{module.total_items}</div>
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
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      );
    }

    switch (reportType) {
      case 'module_progress':
        return renderModuleProgressReport();
      case 'learner_activity':
        return renderLearnerActivityReport();
      case 'quiz_performance':
        return renderQuizPerformanceReport();
      case 'completion_rate':
        return renderCompletionRateReport();
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
            <h1 className="text-3xl font-bold text-gray-900">
              {moduleId ? 'Module Analytics' : 'Reports & Analytics'}
            </h1>
            <p className="text-gray-600 mt-1">
              {moduleId 
                ? 'Detailed insights into learner progress and quiz performance'
                : 'Analyze learner performance and training effectiveness'}
            </p>
          </div>
          {!moduleId && (
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
          )}
        </div>
      </div>

      {!moduleId && (
        <>
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
                onClick={() => window.location.reload()}
                disabled={isLoading}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isLoading && <LoadingSpinner size="sm" />}
                <BarChart3 className="w-4 h-4" />
                <span>Refresh Data</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Report Content */}
      {renderReport()}
    </Layout>
  );
};