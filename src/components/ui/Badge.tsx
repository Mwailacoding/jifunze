import React from 'react';

type BadgeLevel = 
  | 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' 
  | 'bronze' | 'silver' | 'gold' | 'platinum';

interface BadgeProps {
  name?: string;
  description?: string;
  children?: React.ReactNode;
  level?: BadgeLevel;
  earned?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showDescription?: boolean;
  className?: string;
  variant?: 'text' | 'icon';
}

export const Badge: React.FC<BadgeProps> = ({
  name,
  description,
  children,
  level = 'default',
  earned = false,
  size = 'md',
  showDescription = false,
  className = '',
  variant = 'text'
}) => {
  // Size classes for both variants
  const sizeClasses = {
    sm: variant === 'text' ? 'px-2 py-0.5 text-xs' : 'w-8 h-8 text-xs',
    md: variant === 'text' ? 'px-2.5 py-1 text-sm' : 'w-12 h-12 text-sm',
    lg: variant === 'text' ? 'px-3 py-1.5 text-base' : 'w-16 h-16 text-base'
  };
  
  // Level classes for both variants
  const levelClasses = {
    default: 'bg-neutral-100 text-neutral-800',
    primary: 'bg-primary-100 text-primary-800',
    secondary: 'bg-secondary-100 text-secondary-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800',
    bronze: earned 
      ? variant === 'text' 
        ? 'bg-amber-100 text-amber-800 ring-1 ring-amber-300' 
        : 'bg-amber-100 text-amber-800 shadow-amber-200'
      : variant === 'text'
        ? 'bg-neutral-100 text-neutral-500'
        : 'bg-neutral-100 text-neutral-400 opacity-70',
    silver: earned
      ? variant === 'text'
        ? 'bg-gray-100 text-gray-800 ring-1 ring-gray-300'
        : 'bg-gray-100 text-gray-800 shadow-gray-200'
      : variant === 'text'
        ? 'bg-neutral-100 text-neutral-500'
        : 'bg-neutral-100 text-neutral-400 opacity-70',
    gold: earned
      ? variant === 'text'
        ? 'bg-yellow-100 text-yellow-800 ring-1 ring-yellow-300'
        : 'bg-yellow-100 text-yellow-800 shadow-yellow-200'
      : variant === 'text'
        ? 'bg-neutral-100 text-neutral-500'
        : 'bg-neutral-100 text-neutral-400 opacity-70',
    platinum: earned
      ? variant === 'text'
        ? 'bg-purple-100 text-purple-800 ring-1 ring-purple-300'
        : 'bg-purple-100 text-purple-800 shadow-purple-200'
      : variant === 'text'
        ? 'bg-neutral-100 text-neutral-500'
        : 'bg-neutral-100 text-neutral-400 opacity-70'
  };

  // Icon content
  const getIconContent = () => {
    if (children) return children;
    switch (level) {
      case 'bronze': return '🥉';
      case 'silver': return '🥈';
      case 'gold': return '🥇';
      case 'platinum': return '💎';
      default: return null;
    }
  };

  if (variant === 'icon') {
    return (
      <div className={`flex flex-col items-center ${className}`}>
        <div
          className={`
            ${sizeClasses[size]} 
            ${levelClasses[level]} 
            rounded-full flex items-center justify-center font-bold
            shadow-lg transition-all duration-300
            ${earned ? 'transform hover:scale-105' : ''}
          `}
        >
          {getIconContent()}
        </div>
        {name && (
          <span className={`mt-1 text-center font-medium text-neutral-700 ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
            {name}
          </span>
        )}
        {showDescription && description && (
          <p className="mt-1 text-xs text-neutral-600 text-center max-w-[100px] truncate">
            {description}
          </p>
        )}
      </div>
    );
  }

  return (
    <span
      className={`
        inline-flex items-center font-medium rounded-full 
        ${sizeClasses[size]} 
        ${levelClasses[level]} 
        ${className}
      `}
    >
      {children || name}
    </span>
  );
};