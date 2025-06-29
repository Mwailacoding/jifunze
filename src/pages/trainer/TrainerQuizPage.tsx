import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  PlusCircle, 
  List, 
  Edit, 
  Trash2, 
  CheckCircle, 
  XCircle,
  ArrowLeft,
  Clock,
  Award,
  Users,
  BookOpen
} from 'lucide-react';
import { Layout } from '../../components/layout/Layout';
import { useNotification } from '../../contexts/NotificationContext';
import { apiClient } from '../../utils/api';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';

interface Quiz {
  id: number;
  title: string;
  description?: string;
  passing_score: number;
  time_limit?: number;
  module_id: number;
  module_title: string;
  is_active: boolean;
  question_count: number;
}

interface QuizQuestion {
  id: number;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'short_answer';
  options: string[];
  correct_answer: string;
  points: number;
}

interface AssignmentData {
  assignment_type: 'all' | 'department' | 'individual';
  individual_id: string;
  department_id: string;
  employer_id: string;
  due_date: string;
  is_mandatory: boolean;
  notes: string;
}

export const TrainerQuizPage: React.FC = () => {
  const { moduleId } = useParams<{ moduleId: string }>();
  const navigate = useNavigate();
  const { showError, showSuccess } = useNotification();
  
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [assignmentData, setAssignmentData] = useState<AssignmentData>({
    assignment_type: 'all',
    individual_id: '',
    department_id: '',
    employer_id: '',
    due_date: '',
    is_mandatory: false,
    notes: ''
  });
  
  const [newQuestion, setNewQuestion] = useState({
    question_text: '',
    question_type: 'multiple_choice' as 'multiple_choice' | 'true_false' | 'short_answer',
    options: ['', ''],
    correct_answer: '',
    points: 1
  });

  const [showContentQuestionModal, setShowContentQuestionModal] = useState(false);

  useEffect(() => {
    const fetchQuizzes = async () => {
      if (!moduleId) return;
      
      try {
        setIsLoading(true);
        const data = await apiClient.get<Quiz[]>(`/trainer/quizzes?module_id=${moduleId}`);
        setQuizzes(data);
      } catch (error) {
        showError('Error', 'Failed to load quizzes');
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuizzes();
  }, [moduleId, showError]);

  useEffect(() => {
    const fetchQuestions = async () => {
      if (!selectedQuiz) return;
      
      try {
        setIsLoading(true);
        const data = await apiClient.get<QuizQuestion[]>(`/trainer/quizzes/${selectedQuiz.id}/questions`);
        setQuestions(data);
      } catch (error) {
        showError('Error', 'Failed to load questions');
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestions();
  }, [selectedQuiz, showError]);

  const handleCreateQuiz = async () => {
    try {
      setIsSubmitting(true);
      const quiz = await apiClient.post<Quiz>('/quizzes', {
        module_id: moduleId,
        title: 'New Quiz',
        passing_score: 80,
        is_active: true
      });
      
      setQuizzes(prev => [...prev, quiz]);
      showSuccess('Success', 'Quiz created successfully');
    } catch (error) {
      showError('Error', 'Failed to create quiz');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddQuestion = async () => {
    try {
      setIsSubmitting(true);
      if (!selectedQuiz) return;
      
      const question = await apiClient.post<QuizQuestion>(
        `/trainer/quizzes/${selectedQuiz.id}/questions`,
        newQuestion
      );
      
      setQuestions(prev => [...prev, question]);
      setShowQuestionModal(false);
      setNewQuestion({
        question_text: '',
        question_type: 'multiple_choice',
        options: ['', ''],
        correct_answer: '',
        points: 1
      });
      showSuccess('Success', 'Question added successfully');
    } catch (error) {
      showError('Error', 'Failed to add question');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddContentQuestions = async () => {
    const contentId = 35;
    try {
      setIsSubmitting(true);
      
      const payload = {
        question_text: "is safety a priority",
        question_type: "true_false",
        options: ["True", "False"],
        correct_answer: "True",
        points: 1
      };

      console.log('Sending content question payload:', JSON.stringify(payload, null, 2));
      const response = await apiClient.post(`/content/${contentId}/questions`, payload);
      showSuccess('Success', 'Content question added successfully');
      setShowContentQuestionModal(false);
    } catch (error) {
      let errorMessage = 'Unknown error';
      if (typeof error === 'object' && error !== null && 'response' in error) {
        const err = error as { response?: { data?: { message?: string } } };
        errorMessage = err.response?.data?.message || 'Unknown error';
      }
      showError('Error', 'Failed to add content question: ' + errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignQuiz = async () => {
    try {
      setIsSubmitting(true);
      if (!selectedQuiz) return;
      
      await apiClient.post(
        `/trainer/quizzes/${selectedQuiz.id}/assign`,
        assignmentData
      );
      
      setShowAssignModal(false);
      showSuccess('Success', 'Quiz assigned successfully');
    } catch (error) {
      showError('Error', 'Failed to assign quiz');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuestionTypeChange = (type: 'multiple_choice' | 'true_false' | 'short_answer') => {
    setNewQuestion(prev => ({
      ...prev,
      question_type: type,
      options: type === 'true_false' ? ['True', 'False'] : ['', ''],
      correct_answer: type === 'true_false' ? 'True' : ''
    }));
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...newQuestion.options];
    newOptions[index] = value;
    setNewQuestion(prev => ({ ...prev, options: newOptions }));
  };

  const addOption = () => {
    setNewQuestion(prev => ({ ...prev, options: [...prev.options, ''] }));
  };

  const removeOption = (index: number) => {
    const newOptions = newQuestion.options.filter((_, i) => i !== index);
    setNewQuestion(prev => ({ ...prev, options: newOptions }));
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
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center space-x-2 text-neutral-600 hover:text-neutral-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Module</span>
          </button>

          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-neutral-900">Manage Quizzes</h1>
            <div className="flex space-x-3">
              <button
                onClick={handleCreateQuiz}
                className="btn-primary flex items-center space-x-2"
                disabled={isSubmitting}
              >
                {isSubmitting ? <LoadingSpinner size="sm" /> : <PlusCircle className="w-4 h-4" />}
                <span>Create Quiz</span>
              </button>
              <button
                onClick={() => setShowContentQuestionModal(true)}
                className="btn-primary flex items-center space-x-2"
                disabled={isSubmitting}
              >
                <PlusCircle className="w-4 h-4" />
                <span>Add Content Questions</span>
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="card p-4">
              <h3 className="font-semibold text-neutral-900 mb-4">Quizzes</h3>
              
              {quizzes.length === 0 ? (
                <div className="text-center py-8 text-neutral-500">
                  <p>No quizzes created yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {quizzes.map(quiz => (
                    <div
                      key={quiz.id}
                      className={`p-3 rounded-lg cursor-pointer transition-all ${
                        selectedQuiz?.id === quiz.id
                          ? 'bg-primary-100 border border-primary-300'
                          : 'bg-neutral-50 hover:bg-neutral-100'
                      }`}
                      onClick={() => setSelectedQuiz(quiz)}
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{quiz.title}</h4>
                        <Badge level={quiz.is_active ? 'success' : 'default'} size="sm">
                          {quiz.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-neutral-600 mt-1">
                        <BookOpen className="w-3 h-3" />
                        <span>{quiz.module_title}</span>
                      </div>
                      <div className="flex items-center space-x-4 text-sm mt-2">
                        <div className="flex items-center space-x-1">
                          <List className="w-3 h-3" />
                          <span>{quiz.question_count} questions</span>
                        </div>
                        {quiz.time_limit && (
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{quiz.time_limit} min</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2">
            {selectedQuiz ? (
              <div className="card p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-neutral-900">{selectedQuiz.title}</h2>
                    <p className="text-neutral-600">{selectedQuiz.description || 'No description'}</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setShowAssignModal(true)}
                      className="btn-outline flex items-center space-x-2"
                    >
                      <Users className="w-4 h-4" />
                      <span>Assign</span>
                    </button>
                    <button className="btn-primary flex items-center space-x-2">
                      <Edit className="w-4 h-4" />
                      <span>Edit</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-neutral-50 p-3 rounded-lg">
                    <div className="text-sm text-neutral-600">Passing Score</div>
                    <div className="text-lg font-semibold">{selectedQuiz.passing_score}%</div>
                  </div>
                  <div className="bg-neutral-50 p-3 rounded-lg">
                    <div className="text-sm text-neutral-600">Time Limit</div>
                    <div className="text-lg font-semibold">
                      {selectedQuiz.time_limit ? `${selectedQuiz.time_limit} min` : 'None'}
                    </div>
                  </div>
                  <div className="bg-neutral-50 p-3 rounded-lg">
                    <div className="text-sm text-neutral-600">Status</div>
                    <div className="text-lg font-semibold">
                      {selectedQuiz.is_active ? (
                        <span className="text-green-600">Active</span>
                      ) : (
                        <span className="text-red-600">Inactive</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-neutral-900">Questions</h3>
                  <button
                    onClick={() => setShowQuestionModal(true)}
                    className="btn-primary flex items-center space-x-2"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Add Question</span>
                  </button>
                </div>

                {questions.length === 0 ? (
                  <div className="text-center py-8 text-neutral-500">
                    <p>No questions added yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {questions.map((question, index) => (
                      <div key={question.id} className="border border-neutral-200 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">Q{index + 1}:</span>
                              <span>{question.question_text}</span>
                            </div>
                            <div className="mt-2">
                              <span className="text-sm text-neutral-600">
                                Type: {question.question_type.replace('_', ' ')}
                              </span>
                              <span className="mx-2">•</span>
                              <span className="text-sm text-neutral-600">
                                Points: {question.points}
                              </span>
                            </div>
                          </div>
                          <button className="text-red-600 hover:text-red-800">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {question.question_type !== 'short_answer' && (
                          <div className="mt-3">
                            <div className="text-sm text-neutral-600 mb-1">Options:</div>
                            <div className="space-y-1">
                              {question.options.map((option, i) => (
                                <div
                                  key={i}
                                  className={`flex items-center space-x-2 p-2 rounded ${
                                    option === question.correct_answer
                                      ? 'bg-green-50 border border-green-200'
                                      : 'bg-neutral-50'
                                  }`}
                                >
                                  {option === question.correct_answer ? (
                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                  ) : (
                                    <XCircle className="w-4 h-4 text-neutral-400" />
                                  )}
                                  <span>{option}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="card p-8 text-center">
                <Award className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-neutral-900 mb-2">
                  Select a Quiz
                </h3>
                <p className="text-neutral-600">
                  Choose a quiz from the list to view and edit its details
                </p>
              </div>
            )}
          </div>
        </div>

        <Modal
          isOpen={showQuestionModal}
          onClose={() => setShowQuestionModal(false)}
          title="Add New Question"
          size="lg"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Question Text
              </label>
              <textarea
                value={newQuestion.question_text}
                onChange={(e) => setNewQuestion({...newQuestion, question_text: e.target.value})}
                className="w-full p-2 border border-neutral-300 rounded focus:ring focus:ring-primary-200 focus:border-primary-500"
                rows={3}
                placeholder="Enter the question text..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Question Type
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  className={`p-2 border rounded ${
                    newQuestion.question_type === 'multiple_choice'
                      ? 'bg-primary-100 border-primary-500'
                      : 'border-neutral-300'
                  }`}
                  onClick={() => handleQuestionTypeChange('multiple_choice')}
                >
                  Multiple Choice
                </button>
                <button
                  type="button"
                  className={`p-2 border rounded ${
                    newQuestion.question_type === 'true_false'
                      ? 'bg-primary-100 border-primary-500'
                      : 'border-neutral-300'
                  }`}
                  onClick={() => handleQuestionTypeChange('true_false')}
                >
                  True/False
                </button>
                <button
                  type="button"
                  className={`p-2 border rounded ${
                    newQuestion.question_type === 'short_answer'
                      ? 'bg-primary-100 border-primary-500'
                      : 'border-neutral-300'
                  }`}
                  onClick={() => handleQuestionTypeChange('short_answer')}
                >
                  Short Answer
                </button>
              </div>
            </div>

            {newQuestion.question_type !== 'short_answer' && (
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Options
                </label>
                <div className="space-y-2">
                  {newQuestion.options.map((option, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input
                        type={newQuestion.question_type === 'multiple_choice' ? 'radio' : 'hidden'}
                        name="correct_option"
                        checked={option === newQuestion.correct_answer}
                        onChange={() => setNewQuestion({...newQuestion, correct_answer: option})}
                        className="text-primary-600 focus:ring-primary-500"
                      />
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => handleOptionChange(index, e.target.value)}
                        className="flex-1 p-2 border border-neutral-300 rounded focus:ring focus:ring-primary-200 focus:border-primary-500"
                        placeholder={`Option ${index + 1}`}
                      />
                      {newQuestion.question_type === 'multiple_choice' && newQuestion.options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeOption(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {newQuestion.question_type === 'multiple_choice' && (
                  <button
                    type="button"
                    onClick={addOption}
                    className="mt-2 text-sm text-primary-600 hover:text-primary-800 flex items-center space-x-1"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Add Option</span>
                  </button>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Points
                </label>
                <input
                  type="number"
                  min="1"
                  value={newQuestion.points}
                  onChange={(e) => setNewQuestion({...newQuestion, points: parseInt(e.target.value) || 1})}
                  className="w-full p-2 border border-neutral-300 rounded focus:ring focus:ring-primary-200 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Correct Answer
                </label>
                {newQuestion.question_type === 'short_answer' ? (
                  <input
                    type="text"
                    value={newQuestion.correct_answer}
                    onChange={(e) => setNewQuestion({...newQuestion, correct_answer: e.target.value})}
                    className="w-full p-2 border border-neutral-300 rounded focus:ring focus:ring-primary-200 focus:border-primary-500"
                    placeholder="Expected answer"
                  />
                ) : (
                  <div className="p-2 bg-neutral-100 rounded">
                    {newQuestion.correct_answer || 'Select correct answer'}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setShowQuestionModal(false)}
                className="btn-outline"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddQuestion}
                disabled={!newQuestion.question_text || !newQuestion.correct_answer}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? <LoadingSpinner size="sm" /> : 'Add Question'}
              </button>
            </div>
          </div>
        </Modal>

        <Modal
          isOpen={showContentQuestionModal}
          onClose={() => setShowContentQuestionModal(false)}
          title="Add Content Question"
          size="md"
        >
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-neutral-700 mb-2">Question to Add</h3>
              <div className="p-4 bg-neutral-50 rounded">
                <p className="font-medium">Question:</p>
                <p className="mb-2">"is safety a priority"</p>
                <p className="font-medium">Type:</p>
                <p className="mb-2">true_false</p>
                <p className="font-medium">Options:</p>
                <p className="mb-2">True, False</p>
                <p className="font-medium">Correct Answer:</p>
                <p>True</p>
              </div>
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setShowContentQuestionModal(false)}
                className="btn-outline"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddContentQuestions}
                className="btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? <LoadingSpinner size="sm" /> : 'Add Content Question'}
              </button>
            </div>
          </div>
        </Modal>

        <Modal
          isOpen={showAssignModal}
          onClose={() => setShowAssignModal(false)}
          title="Assign Quiz"
          size="md"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Assignment Type
              </label>
              <select
                value={assignmentData.assignment_type}
                onChange={(e) => setAssignmentData({
                  ...assignmentData,
                  assignment_type: e.target.value as 'all' | 'department' | 'individual'
                })}
                className="w-full p-2 border border-neutral-300 rounded focus:ring focus:ring-primary-200 focus:border-primary-500"
              >
                <option value="all">All Learners</option>
                <option value="department">Department</option>
                <option value="individual">Individual Learner</option>
              </select>
            </div>

            {assignmentData.assignment_type === 'individual' && (
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Select Learner
                </label>
                <input
                  type="text"
                  value={assignmentData.individual_id}
                  onChange={(e) => setAssignmentData({
                    ...assignmentData,
                    individual_id: e.target.value
                  })}
                  className="w-full p-2 border border-neutral-300 rounded focus:ring focus:ring-primary-200 focus:border-primary-500"
                  placeholder="Search learners..."
                />
              </div>
            )}

            {assignmentData.assignment_type === 'department' && (
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Select Department
                </label>
                <select
                  value={assignmentData.department_id}
                  onChange={(e) => setAssignmentData({
                    ...assignmentData,
                    department_id: e.target.value
                  })}
                  className="w-full p-2 border border-neutral-300 rounded focus:ring focus:ring-primary-200 focus:border-primary-500"
                >
                  <option value="">Select department</option>
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={assignmentData.due_date}
                  onChange={(e) => setAssignmentData({
                    ...assignmentData,
                    due_date: e.target.value
                  })}
                  className="w-full p-2 border border-neutral-300 rounded focus:ring focus:ring-primary-200 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Mandatory
                </label>
                <select
                  value={assignmentData.is_mandatory ? 'true' : 'false'}
                  onChange={(e) => setAssignmentData({
                    ...assignmentData,
                    is_mandatory: e.target.value === 'true'
                  })}
                  className="w-full p-2 border border-neutral-300 rounded focus:ring focus:ring-primary-200 focus:border-primary-500"
                >
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Notes (Optional)
              </label>
              <textarea
                value={assignmentData.notes}
                onChange={(e) => setAssignmentData({
                  ...assignmentData,
                  notes: e.target.value
                })}
                className="w-full p-2 border border-neutral-300 rounded focus:ring focus:ring-primary-200 focus:border-primary-500"
                rows={3}
                placeholder="Add any instructions or notes..."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="btn-outline"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAssignQuiz}
                className="btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? <LoadingSpinner size="sm" /> : 'Assign Quiz'}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  );
};