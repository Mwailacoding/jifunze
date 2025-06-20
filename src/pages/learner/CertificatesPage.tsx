import React, { useState, useEffect } from 'react';
import { 
  Award, 
  Download, 
  Eye, 
  Calendar,
  FileText,
  Star,
  Trophy,
  ExternalLink
} from 'lucide-react';
import { Layout } from '../../components/layout/Layout';
import { useNotification } from '../../contexts/NotificationContext';
import { apiClient } from '../../utils/api';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Badge } from '../../components/ui/Badge';

// Define the Certificate type here to match what's expected in the component
interface Certificate {
  id: number;
  certificate_type: 'module' | 'quiz';
  item_id: number;
  certificate_id: string;
  title: string; // Making title required here
  generated_at: string;
}

export const CertificatesPage: React.FC = () => {
  const { showError, showSuccess } = useNotification();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [earnedBadges, setEarnedBadges] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch certificates and badges in parallel
        const [certificatesData, badgesData] = await Promise.all([
          apiClient.getCertificateHistory(),
          apiClient.getEarnedBadges()
        ]);
        
        // Transform certificatesData to ensure title is not undefined
        const transformedCertificates = certificatesData.map(cert => ({
          ...cert,
          title: cert.title || `Certificate ${cert.certificate_id}` // Provide a default if title is undefined
        }));
        
        setCertificates(transformedCertificates);
        setEarnedBadges(badgesData);
      } catch (error) {
        showError('Error', 'Failed to load certificates and achievements');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [showError]);

  const handlePreviewCertificate = async (certificate: Certificate) => {
    try {
      const blob = await apiClient.previewCertificate(certificate.certificate_type, certificate.item_id);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (error) {
      showError('Error', 'Failed to preview certificate');
    }
  };

  const handleDownloadCertificate = async (certificate: Certificate) => {
    try {
      const blob = await apiClient.downloadCertificate(certificate.certificate_type, certificate.item_id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificate_${certificate.certificate_type}_${certificate.item_id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      showSuccess('Download Started', 'Certificate download has started');
    } catch (error) {
      showError('Error', 'Failed to download certificate');
    }
  };

  const getCertificateIcon = (type: string) => {
    switch (type) {
      case 'module':
        return FileText;
      case 'quiz':
        return Star;
      default:
        return Award;
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-900 mb-2">Certificates & Achievements</h1>
        <p className="text-neutral-600">
          View and download your earned certificates and achievement badges.
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="card p-6 text-center">
          <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <Award className="w-6 h-6 text-primary-600" />
          </div>
          <div className="text-2xl font-bold text-neutral-900 mb-1">
            {certificates.length}
          </div>
          <div className="text-sm text-neutral-600">Certificates Earned</div>
        </div>

        <div className="card p-6 text-center">
          <div className="w-12 h-12 bg-accent-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <Trophy className="w-6 h-6 text-accent-600" />
          </div>
          <div className="text-2xl font-bold text-accent-600 mb-1">
            {earnedBadges.length}
          </div>
          <div className="text-sm text-neutral-600">Badges Earned</div>
        </div>

        <div className="card p-6 text-center">
          <div className="w-12 h-12 bg-secondary-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <Star className="w-6 h-6 text-secondary-600" />
          </div>
          <div className="text-2xl font-bold text-secondary-600 mb-1">
            {certificates.filter(c => c.certificate_type === 'quiz').length}
          </div>
          <div className="text-sm text-neutral-600">Quiz Certificates</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Certificates */}
        <div className="lg:col-span-2">
          <div className="card p-6">
            <h2 className="text-xl font-semibold text-neutral-900 mb-6">Your Certificates</h2>
            
            {certificates.length > 0 ? (
              <div className="space-y-4">
                {certificates.map((certificate) => {
                  const Icon = getCertificateIcon(certificate.certificate_type);
                  
                  return (
                    <div key={certificate.id} className="flex items-center space-x-4 p-4 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition-colors">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        certificate.certificate_type === 'module' 
                          ? 'bg-primary-100' 
                          : 'bg-accent-100'
                      }`}>
                        <Icon className={`w-6 h-6 ${
                          certificate.certificate_type === 'module' 
                            ? 'text-primary-600' 
                            : 'text-accent-600'
                        }`} />
                      </div>
                      
                      <div className="flex-1">
                        <h3 className="font-medium text-neutral-900 mb-1">
                          {certificate.title}
                        </h3>
                        <div className="flex items-center space-x-4 text-sm text-neutral-600">
                          <span className="capitalize">{certificate.certificate_type} Certificate</span>
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(certificate.generated_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="text-xs text-neutral-500 mt-1">
                          ID: {certificate.certificate_id}
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handlePreviewCertificate(certificate)}
                          className="p-2 text-neutral-600 hover:text-primary-600 rounded-lg hover:bg-primary-50"
                          title="Preview Certificate"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDownloadCertificate(certificate)}
                          className="p-2 text-neutral-600 hover:text-secondary-600 rounded-lg hover:bg-secondary-50"
                          title="Download Certificate"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Award className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-neutral-900 mb-2">No certificates yet</h3>
                <p className="text-neutral-600 mb-4">
                  Complete modules and pass quizzes to earn certificates.
                </p>
                <a href="/modules" className="btn-primary">
                  Start Learning
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Badges Sidebar */}
        <div className="space-y-6">
          {/* Achievement Badges */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">Achievement Badges</h3>
            
            {earnedBadges.length > 0 ? (
              <div className="space-y-4">
                {earnedBadges.map((badge) => (
                  <div key={badge.id} className="flex items-center space-x-3 p-3 bg-neutral-50 rounded-lg">
                    <Badge 
                      level={badge.level} 
                      size="sm" 
                      earned 
                      name={badge.name}
                    />
                    <div className="flex-1">
                      <h4 className="font-medium text-neutral-900 text-sm">
                        {badge.name}
                      </h4>
                      <p className="text-xs text-neutral-600 mb-1">
                        {badge.description}
                      </p>
                      <div className="text-xs text-neutral-500">
                        Earned: {new Date(badge.earned_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <Trophy className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
                <p className="text-sm text-neutral-600">No badges earned yet</p>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <a
                href="/modules"
                className="flex items-center space-x-3 p-3 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
              >
                <FileText className="w-5 h-5 text-primary-600" />
                <span className="text-primary-700 font-medium">Browse Modules</span>
              </a>
              <a
                href="/leaderboard"
                className="flex items-center space-x-3 p-3 bg-accent-50 rounded-lg hover:bg-accent-100 transition-colors"
              >
                <Trophy className="w-5 h-5 text-accent-600" />
                <span className="text-accent-700 font-medium">View Leaderboard</span>
              </a>
            </div>
          </div>

          {/* Certificate Sharing */}
          {certificates.length > 0 && (
            <div className="card p-6 bg-gradient-to-br from-primary-50 to-secondary-50">
              <h3 className="text-lg font-semibold text-neutral-900 mb-2">Share Your Success</h3>
              <p className="text-sm text-neutral-600 mb-4">
                Show off your achievements on social media and professional networks.
              </p>
              <button className="btn-primary w-full flex items-center justify-center space-x-2">
                <ExternalLink className="w-4 h-4" />
                <span>Share Certificates</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};