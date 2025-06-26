export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'trainer' | 'user';
  employer_id?: number;
  department_id?: number;
  phone?: string;
  profile_picture?: string;
  is_active: boolean;
  last_login?: string;
  created_at: string;
}

export interface Module {
  id: number;
  name?: string; // Made optional
  title: string;
  description?: string;
  category: string; // Made optional
  difficulty_level: 'beginner' | 'intermediate' | 'advanced'; // Made optional
  estimated_duration?: number;
  is_active?: boolean; // Made optional
  created_by?: number; // Made optional
  created_at?: string; // Made optional
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
  assignments?: Assignment[];
  quizzes?: Quiz[];
  user_status?: 'not_started' | 'in_progress' | 'completed';
  badge_associated?: Badge;
  certificates?: Certificate[];
  notifications?: Notification[];
  dashboard_stats?: DashboardStats;
  progress_summary?: ProgressSummary;
}

export interface ModuleContent {
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

export interface YouTubeVideo {
  id: number;
  content_id: number;
  youtube_video_id: string;
  title: string;
  channel_name?: string;
  duration?: number;
  thumbnail_url?: string;
}

export interface UserProgress {
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

export interface Quiz {
  id: number;
  module_id: number;
  title: string;
  description?: string;
  passing_score: number;
  time_limit?: number;
  is_active: boolean;
  created_by: number;
  created_at: string;
  questions?: QuizQuestion[];
  user_result?: QuizResult;
}

export interface QuizQuestion {
  id: number;
  quiz_id: number;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'short_answer';
  options: string[];
  correct_answer?: string;
  points: number;
}

export interface QuizResult {
  id: number;
  user_id: number;
  quiz_id: number;
  score: number;
  max_score: number;
  percentage: number;
  passed: boolean;
  answers: Record<string, string>;
  correct_answers?: Record<string, string>;
  completed_at: string;
}

export interface Assignment {
  id: number;
  module_id: number;
  assigned_by?: number; // Made optional
  assignment_type?: 'individual' | 'department' | 'all'; // Made optional
  individual_id?: number;
  department_id?: number;
  employer_id?: number;
  due_date?: string;
  is_mandatory?: boolean; // Made optional
  notes?: string;
  created_at?: string; // Made optional
  module_title?: string;
  completion_percentage?: number;
  assigned_count?: number;
  completed_count?: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  level: 'bronze' | 'silver' | 'gold' | 'platinum';
  earned?: boolean;
  earned_at?: string;
}

export interface UserPoints {
  id: number;
  user_id: number;
  points: number;
  reason: string;
  awarded_at: string;
}

export interface LeaderboardEntry {
  id: number;
  first_name: string;
  last_name: string;
  total_points: number;
  modules_completed: number;
  quizzes_passed: number;
  quizzes_taken: number;
  badges_count: number;
  rank?: number; // optional, since you assign it in the frontend
}

export interface Certificate {
  id: number;
  certificate_type: 'module' | 'quiz';
  item_id: number;
  certificate_id: string;
  title: string;
  generated_at: string;
}

export interface Notification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  is_read: boolean;
  created_at: string;
}

export interface DashboardStats {
  total_users: number;
  active_users: number;
  total_modules: number;
  active_modules: number;
  recent_activity: Array<{
    first_name: string;
    last_name: string;
    module_title: string;
    status: string;
    last_accessed: string;
  }>;
}

export interface ProgressSummary {
  completion_percentage: number;
  completed_modules: number;
  total_modules: number;
  total_points: number;
  badges_count: number;
  current_streak: number;
  recent_activity: {
    content_title: string;
    module_title: string;
    status: 'completed' | 'in-progress';
  }[];
}

// Re-export all types from api.ts for convenience
export * from '../utils/api';

// Additional component-specific types
export interface ComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'secondary' | 'neutral';
}

export interface ProgressBarProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error';
  className?: string;
  showLabel?: boolean;
  animated?: boolean;
}

export interface BadgeProps {
  children: React.ReactNode;
  level?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'bronze' | 'silver' | 'gold' | 'platinum';
  size?: 'sm' | 'md' | 'lg';
  earned?: boolean;
  className?: string;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
}

export interface FormFieldProps {
  label?: string;
  error?: string;
  required?: boolean;
  helpText?: string;
  children: React.ReactNode;
}

// Quiz-specific types
export interface QuizNavigationProps {
  currentIndex: number;
  totalQuestions: number;
  answers: Record<number, string>;
  flaggedQuestions: Set<number>;
  onNavigate: (index: number) => void;
  onToggleFlag: (questionId: number) => void;
}

export interface QuizTimerProps {
  timeLeft: number | null;
  warningThreshold?: number;
  onTimeUp: () => void;
}

export interface QuizQuestionProps {
  question: QuizQuestion;
  answer: string;
  onChange: (answer: string) => void;
  isFlagged: boolean;
  onToggleFlag: () => void;
  questionNumber: number;
  totalQuestions: number;
}

export interface QuizResultsProps {
  result: QuizResult;
  quiz: Quiz;
  onRetake: () => void;
  onContinue: () => void;
}

// Layout and navigation types
export interface NavigationItem {
  label: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  children?: NavigationItem[];
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

// Table types
export interface TableColumn<T> {
  key: keyof T;
  label: string;
  render?: (value: any, item: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}

export interface TableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  onSort?: (key: keyof T, direction: 'asc' | 'desc') => void;
  sortKey?: keyof T;
  sortDirection?: 'asc' | 'desc';
}

// Form types
export interface FormData {
  [key: string]: any;
}

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
}

export interface FormValidation {
  [key: string]: ValidationRule;
}

// Chart and analytics types
export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

export interface AnalyticsData {
  period: string;
  metrics: {
    [key: string]: number;
  };
}

// File upload types
export interface FileUploadProps {
  accept?: string;
  multiple?: boolean;
  maxSize?: number;
  onUpload: (files: File[]) => void;
  onError?: (error: string) => void;
  placeholder?: string;
}

// Search and filter types
export interface SearchFilters {
  query?: string;
  category?: string;
  status?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  tags?: string[];
}

export interface SortOption {
  key: string;
  label: string;
  direction?: 'asc' | 'desc';
}

// Pagination types
export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showInfo?: boolean;
  itemsPerPage?: number;
  totalItems?: number;
}

// Error types
export interface ApiError {
  message: string;
  code?: string;
  details?: any;
}

export interface FormErrors {
  [field: string]: string;
}

// Theme and styling types
export type ColorVariant = 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error' | 'neutral';
export type SizeVariant = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'link';

// State management types
export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export interface ListState<T> extends AsyncState<T[]> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
  };
  filters?: SearchFilters;
  sort?: SortOption;
}