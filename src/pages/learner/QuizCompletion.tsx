import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  RotateCw, 
  ChevronRight,
  Award,
  Download
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../../contexts/NotificationContext';
import { apiClient } from '../../utils/api';

interface QuizCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  quizId: number;
  moduleId: number;
  passed: boolean;
  score: number;
  passingScore: number;
  nextModuleId?: number;
}

export const QuizCompletionModal: React.FC<QuizCompletionModalProps> = ({
  isOpen,
  onClose,
  quizId,
  moduleId,
  passed,
  score,
  passingScore,
  nextModuleId
}) => {
  const navigate = useNavigate();
  const { showSuccess } = useNotification();

  const handleRetakeQuiz = () => {
    navigate(`/modules/${moduleId}/quiz`);
    onClose();
  };

  const handleNextModule = () => {
    if (nextModuleId) {
      navigate(`/modules/${nextModuleId}`);
    } else {
      navigate('/modules');
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="text-center">
          {passed ? (
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
          ) : (
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
              <XCircle className="h-10 w-10 text-red-600" />
            </div>
          )}

          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {passed ? 'Quiz Passed!' : 'Quiz Not Passed'}
          </h3>
          
          <div className="mb-4">
            <p className="text-sm text-gray-500">
              Your score: <span className="font-semibold">{score}%</span> 
              (Required: {passingScore}%)
            </p>
          </div>

          <div className="mt-6 flex flex-col space-y-3">
            {passed ? (
              <>
                {nextModuleId ? (
                  <Button
                    onClick={handleNextModule}
                    variant="default"
                    className="w-full"
                  >
                    Continue to Next Module <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    onClick={() => navigate('/modules')}
                    variant="default"
                    className="w-full"
                  >
                    Back to Modules
                  </Button>
                )}
                <Button
                  onClick={() => navigate(`/modules/${moduleId}`)}
                  variant="outline"
                  className="w-full"
                >
                  Review Module
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={handleRetakeQuiz}
                  variant="default"
                  className="w-full"
                >
                  <RotateCw className="w-4 h-4 mr-2" />
                  Retake Quiz
                </Button>
                <Button
                  onClick={() => navigate(`/modules/${moduleId}`)}
                  variant="outline"
                  className="w-full"
                >
                  Review Module Content
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

