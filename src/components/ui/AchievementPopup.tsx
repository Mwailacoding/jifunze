import React, { useEffect, useState } from 'react';
import { Trophy, Award, Star, Crown } from 'lucide-react';
import { useConfetti } from '../../hooks/useConfetti';

interface AchievementPopupProps {
  achievement: {
    type: 'badge' | 'points' | 'completion' | 'certificate';
    title: string;
    description: string;
    level?: 'bronze' | 'silver' | 'gold' | 'platinum';
    points?: number;
  };
  isVisible: boolean;
  onClose: () => void;
}

export const AchievementPopup: React.FC<AchievementPopupProps> = ({
  achievement,
  isVisible,
  onClose
}) => {
  const { showConfetti } = useConfetti();
  const [shouldAnimate, setShouldAnimate] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShouldAnimate(true);
      showConfetti({ particleCount: 100, spread: 100 });
      
      const timer = setTimeout(() => {
        onClose();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [isVisible, showConfetti, onClose]);

  if (!isVisible) return null;

  const getIcon = () => {
    switch (achievement.type) {
      case 'badge':
        return <Award className="w-8 h-8" />;
      case 'points':
        return <Star className="w-8 h-8" />;
      case 'completion':
        return <Trophy className="w-8 h-8" />;
      case 'certificate':
        return <Crown className="w-8 h-8" />;
      default:
        return <Trophy className="w-8 h-8" />;
    }
  };

  const getLevelColor = () => {
    if (!achievement.level) return 'from-primary-500 to-primary-600';
    
    const colors = {
      bronze: 'from-amber-600 to-amber-800',
      silver: 'from-gray-400 to-gray-600',
      gold: 'from-accent-400 to-accent-600',
      platinum: 'from-purple-400 to-purple-600'
    };
    
    return colors[achievement.level];
  };

  return (
    <div className="fixed top-4 right-4 z-50">
      <div
        className={`
          achievement-popup max-w-sm p-6 bg-white rounded-xl shadow-2xl border-2 border-accent-200
          ${shouldAnimate ? 'animate-fade-in' : ''}
        `}
      >
        <div className="flex items-center space-x-4">
          <div
            className={`
              w-16 h-16 rounded-full flex items-center justify-center
              bg-gradient-to-br ${getLevelColor()} text-white
              shadow-lg animate-pulse-slow
            `}
          >
            {getIcon()}
          </div>
          
          <div className="flex-1">
            <h3 className="text-lg font-bold text-neutral-900 mb-1">
              🎉 Achievement Unlocked!
            </h3>
            <h4 className="font-semibold text-primary-600 mb-1">
              {achievement.title}
            </h4>
            <p className="text-sm text-neutral-600">
              {achievement.description}
            </p>
            {achievement.points && (
              <p className="text-xs text-accent-600 font-medium mt-2">
                +{achievement.points} points earned!
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};