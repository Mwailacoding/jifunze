import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ArrowLeft,
  AlertTriangle,
  Trophy,
  RotateCcw
} from 'lucide-react';
import { Layout } from '../../components/layout/Layout';
import { useNotification } from '../../contexts/NotificationContext';
import { apiClient } from '../../utils/api';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Quiz, QuizQuestion } from '../../types';

export const QuizPage: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const { showError, showSuccess } = useNotification();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quizResult, setQuizResult] = useState<any>(null);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    const fetchQuiz = async () => {
      if (!quizId) return;
      
      try {
        setIsLoading(true);
        const data = await apiClient.getQuiz(parseInt(quizId));
        setQuiz(data);
        
        // Set timer if quiz has time limit
        if (data.time_limit) {
          setTimeLeft(data.time_limit * 60); // Convert minutes to seconds
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

  // Timer effect
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || showResults) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev && prev <= 1) {
          handleSubmitQuiz();
          return 0;
        }
        return prev ? prev - 1 : 0;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, showResults]);

  const handleAnswerChange = (questionId: number, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleSubmitQuiz = async () => {
    if (!quiz) return;

    setIsSubmitting(true);
    try {
      const submissionAnswers = quiz.questions?.map(q => ({
        question_id: q.id,
        answer: answers[q.id] || ''
      })) || [];

      const result = await apiClient.submitQuiz(quiz.id, submissionAnswers);
      setQuizResult(result);
      setShowResults(true);
      
      if (result.passed) {
        showSuccess('Quiz Passed!', `You scored ${result.percentage}%`);
      } else {
        showError('Quiz Failed', `You scored ${result.percentage}%. Passing score is ${quiz.passing_score}%`);
      }
    } catch (error) {
      showError('Error', 'Failed to submit quiz');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getAnsweredCount = () => {
    return Object.keys(answers).length;
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

  // Show results page
  if (showResults && quizResult) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto">
          <div className="card p-8 text-center">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
              quizResult.passed ? 'bg-primary-100' : 'bg-red-100'
            }`}>
              {quizResult.passed ? (
                <Trophy className="w-10 h-10 text-primary-600" />
              ) : (
                <XCircle className="w-10 h-10 text-red-600" />
              )}
            </div>

            <h1 className="text-3xl font-bold text-neutral-900 mb-2">
              {quizResult.passed ? 'Congratulations!' : 'Quiz Failed'}
            </h1>
            
            <p className="text-neutral-600 mb-6">
              {quizResult.passed 
                ? 'You have successfully passed the quiz!' 
                : `You need ${quiz.passing_score}% to pass. Don't give up!`
              }
            </p>

            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="text-center">
                <div className="text-2xl font-bold text-neutral-900">
                  {quizResult.score}
                </div>
                <div className="text-sm text-neutral-600">Score</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-neutral-900">
                  {quizResult.max_score}
                </div>
                <div className="text-sm text-neutral-600">Total</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${
                  quizResult.passed ? 'text-primary-600' : 'text-red-600'
                }`}>
                  {Math.round(quizResult.percentage)}%
                </div>
                <div className="text-sm text-neutral-600">Percentage</div>
              </div>
            </div>

            <ProgressBar 
              value={quizResult.percentage} 
              color={quizResult.passed ? 'primary' : 'secondary'}
              className="mb-6"
            />

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate(-1)}
                className="btn-primary"
              >
                Continue Learning
              </button>
              {!quizResult.passed && (
                <button
                  onClick={() => {
                    setShowResults(false);
                    setQuizResult(null);
                    setAnswers({});
                    setCurrentQuestionIndex(0);
                    if (quiz.time_limit) {
                      setTimeLeft(quiz.time_limit * 60);
                    }
                  }}
                  className="btn-outline flex items-center space-x-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Retake Quiz</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const currentQuestion = quiz.questions?.[currentQuestionIndex];
  const totalQuestions = quiz.questions?.length || 0;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
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
            
            {timeLeft !== null && (
              <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                timeLeft < 300 ? 'bg-red-100 text-red-700' : 'bg-neutral-100 text-neutral-700'
              }`}>
                <Clock className="w-4 h-4" />
                <span className="font-medium">{formatTime(timeLeft)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Progress */}
        <div className="card p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-neutral-700">
              Question {currentQuestionIndex + 1} of {totalQuestions}
            </span>
            <span className="text-sm text-neutral-600">
              {getAnsweredCount()} of {totalQuestions} answered
            </span>
          </div>
          <ProgressBar 
            value={((currentQuestionIndex + 1) / totalQuestions) * 100} 
            className="mb-2"
          />
          <ProgressBar 
            value={(getAnsweredCount() / totalQuestions) * 100} 
            color="accent"
            size="sm"
          />
        </div>

        {/* Question */}
        {currentQuestion && (
          <div className="card p-6 mb-6">
            <h2 className="text-xl font-semibold text-neutral-900 mb-6">
              {currentQuestion.question_text}
            </h2>

            <div className="space-y-3">
              {currentQuestion.question_type === 'multiple_choice' && (
                currentQuestion.options.map((option, index) => (
                  <label
                    key={index}
                    className={`flex items-center space-x-3 p-4 rounded-lg border cursor-pointer transition-all ${
                      answers[currentQuestion.id] === option
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`question-${currentQuestion.id}`}
                      value={option}
                      checked={answers[currentQuestion.id] === option}
                      onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                      className="text-primary-600"
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
                        : 'border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`question-${currentQuestion.id}`}
                      value={option}
                      checked={answers[currentQuestion.id] === option}
                      onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                      className="text-primary-600"
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
                  className="input-field min-h-24"
                />
              )}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
            disabled={currentQuestionIndex === 0}
            className="btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          <div className="flex space-x-3">
            {currentQuestionIndex < totalQuestions - 1 ? (
              <button
                onClick={() => setCurrentQuestionIndex(prev => Math.min(totalQuestions - 1, prev + 1))}
                className="btn-primary"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmitQuiz}
                disabled={isSubmitting || getAnsweredCount() === 0}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isSubmitting && <LoadingSpinner size="sm" />}
                <span>Submit Quiz</span>
              </button>
            )}
          </div>
        </div>

        {/* Warning for unanswered questions */}
        {getAnsweredCount() < totalQuestions && (
          <div className="mt-6 p-4 bg-accent-50 border border-accent-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-accent-600" />
              <span className="text-accent-800 font-medium">
                You have {totalQuestions - getAnsweredCount()} unanswered questions
              </span>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};