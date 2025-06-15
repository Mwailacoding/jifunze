import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'trainer' | 'user';
  redirectUnauthorizedTo?: string;
  redirectUnauthenticatedTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole,
  redirectUnauthorizedTo = '/dashboard',
  redirectUnauthenticatedTo = '/login'
}) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  // Show loading spinner while auth state is being determined
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // If user is not authenticated
  if (!user) {
    return (
      <Navigate 
        to={redirectUnauthenticatedTo} 
        state={{ from: location }} 
        replace 
      />
    );
  }

  // If role is required but user doesn't have it (and isn't admin)
  if (requiredRole && user.role !== requiredRole && user.role !== 'admin') {
    return <Navigate to={redirectUnauthorizedTo} replace />;
  }

  // If all checks pass, render the children
  return <>{children}</>;
};

// Default props (optional)
ProtectedRoute.defaultProps = {
  redirectUnauthorizedTo: '/dashboard',
  redirectUnauthenticatedTo: '/login'
};