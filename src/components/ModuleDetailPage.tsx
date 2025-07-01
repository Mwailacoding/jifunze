import React, { FC } from 'react';
import { ContentCompletionButtonProps } from './ContentCompletionButton';

interface ModuleDetailPageProps {
  components: {
    ContentCompletionButton: FC<ContentCompletionButtonProps>;
    ModuleLockScreen: FC<any>; // Replace `any` with the correct type
    ModuleProgressTracker: FC<any>; // Replace `any` with the correct type
  };
}

const ModuleDetailPage: FC<ModuleDetailPageProps> = ({ components }) => {
  const { ContentCompletionButton, ModuleLockScreen, ModuleProgressTracker } = components;

  return (
    <div>
      <ContentCompletionButton contentId="123" moduleId="456" />
      <ModuleLockScreen module={{}} previousModuleId="123" />
      <ModuleProgressTracker module={{}} />
    </div>
  );
};

export default ModuleDetailPage;