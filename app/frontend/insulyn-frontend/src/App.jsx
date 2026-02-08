import React, { useState, lazy, Suspense } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Shared components
import ErrorBoundary from './components/ErrorBoundary';
import LoadingFallback from './components/LoadingFallback';
import NotFoundPage from './components/NotFoundPage';

// Route constants
import { ROUTES } from './config/constants';

// Lazy load layout and pages for better performance
const Header = lazy(() => import('./layout/Header'));
const Footer = lazy(() => import('./layout/Footer'));
const Home = lazy(() => import('./pages/Home'));
const DiabetesTest = lazy(() => import('./pages/DiabetesTest'));
const ChatBot = lazy(() => import('./pages/ChatBot'));
const VoiceChat = lazy(() => import('./pages/VoiceChat'));
const DietPlan = lazy(() => import('./pages/DietPlan'));
const EmergencyCheck = lazy(() => import('./pages/EmergencyCheck'));

// Theme configuration
const theme = createTheme({
  palette: {
    primary: {
      main: '#2E7D32',
      light: '#4CAF50',
      dark: '#1B5E20',
    },
    secondary: {
      main: '#FF6B35',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: { fontWeight: 600 },
    h5: { fontWeight: 500 },
    h6: { fontWeight: 500 },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        },
      },
    },
  },
});

function App() {
  const [language, setLanguage] = useState('english');

  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <div className="App">
            <Suspense fallback={<div style={{ height: 64, background: '#2E7D32' }} />}>
              <Header language={language} setLanguage={setLanguage} />
            </Suspense>
            
            <main style={{ minHeight: '80vh', paddingTop: 20 }}>
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
            </main>
            
            <Suspense fallback={<div style={{ height: 60, background: '#f5f5f5' }} />}>
              <Footer language={language} />
            </Suspense>
          </div>
        </Router>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default React.memo(App);
