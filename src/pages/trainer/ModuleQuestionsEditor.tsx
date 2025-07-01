import React, { useState } from 'react';
import { PlusCircle, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

interface Question {
  id: number;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'short_answer';
  options: string[];
  correct_answer: string;
  points: number;
}

const ModuleQuestionsEditor: React.FC<{
  questions: Question[];
  onQuestionsUpdate: (questions: Question[]) => void;
}> = ({ questions, onQuestionsUpdate }) => {
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<Partial<Question>>({
    question_text: '',
    question_type: 'multiple_choice',
    options: ['', ''],
    correct_answer: '',
    points: 1
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddQuestion = () => {
    setIsSubmitting(true);
    // In a real app, you would save to API here
    const newQuestion = {
      ...currentQuestion,
      id: questions.length + 1 // Temporary ID
    } as Question;
    
    onQuestionsUpdate([...questions, newQuestion]);
    setShowQuestionModal(false);
    setCurrentQuestion({
      question_text: '',
      question_type: 'multiple_choice',
      options: ['', ''],
      correct_answer: '',
      points: 1
    });
    setIsSubmitting(false);
  };

  const handleDeleteQuestion = (id: number) => {
    onQuestionsUpdate(questions.filter(q => q.id !== id));
  };

  const handleQuestionTypeChange = (type: 'multiple_choice' | 'true_false' | 'short_answer') => {
    setCurrentQuestion(prev => ({
      ...prev,
      question_type: type,
      options: type === 'true_false' ? ['True', 'False'] : ['', ''],
      correct_answer: type === 'true_false' ? 'True' : ''
    }));
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...(currentQuestion.options || [])];
    newOptions[index] = value;
    setCurrentQuestion(prev => ({ ...prev, options: newOptions }));
  };

  const addOption = () => {
    setCurrentQuestion(prev => ({ ...prev, options: [...(prev.options || []), ''] }));
  };

  const removeOption = (index: number) => {
    const newOptions = (currentQuestion.options ?? []).filter((_, i) => i !== index);
    setCurrentQuestion(prev => ({ ...prev, options: newOptions }));
  };

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Module Questions</h3>
        <button
          onClick={() => setShowQuestionModal(true)}
          className="flex items-center space-x-2 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add Question</span>
        </button>
      </div>

      {questions.length === 0 ? (
        <div className="text-center py-4 text-gray-500">
          No questions added yet
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((question, index) => (
            <div key={question.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">Q{index + 1}:</span>
                    <span>{question.question_text}</span>
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    Type: {question.question_type.replace('_', ' ')} • Points: {question.points}
                  </div>
                </div>
                <button 
                  onClick={() => handleDeleteQuestion(question.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {question.question_type !== 'short_answer' && (
                <div className="mt-3">
                  <div className="text-sm text-gray-600 mb-1">Options:</div>
                  <div className="space-y-1">
                    {question.options.map((option, i) => (
                      <div
                        key={i}
                        className={`flex items-center space-x-2 p-2 rounded ${
                          option === question.correct_answer
                            ? 'bg-green-50 border border-green-200'
                            : 'bg-gray-50'
                        }`}
                      >
                        {option === question.correct_answer ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-gray-400" />
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

      {/* Add Question Modal */}
      <Modal
        isOpen={showQuestionModal}
        onClose={() => setShowQuestionModal(false)}
        title="Add New Question"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Question Text
            </label>
            <textarea
              value={currentQuestion.question_text}
              onChange={(e) => setCurrentQuestion({...currentQuestion, question_text: e.target.value})}
              className="w-full p-2 border border-gray-300 rounded-md"
              rows={3}
              placeholder="Enter your question..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Question Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                className={`p-2 border rounded-md ${
                  currentQuestion.question_type === 'multiple_choice'
                    ? 'bg-blue-100 border-blue-500'
                    : 'border-gray-300'
                }`}
                onClick={() => handleQuestionTypeChange('multiple_choice')}
              >
                Multiple Choice
              </button>
              <button
                type="button"
                className={`p-2 border rounded-md ${
                  currentQuestion.question_type === 'true_false'
                    ? 'bg-blue-100 border-blue-500'
                    : 'border-gray-300'
                }`}
                onClick={() => handleQuestionTypeChange('true_false')}
              >
                True/False
              </button>
              <button
                type="button"
                className={`p-2 border rounded-md ${
                  currentQuestion.question_type === 'short_answer'
                    ? 'bg-blue-100 border-blue-500'
                    : 'border-gray-300'
                }`}
                onClick={() => handleQuestionTypeChange('short_answer')}
              >
                Short Answer
              </button>
            </div>
          </div>

          {currentQuestion.question_type !== 'short_answer' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Options
              </label>
              <div className="space-y-2">
                {(currentQuestion.options ?? []).map((option, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input
                      type={currentQuestion.question_type === 'multiple_choice' ? 'radio' : 'hidden'}
                      name="correct_option"
                      checked={option === currentQuestion.correct_answer}
                      onChange={() => setCurrentQuestion({...currentQuestion, correct_answer: option})}
                      className="text-blue-600"
                    />
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      className="flex-1 p-2 border border-gray-300 rounded-md"
                      placeholder={`Option ${index + 1}`}
                    />
                    {currentQuestion.question_type === 'multiple_choice' && (currentQuestion.options ?? []).length > 2 && (
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
              {currentQuestion.question_type === 'multiple_choice' && (
                <button
                  type="button"
                  onClick={addOption}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Add Option</span>
                </button>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Points
              </label>
              <input
                type="number"
                min="1"
                value={currentQuestion.points}
                onChange={(e) => setCurrentQuestion({...currentQuestion, points: Number(e.target.value) || 1})}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Correct Answer
              </label>
              {currentQuestion.question_type === 'short_answer' ? (
                <input
                  type="text"
                  value={currentQuestion.correct_answer}
                  onChange={(e) => setCurrentQuestion({...currentQuestion, correct_answer: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  placeholder="Expected answer"
                />
              ) : (
                <div className="p-2 bg-gray-100 rounded-md">
                  {currentQuestion.correct_answer || 'Select correct answer'}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => setShowQuestionModal(false)}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAddQuestion}
              disabled={!currentQuestion.question_text || !currentQuestion.correct_answer}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? <LoadingSpinner size="sm" /> : 'Add Question'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ModuleQuestionsEditor;