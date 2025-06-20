import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { apiClient, User } from '../utils/api';

// User type definition
export type UserRole = 'admin' | 'trainer' | 'user';

// Type guard for UserRole
function isUserRole(role: string): role is UserRole {
  return ['admin', 'trainer', 'user'].includes(role.toLowerCase());
}

// Updated validateUser function with role normalization
function validateUser(user: any): User {
  if (!user || typeof user !== 'object') {
    throw new Error('Invalid user data provided');
  }

  // Validate required fields
  if (!user.id || !user.email || !user.first_name || !user.last_name) {
    throw new Error('Missing required user fields');
  }
  
  // Normalize role to lowercase and validate
  const normalizedRole = user.role?.toString().toLowerCase();
  if (!isUserRole(normalizedRole)) {
    console.warn(`Invalid user role received: ${user.role}, defaulting to 'user'`);
    user.role = 'user'; // Default to 'user' if invalid
  } else {
    user.role = normalizedRole; // Ensure correct casing
  }

  return {
    id: Number(user.id),
    email: String(user.email),
    first_name: String(user.first_name),
    last_name: String(user.last_name),
    role: user.role,
    employer_id: user.employer_id ? Number(user.employer_id) : undefined,
    department_id: user.department_id ? Number(user.department_id) : undefined,
    phone: user.phone ? String(user.phone) : undefined,
    profile_picture: user.profile_picture ? String(user.profile_picture) : undefined,
    is_active: Boolean(user.is_active ?? true),
    last_login: user.last_login ? String(user.last_login) : undefined,
    created_at: user.created_at ? String(user.created_at) : undefined,
    updated_at: user.updated_at ? String(user.updated_at) : undefined
  };
}

// Context types
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<LoginResult>;
  register: (userData: RegisterData) => Promise<RegisterResult>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
  clearError: () => void;
  refreshUser: () => Promise<void>;
  hasRole: (role: UserRole | UserRole[]) => boolean;
  canAccess: (requiredRole: UserRole) => boolean;
}

export interface LoginResult {
  success: boolean;
  user: User;
  redirectTo?: string;
  isAdmin?: boolean;
}

export interface RegisterResult {
  success: boolean;
  user: User;
  redirectTo?: string;
}

type RegisterData = {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: UserRole | string;
  employer_id?: number;
  department_id?: number;
  phone?: string;
  profile_picture?: string;
};

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Context provider component
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize auth state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (token) {
          apiClient.setToken(token);
          const userProfile = await apiClient.getProfile();
          const validatedUser = validateUser(userProfile);
          setUser(validatedUser);
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
        if (error instanceof Error) {
          // Don't show initialization errors to users
          console.warn('Auth initialization failed:', error.message);
        }
        await logout();
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!user) return;
    
    try {
      const userProfile = await apiClient.getProfile();
      const validatedUser = validateUser(userProfile);
      setUser(validatedUser);
    } catch (error) {
      console.error('Failed to refresh user:', error);
      if (error instanceof Error && error.message.includes('expired')) {
        await logout();
      }
    }
  }, [user]);

  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    setIsLoading(true);
    clearError();
    
    try {
      const response = await apiClient.login(email, password);
      
      if (!response.success) {
        throw new Error(response.message || 'Login failed');
      }
      
      localStorage.setItem('authToken', response.token);
      apiClient.setToken(response.token);
      
      const validatedUser = validateUser(response.user);
      setUser(validatedUser);
      setIsAuthenticated(true);
      
      // Determine redirect path
      let redirectTo = '/dashboard';
      const isAdmin = response.redirect_to_admin || validatedUser.role === 'admin';
      
      if (isAdmin) {
        redirectTo = '/admin/dashboard';
      } else if (validatedUser.role === 'trainer') {
        redirectTo = '/trainer/dashboard';
      }
      
      return {
        success: true,
        user: validatedUser,
        redirectTo,
        isAdmin
      };
    } catch (error) {
      console.error('Login failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [clearError]);

  const register = useCallback(async (userData: RegisterData): Promise<RegisterResult> => {
    setIsLoading(true);
    clearError();
    
    try {
      // Normalize role before sending to API
      const normalizedData = {
        ...userData,
        role: userData.role.toString().toLowerCase()
      };
      
      const response = await apiClient.register(normalizedData);
      
      localStorage.setItem('authToken', response.token);
      apiClient.setToken(response.token);
      
      const validatedUser = validateUser(response.user);
      setUser(validatedUser);
      setIsAuthenticated(true);
      
      // Determine redirect path
      let redirectTo = '/dashboard';
      if (validatedUser.role === 'admin') {
        redirectTo = '/admin/dashboard';
      } else if (validatedUser.role === 'trainer') {
        redirectTo = '/trainer/dashboard';
      }
      
      return {
        success: true,
        user: validatedUser,
        redirectTo
      };
    } catch (error) {
      console.error('Registration failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [clearError]);

  const logout = useCallback(async () => {
    try {
      await apiClient.logout();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      localStorage.removeItem('authToken');
      apiClient.clearToken();
      setUser(null);
      setIsAuthenticated(false);
      clearError();
    }
  }, [clearError]);

  const updateUser = useCallback((userData: Partial<User>) => {
    if (!user) return;
    
    try {
      // Ensure role is normalized when updating user
      if (userData.role) {
        const normalizedRole = userData.role.toString().toLowerCase();
        userData.role = isUserRole(normalizedRole) ? normalizedRole : user.role;
      }
      
      const updatedUser = { ...user, ...userData };
      const validatedUser = validateUser(updatedUser);
      setUser(validatedUser);
    } catch (error) {
      console.error('Failed to update user:', error);
      setError('Failed to update user information');
    }
  }, [user]);

  // Role checking utilities
  const hasRole = useCallback((role: UserRole | UserRole[]): boolean => {
    if (!user) return false;
    
    if (Array.isArray(role)) {
      return role.includes(user.role);
    }
    
    return user.role === role;
  }, [user]);

  const canAccess = useCallback((requiredRole: UserRole): boolean => {
    if (!user) return false;
    
    // Role hierarchy: admin > trainer > user
    const roleHierarchy: Record<UserRole, number> = {
      admin: 3,
      trainer: 2,
      user: 1
    };
    
    const userLevel = roleHierarchy[user.role] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 0;
    
    return userLevel >= requiredLevel;
  }, [user]);

  // Context value
  const value = {
    user,
    isLoading,
    isAuthenticated,
    error,
    login,
    register,
    logout,
    updateUser,
    clearError,
    refreshUser,
    hasRole,
    canAccess,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook for using the auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Higher-order component for role-based access
export const withAuth = <P extends object>(
  Component: React.ComponentType<P>,
  requiredRole?: UserRole
) => {
  return (props: P) => {
    const { user, isLoading, canAccess } = useAuth();
    
    if (isLoading) {
      return <div>Loading...</div>;
    }
    
    if (!user) {
      return <div>Please log in to access this page.</div>;
    }
    
    if (requiredRole && !canAccess(requiredRole)) {
      return <div>You do not have permission to access this page.</div>;
    }
    
    return <Component {...props} />;
  };
};