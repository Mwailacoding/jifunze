import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  XCircle, 
  ArrowLeft,
  AlertTriangle,
  Trophy,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Flag,
  Save,
  Timer,
  Target,
  Award
} from 'lucide-react';
import { Layout } from '../../components/layout/Layout';
import { useNotification } from '../../contexts/NotificationContext';
import { apiClient, Quiz, QuizResult } from '../../utils/api';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { QuizQuestion } from '../../types';
import { Badge } from '../../components/ui/Badge';

interface QuizAnswer {
  question_id: number;
  answer: string;
}



export const QuizPage: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const { showError, showSuccess, showWarning, showInfo } = useNotification();
  
  // Quiz state
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());
  
  // Timer state
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  
  // Quiz submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [showResults, setShowResults] = useState(false);
  
  // UI state
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');

  // Load quiz data
  useEffect(() => {
    const fetchQuiz = async () => {
      if (!quizId) return;
      
      try {
        setIsLoading(true);
        const data = await apiClient.getQuiz(parseInt(quizId));
        setQuiz(data);
        
        // Initialize answers state with empty values for all questions
        if (data.questions) {
          const initialAnswers = data.questions.reduce((acc: Record<number, string>, question) => {
            acc[question.id] = '';
            return acc;
          }, {});
          setAnswers(initialAnswers);
        }
        
        // Initialize timer if quiz has time limit
        if (data.time_limit) {
          setTimeLeft(data.time_limit * 60);
          setStartTime(new Date());
        }
      } catch (error) {
        showError('Error', 'Failed to load quiz');
        navigate(-1);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuiz();
  }, [quizId, showError, navigate]);

  // Timer countdown effect
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || showResults || isSubmitting) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev && prev <= 1) {
          handleSubmitQuiz(true);
          return 0;
        }
        return prev ? prev - 1 : 0;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, showResults, isSubmitting]);

  // Auto-save answers periodically
  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      if (Object.keys(answers).length > 0 && !showResults) {
        setAutoSaveStatus('saving');
        setTimeout(() => setAutoSaveStatus('saved'), 1000);
      }
    }, 30000);

    return () => clearInterval(autoSaveInterval);
  }, [answers, showResults]);

  // Handle answer changes
  const handleAnswerChange = useCallback((questionId: number, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  }, []);

  // Toggle question flagging
  const toggleFlag = useCallback((questionId: number) => {
    setFlaggedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  }, []);

  // Navigation functions
  const goToQuestion = useCallback((index: number) => {
    if (index >= 0 && index < (quiz?.questions?.length || 0)) {
      setCurrentQuestionIndex(index);
    }
  }, [quiz]);

  const goToPrevious = useCallback(() => {
    goToQuestion(currentQuestionIndex - 1);
  }, [currentQuestionIndex, goToQuestion]);

  const goToNext = useCallback(() => {
    goToQuestion(currentQuestionIndex + 1);
  }, [currentQuestionIndex, goToQuestion]);

  // Submit quiz
  const handleSubmitQuiz = async (autoSubmit = false) => {
    if (!quiz || isSubmitting) return;

    // Check for unanswered questions
    const unansweredCount = (quiz.questions?.length || 0) - Object.keys(answers).length;
    
    if (!autoSubmit && unansweredCount > 0) {
      setShowSubmitConfirm(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const submissionAnswers: QuizAnswer[] = quiz.questions?.map(q => ({
        question_id: q.id,
        answer: answers[q.id] || ''
      })) || [];

      const result = await apiClient.submitQuiz(quiz.id, submissionAnswers);
      
      setQuizResult(result);
      setShowResults(true);
      setShowSubmitConfirm(false);
      
      if (result.passed) {
        showSuccess(
          'Congratulations!', 
          `You passed with ${Math.round(result.percentage)}%`
        );
      } else {
        showWarning(
          'Quiz Not Passed', 
          `You scored ${Math.round(result.percentage)}%. You need ${quiz.passing_score}% to pass.`
        );
      }

      if (result.badges_awarded && result.badges_awarded.length > 0) {
        showInfo(
          'Badges Earned!',
          `You earned ${result.badges_awarded.length} new badge${result.badges_awarded.length > 1 ? 's' : ''}!`
        );
      }
    } catch (error) {
      showError('Error', 'Failed to submit quiz');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset quiz for retake
  const handleRetakeQuiz = () => {
    setShowResults(false);
    setQuizResult(null);
    setAnswers({});
    setFlaggedQuestions(new Set());
    setCurrentQuestionIndex(0);
    setShowSubmitConfirm(false);
    
    if (quiz?.time_limit) {
      setTimeLeft(quiz.time_limit * 60);
      setStartTime(new Date());
    }
  };

  // Utility functions
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getAnsweredCount = () => Object.keys(answers).length;
  const getTotalQuestions = () => quiz?.questions?.length || 0;
  const getProgressPercentage = () => {
    const total = getTotalQuestions();
    return total > 0 ? (getAnsweredCount() / total) * 100 : 0;
  };

  // Loading state
  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </Layout>
    );
  }

  // Quiz not found
  if (!quiz) {
    return (
      <Layout>
        <div className="text-center py-12">
          <AlertTriangle className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-neutral-900 mb-2">Quiz not found</h3>
          <button onClick={() => navigate(-1)} className="btn-primary">
            Go Back
          </button>
        </div>
      </Layout>
    );
  }

  // Results view
  if (showResults && quizResult) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto">
          <div className="card p-8 text-center">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${
              quizResult.passed ? 'bg-green-100' : 'bg-red-100'
            }`}>
              {quizResult.passed ? (
                <Trophy className="w-12 h-12 text-green-600" />
              ) : (
                <XCircle className="w-12 h-12 text-red-600" />
              )}
            </div>

            <h1 className="text-3xl font-bold text-neutral-900 mb-2">
              {quizResult.passed ? 'Congratulations!' : 'Keep Trying!'}
            </h1>
            
            <p className="text-neutral-600 mb-8">
              {quizResult.passed 
                ? 'You have successfully passed the quiz!' 
                : `You need ${quiz.passing_score}% to pass. Don't give up!`
              }
            </p>

            {/* Score Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-neutral-900">
                  {quizResult.score}
                </div>
                <div className="text-sm text-neutral-600">Your Score</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-neutral-900">
                  {quizResult.max_score}
                </div>
                <div className="text-sm text-neutral-600">Total Points</div>
              </div>
              <div className="text-center">
                <div className={`text-3xl font-bold ${
                  quizResult.passed ? 'text-green-600' : 'text-red-600'
                }`}>
                  {Math.round(quizResult.percentage)}%
                </div>
                <div className="text-sm text-neutral-600">Percentage</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary-600">
                  {quizResult.points_awarded || 0}
                </div>
                <div className="text-sm text-neutral-600">Points Earned</div>
              </div>
            </div>

            <ProgressBar 
              value={quizResult.percentage} 
              color={quizResult.passed ? 'primary' : 'secondary'}
              className="mb-8"
            />

            {/* Badges */}
            {quizResult.badges_awarded && quizResult.badges_awarded.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-neutral-900 mb-4">Badges Earned</h3>
                <div className="flex justify-center space-x-2">
                  {quizResult.badges_awarded.map((badge, index) => (
                    <Badge key={index} level="gold" size="lg" earned>
                      <Award className="w-4 h-4" />
                      {badge}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate(-1)}
                className="btn-primary"
              >
                Continue Learning
              </button>
              {!quizResult.passed && (
                <button
                  onClick={handleRetakeQuiz}
                  className="btn-outline flex items-center space-x-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Retake Quiz</span>
                </button>
              )}
              {quizResult.passed && (
                <button
                  onClick={() => {
                    showInfo('Certificate', 'Certificate download feature coming soon!');
                  }}
                  className="btn-outline flex items-center space-x-2"
                >
                  <Award className="w-4 h-4" />
                  <span>Download Certificate</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const currentQuestion = quiz.questions?.[currentQuestionIndex];
  const totalQuestions = getTotalQuestions();

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center space-x-2 text-neutral-600 hover:text-neutral-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">{quiz.title}</h1>
              {quiz.description && (
                <p className="text-neutral-600 mt-1">{quiz.description}</p>
              )}
            </div>
            
            {/* Timer and Quiz Info */}
            <div className="flex items-center space-x-4">
              {timeLeft !== null && (
                <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                  timeLeft < 300 ? 'bg-red-100 text-red-700' : 'bg-primary-100 text-primary-700'
                }`}>
                  <Timer className="w-4 h-4" />
                  <span className="font-medium">{formatTime(timeLeft)}</span>
                </div>
              )}
              
              <div className="flex items-center space-x-2 px-4 py-2 bg-neutral-100 rounded-lg">
                <Target className="w-4 h-4 text-neutral-600" />
                <span className="text-neutral-700">Pass: {quiz.passing_score}%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Question Navigation Sidebar */}
          <div className="lg:col-span-1">
            <div className="card p-4 sticky top-4">
              <h3 className="font-semibold text-neutral-900 mb-4">Questions</h3>
              
              {/* Progress Summary */}
              <div className="mb-4">
                <div className="flex justify-between text-sm text-neutral-600 mb-2">
                  <span>Progress</span>
                  <span>{getAnsweredCount()}/{totalQuestions}</span>
                </div>
                <ProgressBar value={getProgressPercentage()} size="sm" />
              </div>

              {/* Question Grid */}
              <div className="grid grid-cols-5 gap-2 mb-4">
                {quiz.questions?.map((q, index) => (
                  <button
                    key={q.id}
                    onClick={() => goToQuestion(index)}
                    className={`w-8 h-8 rounded text-xs font-medium transition-all relative ${
                      index === currentQuestionIndex
                        ? 'bg-primary-600 text-white'
                        : answers[q.id]
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    {index + 1}
                    {flaggedQuestions.has(q.id) && (
                      <Flag className="w-2 h-2 text-red-500 absolute -top-0.5 -right-0.5" />
                    )}
                  </button>
                ))}
              </div>

              {/* Legend */}
              <div className="space-y-2 text-xs text-neutral-600">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-100 rounded"></div>
                  <span>Answered</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-neutral-100 rounded"></div>
                  <span>Not answered</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-primary-600 rounded"></div>
                  <span>Current</span>
                </div>
              </div>

              {/* Auto-save Status */}
              <div className="mt-4 pt-4 border-t border-neutral-200">
                <div className="flex items-center space-x-2 text-xs">
                  <Save className="w-3 h-3" />
                  <span className={
                    autoSaveStatus === 'saved' ? 'text-green-600' :
                    autoSaveStatus === 'saving' ? 'text-blue-600' : 'text-red-600'
                  }>
                    {autoSaveStatus === 'saved' ? 'Auto-saved' :
                     autoSaveStatus === 'saving' ? 'Saving...' : 'Save error'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Question Area */}
          <div className="lg:col-span-3">
            {currentQuestion && (
              <div className="card p-6 mb-6">
                {/* Question Header */}
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <span className="text-sm font-medium text-neutral-600">
                        Question {currentQuestionIndex + 1} of {totalQuestions}
                      </span>
                      <button
                        onClick={() => toggleFlag(currentQuestion.id)}
                        className={`flex items-center space-x-1 px-2 py-1 rounded text-xs transition-colors ${
                          flaggedQuestions.has(currentQuestion.id)
                            ? 'bg-red-100 text-red-700'
                            : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                        }`}
                      >
                        <Flag className="w-3 h-3" />
                        <span>{flaggedQuestions.has(currentQuestion.id) ? 'Flagged' : 'Flag'}</span>
                      </button>
                    </div>
                    <h2 className="text-xl font-semibold text-neutral-900">
                      {currentQuestion.question_text}
                    </h2>
                  </div>
                  
                  <div className="text-sm text-neutral-600">
                    {currentQuestion.points} point{currentQuestion.points !== 1 ? 's' : ''}
                  </div>
                </div>

                {/* Answer Options */}
                <div className="space-y-3">
                  {currentQuestion.question_type === 'multiple_choice' && (
                    currentQuestion.options?.map((option, index) => (
                      <label
                        key={index}
                        className={`flex items-center space-x-3 p-4 rounded-lg border cursor-pointer transition-all ${
                          answers[currentQuestion.id] === option
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`question-${currentQuestion.id}`}
                          value={option}
                          checked={answers[currentQuestion.id] === option}
                          onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                          className="text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-neutral-900">{option}</span>
                      </label>
                    ))
                  )}

                  {currentQuestion.question_type === 'true_false' && (
                    ['True', 'False'].map((option) => (
                      <label
                        key={option}
                        className={`flex items-center space-x-3 p-4 rounded-lg border cursor-pointer transition-all ${
                          answers[currentQuestion.id] === option
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`question-${currentQuestion.id}`}
                          value={option}
                          checked={answers[currentQuestion.id] === option}
                          onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                          className="text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-neutral-900">{option}</span>
                      </label>
                    ))
                  )}

                  {currentQuestion.question_type === 'short_answer' && (
                    <textarea
                      value={answers[currentQuestion.id] || ''}
                      onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                      placeholder="Enter your answer..."
                      className="w-full p-4 border border-neutral-200 rounded-lg focus:border-primary-500 focus:ring focus:ring-primary-200 min-h-24"
                    />
                  )}
                </div>
              </div>
            )}

            {/* Navigation and Submit Controls */}
            <div className="flex items-center justify-between">
              <button
                onClick={goToPrevious}
                disabled={currentQuestionIndex === 0}
                className="btn-outline disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <div className="flex items-center space-x-3">
                {/* Unanswered Warning */}
                {getTotalQuestions() - getAnsweredCount() > 0 && (
                  <div className="text-sm text-amber-600 flex items-center space-x-1">
                    <AlertTriangle className="w-4 h-4" />
                    <span>{getTotalQuestions() - getAnsweredCount()} unanswered</span>
                  </div>
                )}

                {currentQuestionIndex < totalQuestions - 1 ? (
                  <button
                    onClick={goToNext}
                    className="btn-primary flex items-center space-x-2"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => handleSubmitQuiz()}
                    disabled={isSubmitting}
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {isSubmitting && <LoadingSpinner size="sm" />}
                    <span>Submit Quiz</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Submit Confirmation Modal */}
        {showSubmitConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold text-neutral-900 mb-4">
                Submit Quiz?
              </h3>
              <p className="text-neutral-600 mb-6">
                You have {getTotalQuestions() - getAnsweredCount()} unanswered questions. 
                Are you sure you want to submit your quiz?
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowSubmitConfirm(false)}
                  className="btn-outline flex-1"
                >
                  Review Answers
                </button>
                <button
                  onClick={() => handleSubmitQuiz()}
                  className="btn-primary flex-1"
                >
                  Submit Quiz
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};