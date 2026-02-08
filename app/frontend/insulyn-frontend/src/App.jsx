import React, { useState, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import ErrorBoundary from './components/ErrorBoundary';
import LoadingFallback from './components/LoadingFallback';
import NotFoundPage from './components/NotFoundPage';
import { ROUTES } from './config/constants';

const Header = lazy(() => import('./layout/Header'));
const Footer = lazy(() => import('./layout/Footer'));
const Home = lazy(() => import('./pages/Home'));
const DiabetesTest = lazy(() => import('./pages/DiabetesTest'));
const ChatBot = lazy(() => import('./pages/ChatBot'));
const VoiceChat = lazy(() => import('./pages/VoiceChat'));
const DietPlan = lazy(() => import('./pages/DietPlan'));
const EmergencyCheck = lazy(() => import('./pages/EmergencyCheck'));

function App() {
  const [language, setLanguage] = useState('english');

  return (
    <ErrorBoundary>
      <Router>
        <div className="flex flex-col min-h-screen noise">
          <Suspense fallback={<div className="h-20" />}>
            <Header language={language} setLanguage={setLanguage} />
          </Suspense>

          <main className="flex-1 relative">
            {/* Ambient background mesh */}
            <div className="fixed inset-0 gradient-mesh pointer-events-none" />
            <div className="fixed inset-0 grid-pattern pointer-events-none" />

            <div className="relative z-10">
              <Suspense fallback={<LoadingFallback />}>
                <Routes>
                  <Route path={ROUTES.HOME} element={<Home language={language} />} />
                  <Route path={ROUTES.TEST} element={<DiabetesTest language={language} />} />
                  <Route path={ROUTES.CHAT} element={<ChatBot language={language} />} />
                  <Route path={ROUTES.VOICE_CHAT} element={<VoiceChat language={language} />} />
                  <Route path={ROUTES.DIET_PLAN} element={<DietPlan language={language} />} />
                  <Route path={ROUTES.EMERGENCY} element={<EmergencyCheck language={language} />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </Suspense>
            </div>
          </main>

          <Suspense fallback={<div className="h-20" />}>
            <Footer language={language} />
          </Suspense>
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default React.memo(App);
