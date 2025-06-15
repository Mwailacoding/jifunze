import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface RoleBasedRouteProps {
  adminComponent: React.ReactNode;
  trainerComponent: React.ReactNode;
  userComponent: React.ReactNode;
}

export const RoleBasedRoute: React.FC<RoleBasedRouteProps> = ({
  adminComponent,
  trainerComponent,
  userComponent
}) => {
  const { user } = useAuth();

  if (!user) return null;

  switch (user.role) {
    case 'admin':
      return <>{adminComponent}</>;
    case 'trainer':
      return <>{trainerComponent}</>;
    case 'user':
      return <>{userComponent}</>;
    default:
      return <>{userComponent}</>;
  }
};