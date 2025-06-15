import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, Plus, ArrowLeft, BookOpen, Video, FileText, Star, Trash2, Edit, CircleDot as DragHandleDots2 } from 'lucide-react';
import { Layout } from '../../components/layout/Layout';
import { useNotification } from '../../contexts/NotificationContext';
import { apiClient } from '../../utils/api';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Modal } from '../../components/ui/Modal';

export const ModuleEditorPage: React.FC = () => {
  const { moduleId } = useParams<{ moduleId: string }>();
  const navigate = useNavigate();
  const { showError, showSuccess } = useNotification();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isContentModalOpen, setIsContentModalOpen] = useState(false);
  const [editingContent, setEditingContent] = useState<any>(null);

  const [moduleData, setModuleData] = useState({
    title: '',
    description: '',
    category: '',
    difficulty_level: 'beginner',
    estimated_duration: 30,
    is_active: true
  });

  const [contents, setContents] = useState<any[]>([]);

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

  useEffect(() => {
    if (moduleId) {
      const fetchModule = async () => {
        try {
          setIsLoading(true);
          const data = await apiClient.getModule(parseInt(moduleId));
          setModuleData({
            title: data.title,
            description: data.description || '',
            category: data.category,
            difficulty_level: data.difficulty_level,
            estimated_duration: data.estimated_duration || 30,
            is_active: data.is_active
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
        // Update existing module
        await apiClient.updateModule(parseInt(moduleId), moduleData);
        showSuccess('Module Updated', 'Module has been updated successfully');
      } else {
        // Create new module
        const response = await apiClient.createModule(moduleData);
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

      await apiClient.addModuleContent(parseInt(moduleId), contentData);
      showSuccess('Content Added', 'Content has been added successfully');
      
      // Refresh module data
      const data = await apiClient.getModule(parseInt(moduleId));
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
                  onChange={(e) => setModuleData(prev => ({ ...prev, difficulty_level: e.target.value }))}
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
                    checked={moduleData.is_active}
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
                        <button className="p-2 text-neutral-400 hover:text-primary-600 rounded-lg hover:bg-primary-50">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-neutral-400 hover:text-red-600 rounded-lg hover:bg-red-50">
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
        onClose={() => setIsContentModalOpen(false)}
        title="Add New Content"
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
              onClick={handleAddContent}
              className="btn-primary flex-1"
            >
              Add Content
            </button>
            <button
              onClick={() => setIsContentModalOpen(false)}
              className="btn-outline flex-1"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
};