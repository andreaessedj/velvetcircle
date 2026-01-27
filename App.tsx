
import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import Auth from './components/Auth';
import NotificationToast from './components/NotificationToast';
import { ViewState, User } from './types';
import { Sparkles } from 'lucide-react';
import { api } from './services/db';
import { notificationService } from './services/notificationService';
import { useTranslation } from 'react-i18next';
const App: React.FC = () => {
  const { t } = useTranslation();
  const [viewState, setViewState] = useState<ViewState>('LANDING');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [showBetaOverlay, setShowBetaOverlay] = useState(false);
  const [adminUser, setAdminUser] = useState<{ id: string, name: string, avatar: string } | null>(null);

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

          // Show beta once per session
          if (!sessionStorage.getItem('velvet_beta_shown')) {
            setShowBetaOverlay(true);
          }
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

    // Show beta after explicit login
    setShowBetaOverlay(true);
  };

  const handleLogout = async () => {
    await api.logout();
    notificationService.cleanup();
    setCurrentUser(null);
    setViewState('LANDING');
    sessionStorage.removeItem('velvet_beta_shown');
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

  // Helper to open chat from the overlay
  const handleContactAdmin = async () => {
    try {
      const users = await api.getUsers();
      const admin = users.find(u => u.email?.toLowerCase() === 'andreaesse@live.it');
      if (admin) {
        // We use window injection to trigger Dashboard's opening of chat
        (window as any).velvetOpenChat?.(admin.id, encodeURIComponent(admin.name), encodeURIComponent(admin.avatar));
        setShowBetaOverlay(false);
        sessionStorage.setItem('velvet_beta_shown', 'true');
      } else {
        alert(t('app.admin_not_found'));
      }
    } catch (e) {
      console.error(e);
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
      <BetaMarquee position="bottom" />

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

          {/* Beta Welcome Overlay */}
          {showBetaOverlay && (
            <div className="fixed inset-0 z-[10000] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in">
              <div className="max-w-md w-full glass-card p-8 relative overflow-hidden group">
                {/* Decorative Elements */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-crimson-600/10 rounded-full blur-3xl group-hover:bg-crimson-600/20 transition-colors" />

                <div className="relative z-10 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-crimson-900/40 border border-crimson-500 mb-6 animate-pulse">
                    <Sparkles className="w-8 h-8 text-crimson-500" />
                  </div>

                  <h2 className="text-3xl font-serif text-white mb-2">{t('app.beta_welcome', { defaultValue: 'Benvenuto nel' })} <span className="gold-gradient-text">Beta Test</span></h2>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-crimson-500 font-bold mb-6">{t('app.beta_preview')}</p>

                  <div className="space-y-4 text-left mb-8">
                    <div className="bg-white/5 p-4 rounded border border-white/10">
                      <h4 className="text-white font-bold text-sm mb-1 italic">{t('app.what_is_beta')}</h4>
                      <p className="text-xs text-neutral-400 leading-relaxed">
                        {t('app.beta_desc')}
                      </p>
                    </div>

                    <div className="bg-crimson-950/20 p-4 rounded border border-crimson-900/30">
                      <h4 className="text-crimson-400 font-bold text-sm mb-1 italic">{t('app.tester_benefits')}</h4>
                      <p className="text-xs text-neutral-300 leading-relaxed">
                        {t('app.tester_desc')}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <button
                      onClick={handleContactAdmin}
                      className="w-full bg-crimson-900 hover:bg-crimson-800 text-white font-bold uppercase tracking-widest py-4 transition-all shadow-[0_0_20px_rgba(220,38,38,0.3)] hover:scale-[1.02] active:scale-[0.98]"
                    >
                      {t('app.write_admin')}
                    </button>
                    <button
                      onClick={() => {
                        setShowBetaOverlay(false);
                        sessionStorage.setItem('velvet_beta_shown', 'true');
                      }}
                      className="w-full py-3 text-neutral-500 hover:text-white text-[10px] uppercase font-bold tracking-widest transition-colors"
                    >
                      {t('app.start_exploring')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Notification Toast - shown globally */}
      {currentUser && <NotificationToast />}
    </div>
  );
};

export default App;
