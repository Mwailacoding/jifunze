import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { apiClient, User } from '../utils/api';

// User type definition
export type UserRole = 'admin' | 'trainer' | 'user';

// Type guard for UserRole
function isUserRole(role: string): role is UserRole {
  return ['admin', 'trainer', 'user'].includes(role);
}

// Validate API response matches our User type
function validateUser(user: any): User {
  if (!user) throw new Error('User data is missing');
  if (!isUserRole(user.role)) {
    throw new Error(`Invalid user role: ${user.role}`);
  }

  return {
    id: user.id,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    role: user.role,
    employer_id: user.employer_id,
    department_id: user.department_id,
    phone: user.phone,
    profile_picture: user.profile_picture,
    is_active: user.is_active ?? true,
    last_login: user.last_login,
    created_at: user.created_at,
    updated_at: user.updated_at
  };
}

// Context types
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
  clearError: () => void;
}

type RegisterData = {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: UserRole;
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
          setUser(validateUser(userProfile));
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
        if (error instanceof Error) {
          setError(error.message);
        }
        await logout();
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    clearError();
    try {
      const response = await apiClient.login(email, password);
      
      localStorage.setItem('authToken', response.token);
      apiClient.setToken(response.token);
      
      const validatedUser = validateUser(response.user);
      setUser(validatedUser);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Login failed:', error);
      if (error instanceof Error) {
        setError(error.message);
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [clearError]);

  const register = useCallback(async (userData: RegisterData) => {
    setIsLoading(true);
    clearError();
    try {
      const response = await apiClient.register(userData);
      
      localStorage.setItem('authToken', response.token);
      apiClient.setToken(response.token);
      
      const validatedUser = validateUser(response.user);
      setUser(validatedUser);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Registration failed:', error);
      if (error instanceof Error) {
        setError(error.message);
      }
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
      clearError();
    }
  }, [clearError]);

  const updateUser = useCallback((userData: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...userData });
    }
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