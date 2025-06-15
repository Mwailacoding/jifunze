import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { apiClient } from '../utils/api';

// User type definition
export type UserRole = 'admin' | 'trainer' | 'user';

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  employer_id?: number;
  department_id?: number;
  phone?: string;
  profile_picture?: string;
  is_active?: boolean;
  last_login?: string;
  created_at?: string;
  updated_at?: string;
}

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
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  refreshAuth: () => Promise<string>; // Update the return type to Promise<string>
  clearError: () => void;
}

interface LoginResponse {
  token: string;
  user: any;
  refresh_token?: string;
}

interface RegisterResponse {
  token: string;
  user: any;
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
        logout();
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
      const response = await apiClient.login(email, password) as LoginResponse;
      
      localStorage.setItem('authToken', response.token);
      if (response.refresh_token) {
        localStorage.setItem('refreshToken', response.refresh_token);
      }

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
      const response = await apiClient.register(userData) as RegisterResponse;
      
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

  const logout = useCallback(() => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    apiClient.clearToken();
    setUser(null);
    setIsAuthenticated(false);
    clearError();
  }, [clearError]);

  const updateUser = useCallback((userData: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...userData });
    }
  }, [user]);

  const refreshAuth = useCallback(async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    setIsLoading(true);
    clearError();
    try {
      const newToken = await apiClient.refreshToken();

      if (!newToken) {
        throw new Error('Failed to refresh token: Token is null');
      }

      localStorage.setItem('authToken', newToken);
      apiClient.setToken(newToken);

      const userProfile = await apiClient.getProfile();
      const validatedUser = validateUser(userProfile);
      setUser(validatedUser);
      setIsAuthenticated(true);
      return newToken;
    } catch (error) {
      console.error('Failed to refresh auth:', error);
      if (error instanceof Error) {
        setError(error.message);
      }
      logout();
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [logout, clearError]);

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
    refreshAuth,
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

// ApiClient class
class ApiClient {
  public async refreshToken(): Promise<string | null> {
    // Logic to refresh the token
    const response = await fetch('/api/refresh-token', {
      method: 'POST',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    const data = await response.json();
    return data.token || null;
  }
}