import { Module } from "../utils/api";

export interface ContentCompletionButtonProps {
  contentId: string;
  moduleId: string; // Keep this as string to match the component
}

export interface ModuleLockScreenProps {
  module: LocalModule;
  previousModuleId: number;
}

export interface ModuleProgressTrackerProps {
  module: LocalModule;
}

// Updated Module type with required content_completed
export interface LocalModule {
  id: number;
  title: string;
  content_count: number;
  content_completed: number; // Made required by removing ?
  quiz_count: number;
  quiz_passed: boolean;
}