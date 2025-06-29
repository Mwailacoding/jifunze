import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  CheckCircle, 
  XCircle, 
  ArrowLeft,
  Clock,
  Trophy,
  Flag,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Layout } from '../../components/layout/Layout';
import { useNotification } from '../../contexts/NotificationContext';
import { apiClient } from '../../utils/api';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Badge } from '../../components/ui/Badge';

interface QuizQuestion {
  id: number;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'short_answer';
  options: string[];
  correct_answer: string;
  points: number;
}

interface Quiz {
  id: number;
  title: string;
  description?: string;
  passing_score: number;
  time_limit?: number;
  questions: QuizQuestion[];
}

export const QuizPage: React.FC = () => {
  const { contentId } = useParams<{ contentId: string }>();
  const navigate = useNavigate();
  const { showError, showSuccess } = useNotification();
  
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quizResult, setQuizResult] = useState<any>(null);
  const [showResults, setShowResults] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        setIsLoading(true);
        const quizData = await apiClient.getContentQuiz(Number(contentId));
        setQuiz(quizData);
        
        if (quizData.time_limit) {
          setTimeLeft(quizData.time_limit * 60);
        }
        
        const initialAnswers: Record<number, string> = {};
        quizData.questions.forEach((question: QuizQuestion) => {
          initialAnswers[question.id] = '';
        });
        setAnswers(initialAnswers);
      } catch (error) {
        showError('Error', 'Failed to load quiz');
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuiz();
  }, [contentId, showError]);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || showResults) return;

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
  }, [timeLeft, showResults]);

  const handleAnswerChange = (questionId: number, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const toggleFlag = (questionId: number) => {
    setFlaggedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const goToQuestion = (index: number) => {
    if (index >= 0 && index < (quiz?.questions.length || 0)) {
      setCurrentQuestionIndex(index);
    }
  };

  const handleSubmitQuiz = async (autoSubmit = false) => {
    if (!quiz || isSubmitting) return;

    const unansweredCount = quiz.questions.length - Object.keys(answers).filter(k => answers[Number(k)]).length;
    
    if (!autoSubmit && unansweredCount > 0) {
      if (!window.confirm(`You have ${unansweredCount} unanswered questions. Submit anyway?`)) {
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const submissionAnswers = quiz.questions.map(q => ({
        question_id: q.id,
        answer: answers[q.id] || ''
      }));

      const result = await apiClient.submitQuiz(quiz.id, submissionAnswers);
      setQuizResult(result);
      setShowResults(true);
      
      if (result.passed) {
        showSuccess('Quiz Passed', `You scored ${result.score}/${result.max_score} (${result.percentage}%)`);
      } else {
        showError('Quiz Failed', `You scored ${result.score}/${result.max_score}. Need ${quiz.passing_score}% to pass.`);
      }
    } catch (error) {
      showError('Error', 'Failed to submit quiz');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </Layout>
    );
  }

  if (!quiz) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-neutral-900 mb-2">
            Quiz not available
          </h3>
          <button 
            onClick={() => navigate(-1)} 
            className="btn-primary"
          >
            Go Back
          </button>
        </div>
      </Layout>
    );
  }

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
              {quizResult.passed ? 'Congratulations!' : 'Try Again!'}
            </h1>
            
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div>
                <div className="text-2xl font-bold">
                  {quizResult.score}/{quizResult.max_score}
                </div>
                <div className="text-sm text-neutral-600">Score</div>
              </div>
              <div>
                <div className={`text-2xl font-bold ${
                  quizResult.passed ? 'text-green-600' : 'text-red-600'
                }`}>
                  {Math.round(quizResult.percentage)}%
                </div>
                <div className="text-sm text-neutral-600">Percentage</div>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {quizResult.passed ? 'Passed' : 'Failed'}
                </div>
                <div className="text-sm text-neutral-600">Result</div>
              </div>
            </div>

            <ProgressBar 
              value={quizResult.percentage} 
              color={quizResult.passed ? 'primary' : 'secondary'}
              className="mb-6"
            />

            <div className="flex justify-center space-x-4">
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
                    setCurrentQuestionIndex(0);
                    setAnswers({});
                    setFlaggedQuestions(new Set());
                    if (quiz.time_limit) {
                      setTimeLeft(quiz.time_limit * 60);
                    }
                  }}
                  className="btn-outline"
                >
                  Retake Quiz
                </button>
              )}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const answeredCount = Object.keys(answers).filter(k => answers[Number(k)]).length;
  const totalQuestions = quiz.questions.length;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
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
            
            {timeLeft !== null && (
              <div className="flex items-center space-x-2 px-4 py-2 bg-neutral-100 rounded-lg">
                <Clock className="w-4 h-4" />
                <span className="font-medium">{formatTime(timeLeft)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <div className="card p-4 sticky top-4">
              <h3 className="font-semibold text-neutral-900 mb-4">Questions</h3>
              
              <div className="mb-4">
                <div className="flex justify-between text-sm text-neutral-600 mb-2">
                  <span>Progress</span>
                  <span>{answeredCount}/{totalQuestions}</span>
                </div>
                <ProgressBar 
                  value={(answeredCount / totalQuestions) * 100} 
                  size="sm" 
                />
              </div>

              <div className="grid grid-cols-5 gap-2 mb-4">
                {quiz.questions.map((q, index) => (
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
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="card p-6 mb-6">
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

              <div className="space-y-3">
                {currentQuestion.question_type === 'multiple_choice' && (
                  currentQuestion.options.map((option, index) => (
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
                        onChange={() => handleAnswerChange(currentQuestion.id, option)}
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
                        onChange={() => handleAnswerChange(currentQuestion.id, option)}
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

            <div className="flex items-center justify-between">
              <button
                onClick={() => goToQuestion(currentQuestionIndex - 1)}
                disabled={currentQuestionIndex === 0}
                className="btn-outline disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              {currentQuestionIndex < totalQuestions - 1 ? (
                <button
                  onClick={() => goToQuestion(currentQuestionIndex + 1)}
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
                  {isSubmitting ? <LoadingSpinner size="sm" /> : 'Submit Quiz'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};