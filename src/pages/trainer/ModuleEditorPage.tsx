import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Save, 
  Plus, 
  ArrowLeft, 
  BookOpen, 
  Video, 
  FileText, 
  Star, 
  Trash2, 
  Edit, 
  CircleDot as DragHandleDots2,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { Layout } from '../../components/layout/Layout';
import { useNotification } from '../../contexts/NotificationContext';
import { apiClient } from '../../utils/api';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Modal } from '../../components/ui/Modal';

interface Question {
  id: number;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'short_answer';
  options: string[];
  correct_answer: string;
  points: number;
}

interface Content {
  id: number;
  content_type: string;
  title: string;
  description: string;
  url: string;
  youtube_video_id: string;
  duration: number;
  display_order: number;
  is_downloadable: boolean;
  questions?: Question[];
}

interface Module {
  id?: number;
  title: string;
  description?: string;
  category: string;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  estimated_duration?: number;
  is_active?: boolean;
  contents?: Content[];
}

export const ModuleEditorPage: React.FC = () => {
  const { moduleId } = useParams<{ moduleId: string }>();
  const navigate = useNavigate();
  const { showError, showSuccess } = useNotification();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isContentModalOpen, setIsContentModalOpen] = useState(false);
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [editingContent, setEditingContent] = useState<Content | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  const [moduleData, setModuleData] = useState<Module>({
    title: '',
    description: '',
    category: '',
    difficulty_level: 'beginner',
    estimated_duration: 30,
    is_active: true
  });

  const [contents, setContents] = useState<Content[]>([]);
  const [currentQuestions, setCurrentQuestions] = useState<Question[]>([]);

  const [newContent, setNewContent] = useState({
    content_type: 'video',
    title: '',
    description: '',
    url: '',
    youtube_video_id: '',
    duration: 0,
    display_order: 1,
    is_downloadable: false
  });

  const [newQuestion, setNewQuestion] = useState({
    question_text: '',
    question_type: 'multiple_choice' as 'multiple_choice' | 'true_false' | 'short_answer',
    options: ['', ''],
    correct_answer: '',
    points: 1
  });

  useEffect(() => {
    if (moduleId) {
      const fetchModule = async () => {
        try {
          setIsLoading(true);
          const data = await apiClient.get<Module>(`/modules/${parseInt(moduleId)}`);
          setModuleData({
            title: data.title,
            description: data.description || '',
            category: data.category,
            difficulty_level: data.difficulty_level,
            estimated_duration: data.estimated_duration || 30,
            is_active: data.is_active ?? true
          });
          setContents(data.contents || []);
        } catch (error) {
          showError('Error', 'Failed to load module');
          navigate('/trainer/modules');
        } finally {
          setIsLoading(false);
        }
      };

      fetchModule();
    }
  }, [moduleId, showError, navigate]);

  const handleSaveModule = async () => {
    try {
      setIsSaving(true);
      
      if (moduleId) {
        await apiClient.put(`/modules/${parseInt(moduleId)}`, moduleData);
        showSuccess('Module Updated', 'Module has been updated successfully');
      } else {
        const response = await apiClient.post<{ module_id: number }>('/modules', moduleData);
        showSuccess('Module Created', 'Module has been created successfully');
        navigate(`/trainer/modules/${response.module_id}/edit`);
      }
    } catch (error) {
      showError('Error', 'Failed to save module');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddContent = async () => {
    try {
      if (!moduleId) {
        showError('Error', 'Please save the module first before adding content');
        return;
      }

      const contentData = {
        ...newContent,
        display_order: contents.length + 1
      };

      await apiClient.post(`/modules/${parseInt(moduleId)}/content`, contentData);
      showSuccess('Content Added', 'Content has been added successfully');
      
      const data = await apiClient.get<Module>(`/modules/${parseInt(moduleId)}`);
      setContents(data.contents || []);
      
      setIsContentModalOpen(false);
      setNewContent({
        content_type: 'video',
        title: '',
        description: '',
        url: '',
        youtube_video_id: '',
        duration: 0,
        display_order: 1,
        is_downloadable: false
      });
    } catch (error) {
      showError('Error', 'Failed to add content');
    }
  };

  const handleEditContent = (content: Content) => {
    setEditingContent(content);
    setNewContent({
      content_type: content.content_type,
      title: content.title,
      description: content.description,
      url: content.url,
      youtube_video_id: content.youtube_video_id,
      duration: content.duration,
      display_order: content.display_order,
      is_downloadable: content.is_downloadable
    });
    setIsContentModalOpen(true);
  };

  const handleDeleteContent = async (contentId: number) => {
    try {
      await apiClient.delete(`/modules/content/${contentId}`);
      showSuccess('Content Deleted', 'Content has been removed successfully');
      const data = await apiClient.get<Module>(`/modules/${parseInt(moduleId!)}`);
      setContents(data.contents || []);
    } catch (error) {
      showError('Error', 'Failed to delete content');
    }
  };

  const handleEditQuiz = (content: Content) => {
    setEditingContent(content);
    setCurrentQuestions(content.questions || []);
  };

  const handleAddQuestion = async () => {
    try {
      if (!editingContent) return;

      const questionData = {
        ...newQuestion,
        content_id: editingContent.id
      };

      await apiClient.post(`/content/${editingContent.id}/questions`, questionData);
      showSuccess('Question Added', 'Question has been added successfully');
      
      const data = await apiClient.get<Module>(`/modules/${parseInt(moduleId!)}`);
      setContents(data.contents || []);
      setCurrentQuestions(data.contents?.find((c: Content) => c.id === editingContent.id)?.questions || []);
      
      setIsQuestionModalOpen(false);
      setNewQuestion({
        question_text: '',
        question_type: 'multiple_choice',
        options: ['', ''],
        correct_answer: '',
        points: 1
      });
    } catch (error) {
      showError('Error', 'Failed to add question');
    }
  };

  const handleDeleteQuestion = async (questionId: number) => {
    try {
      await apiClient.delete(`/questions/${questionId}`);
      showSuccess('Question Deleted', 'Question has been removed successfully');
      const data = await apiClient.get<Module>(`/modules/${parseInt(moduleId!)}`);
      setContents(data.contents || []);
      setCurrentQuestions(data.contents?.find((c: Content) => c.id === editingContent?.id)?.questions || []);
    } catch (error) {
      showError('Error', 'Failed to delete question');
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

  const getContentIcon = (contentType: string) => {
    switch (contentType) {
      case 'video':
        return Video;
      case 'document':
        return FileText;
      case 'quiz':
        return Star;
      default:
        return BookOpen;
    }
  };

  const getContentTypeColor = (contentType: string) => {
    switch (contentType) {
      case 'video':
        return 'from-red-500 to-red-600';
      case 'document':
        return 'from-blue-500 to-blue-600';
      case 'quiz':
        return 'from-accent-500 to-accent-600';
      default:
        return 'from-primary-500 to-primary-600';
    }
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
        <button
          onClick={() => navigate('/trainer/modules')}
          className="flex items-center space-x-2 text-neutral-600 hover:text-neutral-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Modules</span>
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">
              {moduleId ? 'Edit Module' : 'Create New Module'}
            </h1>
            <p className="text-neutral-600 mt-1">
              {moduleId ? 'Update your training module content and settings.' : 'Build a comprehensive training module for your learners.'}
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleSaveModule}
              disabled={isSaving}
              className="btn-primary flex items-center space-x-2"
            >
              {isSaving && <LoadingSpinner size="sm" />}
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Module'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Module Settings */}
        <div className="lg:col-span-1">
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-neutral-900 mb-4">Module Settings</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Module Title
                </label>
                <input
                  type="text"
                  value={moduleData.title}
                  onChange={(e) => setModuleData(prev => ({ ...prev, title: e.target.value }))}
                  className="input-field"
                  placeholder="Enter module title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Description
                </label>
                <textarea
                  value={moduleData.description}
                  onChange={(e) => setModuleData(prev => ({ ...prev, description: e.target.value }))}
                  className="input-field min-h-24"
                  placeholder="Describe what learners will gain from this module"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Category
                </label>
                <input
                  type="text"
                  value={moduleData.category}
                  onChange={(e) => setModuleData(prev => ({ ...prev, category: e.target.value }))}
                  className="input-field"
                  placeholder="e.g., Customer Service, Safety, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Difficulty Level
                </label>
                <select
                  value={moduleData.difficulty_level}
                  onChange={(e) => setModuleData(prev => ({ 
                    ...prev, 
                    difficulty_level: e.target.value as 'beginner' | 'intermediate' | 'advanced' 
                  }))}
                  className="input-field"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Estimated Duration (minutes)
                </label>
                <input
                  type="number"
                  value={moduleData.estimated_duration}
                  onChange={(e) => setModuleData(prev => ({ ...prev, estimated_duration: parseInt(e.target.value) }))}
                  className="input-field"
                  min="1"
                />
              </div>

              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={moduleData.is_active ?? true}
                    onChange={(e) => setModuleData(prev => ({ ...prev, is_active: e.target.checked }))}
                    className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm font-medium text-neutral-700">Active Module</span>
                </label>
                <p className="text-xs text-neutral-600 mt-1">
                  Only active modules are visible to learners
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Module Content */}
        <div className="lg:col-span-2">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-neutral-900">Module Content</h2>
              <button
                onClick={() => setIsContentModalOpen(true)}
                disabled={!moduleId}
                className="btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                <span>Add Content</span>
              </button>
            </div>

            {!moduleId && (
              <div className="text-center py-8 bg-neutral-50 rounded-lg mb-6">
                <BookOpen className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
                <p className="text-neutral-600 mb-2">Save the module first to add content</p>
                <p className="text-sm text-neutral-500">
                  You need to create the module before you can add lessons, videos, and quizzes.
                </p>
              </div>
            )}

            {contents.length > 0 ? (
              <div className="space-y-3">
                {contents.map((content, index) => {
                  const Icon = getContentIcon(content.content_type);
                  
                  return (
                    <div key={content.id} className="flex items-center space-x-4 p-4 bg-neutral-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="text-sm font-medium text-neutral-500 w-6">
                          {index + 1}
                        </div>
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br ${getContentTypeColor(content.content_type)}`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                      </div>

                      <div className="flex-1">
                        <h3 className="font-medium text-neutral-900 mb-1">{content.title}</h3>
                        <div className="flex items-center space-x-4 text-xs text-neutral-500">
                          <span className="capitalize">{content.content_type}</span>
                          {content.duration && (
                            <span>{content.duration} min</span>
                          )}
                          {content.is_downloadable && (
                            <span className="text-primary-600">Downloadable</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button className="p-2 text-neutral-400 hover:text-neutral-600 rounded-lg hover:bg-neutral-200">
                          <DragHandleDots2 className="w-4 h-4" />
                        </button>
                        {content.content_type === 'quiz' ? (
                          <button 
                            onClick={() => handleEditQuiz(content)}
                            className="p-2 text-neutral-400 hover:text-primary-600 rounded-lg hover:bg-primary-50"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleEditContent(content)}
                            className="p-2 text-neutral-400 hover:text-primary-600 rounded-lg hover:bg-primary-50"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                        <button 
                          onClick={() => handleDeleteContent(content.id)}
                          className="p-2 text-neutral-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : moduleId ? (
              <div className="text-center py-8">
                <BookOpen className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
                <p className="text-neutral-600 mb-4">No content added yet</p>
                <button
                  onClick={() => setIsContentModalOpen(true)}
                  className="btn-primary"
                >
                  Add Your First Content
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Add Content Modal */}
      <Modal
        isOpen={isContentModalOpen}
        onClose={() => {
          setIsContentModalOpen(false);
          setEditingContent(null);
          setNewContent({
            content_type: 'video',
            title: '',
            description: '',
            url: '',
            youtube_video_id: '',
            duration: 0,
            display_order: 1,
            is_downloadable: false
          });
        }}
        title={editingContent ? 'Edit Content' : 'Add New Content'}
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Content Type
            </label>
            <select
              value={newContent.content_type}
              onChange={(e) => setNewContent(prev => ({ ...prev, content_type: e.target.value }))}
              className="input-field"
            >
              <option value="video">Video</option>
              <option value="document">Document</option>
              <option value="html">HTML Content</option>
              <option value="quiz">Quiz</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Title
            </label>
            <input
              type="text"
              value={newContent.title}
              onChange={(e) => setNewContent(prev => ({ ...prev, title: e.target.value }))}
              className="input-field"
              placeholder="Enter content title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Description
            </label>
            <textarea
              value={newContent.description}
              onChange={(e) => setNewContent(prev => ({ ...prev, description: e.target.value }))}
              className="input-field min-h-20"
              placeholder="Describe this content"
            />
          </div>

          {newContent.content_type === 'video' && (
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                YouTube Video ID
              </label>
              <input
                type="text"
                value={newContent.youtube_video_id}
                onChange={(e) => setNewContent(prev => ({ ...prev, youtube_video_id: e.target.value }))}
                className="input-field"
                placeholder="e.g., dQw4w9WgXcQ"
              />
              <p className="text-xs text-neutral-600 mt-1">
                Extract the video ID from the YouTube URL (the part after v=)
              </p>
            </div>
          )}

          {newContent.content_type !== 'quiz' && (
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                URL (Optional)
              </label>
              <input
                type="url"
                value={newContent.url}
                onChange={(e) => setNewContent(prev => ({ ...prev, url: e.target.value }))}
                className="input-field"
                placeholder="https://example.com/resource"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Duration (minutes)
            </label>
            <input
              type="number"
              value={newContent.duration}
              onChange={(e) => setNewContent(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
              className="input-field"
              min="0"
            />
          </div>

          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={newContent.is_downloadable}
                onChange={(e) => setNewContent(prev => ({ ...prev, is_downloadable: e.target.checked }))}
                className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-neutral-700">Allow offline download</span>
            </label>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              onClick={editingContent ? handleAddContent : handleAddContent}
              className="btn-primary flex-1"
            >
              {editingContent ? 'Update Content' : 'Add Content'}
            </button>
            <button
              onClick={() => {
                setIsContentModalOpen(false);
                setEditingContent(null);
              }}
              className="btn-outline flex-1"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* Quiz Questions Modal */}
      {editingContent?.content_type === 'quiz' && (
        <Modal
          isOpen={true}
          onClose={() => setEditingContent(null)}
          title={`Manage Quiz: ${editingContent.title}`}
          size="xl"
        >
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Quiz Questions</h3>
              <button
                onClick={() => {
                  setEditingQuestion(null);
                  setNewQuestion({
                    question_text: '',
                    question_type: 'multiple_choice',
                    options: ['', ''],
                    correct_answer: '',
                    points: 1
                  });
                  setIsQuestionModalOpen(true);
                }}
                className="btn-primary flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add Question</span>
              </button>
            </div>

            {currentQuestions.length === 0 ? (
              <div className="text-center py-8 text-neutral-500">
                No questions added yet
              </div>
            ) : (
              <div className="space-y-4">
                {currentQuestions.map((question, index) => (
                  <div key={question.id} className="border border-neutral-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">Q{index + 1}:</span>
                          <span>{question.question_text}</span>
                        </div>
                        <div className="mt-2 text-sm text-neutral-600">
                          Type: {question.question_type.replace('_', ' ')} • Points: {question.points}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => {
                            setEditingQuestion(question);
                            setNewQuestion({
                              question_text: question.question_text,
                              question_type: question.question_type,
                              options: [...question.options],
                              correct_answer: question.correct_answer,
                              points: question.points
                            });
                            setIsQuestionModalOpen(true);
                          }}
                          className="text-neutral-600 hover:text-primary-600"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteQuestion(question.id)}
                          className="text-neutral-600 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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
        </Modal>
      )}

      {/* Add/Edit Question Modal */}
      <Modal
        isOpen={isQuestionModalOpen}
        onClose={() => {
          setIsQuestionModalOpen(false);
          setEditingQuestion(null);
        }}
        title={editingQuestion ? 'Edit Question' : 'Add New Question'}
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Question Text
            </label>
            <textarea
              value={newQuestion.question_text}
              onChange={(e) => setNewQuestion({...newQuestion, question_text: e.target.value})}
              className="w-full p-2 border border-neutral-300 rounded-md focus:ring focus:ring-primary-200 focus:border-primary-500"
              rows={3}
              placeholder="Enter your question..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Question Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                className={`p-2 border rounded-md ${
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
                className={`p-2 border rounded-md ${
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
                className={`p-2 border rounded-md ${
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
              <label className="block text-sm font-medium text-neutral-700 mb-2">
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
                      className="flex-1 p-2 border border-neutral-300 rounded-md focus:ring focus:ring-primary-200 focus:border-primary-500"
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
                  <Plus className="w-4 h-4" />
                  <span>Add Option</span>
                </button>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Points
              </label>
              <input
                type="number"
                min="1"
                value={newQuestion.points}
                onChange={(e) => setNewQuestion({...newQuestion, points: parseInt(e.target.value) || 1})}
                className="w-full p-2 border border-neutral-300 rounded-md focus:ring focus:ring-primary-200 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Correct Answer
              </label>
              {newQuestion.question_type === 'short_answer' ? (
                <input
                  type="text"
                  value={newQuestion.correct_answer}
                  onChange={(e) => setNewQuestion({...newQuestion, correct_answer: e.target.value})}
                  className="w-full p-2 border border-neutral-300 rounded-md focus:ring focus:ring-primary-200 focus:border-primary-500"
                  placeholder="Expected answer"
                />
              ) : (
                <div className="p-2 bg-neutral-100 rounded-md">
                  {newQuestion.correct_answer || 'Select correct answer'}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsQuestionModalOpen(false);
                setEditingQuestion(null);
              }}
              className="btn-outline"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={editingQuestion ? handleAddQuestion : handleAddQuestion}
              disabled={!newQuestion.question_text || !newQuestion.correct_answer}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {editingQuestion ? 'Update Question' : 'Add Question'}
            </button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
};