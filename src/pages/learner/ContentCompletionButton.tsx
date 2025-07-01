import React, { useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from './ui/Button';
import { useNotification } from '../contexts/NotificationContext';
import { apiClient } from '../utils/api';

interface ContentCompletionButtonProps {
  contentId: number;
  moduleId: number;
  onCompleted?: () => void;
  initialCompleted?: boolean;
}

export const ContentCompletionButton: React.FC<ContentCompletionButtonProps> = ({
  contentId,
  moduleId,
  onCompleted,
  initialCompleted = false
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isCompleted, setIsCompleted] = useState(initialCompleted);
  const { showSuccess, showError } = useNotification();

  const handleComplete = async () => {
    try {
      setIsLoading(true);
      await apiClient.markContentComplete(contentId, moduleId);
      setIsCompleted(true);
      showSuccess('Completed', 'Content marked as complete');
      if (onCompleted) onCompleted();
    } catch (error) {
      showError('Error', 'Failed to mark content as complete');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-6">
      {isCompleted ? (
        <div className="flex items-center justify-center p-3 bg-green-50 text-green-700 rounded-lg">
          <CheckCircle2 className="w-5 h-5 mr-2" />
          <span>Completed</span>
        </div>
      ) : (
        <Button
          onClick={handleComplete}
          variant="primary"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Marking Complete...
            </>
          ) : (
            'Mark as Complete'
          )}
        </Button>
      )}
    </div>
  );
};