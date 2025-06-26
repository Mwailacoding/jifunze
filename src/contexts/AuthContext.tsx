import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { apiClient, User } from '../utils/api';

// User type definition
export type UserRole = 'admin' | 'trainer' | 'user';

// Type guard for UserRole
function isUserRole(role: string): role is UserRole {
  return ['admin', 'trainer', 'user'].includes(role.toLowerCase());
}

// Enhanced validateUser function with strict typing and normalization
function validateUser(user: unknown): User {
  if (!user || typeof user !== 'object') {
    throw new Error('Invalid user data provided');
  }

  const userObj = user as Record<string, unknown>;

  // Validate required fields with proper type checking
  const requiredFields = ['id', 'email', 'first_name', 'last_name'];
  for (const field of requiredFields) {
    if (!userObj[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  // Normalize and validate role
  let role: UserRole = 'user';
  if (userObj.role) {
    const roleStr = String(userObj.role).toLowerCase();
    if (isUserRole(roleStr)) {
      role = roleStr;
    } else {
      console.warn(`Invalid user role received: ${userObj.role}, defaulting to 'user'`);
    }
  }

  // Helper function for optional number fields
  const getOptionalNumber = (value: unknown): number | undefined => 
    value !== undefined ? Number(value) : undefined;

  // Helper function for optional string fields
  const getOptionalString = (value: unknown): string | undefined =>
    value !== undefined ? String(value) : undefined;

  return {
    id: Number(userObj.id),
    email: String(userObj.email),
    first_name: String(userObj.first_name),
    last_name: String(userObj.last_name),
    role,
    employer_id: getOptionalNumber(userObj.employer_id),
    department_id: getOptionalNumber(userObj.department_id),
    phone: getOptionalString(userObj.phone),
    profile_picture: getOptionalString(userObj.profile_picture),
    is_active: Boolean(userObj.is_active ?? true),
    last_login: userObj.last_login ? new Date(String(userObj.last_login)).toISOString() : undefined,
    created_at: userObj.created_at ? new Date(String(userObj.created_at)).toISOString() : undefined,
    updated_at: userObj.updated_at ? new Date(String(userObj.updated_at)).toISOString() : undefined
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

interface RegisterData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role?: UserRole | string;
  employer_id?: number;
  department_id?: number;
  phone?: string;
  profile_picture?: string;
}

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
      setIsLoading(true);
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
        await logout();
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const refreshUser = useCallback(async () => {
    if (!isAuthenticated) return;
    
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
  }, [isAuthenticated]);

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
      
      // Determine redirect path based on role
      let redirectTo = '/dashboard';
      const isAdmin = validatedUser.role === 'admin';
      
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
      throw error;
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
        role: userData.role?.toString().toLowerCase() || 'user'
      };
      
      const response = await apiClient.register(normalizedData);
      
      localStorage.setItem('authToken', response.token);
      apiClient.setToken(response.token);
      
      const validatedUser = validateUser(response.user);
      setUser(validatedUser);
      setIsAuthenticated(true);
      
      // Determine redirect path based on role
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
      throw error;
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
      setIsLoading(false);
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
    return Array.isArray(role) ? role.includes(user.role) : user.role === role;
  }, [user]);

  const canAccess = useCallback((requiredRole: UserRole): boolean => {
    if (!user) return false;
    
    // Role hierarchy: admin > trainer > user
    const roleHierarchy: Record<UserRole, number> = {
      admin: 3,
      trainer: 2,
      user: 1
    };
    
    return (roleHierarchy[user.role] || 0) >= (roleHierarchy[requiredRole] || 0);
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
): React.FC<P> => {
  const WrappedComponent: React.FC<P> = (props) => {
    const { user, isLoading, canAccess } = useAuth();
    
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-64">
          <span className="text-lg">Loading authentication...</span>
        </div>
      );
    }
    
    if (!user) {
      return (
        <div className="flex justify-center items-center h-64">
          <span className="text-lg">Please log in to access this page.</span>
        </div>
      );
    }
    
    if (requiredRole && !canAccess(requiredRole)) {
      return (
        <div className="flex justify-center items-center h-64">
          <span className="text-lg text-red-500">
            You don't have permission to access this page.
          </span>
        </div>
      );
    }
    
    return <Component {...props} />;
  };
  
  WrappedComponent.displayName = `withAuth(${Component.displayName || Component.name || 'Component'})`;
  return WrappedComponent;
};