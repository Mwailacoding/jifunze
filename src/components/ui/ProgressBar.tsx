import React from 'react';

interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
  showPercentage?: boolean;
  animated?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'secondary' | 'accent';
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  className = '',
  showPercentage = false,
  animated = true,
  size = 'md',
  color = 'primary'
}) => {
  const percentage = Math.min((value / max) * 100, 100);
  
  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-4'
  };

  const colorClasses = {
    primary: 'from-primary-500 to-primary-600',
    secondary: 'from-secondary-500 to-secondary-600',
    accent: 'from-accent-400 to-accent-600'
  };

  return (
    <div className={`progress-bar ${sizeClasses[size]} ${className}`}>
      <div
        className={`progress-fill bg-gradient-to-r ${colorClasses[color]} ${animated ? 'transition-all duration-500' : ''}`}
        style={{ width: `${percentage}%` }}
      />
      {showPercentage && (
        <span className="text-xs font-medium text-neutral-600 ml-2">
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  );
};