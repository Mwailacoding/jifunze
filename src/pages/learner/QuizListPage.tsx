import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  BookOpen,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Trophy,
  AlertCircle,
  Target,
  Timer,
  PlayCircle
} from 'lucide-react';
import { Layout } from '../../components/layout/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { apiClient, Quiz } from '../../utils/api';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Badge } from '../../components/ui/Badge';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Module } from '../../types/index';

export const QuizListPage: React.FC = () => {
  const { moduleId } = useParams<{ moduleId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showError, showInfo } = useNotification();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [module, setModule] = useState<Module | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!moduleId) return;
      
      try {
        setIsLoading(true);
        const [quizzesData, moduleData] = await Promise.all([
          apiClient.getModuleQuizzes(parseInt(moduleId)),
          apiClient.getModule(parseInt(moduleId))
        ]);
        
        setQuizzes(quizzesData);
        setModule(moduleData);
      } catch (error) {
        showError('Error', 'Failed to load quizzes');
        navigate(-1);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [moduleId, showError, navigate]);

  const handleStartQuiz = (quiz: Quiz) => {
    if (quiz.user_result?.passed) {
      showInfo(
        'Quiz Already Completed',
        'You have already passed this quiz. You can retake it if you want to improve your score.'
      );
    }
    navigate(`/quiz/${quiz.id}`);
  };

  const getQuizStatusIcon = (quiz: Quiz) => {
    if (quiz.user_result) {
      return quiz.user_result.passed ? 
        <CheckCircle2 className="w-5 h-5 text-green-600" /> :
        <XCircle className="w-5 h-5 text-red-600" />;
    }
    return <PlayCircle className="w-5 h-5 text-primary-600" />;
  };

  const getQuizStatusText = (quiz: Quiz) => {
    if (quiz.user_result) {
      return quiz.user_result.passed ? 'Passed' : 'Failed';
    }
    return 'Not Started';
  };

  const getQuizStatusColor = (quiz: Quiz) => {
    if (quiz.user_result) {
      return quiz.user_result.passed ? 'text-green-600' : 'text-red-600';
    }
    return 'text-neutral-600';
  };

  const formatDuration = (minutes: number) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${minutes}m`;
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

  if (!module) {
    return (
      <Layout>
        <div className="text-center py-12">
          <AlertCircle className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-neutral-900 mb-2">Module not found</h3>
          <button onClick={() => navigate(-1)} className="btn-primary">
            Go Back
          </button>
        </div>
      </Layout>
    );
  }

  const completedQuizzes = quizzes.filter(q => q.user_result?.passed).length;
  const totalQuizzes = quizzes.length;
  const completionRate = totalQuizzes > 0 ? (completedQuizzes / totalQuizzes) * 100 : 0;

  return (
    <Layout>
      <div className="mb-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center space-x-2 text-neutral-600 hover:text-neutral-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Module</span>
        </button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 mb-2">
              {module.title} - Quizzes
            </h1>
            <p className="text-neutral-600">
              Test your knowledge with these interactive quizzes
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-600">
                {completedQuizzes}
              </div>
              <div className="text-sm text-neutral-600">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-neutral-900">
                {totalQuizzes}
              </div>
              <div className="text-sm text-neutral-600">Total</div>
            </div>
          </div>
        </div>

        <div className="mt-6 card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-neutral-900">Your Progress</h3>
            <span className="text-sm text-neutral-600">
              {Math.round(completionRate)}% Complete
            </span>
          </div>
          <ProgressBar value={completionRate} className="mb-4" />
          
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-xl font-bold text-green-600">{completedQuizzes}</div>
              <div className="text-sm text-neutral-600">Passed</div>
            </div>
            <div>
              <div className="text-xl font-bold text-red-600">
                {quizzes.filter(q => q.user_result && !q.user_result.passed).length}
              </div>
              <div className="text-sm text-neutral-600">Failed</div>
            </div>
            <div>
              <div className="text-xl font-bold text-neutral-600">
                {quizzes.filter(q => !q.user_result).length}
              </div>
              <div className="text-sm text-neutral-600">Not Started</div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {totalQuizzes === 0 ? (
          <div className="card p-8 text-center">
            <BookOpen className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-neutral-900 mb-2">
              No quizzes available
            </h3>
            <p className="text-neutral-600">
              There are no quizzes for this module yet.
            </p>
          </div>
        ) : (
          quizzes.map((quiz) => (
            <div 
              key={quiz.id} 
              className="card p-6 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleStartQuiz(quiz)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    {getQuizStatusIcon(quiz)}
                    <h3 className="text-xl font-semibold text-neutral-900">
                      {quiz.title}
                    </h3>
                    <Badge 
                      level={quiz.user_result?.passed ? 'gold' : 'default'} 
                      size="sm"
                      earned={Boolean(quiz.user_result?.passed)}
                    >
                      {getQuizStatusText(quiz)}
                    </Badge>
                  </div>

                  {quiz.description && (
                    <p className="text-neutral-600 mb-4">{quiz.description}</p>
                  )}

                  <div className="flex items-center space-x-6 text-sm text-neutral-600 mb-4">
                    <div className="flex items-center space-x-2">
                      <Target className="w-4 h-4" />
                      <span>Passing Score: {quiz.passing_score}%</span>
                    </div>
                    
                    {quiz.time_limit && (
                      <div className="flex items-center space-x-2">
                        <Timer className="w-4 h-4" />
                        <span>Time Limit: {formatDuration(quiz.time_limit)}</span>
                      </div>
                    )}
                    
                    {quiz.questions && (
                      <div className="flex items-center space-x-2">
                        <BookOpen className="w-4 h-4" />
                        <span>{quiz.questions.length} Questions</span>
                      </div>
                    )}
                  </div>

                  {quiz.user_result && (
                    <div className="bg-neutral-50 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-neutral-900">Your Best Result</span>
                        <span className={`font-semibold ${getQuizStatusColor(quiz)}`}>
                          {quiz.user_result.score}/{quiz.user_result.max_score} 
                          ({Math.round(quiz.user_result.percentage)}%)
                        </span>
                      </div>
                      <ProgressBar 
                        value={quiz.user_result.percentage} 
                        color={quiz.user_result.passed ? 'primary' : 'secondary'}
                        size="sm"
                      />
                      <div className="text-xs text-neutral-600 mt-1">
                        Completed on {new Date(quiz.user_result.completed_at).toLocaleDateString()}
                      </div>
                    </div>
                  )}
                </div>

                <div className="ml-6 flex flex-col items-end space-y-3">
                  {quiz.user_result?.passed && (
                    <div className="flex items-center space-x-2 text-green-600">
                      <Trophy className="w-4 h-4" />
                      <span className="text-sm font-medium">Completed</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-8 card p-6 bg-primary-50 border-primary-200">
        <h3 className="text-lg font-semibold text-primary-900 mb-3">Quiz Tips</h3>
        <ul className="space-y-2 text-primary-800">
          <li className="flex items-start space-x-2">
            <div className="w-1.5 h-1.5 bg-primary-600 rounded-full mt-2 flex-shrink-0"></div>
            <span>Read each question carefully before selecting your answer</span>
          </li>
          <li className="flex items-start space-x-2">
            <div className="w-1.5 h-1.5 bg-primary-600 rounded-full mt-2 flex-shrink-0"></div>
            <span>You can retake quizzes to improve your score</span>
          </li>
          <li className="flex items-start space-x-2">
            <div className="w-1.5 h-1.5 bg-primary-600 rounded-full mt-2 flex-shrink-0"></div>
            <span>Your best score will be recorded for each quiz</span>
          </li>
          {quizzes.some(q => q.time_limit) && (
            <li className="flex items-start space-x-2">
              <div className="w-1.5 h-1.5 bg-primary-600 rounded-full mt-2 flex-shrink-0"></div>
              <span>Some quizzes have time limits - manage your time wisely</span>
            </li>
          )}
        </ul>
      </div>
    </Layout>
  );
};