import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Menu, 
  X, 
  User, 
  LogOut, 
  Settings, 
  Bell,
  Award,
  BookOpen
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export const Navbar: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinks = {
    user: [
      { to: '/dashboard', label: 'Dashboard', icon: BookOpen },
      { to: '/modules', label: 'Training Modules', icon: BookOpen },
      { to: '/assignments', label: 'Assignments', icon: BookOpen },
      { to: '/leaderboard', label: 'Leaderboard', icon: Award },
      { to: '/certificates', label: 'Certificates', icon: Award },
    ],
    trainer: [
      { to: '/trainer/dashboard', label: 'Dashboard', icon: BookOpen },
      { to: '/trainer/modules', label: 'My Modules', icon: BookOpen },
      { to: '/trainer/learners', label: 'Learners', icon: User },
      { to: '/trainer/reports', label: 'Reports', icon: BookOpen },
    ],
    admin: [
      { to: '/admin/dashboard', label: 'Dashboard', icon: BookOpen },
      { to: '/admin/users', label: 'User Management', icon: User },
      { to: '/admin/modules', label: 'Content Management', icon: BookOpen },
      { to: '/admin/analytics', label: 'Analytics', icon: BookOpen },
    ]
  };

  const currentNavLinks = user ? navLinks[user.role] || [] : [];

  return (
    <nav className="bg-white/95 backdrop-blur-md shadow-lg border-b border-neutral-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and main nav */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-neutral-900">Jifunze Mara</span>
            </Link>

            {/* Desktop navigation */}
            <div className="hidden md:flex ml-10 space-x-8">
              {currentNavLinks.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname === link.to;
                
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`
                      flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
                      ${isActive 
                        ? 'bg-primary-500 text-white shadow-md' 
                        : 'text-neutral-700 hover:bg-primary-50 hover:text-primary-600'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            {user && (
              <>
                {/* Notifications */}
                <button className="p-2 text-neutral-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                  <Bell className="w-5 h-5" />
                </button>

                {/* Profile menu */}
                <div className="relative">
                  <button
                    onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                    className="flex items-center space-x-3 p-2 rounded-lg hover:bg-neutral-100 transition-colors"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {user.first_name[0]}{user.last_name[0]}
                      </span>
                    </div>
                    <span className="hidden md:block text-sm font-medium text-neutral-700">
                      {user.first_name} {user.last_name}
                    </span>
                  </button>

                  {/* Profile dropdown */}
                  {isProfileMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-neutral-200 py-1 z-50">
                      <Link
                        to="/profile"
                        className="flex items-center space-x-2 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
                        onClick={() => setIsProfileMenuOpen(false)}
                      >
                        <User className="w-4 h-4" />
                        <span>Profile</span>
                      </Link>
                      <Link
                        to="/settings"
                        className="flex items-center space-x-2 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
                        onClick={() => setIsProfileMenuOpen(false)}
                      >
                        <Settings className="w-4 h-4" />
                        <span>Settings</span>
                      </Link>
                      <hr className="my-1 border-neutral-200" />
                      <button
                        onClick={handleLogout}
                        className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-neutral-600 hover:text-primary-600 rounded-lg"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-neutral-200">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {currentNavLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.to;
              
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`
                    flex items-center space-x-2 px-3 py-2 rounded-lg text-base font-medium
                    ${isActive 
                      ? 'bg-primary-500 text-white' 
                      : 'text-neutral-700 hover:bg-primary-50 hover:text-primary-600'
                    }
                  `}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Icon className="w-5 h-5" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
};