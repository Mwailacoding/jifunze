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
  category?: string; // Made optional
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced'; // Made optional
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
// In src/types/index.ts
export interface LeaderboardEntry {
  id: number;
  first_name: string;
  last_name: string;
  profile_picture?: string;
  total_points: number;
  badges_count: number;
  modules_completed: number;
  rank: number;
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
  total_modules?: number;
  completed_modules?: number;
  completion_percentage?: number;
  total_points?: number;
  badges_count?: number;
  recent_activity?: Array<{
    content_id?: number;
    content_title?: string;
    module_title?: string;
    status?: string;
    last_accessed?: string;
    score?: number;
  }>;
}