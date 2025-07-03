import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  Award,
  BarChart3,
  Settings,
  FileText,
  Target,
  Calendar,
  Download
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();

  const navigationItems = {
    user: [
      { icon: LayoutDashboard, label: 'Dashboard', to: '/dashboard' },
      { icon: BookOpen, label: 'Training Modules', to: '/modules' },
      { icon: Award, label: 'Leaderboard', to: '/leaderboard' },
      { icon: Download, label: 'Offline Content', to: '/offline' },
    ],
    trainer: [
      { icon: LayoutDashboard, label: 'Dashboard', to: '/trainer/dashboard' },
      { icon: BookOpen, label: 'My Modules', to: '/trainer/modules' },
      { icon: Users, label: 'Learners', to: '/trainer/learners' },
    ],
    admin: [
      { icon: LayoutDashboard, label: 'Dashboard', to: '/admin/dashboard' },
      { icon: Users, label: 'User Management', to: '/admin/users' },
      { icon: BookOpen, label: 'Content Management', to: '/admin/modules' },
      { icon: BarChart3, label: 'Analytics', to: '/admin/analytics' },
    ]
  };

  const items = user ? navigationItems[user.role] || [] : [];

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:pt-16 bg-white border-r border-neutral-200">
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
          <nav className="mt-5 flex-1 px-2 space-y-1">
            {items.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.to;
              
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`
                    nav-link ${isActive ? 'active' : ''}
                  `}
                >
                  <Icon className="mr-3 flex-shrink-0 h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User info */}
        {user && (
          <div className="flex-shrink-0 flex border-t border-neutral-200 p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {user.first_name[0]}{user.last_name[0]}
                </span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-neutral-900">
                  {user.first_name} {user.last_name}
                </p>
                <p className="text-xs text-neutral-500 capitalize">
                  {user.role}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};