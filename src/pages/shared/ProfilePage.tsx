import React, { useState } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  Calendar,
  Edit,
  Save,
  Camera,
  Award,
  BookOpen,
  TrendingUp
} from 'lucide-react';
import { Layout } from '../../components/layout/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { apiClient } from '../../utils/api';
import { Badge } from '../../components/ui/Badge';
import { ProgressBar } from '../../components/ui/ProgressBar';

export const ProfilePage: React.FC = () => {
  const { user, updateUser } = useAuth();
  const { showError, showSuccess } = useNotification();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [profileData, setProfileData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    profile_picture: user?.profile_picture || ''
  });

  const handleSaveProfile = async () => {
    try {
      setIsSaving(true);
      await apiClient.updateProfile(profileData);
      updateUser(profileData);
      setIsEditing(false);
      showSuccess('Profile Updated', 'Your profile has been updated successfully');
    } catch (error) {
      showError('Error', 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setProfileData({
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      profile_picture: user?.profile_picture || ''
    });
    setIsEditing(false);
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrator';
      case 'trainer':
        return 'Trainer';
      case 'user':
        return 'Learner';
      default:
        return role;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-700';
      case 'trainer':
        return 'bg-accent-100 text-accent-700';
      case 'user':
        return 'bg-primary-100 text-primary-700';
      default:
        return 'bg-neutral-100 text-neutral-700';
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">My Profile</h1>
          <p className="text-neutral-600">
            Manage your personal information and account settings.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <div className="card p-6 text-center">
              {/* Profile Picture */}
              <div className="relative mb-6">
                <div className="w-24 h-24 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-white text-2xl font-bold">
                    {user?.first_name[0]}{user?.last_name[0]}
                  </span>
                </div>
                <button className="absolute bottom-0 right-1/2 transform translate-x-1/2 translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center border-2 border-neutral-200 hover:border-primary-300">
                  <Camera className="w-4 h-4 text-neutral-600" />
                </button>
              </div>

              {/* Basic Info */}
              <h2 className="text-xl font-bold text-neutral-900 mb-1">
                {user?.first_name} {user?.last_name}
              </h2>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getRoleBadgeColor(user?.role || '')}`}>
                {getRoleDisplayName(user?.role || '')}
              </span>

              {/* Contact Info */}
              <div className="mt-6 space-y-3 text-left">
                <div className="flex items-center space-x-3">
                  <Mail className="w-4 h-4 text-neutral-400" />
                  <span className="text-sm text-neutral-600">{user?.email}</span>
                </div>
                {user?.phone && (
                  <div className="flex items-center space-x-3">
                    <Phone className="w-4 h-4 text-neutral-400" />
                    <span className="text-sm text-neutral-600">{user.phone}</span>
                  </div>
                )}
                <div className="flex items-center space-x-3">
                  <Calendar className="w-4 h-4 text-neutral-400" />
                  <span className="text-sm text-neutral-600">
                    Joined {new Date(user?.created_at || '').toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Edit Button */}
              <button
                onClick={() => setIsEditing(true)}
                className="btn-primary w-full mt-6 flex items-center justify-center space-x-2"
              >
                <Edit className="w-4 h-4" />
                <span>Edit Profile</span>
              </button>
            </div>

            {/* Quick Stats for Learners */}
            {user?.role === 'user' && (
              <div className="card p-6 mt-6">
                <h3 className="font-semibold text-neutral-900 mb-4">Learning Progress</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <BookOpen className="w-4 h-4 text-primary-600" />
                      <span className="text-sm text-neutral-600">Modules Completed</span>
                    </div>
                    <span className="font-medium text-neutral-900">12</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Award className="w-4 h-4 text-accent-600" />
                      <span className="text-sm text-neutral-600">Badges Earned</span>
                    </div>
                    <span className="font-medium text-neutral-900">5</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="w-4 h-4 text-secondary-600" />
                      <span className="text-sm text-neutral-600">Total Points</span>
                    </div>
                    <span className="font-medium text-neutral-900">2,450</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Profile Details */}
          <div className="lg:col-span-2">
            <div className="card p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-neutral-900">Personal Information</h2>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="btn-outline flex items-center space-x-2"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Edit</span>
                  </button>
                )}
              </div>

              {isEditing ? (
                <form onSubmit={(e) => { e.preventDefault(); handleSaveProfile(); }} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        First Name
                      </label>
                      <input
                        type="text"
                        value={profileData.first_name}
                        onChange={(e) => setProfileData(prev => ({ ...prev, first_name: e.target.value }))}
                        className="input-field"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={profileData.last_name}
                        onChange={(e) => setProfileData(prev => ({ ...prev, last_name: e.target.value }))}
                        className="input-field"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                      className="input-field"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                      className="input-field"
                      placeholder="Enter your phone number"
                    />
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="btn-primary flex items-center space-x-2"
                    >
                      <Save className="w-4 h-4" />
                      <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="btn-outline"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        First Name
                      </label>
                      <p className="text-neutral-900">{user?.first_name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Last Name
                      </label>
                      <p className="text-neutral-900">{user?.last_name}</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Email Address
                    </label>
                    <p className="text-neutral-900">{user?.email}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Phone Number
                    </label>
                    <p className="text-neutral-900">{user?.phone || 'Not provided'}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Role
                    </label>
                    <p className="text-neutral-900">{getRoleDisplayName(user?.role || '')}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Account Status
                    </label>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                      user?.is_active ? 'bg-primary-100 text-primary-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {user?.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Achievements Section for Learners */}
            {user?.role === 'user' && (
              <div className="card p-6 mt-6">
                <h2 className="text-xl font-semibold text-neutral-900 mb-6">Recent Achievements</h2>
                
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <Badge level="bronze" size="md" earned name="First Steps" />
                  <Badge level="silver" size="md" earned name="Quick Learner" />
                  <Badge level="gold" size="md" earned={false} name="Expert" />
                  <Badge level="platinum" size="md" earned={false} name="Master" />
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-neutral-700">Learning Progress</span>
                      <span className="text-sm text-neutral-600">75%</span>
                    </div>
                    <ProgressBar value={75} animated />
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-3 bg-neutral-50 rounded-lg">
                      <div className="text-lg font-bold text-primary-600">12</div>
                      <div className="text-xs text-neutral-600">Modules</div>
                    </div>
                    <div className="p-3 bg-neutral-50 rounded-lg">
                      <div className="text-lg font-bold text-accent-600">2,450</div>
                      <div className="text-xs text-neutral-600">Points</div>
                    </div>
                    <div className="p-3 bg-neutral-50 rounded-lg">
                      <div className="text-lg font-bold text-secondary-600">5</div>
                      <div className="text-xs text-neutral-600">Badges</div>
                    </div>
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