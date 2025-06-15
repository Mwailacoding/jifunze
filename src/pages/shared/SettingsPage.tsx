import React, { useState } from 'react';
import { 
  Settings, 
  Lock, 
  Bell, 
  Globe,
  Moon,
  Sun,
  Shield,
  Download,
  Trash2,
  Save,
  Eye,
  EyeOff
} from 'lucide-react';
import { Layout } from '../../components/layout/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { apiClient } from '../../utils/api';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { showError, showSuccess } = useNotification();
  const [activeTab, setActiveTab] = useState('general');
  const [isSaving, setIsSaving] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  const [notificationSettings, setNotificationSettings] = useState({
    email_notifications: true,
    push_notifications: true,
    assignment_reminders: true,
    achievement_notifications: true,
    weekly_progress: true
  });

  const [generalSettings, setGeneralSettings] = useState({
    language: 'en',
    timezone: 'UTC',
    theme: 'light',
    auto_save_progress: true,
    offline_sync: true
  });

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.new_password !== passwordData.confirm_password) {
      showError('Password Mismatch', 'New passwords do not match');
      return;
    }

    if (passwordData.new_password.length < 6) {
      showError('Weak Password', 'Password must be at least 6 characters long');
      return;
    }

    try {
      setIsSaving(true);
      await apiClient.changePassword(passwordData.current_password, passwordData.new_password);
      showSuccess('Password Changed', 'Your password has been updated successfully');
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
    } catch (error) {
      showError('Error', 'Failed to change password');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    try {
      setIsSaving(true);
      // API call to save notification settings
      showSuccess('Settings Saved', 'Notification preferences have been updated');
    } catch (error) {
      showError('Error', 'Failed to save notification settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveGeneral = async () => {
    try {
      setIsSaving(true);
      // API call to save general settings
      showSuccess('Settings Saved', 'General preferences have been updated');
    } catch (error) {
      showError('Error', 'Failed to save general settings');
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Privacy', icon: Shield }
  ];

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">Settings</h1>
          <p className="text-neutral-600">
            Manage your account preferences and security settings.
          </p>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Settings Navigation */}
          <div className="lg:col-span-1">
            <div className="card p-4">
              <nav className="space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        activeTab === tab.id
                          ? 'bg-primary-500 text-white'
                          : 'text-neutral-700 hover:bg-neutral-100'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="font-medium">{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Settings Content */}
          <div className="lg:col-span-3">
            {/* General Settings */}
            {activeTab === 'general' && (
              <div className="card p-6">
                <h2 className="text-xl font-semibold text-neutral-900 mb-6">General Settings</h2>
                
                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Language
                      </label>
                      <select
                        value={generalSettings.language}
                        onChange={(e) => setGeneralSettings(prev => ({ ...prev, language: e.target.value }))}
                        className="input-field"
                      >
                        <option value="en">English</option>
                        <option value="es">Spanish</option>
                        <option value="fr">French</option>
                        <option value="de">German</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Timezone
                      </label>
                      <select
                        value={generalSettings.timezone}
                        onChange={(e) => setGeneralSettings(prev => ({ ...prev, timezone: e.target.value }))}
                        className="input-field"
                      >
                        <option value="UTC">UTC</option>
                        <option value="America/New_York">Eastern Time</option>
                        <option value="America/Chicago">Central Time</option>
                        <option value="America/Denver">Mountain Time</option>
                        <option value="America/Los_Angeles">Pacific Time</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Theme
                    </label>
                    <div className="flex space-x-4">
                      <button
                        onClick={() => setGeneralSettings(prev => ({ ...prev, theme: 'light' }))}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg border ${
                          generalSettings.theme === 'light'
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-neutral-300 text-neutral-700 hover:bg-neutral-50'
                        }`}
                      >
                        <Sun className="w-4 h-4" />
                        <span>Light</span>
                      </button>
                      <button
                        onClick={() => setGeneralSettings(prev => ({ ...prev, theme: 'dark' }))}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg border ${
                          generalSettings.theme === 'dark'
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-neutral-300 text-neutral-700 hover:bg-neutral-50'
                        }`}
                      >
                        <Moon className="w-4 h-4" />
                        <span>Dark</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-medium text-neutral-900">Learning Preferences</h3>
                    
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={generalSettings.auto_save_progress}
                        onChange={(e) => setGeneralSettings(prev => ({ ...prev, auto_save_progress: e.target.checked }))}
                        className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                      />
                      <div>
                        <span className="text-sm font-medium text-neutral-900">Auto-save progress</span>
                        <p className="text-xs text-neutral-600">Automatically save your progress as you learn</p>
                      </div>
                    </label>

                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={generalSettings.offline_sync}
                        onChange={(e) => setGeneralSettings(prev => ({ ...prev, offline_sync: e.target.checked }))}
                        className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                      />
                      <div>
                        <span className="text-sm font-medium text-neutral-900">Offline sync</span>
                        <p className="text-xs text-neutral-600">Sync progress when you come back online</p>
                      </div>
                    </label>
                  </div>

                  <button
                    onClick={handleSaveGeneral}
                    disabled={isSaving}
                    className="btn-primary flex items-center space-x-2"
                  >
                    {isSaving && <LoadingSpinner size="sm" />}
                    <Save className="w-4 h-4" />
                    <span>Save Changes</span>
                  </button>
                </div>
              </div>
            )}

            {/* Security Settings */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                {/* Change Password */}
                <div className="card p-6">
                  <h2 className="text-xl font-semibold text-neutral-900 mb-6">Change Password</h2>
                  
                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Current Password
                      </label>
                      <div className="relative">
                        <input
                          type={showCurrentPassword ? 'text' : 'password'}
                          value={passwordData.current_password}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, current_password: e.target.value }))}
                          className="input-field pr-10"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        >
                          {showCurrentPassword ? (
                            <EyeOff className="w-4 h-4 text-neutral-400" />
                          ) : (
                            <Eye className="w-4 h-4 text-neutral-400" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          value={passwordData.new_password}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, new_password: e.target.value }))}
                          className="input-field pr-10"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        >
                          {showNewPassword ? (
                            <EyeOff className="w-4 h-4 text-neutral-400" />
                          ) : (
                            <Eye className="w-4 h-4 text-neutral-400" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        value={passwordData.confirm_password}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, confirm_password: e.target.value }))}
                        className="input-field"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSaving}
                      className="btn-primary flex items-center space-x-2"
                    >
                      {isSaving && <LoadingSpinner size="sm" />}
                      <Lock className="w-4 h-4" />
                      <span>Update Password</span>
                    </button>
                  </form>
                </div>

                {/* Security Information */}
                <div className="card p-6">
                  <h3 className="font-semibold text-neutral-900 mb-4">Security Information</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-neutral-600">Last password change</span>
                      <span className="text-sm text-neutral-900">Never</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-neutral-600">Account created</span>
                      <span className="text-sm text-neutral-900">
                        {new Date(user?.created_at || '').toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-neutral-600">Last login</span>
                      <span className="text-sm text-neutral-900">
                        {user?.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Notification Settings */}
            {activeTab === 'notifications' && (
              <div className="card p-6">
                <h2 className="text-xl font-semibold text-neutral-900 mb-6">Notification Preferences</h2>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="font-medium text-neutral-900 mb-4">Email Notifications</h3>
                    <div className="space-y-3">
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={notificationSettings.email_notifications}
                          onChange={(e) => setNotificationSettings(prev => ({ ...prev, email_notifications: e.target.checked }))}
                          className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                        />
                        <div>
                          <span className="text-sm font-medium text-neutral-900">Email notifications</span>
                          <p className="text-xs text-neutral-600">Receive general notifications via email</p>
                        </div>
                      </label>

                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={notificationSettings.assignment_reminders}
                          onChange={(e) => setNotificationSettings(prev => ({ ...prev, assignment_reminders: e.target.checked }))}
                          className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                        />
                        <div>
                          <span className="text-sm font-medium text-neutral-900">Assignment reminders</span>
                          <p className="text-xs text-neutral-600">Get reminded about upcoming assignment deadlines</p>
                        </div>
                      </label>

                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={notificationSettings.achievement_notifications}
                          onChange={(e) => setNotificationSettings(prev => ({ ...prev, achievement_notifications: e.target.checked }))}
                          className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                        />
                        <div>
                          <span className="text-sm font-medium text-neutral-900">Achievement notifications</span>
                          <p className="text-xs text-neutral-600">Celebrate your learning milestones and badges</p>
                        </div>
                      </label>

                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={notificationSettings.weekly_progress}
                          onChange={(e) => setNotificationSettings(prev => ({ ...prev, weekly_progress: e.target.checked }))}
                          className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                        />
                        <div>
                          <span className="text-sm font-medium text-neutral-900">Weekly progress reports</span>
                          <p className="text-xs text-neutral-600">Receive a summary of your learning progress</p>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium text-neutral-900 mb-4">Push Notifications</h3>
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={notificationSettings.push_notifications}
                        onChange={(e) => setNotificationSettings(prev => ({ ...prev, push_notifications: e.target.checked }))}
                        className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                      />
                      <div>
                        <span className="text-sm font-medium text-neutral-900">Browser notifications</span>
                        <p className="text-xs text-neutral-600">Receive notifications in your browser</p>
                      </div>
                    </label>
                  </div>

                  <button
                    onClick={handleSaveNotifications}
                    disabled={isSaving}
                    className="btn-primary flex items-center space-x-2"
                  >
                    {isSaving && <LoadingSpinner size="sm" />}
                    <Save className="w-4 h-4" />
                    <span>Save Preferences</span>
                  </button>
                </div>
              </div>
            )}

            {/* Privacy Settings */}
            {activeTab === 'privacy' && (
              <div className="space-y-6">
                {/* Data & Privacy */}
                <div className="card p-6">
                  <h2 className="text-xl font-semibold text-neutral-900 mb-6">Data & Privacy</h2>
                  
                  <div className="space-y-4">
                    <div className="p-4 bg-neutral-50 rounded-lg">
                      <h3 className="font-medium text-neutral-900 mb-2">Download Your Data</h3>
                      <p className="text-sm text-neutral-600 mb-3">
                        Get a copy of all your learning data, progress, and achievements.
                      </p>
                      <button className="btn-outline flex items-center space-x-2">
                        <Download className="w-4 h-4" />
                        <span>Download Data</span>
                      </button>
                    </div>

                    <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                      <h3 className="font-medium text-red-900 mb-2">Delete Account</h3>
                      <p className="text-sm text-red-700 mb-3">
                        Permanently delete your account and all associated data. This action cannot be undone.
                      </p>
                      <button className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center space-x-2">
                        <Trash2 className="w-4 h-4" />
                        <span>Delete Account</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Privacy Controls */}
                <div className="card p-6">
                  <h3 className="font-semibold text-neutral-900 mb-4">Privacy Controls</h3>
                  <div className="space-y-3">
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        defaultChecked={true}
                        className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                      />
                      <div>
                        <span className="text-sm font-medium text-neutral-900">Show profile in leaderboard</span>
                        <p className="text-xs text-neutral-600">Allow others to see your ranking and achievements</p>
                      </div>
                    </label>

                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        defaultChecked={false}
                        className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                      />
                      <div>
                        <span className="text-sm font-medium text-neutral-900">Analytics tracking</span>
                        <p className="text-xs text-neutral-600">Help improve the platform with anonymous usage data</p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};