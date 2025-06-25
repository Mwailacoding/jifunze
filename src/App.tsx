
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { NotificationToast } from './components/ui/NotificationToast';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { RoleBasedRoute } from './components/auth/RoleBasedRoute';

// Auth pages
import { LoginForm } from './components/auth/LoginForm';
import { RegisterForm } from './components/auth/RegisterForm';

// Dashboard pages

import { LearnerDashboard } from './pages/learner/LearnerDashboard';
import { TrainerDashboard } from './pages/trainer/TrainerDashboard';
import { AdminDashboard } from './pages/admin/AdminDashboard';

// Learner pages
import { ModulesPage } from './pages/learner/ModulesPage';
import { ModuleDetailPage } from './pages/learner/ModuleDetailPage';
import { AssignmentsPage } from './pages/learner/AssignmentsPage';
import { LeaderboardPage } from './pages/learner/LeaderboardPage';
import { CertificatesPage } from './pages/learner/CertificatesPage';
import { OfflineContentPage } from './pages/learner/OfflineContentPage';
import { QuizPage } from './pages/learner/QuizPage';

// Trainer pages
import { TrainerModulesPage } from './pages/trainer/TrainerModulesPage';
import { TrainerLearnersPage } from './pages/trainer/TrainerLearnersPage';
import { TrainerReportsPage } from './pages/trainer/TrainerReportsPage';
import { TrainerAssignmentsPage } from './pages/trainer/TrainerAssignmentsPage';
import { ModuleEditorPage } from './pages/trainer/ModuleEditorPage';

// Admin pages
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminAnalyticsPage } from './pages/admin/AdminAnalyticsPage';
import { AdminModulesPage } from './pages/admin/AdminModulesPage';

// Shared pages
import { ProfilePage } from './pages/shared/ProfilePage';
import { SettingsPage } from './pages/shared/SettingsPage';
import { LandingPage } from './pages/LandingPage';

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <Router>
          <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-primary-50">
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginForm />} />
              <Route path="/register" element={<RegisterForm />} />

              {/* Protected routes */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <RoleBasedRoute
                    adminComponent={<Navigate to="/admin/dashboard" replace />}
                    trainerComponent={<Navigate to="/trainer/dashboard" replace />}
                    userComponent={<Navigate to="/learner/dashboard" replace />}
                  />
                </ProtectedRoute>
              } />

              {/* Learner routes */}
              <Route path="/learner/dashboard" element={
                <ProtectedRoute requiredRole="user">
                  <LearnerDashboard />
                </ProtectedRoute>
              } />
              <Route path="/modules" element={
                <ProtectedRoute requiredRole="user">
                  <ModulesPage />
                </ProtectedRoute>
              } />
              <Route path="/modules/:moduleId" element={
                <ProtectedRoute requiredRole="user">
                  <ModuleDetailPage />
                </ProtectedRoute>
              } />
              <Route path="/quiz/:quizId" element={
                <ProtectedRoute requiredRole="user">
                  <QuizPage />
                </ProtectedRoute>
              } />
              <Route path="/assignments" element={
                <ProtectedRoute requiredRole="user">
                  <AssignmentsPage />
                </ProtectedRoute>
              } />
              <Route path="/leaderboard" element={
                <ProtectedRoute requiredRole="user">
                  <LeaderboardPage />
                </ProtectedRoute>
              } />
              <Route path="/certificates" element={
                <ProtectedRoute requiredRole="user">
                  <CertificatesPage />
                </ProtectedRoute>
              } />
              <Route path="/offline" element={
                <ProtectedRoute requiredRole="user">
                  <OfflineContentPage />
                </ProtectedRoute>
              } />

              {/* Trainer routes */}
              <Route path="/trainer/dashboard" element={
                <ProtectedRoute requiredRole="trainer">
                  <TrainerDashboard />
                </ProtectedRoute>
              } />
              <Route path="/trainer/modules" element={
                <ProtectedRoute requiredRole="trainer">
                  <TrainerModulesPage />
                </ProtectedRoute>
              } />
              <Route path="/trainer/modules/new" element={
                <ProtectedRoute requiredRole="trainer">
                  <ModuleEditorPage />
                </ProtectedRoute>
              } />
              <Route path="/trainer/modules/:moduleId/edit" element={
                <ProtectedRoute requiredRole="trainer">
                  <ModuleEditorPage />
                </ProtectedRoute>
              } />
              <Route path="/trainer/learners" element={
                <ProtectedRoute requiredRole="trainer">
                  <TrainerLearnersPage />
                </ProtectedRoute>
              } />
              <Route path="/trainer/assignments" element={
                <ProtectedRoute requiredRole="trainer">
                  <TrainerAssignmentsPage />
                </ProtectedRoute>
              } />
              <Route path="/trainer/reports" element={
                <ProtectedRoute requiredRole="trainer">
                  <TrainerReportsPage />
                </ProtectedRoute>
              } />

              {/* Admin routes */}
              <Route path="/admin/dashboard" element={
                <ProtectedRoute requiredRole="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              } />
              <Route path="/admin/users" element={
                <ProtectedRoute requiredRole="admin">
                  <AdminUsersPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/modules" element={
                <ProtectedRoute requiredRole="admin">
                  <AdminModulesPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/analytics" element={
                <ProtectedRoute requiredRole="admin">
                  <AdminAnalyticsPage />
                </ProtectedRoute>
              } />

              {/* Shared routes */}
              <Route path="/profile" element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute>
                  <SettingsPage />
                </ProtectedRoute>
              } />

              {/* Catch-all route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>

            <NotificationToast />
          </div>
        </Router>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;