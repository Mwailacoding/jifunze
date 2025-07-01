import React from 'react';
import { Award } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/Tooltip';

interface CertificateBadgeProps {
  className?: string;
  tooltipText?: string;
}

const CertificateBadge: React.FC<CertificateBadgeProps> = ({ 
  className = '',
  tooltipText = 'Certificate earned' 
}) => {
    function cn(...classes: (string | undefined | null)[]): string {
        return classes.filter(Boolean).join(' ');
    }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            "relative inline-flex items-center justify-center",
            className
          )}>
            <div className="absolute -inset-1 bg-primary-500/30 rounded-full blur-sm"></div>
            <div className="relative bg-gradient-to-br from-primary-600 to-secondary-600 text-white p-2 rounded-full shadow-lg">
              <Award className="w-5 h-5" />
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default CertificateBadge;