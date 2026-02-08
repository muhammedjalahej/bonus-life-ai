import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import ErrorBoundary from './components/ErrorBoundary';
import LoadingFallback from './components/LoadingFallback';
import NotFoundPage from './components/NotFoundPage';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { ROUTES } from './config/constants';

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
const Dashboard = lazy(() => import('./pages/Dashboard'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));

function App() {
  const [language, setLanguage] = useState('english');

  useEffect(() => {
    document.title = language === 'turkish' ? 'More Life AI - Diyabet Önleme' : 'More Life AI - Diabetes Prevention';
  }, [language]);

  return (
    <ErrorBoundary language={language}>
      <Router>
        <AuthProvider>
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
                  <Route path={ROUTES.TEST} element={<DiabetesTest language={language} />} />
                  <Route path={ROUTES.CHAT} element={<ChatBot language={language} />} />
                  <Route path={ROUTES.VOICE_CHAT} element={<VoiceChat language={language} />} />
                  <Route path={ROUTES.DIET_PLAN} element={<DietPlan language={language} />} />
                  <Route path={ROUTES.EMERGENCY} element={<EmergencyCheck language={language} />} />
                  <Route path={ROUTES.DASHBOARD} element={<ProtectedRoute><Dashboard language={language} /></ProtectedRoute>} />
                  <Route path={`${ROUTES.ADMIN}/*`} element={<ProtectedRoute requireAdmin><AdminPanel language={language} /></ProtectedRoute>} />
                  <Route path="*" element={<NotFoundPage language={language} />} />
                </Routes>
              </Suspense>
            </div>
          </main>

          <Suspense fallback={<div className="h-20" />}>
            <Footer language={language} />
          </Suspense>
        </div>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default React.memo(App);
