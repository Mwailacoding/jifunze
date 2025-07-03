import React, { useState, useEffect, FC } from 'react';
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
  ExternalLink,
  Flag,
  ChevronLeft,
  ChevronRight,
  XCircle
} from 'lucide-react';
import { Layout } from '../../components/layout/Layout';
import { ContentCompletionButtonProps, ModuleLockScreenProps, ModuleProgressTrackerProps } from '../../types/ModuleComponents';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { apiClient } from '../../utils/api';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';

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
  quiz_passed?: boolean;
  learner_count?: number;
  completion_rate?: number;
  created_by_name?: string;
  user_progress?: UserProgress;
  youtube_video?: YouTubeVideo;
  offline_available?: boolean;
  is_completed?: boolean;
  is_locked?: boolean;
  prerequisite_module_id?: number;
}

const transformModuleData = (apiData: any): Module => ({
  id: apiData.id,
  name: apiData.name ?? apiData.title ?? 'Unnamed Module',
  title: apiData.title ?? 'Untitled Module',
  category: apiData.category ?? 'General',
  difficulty_level: apiData.difficulty_level || 'beginner',
  is_active: apiData.is_active ?? true,
  created_by: apiData.created_by || 0,
  created_at: apiData.created_at || new Date().toISOString(),
  description: apiData.description,
  estimated_duration: apiData.estimated_duration,
  completion_percentage: apiData.completion_percentage,
  contents: (apiData.contents || []).map((content: any) => ({
    ...content,
    content_type: content.content_type === 'quiz' ? 'quiz' : content.content_type,
  })),
  content_count: apiData.content_count,
  quiz_count: apiData.quiz_count,
  quiz_passed: apiData.quiz_passed,
  learner_count: apiData.learner_count,
  completion_rate: apiData.completion_rate,
  created_by_name: apiData.created_by_name,
  user_progress: apiData.user_progress,
  youtube_video: apiData.youtube_video,
  offline_available: apiData.offline_available,
  is_completed: apiData.is_completed,
  is_locked: apiData.is_locked,
  prerequisite_module_id: apiData.prerequisite_module_id
});

// Implementation of the unused interfaces
const ContentCompletionButton = ({
  contentId,
  moduleId,
  onComplete,
  className = '',
}: ContentCompletionButtonProps & { onComplete: (contentId: number, moduleId: number) => Promise<void>; className?: string }) => {
  const [isLoading, setIsLoading] = useState(false);
  const handleClick = async () => {
    setIsLoading(true);
    try {
      await onComplete(Number(contentId), Number(moduleId));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={`btn-primary ${className}`}
    >
      {isLoading ? 'Marking...' : 'Mark as Complete'}
    </button>
  );
}

const ModuleCompletionScreen: FC<{ module: Module }> = ({ module }) => {
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="card p-8 text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 text-green-600 mb-4">
            <CheckCircle2 className="h-8 w-8" />
          </div>

          <h3 className="text-xl font-semibold mb-2">Module Completed!</h3>
          <p className="text-neutral-600 mb-6">
            Congratulations! You have successfully completed the &quot;{module.title}&quot; module.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/dashboard')}
              className="btn-primary"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

const ModuleLockScreen: FC<{ prerequisiteModule: any }> = ({ prerequisiteModule }) => {
  const navigate = useNavigate();

  const contentIncomplete = prerequisiteModule.content_count
    ? (prerequisiteModule.content_completed ?? 0) < prerequisiteModule.content_count
    : false;

  const quizNotPassed = prerequisiteModule.quiz_count
    ? prerequisiteModule.quiz_count > 0 && !prerequisiteModule.quiz_passed
    : false;

  const progress =
    prerequisiteModule.content_count && prerequisiteModule.content_completed
      ? Math.round(
          (prerequisiteModule.content_completed / prerequisiteModule.content_count) * 100
        )
      : 0;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="card p-8 text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 text-red-600 mb-4">
            <Lock className="h-8 w-8" />
          </div>

          <h3 className="text-xl font-semibold mb-2">Module Locked</h3>
          <p className="text-neutral-600 mb-6">
            You need to complete the &quot;{prerequisiteModule.title}&quot; module to access this content.
          </p>

          <div className="max-w-md mx-auto mb-8">
            <div className="space-y-3 text-left">
              {contentIncomplete && (
                <div className="flex items-start">
                  <div className="w-5 h-5 text-accent-600 mr-2 mt-0.5">⚠️</div>
                  <div>
                    <p className="font-medium">Complete all content in &quot;{prerequisiteModule.title}&quot;</p>
                    <p className="text-sm text-neutral-600">
                      {prerequisiteModule.content_completed} of {prerequisiteModule.content_count} lessons completed
                    </p>
                    <div className="mt-2">
                      <ProgressBar value={progress} />
                    </div>
                  </div>
                </div>
              )}

              {quizNotPassed && (
                <div className="flex items-start">
                  <div className="w-5 h-5 text-accent-600 mr-2 mt-0.5">⚠️</div>
                  <div>
                    <p className="font-medium">Pass the quiz in &quot;{prerequisiteModule.title}&quot;</p>
                    <p className="text-sm text-neutral-600">
                      You need to score at least 80% to pass
                    </p>
                    <button
                      onClick={() => navigate(`/modules/${prerequisiteModule.id}`)}
                      className="btn-secondary mt-2"
                    >
                      Go to Module
                    </button>
                  </div>
                </div>
              )}

              {!contentIncomplete && !quizNotPassed && (
                <div className="flex items-start">
                  <div className="w-5 h-5 text-green-600 mr-2 mt-0.5">✅</div>
                  <div>
                    <p className="font-medium">Prerequisite module completed!</p>
                    <p className="text-sm text-neutral-600">
                      You should now have access to this module
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <button
              onClick={() => navigate(`/modules/${prerequisiteModule.id}`)}
              className="btn-primary"
            >
              Go to &quot;{prerequisiteModule.title}&quot; Module
            </button>
            <button
              onClick={() => navigate('/modules')}
              className="btn-outline"
            >
              Browse Available Modules
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

const ModuleProgressTracker: FC<ModuleProgressTrackerProps & { className?: string }> = ({
  module,
  className = '',
}) => {
  const completedContents =
    Array.isArray((module as any).contents)
      ? ((module as any).contents as any[]).filter(
          (c: any) => c?.user_progress?.status === 'completed'
        ).length
      : 0;
  const totalContents =
    Array.isArray((module as any).contents)
      ? ((module as any).contents as any[]).length
      : 0;
  const completionPercentage =
    totalContents > 0
      ? Math.round((completedContents / totalContents) * 100)
      : 0;

  return (
    <div className={`card p-6 ${className}`}>
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
  );
};

interface ModuleDetailPageProps {
  components?: any;
}

const ModuleDetailPage: FC<ModuleDetailPageProps> = ({ components }) => {
  const { moduleId } = useParams<{ moduleId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showError, showSuccess } = useNotification();
  const [module, setModule] = useState<Module | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedContent, setSelectedContent] = useState<ModuleContent | null>(null);
  const [isContentModalOpen, setIsContentModalOpen] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizData, setQuizData] = useState<any>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizResult, setQuizResult] = useState<any>(null);
  const [isModuleLocked, setIsModuleLocked] = useState(false);
  const [prerequisiteModule, setPrerequisiteModule] = useState<any>(null);

  // Fetch module data
  useEffect(() => {
    const fetchModule = async () => {
      if (!moduleId) return;
      
      try {
        setIsLoading(true);
        
        // First, get all modules to check if this one is locked
        const allModules = await apiClient.getModules();
        const currentModuleIndex = allModules.findIndex((m: any) => m.id === parseInt(moduleId));
        
        if (currentModuleIndex > 0) {
          const previousModule = allModules[currentModuleIndex - 1] as any;
          const isLocked = previousModule && !(
            previousModule.completion_percentage === 100 && 
            (previousModule.quiz_count === 0 || previousModule.quiz_passed)
          );
          
          setIsModuleLocked(isLocked);
          if (isLocked) {
            setPrerequisiteModule(previousModule);
          }
        } else {
          setIsModuleLocked(false);
        }
        
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
      // Check if content is already completed
      if (content.user_progress?.status === 'completed') {
        showError('Already Completed', 'This content has already been completed.');
        return;
      }

      const result = await apiClient.completeContent(content.id);
      showSuccess('Progress Updated', 'Content marked as completed!');
      
      if (moduleId) {
        const apiData = await apiClient.getModule(parseInt(moduleId));
        const updatedModule = transformModuleData(apiData);
        setModule(updatedModule);
        
        // Check if module is now completed
        if (updatedModule.is_completed) {
          showSuccess('Module Completed!', 'Congratulations! You have completed this module.');
          // Redirect to completion screen or dashboard after a short delay
          setTimeout(() => {
            navigate('/dashboard');
          }, 2000);
        }
      }
  
      if (content.content_type === 'quiz') {
        try {
          const quizData = await apiClient.getContentQuiz(content.id);
          
          // Ensure questions array exists
          if (!quizData.questions) {
            quizData.questions = [];
          }
  
          setQuizData(quizData);
          setShowQuiz(true);
          setIsContentModalOpen(false);
          
          const initialAnswers: Record<number, string> = {};
          quizData.questions.forEach((question: any) => {
            initialAnswers[question.id] = '';
          });
          setQuizAnswers(initialAnswers);
        } catch (error) {
          console.error('Failed to load quiz:', error);
          showError('Error', 'Failed to load quiz');
        }
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

  const handleQuizAnswerChange = (questionId: number, answer: string) => {
    setQuizAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleQuizSubmit = async () => {
    if (!quizData) return;

    try {
      const submissionAnswers = quizData.questions.map((q: any) => ({
        question_id: q.id,
        answer: quizAnswers[q.id] || ''
      }));

      const result = await apiClient.submitContentQuiz(quizData.id, submissionAnswers);
      setQuizResult(result);
      setQuizSubmitted(true);
      
      if (result.passed) {
        showSuccess('Quiz Passed', `You scored ${result.score}/${result.max_score} (${result.percentage}%)`);
      } else {
        showError('Quiz Failed', `You scored ${result.score}/${result.max_score}. Need ${quizData.passing_score}% to pass.`);
      }

      if (moduleId) {
        const apiData = await apiClient.getModule(parseInt(moduleId));
        const updatedModule = transformModuleData(apiData);
        setModule(updatedModule);
      }
    } catch (error) {
      showError('Error', 'Failed to submit quiz');
    }
  };

  const handleQuizRetry = () => {
    setQuizSubmitted(false);
    setCurrentQuestionIndex(0);
    setQuizAnswers({});
  };

  const handleQuizClose = () => {
    setShowQuiz(false);
    setQuizData(null);
    setQuizSubmitted(false);
    setQuizResult(null);
    setCurrentQuestionIndex(0);
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
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Module Not Found</h2>
            <p className="text-neutral-600 mb-4">The module you're looking for doesn't exist.</p>
            <button onClick={() => navigate('/modules')} className="btn-primary">
              Back to Modules
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  // Show completion screen if module is completed
  if (module.is_completed) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto">
          <div className="card p-8 text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 text-green-600 mb-4">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <h3 className="text-xl font-semibold mb-2">Module Completed!</h3>
            <p className="text-neutral-600 mb-6">
              Congratulations! You have successfully completed the &quot;{module.title}&quot; module.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate('/dashboard')}
                className="btn-primary"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Show lock screen if module is locked
  if (isModuleLocked && prerequisiteModule) {
    return <ModuleLockScreen prerequisiteModule={prerequisiteModule} />;
  }

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
                <span>{module.contents?.length || 0} lessons</span>
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

          <ModuleProgressTracker
            module={{
              id: module.id,
              title: module.title,
              content_count: module.contents?.length || 0,
              content_completed: module.contents?.filter(c => c.user_progress?.status === 'completed').length || 0,
              quiz_count: module.quiz_count || 0,
              quiz_passed: false // or actual value if available
            }}
          />
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
              const isQuiz = content.content_type === 'quiz';

              if (isLocked) {
                return (
                  <div
                    key={content.id}
                    className="flex items-center space-x-4 p-4 rounded-lg border bg-neutral-50 border-neutral-200 opacity-60 cursor-not-allowed"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="text-sm font-medium text-neutral-500 w-6">
                        {index + 1}
                      </div>
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br ${getContentTypeColor(content.content_type)}`}>
                        <Lock className="w-5 h-5 text-white" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-neutral-900 mb-1">{content.title}</h3>
                      <p className="text-sm text-neutral-500">Complete the previous lesson to unlock.</p>
                    </div>
                  </div>
                );
              }

              // Unlocked content card
              return (
                <div
                  key={content.id}
                  className={`flex items-center space-x-4 p-4 rounded-lg border transition-all bg-white border-neutral-200 hover:border-primary-300 hover:shadow-md cursor-pointer`}
                  onClick={() => {
                    if (!isLocked) {
                      handleContentClick(content);
                    }
                  }}
                >
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
                      {isQuiz && (
                        <div className="ml-2">
                          <Badge variant="text">Quiz</Badge>
                        </div>
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
                <div className="aspect-video relative">
                  {selectedContent.youtube_video.youtube_video_id ? (
                    <>
                      <iframe
                        src={`https://www.youtube.com/embed/${selectedContent.youtube_video.youtube_video_id}?enablejsapi=1&origin=${window.location.origin}`}
                        title={selectedContent.title}
                        className="w-full h-full rounded-lg"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        frameBorder="0"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-10">
                        <div className="text-white text-center p-4 bg-black bg-opacity-50 rounded-lg">
                          <Play className="w-12 h-12 mx-auto mb-2" />
                          <p>Click to play video</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center p-8 bg-neutral-100 rounded-lg">
                      <Video className="w-12 h-12 mx-auto text-neutral-400 mb-4" />
                      <p className="text-neutral-600">Video content not available</p>
                      {selectedContent.url && (
                        <a
                          href={selectedContent.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-4 inline-flex items-center text-primary-600 hover:text-primary-800"
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Open in YouTube
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ) : null}
              <div className="flex justify-between items-center pt-4 border-t">
                <div className="text-sm text-neutral-600">
                  {selectedContent.content_type === 'video' && selectedContent.duration && (
                    <span>Duration: {selectedContent.duration} minutes</span>
                  )}
                </div>
                <div className="flex space-x-3">
                  {selectedContent.user_progress?.status !== 'completed' && (
                    <ContentCompletionButton
                      contentId={String(selectedContent.id)}
                      moduleId={String(module.id)}
                      onComplete={() => handleContentComplete(selectedContent)}
                    />
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
          </div>
        )}
      </Modal>

      {/* Quiz Modal */}
      {showQuiz && quizData && (
        <Modal
import React, { useState, useEffect, FC } from 'react';
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
  ExternalLink,
  Flag,
  ChevronLeft,
  ChevronRight,
  XCircle
} from 'lucide-react';
import { Layout } from '../../components/layout/Layout';
import { ContentCompletionButtonProps, ModuleLockScreenProps, ModuleProgressTrackerProps } from '../../types/ModuleComponents';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { apiClient } from '../../utils/api';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';

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
  quiz_passed?: boolean;
  learner_count?: number;
  completion_rate?: number;
  created_by_name?: string;
  user_progress?: UserProgress;
  youtube_video?: YouTubeVideo;
  offline_available?: boolean;
  is_completed?: boolean;
  has_certificate?: boolean;
  is_locked?: boolean;
  prerequisite_module_id?: number;
}

const transformModuleData = (apiData: any): Module => ({
  id: apiData.id,
  name: apiData.name ?? apiData.title ?? 'Unnamed Module',
  title: apiData.title ?? 'Untitled Module',
  category: apiData.category ?? 'General',
  difficulty_level: apiData.difficulty_level || 'beginner',
  is_active: apiData.is_active ?? true,
  created_by: apiData.created_by || 0,
  created_at: apiData.created_at || new Date().toISOString(),
  description: apiData.description,
  estimated_duration: apiData.estimated_duration,
  completion_percentage: apiData.completion_percentage,
  contents: (apiData.contents || []).map((content: any) => ({
    ...content,
    content_type: content.content_type === 'quiz' ? 'quiz' : content.content_type,
  })),
  content_count: apiData.content_count,
  quiz_count: apiData.quiz_count,
  quiz_passed: apiData.quiz_passed,
  learner_count: apiData.learner_count,
  completion_rate: apiData.completion_rate,
  created_by_name: apiData.created_by_name,
  user_progress: apiData.user_progress,
  youtube_video: apiData.youtube_video,
  offline_available: apiData.offline_available,
  is_completed: apiData.is_completed,
  has_certificate: apiData.has_certificate,
  is_locked: apiData.is_locked,
  prerequisite_module_id: apiData.prerequisite_module_id
});

// Implementation of the unused interfaces
const ContentCompletionButton = ({
  contentId,
  moduleId,
  onComplete,
  className = '',
}: ContentCompletionButtonProps & { onComplete: (contentId: number, moduleId: number) => Promise<void>; className?: string }) => {
  const [isLoading, setIsLoading] = useState(false);
  const handleClick = async () => {
    setIsLoading(true);
    try {
      await onComplete(Number(contentId), Number(moduleId));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={`btn-primary ${className}`}
    >
      {isLoading ? 'Marking...' : 'Mark as Complete'}
    </button>
  );
}

const ModuleCompletionScreen: FC<{ module: Module }> = ({ module }) => {
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="card p-8 text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 text-green-600 mb-4">
            <CheckCircle2 className="h-8 w-8" />
          </div>

          <h3 className="text-xl font-semibold mb-2">Module Completed!</h3>
          <p className="text-neutral-600 mb-6">
            Congratulations! You have successfully completed the &quot;{module.title}&quot; module.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/dashboard')}
              className="btn-primary"
            >
              Back to Dashboard
            </button>
            <button
              onClick={() => navigate('/certificates')}
              className="btn-secondary"
            >
              View Certificates
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

const ModuleLockScreen: FC<{ prerequisiteModule: any }> = ({ prerequisiteModule }) => {
  const navigate = useNavigate();

  const contentIncomplete = prerequisiteModule.content_count
    ? (prerequisiteModule.content_completed ?? 0) < prerequisiteModule.content_count
    : false;

  const quizNotPassed = prerequisiteModule.quiz_count
    ? prerequisiteModule.quiz_count > 0 && !prerequisiteModule.quiz_passed
    : false;

  const progress =
    prerequisiteModule.content_count && prerequisiteModule.content_completed
      ? Math.round(
          (prerequisiteModule.content_completed / prerequisiteModule.content_count) * 100
        )
      : 0;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="card p-8 text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 text-red-600 mb-4">
            <Lock className="h-8 w-8" />
          </div>

          <h3 className="text-xl font-semibold mb-2">Module Locked</h3>
          <p className="text-neutral-600 mb-6">
            You need to complete the &quot;{prerequisiteModule.title}&quot; module to access this content.
          </p>

          <div className="max-w-md mx-auto mb-8">
            <div className="space-y-3 text-left">
              {contentIncomplete && (
                <div className="flex items-start">
                  <div className="w-5 h-5 text-accent-600 mr-2 mt-0.5">⚠️</div>
                  <div>
                    <p className="font-medium">Complete all content in &quot;{prerequisiteModule.title}&quot;</p>
                    <p className="text-sm text-neutral-600">
                      {prerequisiteModule.content_completed} of {prerequisiteModule.content_count} lessons completed
                    </p>
                    <div className="mt-2">
                      <ProgressBar value={progress} />
                    </div>
                  </div>
                </div>
              )}

              {quizNotPassed && (
                <div className="flex items-start">
                  <div className="w-5 h-5 text-accent-600 mr-2 mt-0.5">⚠️</div>
                  <div>
                    <p className="font-medium">Pass the quiz in &quot;{prerequisiteModule.title}&quot;</p>
                    <p className="text-sm text-neutral-600">
                      You need to score at least 80% to pass
                    </p>
                    <button
                      onClick={() => navigate(`/modules/${prerequisiteModule.id}`)}
                      className="btn-secondary mt-2"
                    >
                      Go to Module
                    </button>
                  </div>
                </div>
              )}

              {!contentIncomplete && !quizNotPassed && (
                <div className="flex items-start">
                  <div className="w-5 h-5 text-green-600 mr-2 mt-0.5">✅</div>
                  <div>
                    <p className="font-medium">Prerequisite module completed!</p>
                    <p className="text-sm text-neutral-600">
                      You should now have access to this module
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <button
              onClick={() => navigate(`/modules/${prerequisiteModule.id}`)}
              className="btn-primary"
            >
              Go to &quot;{prerequisiteModule.title}&quot; Module
            </button>
            <button
              onClick={() => navigate('/modules')}
              className="btn-outline"
            >
              Browse Available Modules
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

const ModuleProgressTracker: FC<ModuleProgressTrackerProps & { className?: string }> = ({
  module,
  className = '',
}) => {
  const completedContents =
    Array.isArray((module as any).contents)
      ? ((module as any).contents as any[]).filter(
          (c: any) => c?.user_progress?.status === 'completed'
        ).length
      : 0;
  const totalContents =
    Array.isArray((module as any).contents)
      ? ((module as any).contents as any[]).length
      : 0;
  const completionPercentage =
    totalContents > 0
      ? Math.round((completedContents / totalContents) * 100)
      : 0;

  return (
    <div className={`card p-6 ${className}`}>
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
  );
};

interface ModuleDetailPageProps {
  components?: any;
}

const ModuleDetailPage: FC<ModuleDetailPageProps> = ({ components }) => {
  const { moduleId } = useParams<{ moduleId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showError, showSuccess } = useNotification();
  const [module, setModule] = useState<Module | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedContent, setSelectedContent] = useState<ModuleContent | null>(null);
  const [isContentModalOpen, setIsContentModalOpen] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizData, setQuizData] = useState<any>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizResult, setQuizResult] = useState<any>(null);
  const [isModuleLocked, setIsModuleLocked] = useState(false);
  const [prerequisiteModule, setPrerequisiteModule] = useState<any>(null);

  // Fetch module data
  useEffect(() => {
    const fetchModule = async () => {
      if (!moduleId) return;
      
      try {
        setIsLoading(true);
        
        // First, get all modules to check if this one is locked
        const allModules = await apiClient.getModules();
        const currentModuleIndex = allModules.findIndex((m: any) => m.id === parseInt(moduleId));
        
        if (currentModuleIndex > 0) {
          const previousModule = allModules[currentModuleIndex - 1] as any;
          const isLocked = previousModule && !(
            previousModule.completion_percentage === 100 && 
            (previousModule.quiz_count === 0 || previousModule.quiz_passed)
          );
          
          setIsModuleLocked(isLocked);
          if (isLocked) {
            setPrerequisiteModule(previousModule);
          }
        } else {
          setIsModuleLocked(false);
        }
        
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
      // Check if content is already completed
      if (content.user_progress?.status === 'completed') {
        showError('Already Completed', 'This content has already been completed.');
        return;
      }

      const result = await apiClient.completeContent(content.id);
      showSuccess('Progress Updated', 'Content marked as completed!');
      
      if (moduleId) {
        const apiData = await apiClient.getModule(parseInt(moduleId));
        const updatedModule = transformModuleData(apiData);
        setModule(updatedModule);
        
        // Check if module is now completed
        if (updatedModule.is_completed) {
          showSuccess('Module Completed!', 'Congratulations! You have completed this module.');
          // Redirect to completion screen or dashboard after a short delay
          setTimeout(() => {
            navigate('/dashboard');
          }, 2000);
        }
      }
  
      if (content.content_type === 'quiz') {
        try {
          const quizData = await apiClient.getContentQuiz(content.id);
          
          // Ensure questions array exists
          if (!quizData.questions) {
            quizData.questions = [];
          }
  
          setQuizData(quizData);
          setShowQuiz(true);
          setIsContentModalOpen(false);
          
          const initialAnswers: Record<number, string> = {};
          quizData.questions.forEach((question: any) => {
            initialAnswers[question.id] = '';
          });
          setQuizAnswers(initialAnswers);
        } catch (error) {
          console.error('Failed to load quiz:', error);
          showError('Error', 'Failed to load quiz');
        }
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

  const handleQuizAnswerChange = (questionId: number, answer: string) => {
    setQuizAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleQuizSubmit = async () => {
    if (!quizData) return;

    try {
      const submissionAnswers = quizData.questions.map((q: any) => ({
        question_id: q.id,
        answer: quizAnswers[q.id] || ''
      }));

      const result = await apiClient.submitContentQuiz(quizData.id, submissionAnswers);
      setQuizResult(result);
      setQuizSubmitted(true);
      
      if (result.passed) {
        showSuccess('Quiz Passed', `You scored ${result.score}/${result.max_score} (${result.percentage}%)`);
      } else {
        showError('Quiz Failed', `You scored ${result.score}/${result.max_score}. Need ${quizData.passing_score}% to pass.`);
      }

      if (moduleId) {
        const apiData = await apiClient.getModule(parseInt(moduleId));
        const updatedModule = transformModuleData(apiData);
        setModule(updatedModule);
      }
    } catch (error) {
      showError('Error', 'Failed to submit quiz');
    }
  };

  const handleQuizRetry = () => {
    setQuizSubmitted(false);
    setCurrentQuestionIndex(0);
    setQuizAnswers({});
  };

  const handleQuizClose = () => {
    setShowQuiz(false);
    setQuizData(null);
    setQuizSubmitted(false);
    setQuizResult(null);
    setCurrentQuestionIndex(0);
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
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Module Not Found</h2>
            <p className="text-neutral-600 mb-4">The module you're looking for doesn't exist.</p>
            <button onClick={() => navigate('/modules')} className="btn-primary">
              Back to Modules
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  // Show completion screen if module is completed
  if (module.is_completed) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto">
          <div className="card p-8 text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 text-green-600 mb-4">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <h3 className="text-xl font-semibold mb-2">Module Completed!</h3>
            <p className="text-neutral-600 mb-6">
              Congratulations! You have successfully completed the &quot;{module.title}&quot; module.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate('/dashboard')}
                className="btn-primary"
              >
                Back to Dashboard
              </button>
              <button
                onClick={() => navigate('/certificates')}
                className="btn-secondary"
              >
                View Certificates
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Show lock screen if module is locked
  if (isModuleLocked && prerequisiteModule) {
    return <ModuleLockScreen prerequisiteModule={prerequisiteModule} />;
  }

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
                <span>{module.contents?.length || 0} lessons</span>
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

          <ModuleProgressTracker
            module={{
              id: module.id,
              title: module.title,
              content_count: module.contents?.length || 0,
              content_completed: module.contents?.filter(c => c.user_progress?.status === 'completed').length || 0,
              quiz_count: module.quiz_count || 0,
              quiz_passed: false // or actual value if available
            }}
          />
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
              const isQuiz = content.content_type === 'quiz';

              if (isLocked) {
                return (
                  <div
                    key={content.id}
                    className="flex items-center space-x-4 p-4 rounded-lg border bg-neutral-50 border-neutral-200 opacity-60 cursor-not-allowed"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="text-sm font-medium text-neutral-500 w-6">
                        {index + 1}
                      </div>
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br ${getContentTypeColor(content.content_type)}`}>
                        <Lock className="w-5 h-5 text-white" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-neutral-900 mb-1">{content.title}</h3>
                      <p className="text-sm text-neutral-500">Complete the previous lesson to unlock.</p>
                    </div>
                  </div>
                );
              }

              // Unlocked content card
              return (
                <div
                  key={content.id}
                  className={`flex items-center space-x-4 p-4 rounded-lg border transition-all bg-white border-neutral-200 hover:border-primary-300 hover:shadow-md cursor-pointer`}
                  onClick={() => {
                    if (!isLocked) {
                      handleContentClick(content);
                    }
                  }}
                >
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
                      {isQuiz && (
                        <div className="ml-2">
                          <Badge variant="text">Quiz</Badge>
                        </div>
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
                <div className="aspect-video relative">
                  {selectedContent.youtube_video.youtube_video_id ? (
                    <>
                      <iframe
                        src={`https://www.youtube.com/embed/${selectedContent.youtube_video.youtube_video_id}?enablejsapi=1&origin=${window.location.origin}`}
                        title={selectedContent.title}
                        className="w-full h-full rounded-lg"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        frameBorder="0"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-10">
                        <div className="text-white text-center p-4 bg-black bg-opacity-50 rounded-lg">
                          <Play className="w-12 h-12 mx-auto mb-2" />
                          <p>Click to play video</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center p-8 bg-neutral-100 rounded-lg">
                      <Video className="w-12 h-12 mx-auto text-neutral-400 mb-4" />
                      <p className="text-neutral-600">Video content not available</p>
                      {selectedContent.url && (
                        <a
                          href={selectedContent.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-4 inline-flex items-center text-primary-600 hover:text-primary-800"
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Open in YouTube
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ) : null}
              <div className="flex justify-between items-center pt-4 border-t">
                <div className="text-sm text-neutral-600">
                  {selectedContent.content_type === 'video' && selectedContent.duration && (
                    <span>Duration: {selectedContent.duration} minutes</span>
                  )}
                </div>
                <div className="flex space-x-3">
                  {selectedContent.user_progress?.status !== 'completed' && (
                    <ContentCompletionButton
                      contentId={String(selectedContent.id)}
                      moduleId={String(module.id)}
                      onComplete={() => handleContentComplete(selectedContent)}
                    />
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
          </div>
        )}
      </Modal>

      {/* Quiz Modal */}
      {showQuiz && quizData && (
        <Modal
          isOpen={showQuiz}
          onClose={handleQuizClose}
          title={`Quiz: ${quizData.title}`}
          size="xl"
          {...(!quizSubmitted && { onClose: handleQuizClose })}
        >
          {!quizSubmitted ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-neutral-600">
                  Question {currentQuestionIndex + 1} of {quizData.questions.length}
                </div>
                <Badge variant="text">
                  {quizData.passing_score}% to pass
                </Badge>
              </div>

              <div className="bg-neutral-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">
                  {quizData.questions[currentQuestionIndex].question_text}
                </h3>

                {quizData.questions[currentQuestionIndex].question_type === 'multiple_choice' && (
                  <div className="space-y-3">
                    {quizData.questions[currentQuestionIndex].options.map((option: string, idx: number) => (
                      <label
                        key={idx}
                        className={`flex items-center space-x-3 p-4 rounded-lg border cursor-pointer transition-all ${
                          quizAnswers[quizData.questions[currentQuestionIndex].id] === option
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`question-${quizData.questions[currentQuestionIndex].id}`}
                          value={option}
                          checked={quizAnswers[quizData.questions[currentQuestionIndex].id] === option}
                          onChange={() => handleQuizAnswerChange(quizData.questions[currentQuestionIndex].id, option)}
                          className="text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-neutral-900">{option}</span>
                      </label>
                    ))}
                  </div>
                )}

                {quizData.questions[currentQuestionIndex].question_type === 'true_false' && (
                  <div className="space-y-3">
                    {['True', 'False'].map((option) => (
                      <label
                        key={option}
                        className={`flex items-center space-x-3 p-4 rounded-lg border cursor-pointer transition-all ${
                          quizAnswers[quizData.questions[currentQuestionIndex].id] === option
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`question-${quizData.questions[currentQuestionIndex].id}`}
                          value={option}
                          checked={quizAnswers[quizData.questions[currentQuestionIndex].id] === option}
                          onChange={() => handleQuizAnswerChange(quizData.questions[currentQuestionIndex].id, option)}
                          className="text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-neutral-900">{option}</span>
                      </label>
                    ))}
                  </div>
                )}

                {quizData.questions[currentQuestionIndex].question_type === 'short_answer' && (
                  <textarea
                    value={quizAnswers[quizData.questions[currentQuestionIndex].id] || ''}
                    onChange={(e) => handleQuizAnswerChange(quizData.questions[currentQuestionIndex].id, e.target.value)}
                    placeholder="Enter your answer..."
                    className="w-full p-4 border border-neutral-200 rounded-lg focus:border-primary-500 focus:ring focus:ring-primary-200 min-h-32"
                  />
                )}
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <button
                  onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentQuestionIndex === 0}
                  className="btn-outline flex items-center space-x-2 disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                {currentQuestionIndex < quizData.questions.length - 1 ? (
                  <button
                    onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                    className="btn-primary flex items-center space-x-2"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleQuizSubmit}
                    className="btn-primary"
                  >
                    Submit Quiz
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
                quizResult.passed ? 'bg-green-100' : 'bg-red-100'
              }`}>
                {quizResult.passed ? (
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                ) : (
                  <XCircle className="w-10 h-10 text-red-600" />
                )}
              </div>

              <h3 className="text-2xl font-bold text-neutral-900 mb-2">
                {quizResult.passed ? 'Quiz Passed!' : 'Quiz Failed'}
              </h3>
              
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div>
                  <div className="text-xl font-bold">
                    {quizResult.score}/{quizResult.max_score}
                  </div>
                  <div className="text-sm text-neutral-600">Score</div>
                </div>
                <div>
                  <div className={`text-xl font-bold ${
                    quizResult.passed ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {Math.round(quizResult.percentage)}%
                  </div>
                  <div className="text-sm text-neutral-600">Percentage</div>
                </div>
                <div>
                  <div className="text-xl font-bold">
                    {quizResult.passed ? 'Passed' : 'Failed'}
                  </div>
                  <div className="text-sm text-neutral-600">Result</div>
                </div>
              </div>

              <ProgressBar 
                value={quizResult.percentage} 
                color={quizResult.passed ? 'primary' : 'accent'}
                className="mb-6"
              />

              <div className="flex justify-center space-x-4">
                <button
                  onClick={handleQuizClose}
                  className="btn-primary"
                >
                  Continue Learning
                </button>
                {!quizResult.passed && (
                  <button
                    onClick={handleQuizRetry}
                    className="btn-outline"
                  >
                    Try Again
                  </button>
                )}
              </div>
            </div>
          )}
        </Modal>
      )}
    </Layout>
  );
};

export { ModuleDetailPage };