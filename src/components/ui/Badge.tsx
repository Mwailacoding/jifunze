import React from 'react';
import { Badge as BadgeType } from '../../types';

interface BadgeProps extends Partial<BadgeType> {
  size?: 'sm' | 'md' | 'lg';
  showDescription?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  name,
  description,
  level = 'bronze',
  earned = false,
  size = 'md',
  showDescription = false,
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-16 h-16 text-base'
  };

  const levelClasses = {
    bronze: 'badge-bronze',
    silver: 'badge-silver',
    gold: 'badge-gold',
    platinum: 'badge-platinum'
  };

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div
        className={`
          ${sizeClasses[size]} 
          ${levelClasses[level]} 
          ${earned ? '' : 'opacity-30 grayscale'}
          rounded-full flex items-center justify-center font-bold
          shadow-lg transition-all duration-300
          ${earned ? 'transform hover:scale-110' : ''}
        `}
      >
        {level === 'bronze' && '🥉'}
        {level === 'silver' && '🥈'}
        {level === 'gold' && '🥇'}
        {level === 'platinum' && '💎'}
      </div>
      {name && (
        <span className={`mt-1 text-center font-medium text-neutral-700 ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
          {name}
        </span>
      )}
      {showDescription && description && (
        <p className="mt-1 text-xs text-neutral-600 text-center max-w-20">
          {description}
        </p>
      )}
    </div>
  );
};