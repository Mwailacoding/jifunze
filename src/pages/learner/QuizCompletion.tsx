import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  RotateCw, 
  ChevronRight,
  Award,
  Download
} from 'lucide-react';
import { Button } from '../ui/Button';
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
  const [certificate, setCertificate] = useState<{
    id: string;
    downloadUrl: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && passed) {
      fetchCertificate();
    }
  }, [isOpen, passed]);

  const fetchCertificate = async () => {
    try {
      setIsLoading(true);
      const cert = await apiClient.getModuleCertificate(moduleId);
      setCertificate(cert);
    } catch (error) {
      console.error('Failed to fetch certificate', error);
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleDownloadCertificate = () => {
    if (certificate) {
      window.open(certificate.downloadUrl, '_blank');
    }
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

          {passed && certificate && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-center mb-3">
                <Award className="h-8 w-8 text-blue-600" />
              </div>
              <p className="text-sm text-blue-800 mb-3">
                Congratulations! You've earned a certificate for completing this module.
              </p>
              <Button
                onClick={handleDownloadCertificate}
                variant="primary"
                className="w-full"
                disabled={isLoading}
              >
                <Download className="w-4 h-4 mr-2" />
                {isLoading ? 'Preparing...' : 'Download Certificate'}
              </Button>
            </div>
          )}

          <div className="mt-6 flex flex-col space-y-3">
            {passed ? (
              <>
                {nextModuleId ? (
                  <Button
                    onClick={handleNextModule}
                    variant="primary"
                    className="w-full"
                  >
                    Continue to Next Module <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    onClick={() => navigate('/modules')}
                    variant="primary"
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
                  variant="primary"
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

