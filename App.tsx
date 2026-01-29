
import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import Auth from './components/Auth';
import NotificationToast from './components/NotificationToast';
import { ViewState, User } from './types';

import { api } from './services/db';
import { notificationService } from './services/notificationService';
import { useTranslation } from 'react-i18next';
const App: React.FC = () => {
  const { t } = useTranslation();
  const [viewState, setViewState] = useState<ViewState>('LANDING');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);


  // Check for existing session on mount and record visit
  useEffect(() => {
    const initializeApp = async () => {
      // Record unique visit
      await api.recordSiteVisit();

      try {
        const user = await api.getSessionUser();
        if (user) {
          setCurrentUser(user);
          setViewState('DASHBOARD');
          // Initialize notifications
          notificationService.initialize(user);
          notificationService.requestPermission();


        }
      } catch (e) {
        console.error("Session check failed", e);
      } finally {
        setLoadingSession(false);
      }
    };
    initializeApp();
  }, []);

  const handleEnter = () => {
    setViewState('AUTH');
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setViewState('DASHBOARD');
    // Initialize notifications on login
    notificationService.initialize(user);
    notificationService.requestPermission();


  };

  const handleLogout = async () => {
    await api.logout();
    notificationService.cleanup();
    setCurrentUser(null);
    setViewState('LANDING');

  };

  const handleUpdateUser = async (data: Partial<User>) => {
    if (!currentUser) return;
    try {
      const updatedUser = await api.updateProfile(currentUser.id, data);
      setCurrentUser(prev => prev ? ({ ...prev, ...updatedUser }) : null);
    } catch (e) {
      console.error("Failed to update profile", e);
    }
  };

  const handleRefreshUser = async () => {
    try {
      const user = await api.getSessionUser();
      if (user) {
        setCurrentUser(user);
      }
    } catch (e) {
      console.error("Failed to refresh user", e);
    }
  };



  const BetaMarquee = ({ position }: { position: 'top' | 'bottom' }) => (
    <div className={`fixed ${position}-0 left-0 right-0 beta-banner z-[9999] pointer-events-none opacity-90 shadow-2xl`}>
      <div className={position === 'top' ? 'animate-marquee' : 'animate-marquee-reverse'}>
        {[...Array(20)].map((_, i) => (
          <span key={i} className="mx-8 flex items-center gap-3">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse shadow-[0_0_5px_white]" />
            {t('app.beta_test')} • {t('app.early_access')} • {t('app.report_bugs')} • {t('app.work_in_progress')}
          </span>
        ))}
      </div>
    </div>
  );

  if (loadingSession) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-crimson-700 font-serif">{t('app.loading')}</div>;
  }

  return (
    <div className="antialiased bg-black min-h-screen text-neutral-200">
      <BetaMarquee position="top" />


      {viewState === 'LANDING' && (
        <LandingPage onEnter={handleEnter} />
      )}

      {viewState === 'AUTH' && (
        <Auth
          onLogin={handleLogin}
          onCancel={() => setViewState('LANDING')}
        />
      )}

      {viewState === 'DASHBOARD' && currentUser && (
        <>
          <Dashboard
            currentUser={currentUser}
            onLogout={handleLogout}
            onUpdateUser={handleUpdateUser}
            onRefreshUser={handleRefreshUser}
          />


        </>
      )}

      {/* Notification Toast - shown globally */}
      {currentUser && <NotificationToast />}
    </div>
  );
};

export default App;
