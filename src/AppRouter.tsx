import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { isSupabaseConfigured } from './lib/supabase';
import ErrorBoundary from './components/ErrorBoundary';
import AuthPage from './components/auth/AuthPage';
import OnboardingFlow from './components/auth/OnboardingFlow';
import ResetPasswordPage from './components/auth/ResetPasswordPage';
import PrivacyPolicy from './components/legal/PrivacyPolicy';
import TermsOfService from './components/legal/TermsOfService';
import App from './App';
import { useState, useEffect } from 'react';

// Loading spinner component
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg animate-pulse">
          <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

// Protected route wrapper (only used when Supabase is configured)
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  useEffect(() => {
    if (!loading && user) {
      // Check if user has completed onboarding
      const settings = localStorage.getItem('aiReminderSettings');
      const hasCompletedOnboarding = settings ? JSON.parse(settings).onboardingCompleted : false;
      setShowOnboarding(!hasCompletedOnboarding);
      setCheckingOnboarding(false);
    } else if (!loading && !user) {
      setCheckingOnboarding(false);
    }
  }, [loading, user]);

  if (loading || checkingOnboarding) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (showOnboarding) {
    return <OnboardingFlow onComplete={() => setShowOnboarding(false)} />;
  }

  return <>{children}</>;
}

// Public route - redirect to app if already logged in
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

// Local mode wrapper - shows onboarding if needed, no auth required
function LocalModeRoute({ children }: { children: React.ReactNode }) {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const settings = localStorage.getItem('aiReminderSettings');
    const hasCompletedOnboarding = settings ? JSON.parse(settings).onboardingCompleted : false;
    setShowOnboarding(!hasCompletedOnboarding);
    setChecking(false);
  }, []);

  if (checking) {
    return <LoadingScreen />;
  }

  if (showOnboarding) {
    return <OnboardingFlow onComplete={() => setShowOnboarding(false)} />;
  }

  return <>{children}</>;
}

// Routes when Supabase IS configured (with auth)
function AuthenticatedRoutes() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<PublicRoute><AuthPage /></PublicRoute>} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />

        {/* Password reset - special handling (user is logged in via reset token) */}
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Protected routes - App handles sub-routes internally */}
        <Route path="/" element={<ProtectedRoute><App /></ProtectedRoute>} />
        <Route path="/reminders" element={<ProtectedRoute><App /></ProtectedRoute>} />
        <Route path="/insights" element={<ProtectedRoute><App /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><App /></ProtectedRoute>} />
        <Route path="/partners" element={<ProtectedRoute><App /></ProtectedRoute>} />
        <Route path="/groups" element={<ProtectedRoute><App /></ProtectedRoute>} />

        {/* Catch all - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

// Routes when Supabase is NOT configured (local mode, no auth)
function LocalRoutes() {
  return (
    <Routes>
      {/* Legal pages still accessible */}
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsOfService />} />

      {/* Main app - no auth required, App handles sub-routes internally */}
      <Route path="/" element={<LocalModeRoute><App /></LocalModeRoute>} />
      <Route path="/reminders" element={<LocalModeRoute><App /></LocalModeRoute>} />
      <Route path="/insights" element={<LocalModeRoute><App /></LocalModeRoute>} />
      <Route path="/settings" element={<LocalModeRoute><App /></LocalModeRoute>} />
      <Route path="/partners" element={<LocalModeRoute><App /></LocalModeRoute>} />
      <Route path="/groups" element={<LocalModeRoute><App /></LocalModeRoute>} />

      {/* Redirect login to home in local mode */}
      <Route path="/login" element={<Navigate to="/" replace />} />

      {/* Catch all - redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function AppRouter() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        {isSupabaseConfigured ? <AuthenticatedRoutes /> : <LocalRoutes />}
      </BrowserRouter>
    </ErrorBoundary>
  );
}
