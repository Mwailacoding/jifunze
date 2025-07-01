import React from 'react';
import { CheckCircle2, Circle, AlertCircle, BookOpen, Star } from 'lucide-react';
import { ProgressBar } from '../../components/ui/ProgressBar';

interface ModuleProgressTrackerProps {
  module: {
    id: number;
    title: string;
    content_count: number;
    content_completed: number;
    quiz_count: number;
    quiz_passed: boolean;
  };
}

export const ModuleProgressTracker: React.FC<ModuleProgressTrackerProps> = ({ module }) => {
  const completionPercentage = Math.round(
    (module.content_completed / module.content_count) * 100
  );

  return (
    <div className="card p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4">Module Progress</h3>
      
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium">Overall Completion</span>
          <span className="text-sm">{completionPercentage}%</span>
        </div>
        <ProgressBar 
          value={completionPercentage} 
          color={completionPercentage === 100 ? 'primary' : 'accent'} 
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center">
          {module.content_completed === module.content_count ? (
            <CheckCircle2 className="w-5 h-5 text-primary-600 mr-2" />
          ) : (
            <Circle className="w-5 h-5 text-neutral-300 mr-2" />
          )}
          <span className={module.content_completed === module.content_count ? 'text-neutral-700' : 'text-neutral-500'}>
            Complete all content ({module.content_completed}/{module.content_count})
          </span>
        </div>

        {module.quiz_count > 0 && (
          <div className="flex items-center">
            {module.quiz_passed ? (
              <CheckCircle2 className="w-5 h-5 text-primary-600 mr-2" />
            ) : module.content_completed === module.content_count ? (
              <AlertCircle className="w-5 h-5 text-accent-600 mr-2" />
            ) : (
              <Circle className="w-5 h-5 text-neutral-300 mr-2" />
            )}
            <span className={
              module.quiz_passed ? 'text-neutral-700' : 
              module.content_completed === module.content_count ? 'text-accent-600' : 'text-neutral-500'
            }>
              Pass the module quiz
            </span>
          </div>
        )}

        <div className="pt-3 mt-3 border-t border-neutral-100">
          <div className="flex items-center text-sm text-neutral-600">
            <BookOpen className="w-4 h-4 mr-2" />
            <span>{module.content_completed} of {module.content_count} lessons completed</span>
          </div>
          {module.quiz_count > 0 && (
            <div className="flex items-center text-sm text-neutral-600 mt-1">
              <Star className="w-4 h-4 mr-2" />
              <span>Quiz {module.quiz_passed ? 'passed' : 'not passed yet'}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};