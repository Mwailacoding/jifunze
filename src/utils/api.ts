// api.ts

// Configuration
const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || '/api',
  DEFAULT_TIMEOUT: 70000, // 10 seconds
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
  description: string;
  category: string;
  difficulty_level: string;
  estimated_duration: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
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
  };
}

export interface Progress {
  content_id: number;
  status: 'not_started' | 'in_progress' | 'completed';
  current_position?: number;
  completed_at?: string;
  attempts?: number;
  score?: number;
}

export interface ProgressSummary {
  total_modules: number;
  completed_modules: number;
  completion_percentage: number;
  total_points: number;
  badges_count: number;
  recent_activity: {
    content_id: number;
    content_title: string;
    module_title: string;
    status: string;
    last_accessed: string;
    score?: number;
  }[];
}

export interface Quiz {
  id: number;
  module_id: number;
  title: string;
  description?: string;
  passing_score: number;
  time_limit?: number;
  is_active: boolean;
  questions?: QuizQuestion[];
  user_result?: {
    score: number;
    passed: boolean;
    completed_at: string;
  };
}

export interface QuizQuestion {
  id: number;
  quiz_id: number;
  question_text: string;
  question_type: string;
  options: string[];
  correct_answer: string;
  points: number;
  explanation?: string;
}

export interface QuizResult {
  quiz_id: number;
  score: number;
  max_score: number;
  percentage: number;
  passed: boolean;
  answers: Record<string, string>;
  correct_answers: Record<string, string>;
  completed_at: string;
  details?: {
    question_id: number;
    correct: boolean;
    correct_answer: string;
  }[];
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
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  image_url: string;
  earned_at?: string;
  criteria?: string;
}

export interface LeaderboardEntry {
  user_id: number;
  first_name: string;
  last_name: string;
  profile_picture?: string;
  total_points: number;
  badges_count: number;
  modules_completed: number;
  rank?: number;
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
  recent_modules: {
    id: number;
    title: string;
    learners: number;
    completion_rate: number;
  }[];
  recent_quiz_results: {
    quiz_title: string;
    module_title: string;
    user_id: number;
    first_name: string;
    last_name: string;
    score: number;
    max_score: number;
    passed: boolean;
    completed_at: string;
  }[];
  assignment_stats: {
    id: number;
    module_title: string;
    assigned_to: number;
    completed_by: number;
  }[];
  total_learners?: number;
  active_learners?: number;
  total_modules?: number;
  active_modules?: number;
  recent_completions?: ModuleCompletion[];
}

export interface ModuleCompletion {
  user_id: number;
  first_name: string;
  last_name: string;
  module_id: number;
  module_title: string;
  completed_at: string;
  score: number;
}

export interface Notification {
  id: number;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  action_url?: string;
}

export interface ModuleStats {
  module: Module;
  learner_progress: {
    user_id: number;
    first_name: string;
    last_name: string;
    completed_content: number;
    total_content: number;
  }[];
  quiz_results: QuizResult[];
}

export interface LearnerDetails {
  learner: User;
  modules_progress: {
    id: number;
    title: string;
    completed_content: number;
    total_content: number;
  }[];
  quiz_results: QuizResult[];
  badges: Badge[];
}

export interface ModuleProgressReport {
  module_id: number;
  title: string;
  learners: {
    user_id: number;
    first_name: string;
    last_name: string;
    status: string;
    progress: number;
    last_accessed: string;
  }[];
  summary: {
    total_learners: number;
    not_started: number;
    in_progress: number;
    completed: number;
    average_progress: number;
  };
}

export interface QuizPerformanceReport {
  quiz_id: number;
  title: string;
  attempts: number;
  average_score: number;
  pass_rate: number;
  question_stats: {
    question_id: number;
    question_text: string;
    correct_rate: number;
    common_mistakes: string[];
  }[];
}

export interface DashboardStats {
  total_modules: number;
  in_progress_modules: number;
  completed_modules: number;
  average_score: number;
  recent_activity: Activity[];
}

export interface Activity {
  id: number;
  type: string;
  item_id: number;
  created_at: string;
  details: string;
}

interface LoginResponse {
  token: string;
  user: User;
}

interface RegisterResponse {
  token: string;
  user: User;
}

interface ApiResponse<T> {
  data?: T;
  message?: string;
  success: boolean;
}

class ApiClient {
  private token: string | null = null;
  private requestQueue: { endpoint: string; options: RequestInit }[] = [];
  private isRefreshing = false;

  constructor() {
    this.token = localStorage.getItem('authToken');
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('authToken', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('authToken');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.DEFAULT_TIMEOUT);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(this.token && { 'Authorization': `Bearer ${this.token}` }),
      ...(options.headers as Record<string, string>),
    };

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
        ...options,
        headers,
        credentials: 'include',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Handle 404 specifically
      if (response.status === 404) {
        throw new Error(`Endpoint not found: ${endpoint}`);
      }

      if (response.status === 401) {
        this.clearToken();
        throw new Error('Session expired. Please login again.');
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
    this.setToken(response.token);
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
      await this.request(API_CONFIG.AUTH_PATHS.logout, { method: 'POST' });
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

  async updateProfile(profileData: Partial<User>): Promise<User> {
    return this.request<User>('/profile', {
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

  async getModule(moduleId: number): Promise<Module & { contents: ModuleContent[] }> {
    return this.request<Module & { contents: ModuleContent[] }>(`/modules/${moduleId}`);
  }

  async createModule(moduleData: Omit<Module, 'id' | 'created_at' | 'updated_at'>): Promise<Module> {
    return this.request<Module>('/modules', {
      method: 'POST',
      body: JSON.stringify(moduleData),
    });
  }

  async updateModule(moduleId: number, moduleData: Partial<Module>): Promise<Module> {
    return this.request<Module>(`/modules/${moduleId}`, {
      method: 'PUT',
      body: JSON.stringify(moduleData),
    });
  }

  async activateModule(moduleId: number): Promise<Module> {
    return this.request<Module>(`/modules/${moduleId}/activate`, {
      method: 'PUT',
    });
  }
  
  async deactivateModule(moduleId: number): Promise<Module> {
    return this.request<Module>(`/modules/${moduleId}/deactivate`, {
      method: 'PUT',
    });
  }

  async addModuleContent(moduleId: number, contentData: Omit<ModuleContent, 'id'>): Promise<ModuleContent> {
    return this.request<ModuleContent>(`/modules/${moduleId}/content`, {
      method: 'POST',
      body: JSON.stringify(contentData),
    });
  }

  async updateModuleContent(moduleId: number, contentId: number, contentData: Partial<ModuleContent>): Promise<ModuleContent> {
    return this.request<ModuleContent>(`/modules/${moduleId}/content/${contentId}`, {
      method: 'PUT',
      body: JSON.stringify(contentData),
    });
  }

  async deleteModuleContent(moduleId: number, contentId: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/modules/${moduleId}/content/${contentId}`, {
      method: 'DELETE',
    });
  }

  // Progress endpoints
  async updateProgress(progressData: {
    content_id: number;
    status: 'not_started' | 'in_progress' | 'completed';
    current_position?: number;
    attempts?: number;
    score?: number;
  }): Promise<Progress> {
    return this.request<Progress>('/progress', {
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

  async createQuiz(quizData: Omit<Quiz, 'id'>): Promise<Quiz> {
    return this.request<Quiz>('/quizzes', {
      method: 'POST',
      body: JSON.stringify(quizData),
    });
  }

  async updateQuiz(quizId: number, quizData: Partial<Quiz>): Promise<Quiz> {
    return this.request<Quiz>(`/quizzes/${quizId}`, {
      method: 'PUT',
      body: JSON.stringify(quizData),
    });
  }

  async activateQuiz(quizId: number): Promise<Quiz> {
    return this.request<Quiz>(`/quizzes/${quizId}/activate`, {
      method: 'PUT',
    });
  }

  async deactivateQuiz(quizId: number): Promise<Quiz> {
    return this.request<Quiz>(`/quizzes/${quizId}/deactivate`, {
      method: 'PUT',
    });
  }

  // Assignment endpoints
  async getAssignments(): Promise<Assignment[]> {
    return this.request<Assignment[]>('/assignments');
  }

  async createAssignment(assignmentData: Omit<Assignment, 'id'>): Promise<Assignment> {
    return this.request<Assignment>('/assignments', {
      method: 'POST',
      body: JSON.stringify(assignmentData),
    });
  }

  async updateAssignment(assignmentId: number, assignmentData: Partial<Assignment>): Promise<Assignment> {
    return this.request<Assignment>(`/assignments/${assignmentId}`, {
      method: 'PUT',
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
    return response.blob();
  }

  async downloadCertificate(certType: string, itemId: number): Promise<Blob> {
    const response = await fetch(`${API_CONFIG.BASE_URL}/user/certificates/download/${certType}/${itemId}`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
    });
    return response.blob();
  }

  async getCertificateHistory(): Promise<Certificate[]> {
    return this.request<Certificate[]>('/user/certificates/history');
  }

  // Offline content endpoints
  async downloadContent(contentId: number): Promise<{ download_url: string }> {
    return this.request<{ download_url: string }>(`/content/${contentId}/download`, {
      method: 'POST',
    });
  }

  async getOfflineContent(): Promise<OfflineContent[]> {
    return this.request<OfflineContent[]>('/offline-content');
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

  // Trainer specific endpoints with enhanced 404 handling
  async getTrainerDashboard(): Promise<TrainerDashboard> {
    try {
      return await this.request<TrainerDashboard>('/trainer/dashboard');
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        console.warn('Trainer dashboard endpoint not found, returning empty dashboard');
        return {
          recent_modules: [],
          recent_quiz_results: [],
          assignment_stats: [],
          total_learners: 0,
          active_learners: 0,
          total_modules: 0,
          active_modules: 0,
          recent_completions: []
        };
      }
      throw error;
    }
  }

  async getTrainerModules(): Promise<Module[]> {
    try {
      return await this.request<Module[]>('/trainer/modules');
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        console.warn('Trainer modules endpoint not found, returning empty array');
        return [];
      }
      throw error;
    }
  }

  async getModuleStats(moduleId: number): Promise<ModuleStats> {
    try {
      return await this.request<ModuleStats>(`/trainer/modules/${moduleId}/stats`);
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        console.warn('Module stats endpoint not found, returning empty stats');
        return {
          module: {
            id: moduleId,
            title: '',
            description: '',
            category: '',
            difficulty_level: '',
            estimated_duration: 0,
            is_active: false,
            created_at: '',
            updated_at: ''
          },
          learner_progress: [],
          quiz_results: []
        };
      }
      throw error;
    }
  }

  async getTrainerLearners(): Promise<User[]> {
    try {
      return await this.request<User[]>('/trainer/learners');
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        console.warn('Trainer learners endpoint not found, returning empty array');
        return [];
      }
      throw error;
    }
  }

  async getLearnerDetails(learnerId: number): Promise<LearnerDetails> {
    try {
      return await this.request<LearnerDetails>(`/trainer/learners/${learnerId}`);
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        console.warn('Learner details endpoint not found, returning empty details');
        return {
          learner: {
            id: learnerId,
            email: '',
            first_name: '',
            last_name: '',
            role: 'user',
            is_active: false,
            created_at: '',
            updated_at: ''
          },
          modules_progress: [],
          quiz_results: [],
          badges: []
        };
      }
      throw error;
    }
  }

  async getModuleProgressReport(moduleId?: number, timeRange?: string): Promise<ModuleProgressReport> {
    const params = new URLSearchParams();
    if (moduleId) params.append('module_id', moduleId.toString());
    if (timeRange) params.append('time_range', timeRange);
    
    try {
      return await this.request<ModuleProgressReport>(`/trainer/reports/module-progress?${params.toString()}`);
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        console.warn('Module progress report endpoint not found, returning empty report');
        return {
          module_id: moduleId || 0,
          title: '',
          learners: [],
          summary: {
            total_learners: 0,
            not_started: 0,
            in_progress: 0,
            completed: 0,
            average_progress: 0
          }
        };
      }
      throw error;
    }
  }

  async getQuizPerformanceReport(quizId?: number, timeRange?: string): Promise<QuizPerformanceReport> {
    const params = new URLSearchParams();
    if (quizId) params.append('quiz_id', quizId.toString());
    if (timeRange) params.append('time_range', timeRange);
    
    try {
      return await this.request<QuizPerformanceReport>(`/trainer/reports/quiz-performance?${params.toString()}`);
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        console.warn('Quiz performance report endpoint not found, returning empty report');
        return {
          quiz_id: quizId || 0,
          title: '',
          attempts: 0,
          average_score: 0,
          pass_rate: 0,
          question_stats: []
        };
      }
      throw error;
    }
  }

  // Admin specific endpoints
  async getAllUsers(): Promise<User[]> {
    return this.request<User[]>('/users');
  }

  async getUser(userId: number): Promise<User> {
    return this.request<User>(`/users/${userId}`);
  }

  async updateUser(userId: number, userData: Partial<User>): Promise<User> {
    return this.request<User>(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async updateUserRole(userId: number, role: string): Promise<User> {
    return this.request<User>(`/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  }

  async activateUser(userId: number): Promise<User> {
    return this.request<User>(`/users/${userId}/activate`, {
      method: 'PUT',
    });
  }

  async deactivateUser(userId: number): Promise<User> {
    return this.request<User>(`/users/${userId}/deactivate`, {
      method: 'PUT',
    });
  }

  // Notification endpoints
  async getNotifications(): Promise<Notification[]> {
    return this.request<Notification[]>('/notifications');
  }

  async markNotificationsRead(): Promise<{ message: string }> {
    return this.request<{ message: string }>('/notifications/mark-read', {
      method: 'POST',
    });
  }

  async markNotificationRead(notificationId: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/notifications/${notificationId}/mark-read`, {
      method: 'POST',
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
    return this.request<T>(endpoint, {
      method: 'GET',
    });
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
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }
}

export const apiClient = new ApiClient();