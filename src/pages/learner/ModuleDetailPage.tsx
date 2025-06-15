import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  BookOpen, 
  Play, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Video,
  Download,
  Star,
  ArrowLeft,
  Lock,
  ExternalLink
} from 'lucide-react';
import { Layout } from '../../components/layout/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { apiClient } from '../../utils/api';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Modal } from '../../components/ui/Modal';

// Interface definitions
interface YouTubeVideo {
  id: number;
  content_id: number;
  youtube_video_id: string;
  title: string;
  channel_name?: string;
  duration?: number;
  thumbnail_url?: string;
}

interface UserProgress {
  id: number;
  user_id: number;
  content_id: number;
  status: 'not_started' | 'in_progress' | 'completed';
  progress: number;
  started_at?: string;
  completed_at?: string;
  last_accessed: string;
  current_position?: number;
  attempts: number;
  score?: number;
}

interface ModuleContent {
  id: number;
  module_id: number;
  content_type: 'video' | 'document' | 'html' | 'quiz';
  title: string;
  description?: string;
  url?: string;
  file_path?: string;
  duration?: number;
  display_order: number;
  is_downloadable: boolean;
  user_progress?: UserProgress;
  youtube_video?: YouTubeVideo;
  offline_available?: boolean;
}

interface Module {
  id: number;
  name: string;
  title: string;
  description?: string;
  category: string;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  estimated_duration?: number;
  is_active: boolean;
  created_by: number;
  created_at: string;
  completion_percentage?: number;
  contents?: ModuleContent[];
  content_count?: number;
  quiz_count?: number;
  learner_count?: number;
  completion_rate?: number;
  created_by_name?: string;
  user_progress?: UserProgress;
  youtube_video?: YouTubeVideo;
  offline_available?: boolean;
}

const transformModuleData = (apiData: any): Module => {
  return {
    id: apiData.id,
    name: apiData.name || apiData.title || 'Unnamed Module',
    title: apiData.title || 'Untitled Module',
    category: apiData.category || 'General',
    difficulty_level: apiData.difficulty_level || 'beginner',
    is_active: apiData.is_active ?? true,
    created_by: apiData.created_by || 0,
    created_at: apiData.created_at || new Date().toISOString(),
    description: apiData.description,
    estimated_duration: apiData.estimated_duration,
    completion_percentage: apiData.completion_percentage,
    contents: apiData.contents || [],
    content_count: apiData.content_count,
    quiz_count: apiData.quiz_count,
    learner_count: apiData.learner_count,
    completion_rate: apiData.completion_rate,
    created_by_name: apiData.created_by_name,
    user_progress: apiData.user_progress,
    youtube_video: apiData.youtube_video,
    offline_available: apiData.offline_available
  };
};

export const ModuleDetailPage: React.FC = () => {
  const { moduleId } = useParams<{ moduleId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showError, showSuccess } = useNotification();
  const [module, setModule] = useState<Module | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedContent, setSelectedContent] = useState<ModuleContent | null>(null);
  const [isContentModalOpen, setIsContentModalOpen] = useState(false);

  useEffect(() => {
    const fetchModule = async () => {
      if (!moduleId) return;
      
      try {
        setIsLoading(true);
        const apiData = await apiClient.getModule(parseInt(moduleId));
        const transformedData = transformModuleData(apiData);
        setModule(transformedData);
      } catch (error) {
        showError('Error', 'Failed to load module details');
        navigate('/modules');
      } finally {
        setIsLoading(false);
      }
    };

    fetchModule();
  }, [moduleId, showError, navigate]);

  const handleContentClick = async (content: ModuleContent) => {
    setSelectedContent(content);
    setIsContentModalOpen(true);

    try {
      await apiClient.updateProgress({
        content_id: content.id,
        status: 'in_progress'
      });
    } catch (error) {
      console.error('Failed to update progress:', error);
    }
  };

  const handleContentComplete = async (content: ModuleContent) => {
    try {
      await apiClient.updateProgress({
        content_id: content.id,
        status: 'completed'
      });
      
      showSuccess('Progress Updated', 'Content marked as completed!');
      
      if (moduleId) {
        const apiData = await apiClient.getModule(parseInt(moduleId));
        const updatedModule = transformModuleData(apiData);
        setModule(updatedModule);
      }
    } catch (error) {
      showError('Error', 'Failed to update progress');
    }
  };

  const handleDownloadContent = async (content: ModuleContent) => {
    try {
      await apiClient.downloadContent(content.id);
      showSuccess('Download Started', 'Content is being downloaded for offline access');
    } catch (error) {
      showError('Download Failed', 'Failed to download content for offline access');
    }
  };

  const getContentIcon = (contentType: string) => {
    switch (contentType) {
      case 'video': return Video;
      case 'document': return FileText;
      case 'quiz': return Star;
      default: return BookOpen;
    }
  };

  const getContentTypeColor = (contentType: string) => {
    switch (contentType) {
      case 'video': return 'from-red-500 to-red-600';
      case 'document': return 'from-blue-500 to-blue-600';
      case 'quiz': return 'from-accent-500 to-accent-600';
      default: return 'from-primary-500 to-primary-600';
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

  if (!module) {
    return (
      <Layout>
        <div className="text-center py-12">
          <BookOpen className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-neutral-900 mb-2">Module not found</h3>
          <button onClick={() => navigate('/modules')} className="btn-primary">
            Back to Modules
          </button>
        </div>
      </Layout>
    );
  }

  const completedContents = module.contents?.filter(c => c.user_progress?.status === 'completed').length || 0;
  const totalContents = module.contents?.length || 0;
  const completionPercentage = totalContents > 0 ? Math.round((completedContents / totalContents) * 100) : 0;

  return (
    <Layout>
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/modules')}
          className="flex items-center space-x-2 text-neutral-600 hover:text-neutral-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Modules</span>
        </button>

        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-xl flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-neutral-900">{module.title}</h1>
                <p className="text-neutral-600">{module.category}</p>
              </div>
            </div>

            {module.description && (
              <p className="text-neutral-700 mb-6">{module.description}</p>
            )}

            <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-600">
              <div className="flex items-center space-x-1">
                <Clock className="w-4 h-4" />
                <span>{module.estimated_duration || 30} minutes</span>
              </div>
              <div className="flex items-center space-x-1">
                <BookOpen className="w-4 h-4" />
                <span>{totalContents} lessons</span>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs ${
                module.difficulty_level === 'beginner' ? 'bg-primary-100 text-primary-700' :
                module.difficulty_level === 'intermediate' ? 'bg-accent-100 text-accent-700' :
                'bg-red-100 text-red-700'
              }`}>
                {module.difficulty_level}
              </span>
            </div>
          </div>

          <div className="lg:w-80">
            <div className="card p-6">
              <div className="text-center mb-4">
                <div className="text-3xl font-bold text-primary-600 mb-1">
                  {completionPercentage}%
                </div>
                <p className="text-neutral-600">Complete</p>
              </div>
              <ProgressBar value={completionPercentage} className="mb-4" animated />
              <p className="text-sm text-neutral-600 text-center">
                {completedContents} of {totalContents} lessons completed
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content List */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold text-neutral-900 mb-6">Course Content</h2>
        
        {module.contents && module.contents.length > 0 ? (
          <div className="space-y-4">
            {module.contents.map((content, index) => {
              const Icon = getContentIcon(content.content_type);
              const isCompleted = content.user_progress?.status === 'completed';
              const isInProgress = content.user_progress?.status === 'in_progress';
              const isLocked = index > 0 && !module.contents![index - 1].user_progress?.status;

              return (
                <div
                  key={content.id}
                  className={`flex items-center space-x-4 p-4 rounded-lg border transition-all ${
                    isLocked 
                      ? 'bg-neutral-50 border-neutral-200 opacity-60' 
                      : 'bg-white border-neutral-200 hover:border-primary-300 hover:shadow-md cursor-pointer'
                  }`}
                  onClick={() => !isLocked && handleContentClick(content)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="text-sm font-medium text-neutral-500 w-6">
                      {index + 1}
                    </div>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br ${getContentTypeColor(content.content_type)}`}>
                      {isLocked ? (
                        <Lock className="w-5 h-5 text-white" />
                      ) : (
                        <Icon className="w-5 h-5 text-white" />
                      )}
                    </div>
                  </div>

                  <div className="flex-1">
                    <h3 className="font-medium text-neutral-900 mb-1">{content.title}</h3>
                    {content.description && (
                      <p className="text-sm text-neutral-600 mb-2">{content.description}</p>
                    )}
                    <div className="flex items-center space-x-4 text-xs text-neutral-500">
                      <span className="capitalize">{content.content_type}</span>
                      {content.duration && (
                        <span>{content.duration} min</span>
                      )}
                      {content.offline_available && (
                        <span className="text-primary-600">Available offline</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {content.is_downloadable && !isLocked && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadContent(content);
                        }}
                        className="p-2 text-neutral-400 hover:text-primary-600 rounded-lg hover:bg-primary-50"
                        title="Download for offline access"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    )}

                    {isCompleted ? (
                      <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-primary-600" />
                      </div>
                    ) : isInProgress ? (
                      <div className="w-8 h-8 bg-accent-100 rounded-full flex items-center justify-center">
                        <Play className="w-5 h-5 text-accent-600" />
                      </div>
                    ) : !isLocked ? (
                      <div className="w-8 h-8 bg-neutral-100 rounded-full flex items-center justify-center">
                        <Play className="w-5 h-5 text-neutral-600" />
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <BookOpen className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
            <p className="text-neutral-600">No content available for this module</p>
          </div>
        )}
      </div>

      {/* Content Modal */}
      <Modal
        isOpen={isContentModalOpen}
        onClose={() => setIsContentModalOpen(false)}
        title={selectedContent?.title}
        size="xl"
      >
        {selectedContent && (
          <div className="space-y-4">
            {selectedContent.description && (
              <p className="text-neutral-600">{selectedContent.description}</p>
            )}

            <div className="bg-neutral-50 rounded-lg p-6 min-h-64">
              {selectedContent.content_type === 'video' && selectedContent.youtube_video ? (
                <div className="aspect-video">
                  <iframe
                    src={`https://www.youtube.com/embed/${selectedContent.youtube_video.youtube_video_id}`}
                    title={selectedContent.title}
                    className="w-full h-full rounded-lg"
                    allowFullScreen
                  />
                </div>
              ) : selectedContent.content_type === 'document' && selectedContent.url ? (
                <div className="text-center">
                  <FileText className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
                  <p className="text-neutral-600 mb-4">Document content</p>
                  <a
                    href={selectedContent.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary inline-flex items-center space-x-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Open Document</span>
                  </a>
                </div>
              ) : selectedContent.content_type === 'quiz' ? (
                <div className="text-center">
                  <Star className="w-16 h-16 text-accent-400 mx-auto mb-4" />
                  <p className="text-neutral-600 mb-4">Quiz content</p>
                  <button className="btn-primary">
                    Start Quiz
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <BookOpen className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
                  <p className="text-neutral-600">Content not available</p>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-sm text-neutral-600">
                {selectedContent.content_type === 'video' && selectedContent.duration && (
                  <span>Duration: {selectedContent.duration} minutes</span>
                )}
              </div>
              
              <div className="flex space-x-3">
                {selectedContent.user_progress?.status !== 'completed' && (
                  <button
                    onClick={() => {
                      handleContentComplete(selectedContent);
                      setIsContentModalOpen(false);
                    }}
                    className="btn-primary"
                  >
                    Mark as Complete
                  </button>
                )}
                <button
                  onClick={() => setIsContentModalOpen(false)}
                  className="btn-outline"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </Layout>
  );
};