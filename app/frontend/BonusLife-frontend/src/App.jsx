import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AlertTriangle, Wrench } from 'lucide-react';

import ErrorBoundary from './components/ErrorBoundary';
import LoadingFallback from './components/LoadingFallback';
import NotFoundPage from './components/NotFoundPage';
import ProtectedRoute from './components/ProtectedRoute';
import VoiceAgent from './components/VoiceAgent';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ROUTES } from './config/constants';

/**
 * Wrapper that redirects admin users to /admin when they try to access
 * user-only pages (test, chat, diet, dashboard, etc.)
 */
function BlockIfAdmin({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user && user.role === 'admin') {
    return <Navigate to={ROUTES.ADMIN} replace />;
  }
  return children;
}

/**
 * Full-page maintenance screen shown to non-admin users when the backend
 * returns 503 (maintenance_mode is enabled in site settings).
 */
function MaintenancePage() {
  return (
    <div className="min-h-screen flex items-center justify-center relative">
      <div className="fixed inset-0 gradient-mesh pointer-events-none" />
      <div className="fixed inset-0 grid-pattern pointer-events-none" />
      <div className="relative z-10 text-center max-w-lg mx-auto px-6">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
          <Wrench className="w-10 h-10 text-amber-400" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-3">Under Maintenance</h1>
        <p className="text-gray-400 text-lg mb-6">
          We're currently performing scheduled maintenance to improve your experience.
          Please check back shortly.
        </p>
        <div className="flex items-center justify-center gap-2 text-amber-400/80 text-sm">
          <AlertTriangle className="w-4 h-4" />
          <span>All services will be restored soon</span>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="mt-8 px-6 py-3 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30 font-medium transition"
        >
          Refresh Page
        </button>
      </div>
    </div>
  );
}

/**
 * Inner app that has access to AuthContext and can check maintenance mode.
 */
function AppContent({ language, setLanguage }) {
  const { maintenanceMode, isAdmin } = useAuth();

  // If maintenance mode is on and user is NOT admin, show maintenance page
  // but still allow the /login route so an admin can sign in.
  if (maintenanceMode && !isAdmin) {
    return (
      <div className="flex flex-col min-h-screen noise">
        <Suspense fallback={<div className="h-20" />}>
          <Header language={language} setLanguage={setLanguage} />
        </Suspense>
        <main className="flex-1 relative">
          <div className="fixed inset-0 gradient-mesh pointer-events-none" />
          <div className="fixed inset-0 grid-pattern pointer-events-none" />
          <div className="relative z-10">
            <Suspense fallback={<LoadingFallback language={language} />}>
              <Routes>
                <Route path={ROUTES.LOGIN} element={<Login language={language} />} />
                <Route path="/shared/:token" element={<SharedAssessment language={language} />} />
                <Route path="*" element={<MaintenancePage />} />
              </Routes>
            </Suspense>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen noise">
      <Suspense fallback={<div className="h-20" />}>
        <Header language={language} setLanguage={setLanguage} />
      </Suspense>

      <main className="flex-1 relative">
        {/* Ambient background mesh */}
        <div className="fixed inset-0 gradient-mesh pointer-events-none" />
        <div className="fixed inset-0 grid-pattern pointer-events-none" />

        <div className="relative z-10">
          <Suspense fallback={<LoadingFallback language={language} />}>
            <Routes>
              <Route path={ROUTES.HOME} element={<Home language={language} />} />
              <Route path={ROUTES.LOGIN} element={<Login language={language} />} />
              <Route path={ROUTES.REGISTER} element={<Register language={language} />} />
              <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPassword language={language} />} />
              <Route path={ROUTES.RESET_PASSWORD} element={<ResetPassword language={language} />} />

              {/* User-only pages: admin gets redirected to /admin */}
              <Route path={ROUTES.TEST} element={<BlockIfAdmin><DiabetesTest language={language} /></BlockIfAdmin>} />
              <Route path={ROUTES.CHAT} element={<BlockIfAdmin><ChatBot language={language} /></BlockIfAdmin>} />
              <Route path={ROUTES.VOICE_CHAT} element={<BlockIfAdmin><VoiceChat language={language} /></BlockIfAdmin>} />
              <Route path={ROUTES.DIET_PLAN} element={<BlockIfAdmin><DietPlan language={language} /></BlockIfAdmin>} />
              <Route path={ROUTES.EMERGENCY} element={<BlockIfAdmin><EmergencyCheck language={language} /></BlockIfAdmin>} />
              <Route path={ROUTES.DASHBOARD} element={<BlockIfAdmin><ProtectedRoute><Dashboard language={language} /></ProtectedRoute></BlockIfAdmin>} />

              {/* Admin-only page */}
              <Route path={`${ROUTES.ADMIN}/*`} element={<ProtectedRoute requireAdmin><AdminPanel language={language} /></ProtectedRoute>} />

              {/* Public shared assessment view */}
              <Route path="/shared/:token" element={<SharedAssessment language={language} />} />

              <Route path="*" element={<NotFoundPage language={language} />} />
            </Routes>
          </Suspense>
        </div>
      </main>

      <Suspense fallback={<div className="h-20" />}>
        <Footer language={language} />
      </Suspense>

      <VoiceAgent />
    </div>
  );
}

const Header = lazy(() => import('./layout/Header'));
const Footer = lazy(() => import('./layout/Footer'));
const Home = lazy(() => import('./pages/Home'));
const DiabetesTest = lazy(() => import('./pages/DiabetesTest'));
const ChatBot = lazy(() => import('./pages/ChatBot'));
const VoiceChat = lazy(() => import('./pages/VoiceChat'));
const DietPlan = lazy(() => import('./pages/DietPlan'));
const EmergencyCheck = lazy(() => import('./pages/EmergencyCheck'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const SharedAssessment = lazy(() => import('./pages/SharedAssessment'));

function App() {
  const [language, setLanguage] = useState('english');

  useEffect(() => {
    document.title = language === 'turkish' ? 'Bonus Life AI - Diyabet Önleme' : 'Bonus Life AI - Diabetes Prevention';
  }, [language]);

  return (
    <ErrorBoundary language={language}>
      <Router>
        <AuthProvider>
          <AppContent language={language} setLanguage={setLanguage} />
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default React.memo(App);
