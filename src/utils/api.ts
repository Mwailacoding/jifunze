import { ProgressSummary } from '../types';

// api.ts
// Configuration
const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || '/api',
  DEFAULT_TIMEOUT: 70000, // 70 seconds
  AUTH_PATHS: {
    login: '/login',
    register: '/register',
    forgotPassword: '/forgot-password',
    resetPassword: '/reset-password',
    logout: '/logout'
  }
};

// Type definitions
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
  is_active?: boolean;
  last_login?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Module {
  id: number;
  title: string;
  description?: string;
  category: string;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  estimated_duration?: number;
  is_active?: boolean;
  created_by?: number;
  created_at?: string;
  completion_percentage?: number;
}

export interface ModuleContent {
  id: number;
  module_id: number;
  content_type: string;
  title: string;
  description?: string;
  url?: string;
  file_path?: string;
  duration?: number;
  display_order: number;
  is_downloadable: boolean;
  user_progress?: {
    status: 'not_started' | 'in_progress' | 'completed';
    progress: number;
    completed_at?: string;
    last_accessed?: string;
  };
  offline_available?: boolean;
  youtube_video?: {
    youtube_video_id: string;
    title: string;
    channel_name: string;
    duration: number;
    thumbnail_url: string;
  };
}

export interface Progress {
  content_id: number;
  status: 'not_started' | 'in_progress' | 'completed';
  current_position?: number;
  completed_at?: string;
  last_accessed?: string;
  attempts?: number;
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
  created_by?: number;
  created_at?: string;
  updated_at?: string;
  questions?: QuizQuestion[];
  user_result?: QuizUserResult;
  attempts_allowed?: number;
  user_attempts?: number;
}

export interface QuizQuestion {
  id: number;
  quiz_id: number;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'short_answer';
  options: string[];
  correct_answer?: string;
  points: number;
  explanation?: string;
  display_order?: number;
}

export interface QuizUserResult {
  score: number;
  max_score: number;
  percentage: number;
  passed: boolean;
  completed_at: string;
  time_taken?: number;
}

export interface QuizResult {
  id?: number;
  user_id: number;
  quiz_id: number;
  score: number;
  max_score: number;
  percentage: number;
  passed: boolean;
  answers: Record<string, string>;
  correct_answers?: Record<string, string>;
  completed_at: string;
  time_taken?: number;
  points_awarded?: number;
  badges_awarded?: string[];
}

export interface QuizSubmission {
  quiz_id: number;
  answers: Array<{ question_id: number; answer: string }>;
  time_taken?: number;
}

export interface Assignment {
  id: number;
  module_id: number;
  assigned_by: number;
  assignment_type: 'individual' | 'department' | 'all';
  individual_id?: number;
  department_id?: number;
  employer_id?: number;
  due_date?: string;
  is_mandatory: boolean;
  notes?: string;
  module_title?: string;
  completion_percentage?: number;
  created_at?: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  image_url?: string;
  earned_at?: string;
  criteria?: string;
  level?: 'bronze' | 'silver' | 'gold' | 'platinum';
  category?: string;
}

export interface LeaderboardEntry {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  profile_picture?: string;
  total_points: number;
  badges_count: number;
  modules_completed: number;
  quizzes_taken: number;
  quizzes_passed: number;
  avg_quiz_score: number;
  rank: number;
  employer_id?: number;
  last_updated?: string;
}

export interface Certificate {
  id: number;
  certificate_type: 'module' | 'quiz';
  item_id: number;
  certificate_id: string;
  generated_at: string;
  title?: string;
  download_url?: string;
}

export interface OfflineContent {
  id: number;
  title: string;
  content_type: string;
  size: number;
  file_path?: string;
  downloaded_at?: string;
}

export interface TrainerDashboard {
  total_modules: number;
  active_modules: number;
  total_learners: number;
  recent_modules: {
    id: number;
    title: string;
    created_at: string;
    learners: number;
  }[];
  recent_quiz_results: {
    id: number;
    score: number;
    completed_at: string;
    quiz_title: string;
    first_name: string;
    last_name: string;
  }[];
  assignment_stats: {
    id: number;
    module_title: string;
    assigned_to: number;
    completed_by: number;
  }[];
}

export interface Notification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  notification_type: 'badge' | 'assignment' | 'completion' | 'reminder' | 'system';
  is_read: boolean;
  created_at: string;
  action_url?: string;
  data?: Record<string, any>;
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

interface LoginResponse {
  success: boolean;
  message: string;
  token: string;
  refresh_token?: string;
  user: User;
  redirect_to_admin?: boolean;
}

interface RegisterResponse {
  message: string;
  user: User;
  token: string;
  redirect_to?: string;
}

interface ApiResponse<T> {
  data?: T;
  message?: string;
  success: boolean;
  error?: string;
}

class ApiClient {
  private token: string | null = null;
  private refreshToken: string | null = null;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }> = [];

  constructor() {
    this.token = localStorage.getItem('authToken');
    this.refreshToken = localStorage.getItem('refreshToken');
  }

  setToken(token: string, refreshToken?: string) {
    this.token = token;
    localStorage.setItem('authToken', token);
    
    if (refreshToken) {
      this.refreshToken = refreshToken;
      localStorage.setItem('refreshToken', refreshToken);
    }
  }

  clearToken() {
    this.token = null;
    this.refreshToken = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
  }

  private async processQueue(error: any, token: string | null = null) {
    this.failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve(token);
      }
    });
    
    this.failedQueue = [];
  }

  private async refreshAuthToken(): Promise<string> {
    if (this.isRefreshing) {
      return new Promise((resolve, reject) => {
        this.failedQueue.push({ resolve, reject });
      });
    }

    this.isRefreshing = true;

    try {
      if (!this.refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await fetch(`${API_CONFIG.BASE_URL}/refresh-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: this.refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      this.setToken(data.token);
      this.processQueue(null, data.token);
      
      return data.token;
    } catch (error) {
      this.processQueue(error, null);
      this.clearToken();
      throw error;
    } finally {
      this.isRefreshing = false;
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.DEFAULT_TIMEOUT);

    const makeRequest = async (token?: string): Promise<Response> => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...(options.headers as Record<string, string>),
      };

      return fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
        ...options,
        headers,
        signal: controller.signal
      });
    };

    try {
      let response = await makeRequest(this.token || undefined);

      if (response.status === 401 && this.refreshToken && !this.isRefreshing) {
        try {
          const newToken = await this.refreshAuthToken();
          response = await makeRequest(newToken);
        } catch (refreshError) {
          this.clearToken();
          throw new Error('Session expired. Please login again.');
        }
      }

      clearTimeout(timeoutId);

      if (response.status === 404) {
        throw new Error(`Endpoint not found: ${endpoint}`);
      }

      if (response.status === 401) {
        this.clearToken();
        throw new Error('Session expired. Please login again.');
      }

      if (response.status === 403) {
        throw new Error('Access denied. You do not have permission to perform this action.');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Request failed with status ${response.status}`);
      }

      return await response.json() as T;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timed out');
        }
        throw error;
      }
      throw new Error('An unexpected error occurred');
    }
  }

  // Authentication endpoints
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>(API_CONFIG.AUTH_PATHS.login, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    this.setToken(response.token, response.refresh_token);
    return response;
  }

  async register(userData: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    role: string;
    employer_id?: number;
    phone?: string;
  }): Promise<RegisterResponse> {
    const response = await this.request<RegisterResponse>(API_CONFIG.AUTH_PATHS.register, {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    
    this.setToken(response.token);
    return response;
  }

  async logout(): Promise<void> {
    try {
      await this.request('/logout', { method: 'POST' });
    } finally {
      this.clearToken();
    }
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(API_CONFIG.AUTH_PATHS.forgotPassword, {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`${API_CONFIG.AUTH_PATHS.resetPassword}/${token}`, {
      method: 'POST',
      body: JSON.stringify({ new_password: newPassword }),
    });
  }

  // User endpoints
  async getProfile(): Promise<User> {
    return this.request<User>('/profile');
  }

  async updateProfile(profileData: Partial<User>): Promise<{ message: string; user: User }> {
    return this.request<{ message: string; user: User }>('/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('/change-password', {
      method: 'POST',
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    });
  }

  // Module endpoints
  async getModules(): Promise<Module[]> {
    return this.request<Module[]>('/modules');
  }

  async getModule(moduleId: number): Promise<Module> {
    return this.request<Module>(`/modules/${moduleId}`);
  }

  async createModule(moduleData: Omit<Module, 'id' | 'created_at' | 'updated_at'>): Promise<{ message: string; module_id: number }> {
    return this.request<{ message: string; module_id: number }>('/modules', {
      method: 'POST',
      body: JSON.stringify(moduleData),
    });
  }

  async activateModule(moduleId: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/modules/${moduleId}/activate`, {
      method: 'PUT',
    });
  }
  
  async deactivateModule(moduleId: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/modules/${moduleId}/deactivate`, {
      method: 'PUT',
    });
  }

  async addModuleContent(moduleId: number, contentData: any): Promise<{ message: string; content_id: number }> {
    return this.request<{ message: string; content_id: number }>(`/modules/${moduleId}/content`, {
      method: 'POST',
      body: JSON.stringify(contentData),
    });
  }

  // Progress endpoints
  async updateProgress(progressData: {
    content_id: number;
    status: 'not_started' | 'in_progress' | 'completed';
    current_position?: number;
    attempts?: number;
    score?: number;
  }): Promise<{ message: string; points_awarded?: number; badges_awarded?: string[] }> {
    return this.request<{ message: string; points_awarded?: number; badges_awarded?: string[] }>('/progress', {
      method: 'POST',
      body: JSON.stringify(progressData),
    });
  }

  async getProgressSummary(): Promise<ProgressSummary> {
    return this.request<ProgressSummary>('/progress/summary');
  }

  // Quiz endpoints
  async getModuleQuizzes(moduleId: number): Promise<Quiz[]> {
    return this.request<Quiz[]>(`/quizzes/module/${moduleId}`);
  }

  async getQuiz(quizId: number): Promise<Quiz> {
    return this.request<Quiz>(`/quizzes/${quizId}`);
  }

  async submitQuiz(quizId: number, answers: Array<{ question_id: number; answer: string }>): Promise<QuizResult> {
    return this.request<QuizResult>(`/quizzes/${quizId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    });
  }

  async createQuiz(quizData: {
    module_id: number;
    title: string;
    description?: string;
    passing_score?: number;
    time_limit?: number;
    questions: Array<{
      question_text: string;
      question_type: string;
      options: string[];
      correct_answer: string;
      points?: number;
    }>;
  }): Promise<{ message: string; quiz_id: number }> {
    return this.request<{ message: string; quiz_id: number }>('/quizzes', {
      method: 'POST',
      body: JSON.stringify(quizData),
    });
  }

  // Assignment endpoints
  async getAssignments(): Promise<Assignment[]> {
    return this.request<Assignment[]>('/assignments');
  }

  async createAssignment(assignmentData: Omit<Assignment, 'id'>): Promise<{ message: string; assignment_id: number }> {
    return this.request<{ message: string; assignment_id: number }>('/assignments', {
      method: 'POST',
      body: JSON.stringify(assignmentData),
    });
  }

  async deleteAssignment(assignmentId: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/assignments/${assignmentId}`, {
      method: 'DELETE',
    });
  }

  // Badge endpoints
  async getAllBadges(): Promise<Badge[]> {
    return this.request<Badge[]>('/badges');
  }

  async getEarnedBadges(): Promise<Badge[]> {
    return this.request<Badge[]>('/badges/earned');
  }

  async awardBadge(userId: number, badgeId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('/badges/award', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, badge_id: badgeId }),
    });
  }

  // Leaderboard endpoints
  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    return this.request<LeaderboardEntry[]>('/leaderboard');
  }

  // Certificate endpoints
  async previewCertificate(certType: string, itemId: number): Promise<Blob> {
    const response = await fetch(`${API_CONFIG.BASE_URL}/user/certificates/preview/${certType}/${itemId}`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to generate certificate preview');
    }
    
    return response.blob();
  }

  async downloadCertificate(certType: string, itemId: number): Promise<Blob> {
    const response = await fetch(`${API_CONFIG.BASE_URL}/user/certificates/download/${certType}/${itemId}`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to download certificate');
    }
    
    return response.blob();
  }

  async getCertificateHistory(): Promise<Certificate[]> {
    return this.request<Certificate[]>('/user/certificates/history');
  }

  // Offline content endpoints
  async downloadContent(contentId: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/content/${contentId}/download`, {
      method: 'POST',
    });
  }

  async getOfflineContent(): Promise<{
    offline_content: OfflineContent[];
    total_size: number;
    max_size: number;
  }> {
    return this.request<{
      offline_content: OfflineContent[];
      total_size: number;
      max_size: number;
    }>('/offline-content');
  }

  async deleteOfflineContent(contentId: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/offline-content/${contentId}`, {
      method: 'DELETE',
    });
  }

  // Dashboard endpoints
  async getDashboardStats(): Promise<DashboardStats> {
    return this.request<DashboardStats>('/dashboard/stats');
  }

  async getAdminDashboardStats(): Promise<DashboardStats> {
    return this.request<DashboardStats>('/dashboard/admin-stats');
  }

  // Trainer specific endpoints
  async getTrainerDashboard(): Promise<TrainerDashboard> {
    try {
      return await this.request<TrainerDashboard>('/trainer/dashboard');
    } catch (error) {
      console.warn('Trainer dashboard endpoint not available, returning default data');
      return {
        total_modules: 0,
        active_modules: 0,
        total_learners: 0,
        recent_modules: [],
        recent_quiz_results: [],
        assignment_stats: []
      };
    }
  }

  async getTrainerModules(): Promise<Module[]> {
    try {
      return await this.request<Module[]>('/trainer/modules');
    } catch (error) {
      console.warn('Trainer modules endpoint not available');
      return [];
    }
  }

  async getTrainerLearners(): Promise<User[]> {
    try {
      return await this.request<User[]>('/trainer/learners');
    } catch (error) {
      console.warn('Trainer learners endpoint not available');
      return [];
    }
  }

  // Notification endpoints
  async getNotifications(): Promise<{ unread: Notification[]; read: Notification[] }> {
    return this.request<{ unread: Notification[]; read: Notification[] }>('/notifications');
  }

  async markNotificationsRead(notificationIds: number[]): Promise<{ message: string }> {
    return this.request<{ message: string }>('/notifications/mark-read', {
      method: 'POST',
      body: JSON.stringify({ notification_ids: notificationIds }),
    });
  }

  async markAllNotificationsRead(): Promise<{ message: string }> {
    return this.request<{ message: string }>('/notifications/mark-all-read', {
      method: 'POST',
    });
  }

  // Admin endpoints
  async getAllUsers(): Promise<User[]> {
    return this.request<User[]>('/users');
  }

  async getUser(userId: number): Promise<User> {
    return this.request<User>(`/users/${userId}`);
  }

  async updateUserRole(userId: number, role: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  }

  async activateUser(userId: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/users/${userId}/activate`, {
      method: 'PUT',
    });
  }

  async deactivateUser(userId: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/users/${userId}/deactivate`, {
      method: 'PUT',
    });
  }

  // Contact endpoint
  async sendContactMessage(contactData: {
    name: string;
    email: string;
    message: string;
  }): Promise<{ message: string }> {
    return this.request<{ message: string }>('/contact', {
      method: 'POST',
      body: JSON.stringify(contactData),
    });
  }

  // Utility methods
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  async getRecentModules(): Promise<Module[]> {
    return this.request<Module[]>('/modules/recent');
  }
}

export const apiClient = new ApiClient();