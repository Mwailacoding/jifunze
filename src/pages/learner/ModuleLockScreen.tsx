import React from 'react';
import { Lock, BookOpen, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from './ui/Button';
import { Link } from 'react-router-dom';

interface ModuleLockScreenProps {
  module: {
    id: number;
    title: string;
    content_completed: number;
    content_count: number;
    quiz_passed: boolean;
    quiz_count: number;
  };
  previousModuleId: number;
}

export const ModuleLockScreen: React.FC<ModuleLockScreenProps> = ({ 
  module,
  previousModuleId
}) => {
  const contentIncomplete = module.content_completed < module.content_count;
  const quizNotPassed = module.quiz_count > 0 && !module.quiz_passed;

  return (
    <div className="card p-8 text-center">
      <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 text-red-600 mb-4">
        <Lock className="h-8 w-8" />
      </div>
      
      <h3 className="text-xl font-semibold mb-2">Module Locked</h3>
      <p className="text-neutral-600 mb-6">
        You need to complete the previous module requirements to access this content.
      </p>

      <div className="max-w-md mx-auto mb-8">
        <div className="space-y-3 text-left">
          {contentIncomplete && (
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-accent-600 mr-2 mt-0.5" />
              <div>
                <p className="font-medium">Complete all content</p>
                <p className="text-sm text-neutral-600">
                  {module.content_completed} of {module.content_count} lessons completed
                </p>
              </div>
            </div>
          )}

          {quizNotPassed && (
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-accent-600 mr-2 mt-0.5" />
              <div>
                <p className="font-medium">Pass the module quiz</p>
                <p className="text-sm text-neutral-600">
                  You need to score at least 80% to pass
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-center gap-3">
        <Button
          asChild
          variant="primary"
        >
          <Link to={`/modules/${previousModuleId}`}>
            Return to Previous Module
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
        >
          <Link to="/modules">
            Browse Available Modules
          </Link>
        </Button>
      </div>
    </div>
  );
};