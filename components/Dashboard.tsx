
import React, { useState, useEffect, useRef } from 'react';
import {
  Wine,
  VenetianMask,
  Menu,
  X,
  LogOut,
  Crown,
  Settings,
  Radar,
  Users,
  MessageSquare,
  Gem,
  Ghost,
  Sparkles,
  ChevronUp,
  Coins,
  ShieldAlert,
  Key,
  MapPin
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DashboardView, User, UserRole } from '../types';
import Lounge from './features/Lounge';
import Mentorship from './features/Mentorship';
import RadarView from './features/Radar';
import Members from './features/Members';
import Inbox from './features/Inbox';
import Membership from './features/Membership';
import Visitors from './features/Visitors';
import Oracle from './features/Oracle';
import VirtualCompanion from './features/VirtualCompanion';
import SecretCircles from './features/SecretCircles';
import AdminPanel from './features/AdminPanel';
import ProfileEditor from './ProfileEditor';
import ChatOverlay from './ChatOverlay';
import Footer from './Footer';
import LegalPages from './LegalPages';
import ContactModal from './ContactModal';
import ClubList from './features/ClubList';
import ClubEvents from './features/ClubEvents';
import ClubProfileView from './features/ClubProfileView';
import { ClubProfile } from '../types';
import { api } from '../services/db';

interface DashboardProps {
  currentUser: User;
  onLogout: () => void;
  onUpdateUser: (data: Partial<User>) => void;
  onRefreshUser: () => Promise<void>;
}

const MASTER_ADMIN_EMAIL = 'andreaesse@live.it';

const Dashboard: React.FC<DashboardProps> = ({ currentUser, onLogout, onUpdateUser, onRefreshUser }) => {
  const { t } = useTranslation();
  const [activeView, setActiveView] = useState<DashboardView>('CLUB');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [selectedClub, setSelectedClub] = useState<ClubProfile | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Ref per chiudere il menu utente quando si clicca fuori
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Global Chat State
  const [chatTarget, setChatTarget] = useState<{ id: string, name: string, avatar: string } | null>(null);

  // Gestione layout iniziale: Mobile apre menu, Desktop va su Radar
  useEffect(() => {
    const handleInitialLayout = () => {
      if (window.innerWidth < 768) {
        setIsMobileMenuOpen(true);
      } else {
        setActiveView('RADAR');
      }
    };
    handleInitialLayout();

    // Listener per chiudere menu utente al click fuori
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch Unread Count
  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const count = await api.getUnreadMessageCount(currentUser.id);
        setUnreadCount(count);
      } catch (e) {
        console.error("Failed to fetch unread count", e);
      }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 10000); // Ogni 10s

    // Listener per aggiornamento immediato
    const handleManualRefresh = () => fetchUnread();
    window.addEventListener('velvetRefreshUnreadCount', handleManualRefresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener('velvetRefreshUnreadCount', handleManualRefresh);
    };
  }, [currentUser.id]);

  // 1. NAVIGAZIONE GENERALE (Sidebar Principale)
  const mainNavItems: (({ id: DashboardView; label: string; icon: React.ElementType }) | { type: 'separator' })[] = [
    { id: 'CONFESSIONAL', label: t('dashboard.nav.confessional'), icon: VenetianMask },
    { id: 'RADAR', label: t('dashboard.nav.radar'), icon: Radar },
    { id: 'CIRCLES', label: t('dashboard.nav.circles'), icon: Key },
    { type: 'separator' },
    { id: 'CLUB_LIST', label: t('dashboard.nav.club_list'), icon: MapPin },
    { id: 'MEMBERS', label: t('dashboard.nav.members'), icon: Users },
    { type: 'separator' },
    { id: 'MEMBERSHIP', label: t('dashboard.nav.membership'), icon: Gem },
  ];

  // 2. NAVIGAZIONE PERSONALE (Menu Utente)
  const userNavItems: { id: DashboardView; label: string; icon: React.ElementType }[] = [
    { id: 'MESSAGES', label: t('dashboard.user_menu.messages'), icon: MessageSquare },
    { id: 'VISITORS', label: t('dashboard.user_menu.visitors'), icon: Ghost },
  ];

  const handleOpenChat = (user: { id: string, name: string, avatar: string }) => {
    setChatTarget(user);
  };

  const renderContent = () => {
    switch (activeView) {
      case 'CLUB': return <Lounge currentUser={currentUser} />;
      case 'CLUB_LIST': return <ClubList currentUser={currentUser} onOpenEvents={(club) => { setSelectedClub(club); setActiveView('CLUB_EVENTS'); }} onOpenProfile={(club) => { setSelectedClub(club); setActiveView('CLUB_PROFILE'); }} />;
      case 'CLUB_EVENTS': return <ClubEvents currentUser={currentUser} club={selectedClub || undefined} onBack={() => setActiveView('CLUB_LIST')} />;
      case 'CLUB_PROFILE': return selectedClub ? <ClubProfileView club={selectedClub} onBack={() => setActiveView('CLUB_LIST')} /> : <ClubList currentUser={currentUser} onOpenEvents={(club) => { setSelectedClub(club); setActiveView('CLUB_EVENTS'); }} onOpenProfile={(club) => { setSelectedClub(club); setActiveView('CLUB_PROFILE'); }} />;
      case 'CONFESSIONAL': return <Mentorship currentUser={currentUser} />;
      case 'RADAR': return <RadarView currentUser={currentUser} onOpenChat={handleOpenChat} />;
      case 'CIRCLES': return <SecretCircles currentUser={currentUser} />;
      case 'MEMBERS': return <Members currentUser={currentUser} onOpenChat={handleOpenChat} onUpdateUser={onUpdateUser} />;
      case 'MESSAGES': return <Inbox currentUser={currentUser} onOpenChat={handleOpenChat} />;
      case 'MEMBERSHIP': return <Membership currentUser={currentUser} onRefreshUser={onRefreshUser} />;
      case 'VISITORS': return <Visitors currentUser={currentUser} onOpenChat={handleOpenChat} />;
      case 'ORACLE': return <Oracle currentUser={currentUser} onOpenChat={handleOpenChat} />;
      case 'COMPANION': return <VirtualCompanion currentUser={currentUser} />;
      case 'ADMIN_PANEL': return <AdminPanel currentUser={currentUser} />;
      case 'RULES':
      case 'TERMS':
      case 'PRIVACY':
        return <LegalPages type={activeView} onBack={() => setActiveView('CLUB')} />;
      default: return <Lounge currentUser={currentUser} />;
    }
  };

  // Robust Admin Check
  const isUserAdmin =
    currentUser.email?.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase() ||
    currentUser.role === UserRole.ADMIN ||
    currentUser.role?.toUpperCase() === 'ADMIN';

  return (
    <div className="flex h-[calc(100vh-48px)] mt-6 bg-black text-neutral-300 overflow-hidden font-sans relative">

      {showProfileEditor && (
        <ProfileEditor
          user={currentUser}
          onUpdate={onUpdateUser}
          onClose={() => setShowProfileEditor(false)}
        />
      )}

      {showContactModal && (
        <ContactModal
          currentUser={currentUser}
          onClose={() => setShowContactModal(false)}
        />
      )}

      {/* Global Chat Overlay */}
      {chatTarget && (
        <ChatOverlay
          currentUser={currentUser}
          targetUser={chatTarget}
          onClose={() => setChatTarget(null)}
        />
      )}

      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-72 border-r border-neutral-900 bg-neutral-950 relative z-20 h-full">
        <div className="p-8 flex items-center gap-3">
          <Crown className="w-6 h-6 text-crimson-700" />
          <h1 className="text-xl font-serif font-bold text-neutral-200 tracking-widest">VELVET</h1>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {mainNavItems.map((item, idx) => {
            if ('type' in item && item.type === 'separator') {
              return <div key={`sep-${idx}`} className="my-4 border-t border-neutral-900/50 mx-6" />;
            }
            const navItem = item as { id: DashboardView; label: string; icon: React.ElementType };
            return (
              <button
                key={navItem.id}
                onClick={() => setActiveView(navItem.id)}
                className={`w-full flex items-center gap-4 px-6 py-4 transition-all duration-300 group relative ${activeView === navItem.id
                  ? 'text-crimson-500 bg-neutral-900/50'
                  : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-900/30'
                  }`}
              >
                <navItem.icon className={`w-5 h-5 ${activeView === navItem.id ? 'text-crimson-600' : 'text-neutral-600 group-hover:text-neutral-400'}`} />
                <span className={`font-serif tracking-wide text-sm ${navItem.id === 'MEMBERSHIP' ? 'text-gold-500 font-bold' : ''}`}>{navItem.label}</span>
                {activeView === navItem.id && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-crimson-800 shadow-[0_0_10px_#991b1b]" />
                )}
              </button>
            );
          })}

          {/* Admin Link */}
          {isUserAdmin && (
            <button
              onClick={() => setActiveView('ADMIN_PANEL')}
              className={`w-full flex items-center gap-4 px-6 py-4 transition-all duration-300 group relative mt-4 border-t border-neutral-900/50 ${activeView === 'ADMIN_PANEL'
                ? 'text-blue-500 bg-blue-900/10'
                : 'text-neutral-600 hover:text-blue-400 hover:bg-blue-900/5'
                }`}
            >
              <ShieldAlert className={`w-5 h-5 ${activeView === 'ADMIN_PANEL' ? 'text-blue-600' : 'text-neutral-700'}`} />
              <span className="font-serif tracking-wide text-[10px] uppercase font-bold">Admin Console</span>
            </button>
          )}
        </nav>

        {/* User Menu Area */}
        <div className="p-6 border-t border-neutral-900 relative" ref={userMenuRef}>

          {/* POPUP MENU */}
          {isUserMenuOpen && (
            <div className="absolute bottom-full left-4 right-4 mb-2 bg-neutral-900 border border-neutral-800 rounded-lg shadow-[0_-5px_20px_rgba(0,0,0,0.5)] overflow-hidden animate-fade-in z-30">
              <div className="py-2">
                <p className="px-4 py-2 text-[10px] uppercase text-neutral-500 font-bold tracking-widest">{t('dashboard.user_menu.personal_space')}</p>

                {/* Credits Indicator */}
                <div className="px-4 py-2 flex items-center gap-2 text-yellow-500 border-b border-neutral-800 mb-2">
                  <Coins className="w-4 h-4" />
                  <span className="text-sm font-bold">{t('dashboard.user_menu.credits', { count: currentUser.credits })}</span>
                </div>

                {userNavItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => { setActiveView(item.id); setIsUserMenuOpen(false); }}
                    className={`w-full flex items-center justify-between px-4 py-3 hover:bg-neutral-800 transition-colors ${activeView === item.id ? 'text-crimson-500 bg-neutral-800/50' : 'text-neutral-300'}`}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="w-4 h-4" />
                      <span className="text-sm font-serif">{item.label}</span>
                    </div>
                    {item.id === 'MESSAGES' && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${unreadCount > 0 ? 'bg-crimson-600 text-white animate-pulse' : 'bg-neutral-800 text-neutral-500'}`}>
                        {unreadCount}
                      </span>
                    )}
                  </button>
                ))}

                <div className="border-t border-neutral-800 my-1"></div>

                <button
                  onClick={() => { setShowProfileEditor(true); setIsUserMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  <span className="text-sm">{t('dashboard.user_menu.manage_profile')}</span>
                </button>

                <button
                  onClick={onLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-crimson-500 hover:bg-crimson-900/20 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm font-bold uppercase tracking-wide">{t('dashboard.user_menu.logout')}</span>
                </button>
              </div>
            </div>
          )}

          {/* USER TRIGGER CARD */}
          <div
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className={`flex items-center gap-4 group cursor-pointer p-2 rounded-lg transition-colors ${isUserMenuOpen ? 'bg-neutral-900 border border-neutral-800' : 'hover:bg-neutral-900/50'}`}
          >
            <div className="relative">
              <img
                src={currentUser.avatar}
                alt="User"
                className={`w-10 h-10 rounded-full border object-cover transition-colors ${currentUser.isVip ? 'border-gold-500 shadow-[0_0_10px_rgba(234,179,8,0.3)]' : 'border-neutral-700 group-hover:border-crimson-500'}`}
              />
              {currentUser.isVip && (
                <div className="absolute -top-1 -right-1 bg-neutral-950 rounded-full p-0.5 border border-gold-600 z-10">
                  <Crown className="w-2.5 h-2.5 text-gold-500 fill-current" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-serif truncate ${currentUser.isVip ? 'text-gold-400' : 'text-white'}`}>{currentUser.name}</p>
              <p className="text-[10px] text-neutral-500 truncate uppercase tracking-wider flex items-center gap-1">
                {currentUser.role.replace('_', ' ')}
                <span className="w-1 h-1 rounded-full bg-neutral-600"></span>
                <span className="text-yellow-600">{currentUser.credits}c</span>
              </p>
            </div>
            <ChevronUp className={`w-4 h-4 text-neutral-600 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-6 w-full z-50 bg-neutral-950 border-b border-neutral-900 p-4 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-2">
          <Crown className={`w-5 h-5 ${currentUser.isVip ? 'text-gold-500 fill-current' : 'text-crimson-700'}`} />
          <span className="text-lg font-serif font-bold text-white tracking-widest">VELVET</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X className="text-white" /> : <Menu className="text-white" />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black pt-20 px-6 animate-fade-in flex flex-col overflow-y-auto">
          <div className="flex-1 flex flex-col justify-start space-y-2 pb-10">
            <div className="text-center mb-6 shrink-0">
              <div className="relative inline-block">
                <img src={currentUser.avatar} className="w-20 h-20 rounded-full border-2 border-neutral-800 mx-auto mb-3 object-cover" />
                {currentUser.isVip && <div className="absolute top-0 right-0 bg-gold-600 text-black p-1 rounded-full border border-black"><Crown className="w-4 h-4 fill-current" /></div>}
              </div>
              <h2 className={`text-2xl font-serif ${currentUser.isVip ? 'text-gold-500' : 'text-white'}`}>{currentUser.name}              </h2>
              <div className="flex justify-center items-center gap-2 mt-2 text-yellow-500 text-sm font-bold bg-yellow-900/10 py-1 px-3 rounded-full w-fit mx-auto border border-yellow-900/30">
                <Coins className="w-4 h-4" /> {t('dashboard.user_menu.credits', { count: currentUser.credits })}
              </div>
            </div>

            {/* Sezione Esplora */}
            <p className="text-[10px] uppercase text-neutral-600 font-bold tracking-[0.2em] mb-2 mt-4">{t('dashboard.user_menu.explore')}</p>
            {mainNavItems.map((item, idx) => {
              if ('type' in item && item.type === 'separator') {
                return <div key={`sep-mob-${idx}`} className="my-2 border-t border-neutral-900/50 mx-2" />;
              }
              const navItem = item as { id: DashboardView; label: string; icon: React.ElementType };
              return (
                <button
                  key={navItem.id}
                  onClick={() => {
                    setActiveView(navItem.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full p-4 border border-neutral-800 flex items-center gap-4 transition-all shrink-0 ${activeView === navItem.id
                    ? 'bg-crimson-900/20 border-crimson-900 text-white'
                    : 'bg-neutral-900/30 text-neutral-400'
                    }`}
                >
                  <navItem.icon className={`w-5 h-5 ${activeView === navItem.id ? 'text-crimson-500' : 'text-neutral-500'}`} />
                  <span className={`text-lg font-serif tracking-wide ${navItem.id === 'MEMBERSHIP' ? 'text-gold-500' : ''}`}>{navItem.label}</span>
                </button>
              );
            })}

            {/* Sezione Personale */}
            <p className="text-[10px] uppercase text-neutral-600 font-bold tracking-[0.2em] mb-2 mt-6">{t('dashboard.user_menu.personal_space')}</p>
            <div className="grid grid-cols-2 gap-2">
              {userNavItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveView(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`p-3 border border-neutral-800 flex flex-col items-center justify-center gap-2 transition-all relative ${activeView === item.id
                    ? 'bg-neutral-800 border-neutral-600 text-white'
                    : 'bg-neutral-900/30 text-neutral-400'
                    }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="text-xs font-serif text-center">{item.label}</span>
                  {item.id === 'MESSAGES' && (
                    <span className={`absolute top-1 right-1 text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg ${unreadCount > 0 ? 'bg-crimson-600 text-white animate-pulse' : 'bg-neutral-800 text-neutral-600'}`}>
                      {unreadCount}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <button
              onClick={() => { setShowProfileEditor(true); setIsMobileMenuOpen(false); }}
              className="w-full p-4 mt-6 border border-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center gap-2 uppercase tracking-widest text-xs shrink-0"
            >
              <Settings className="w-4 h-4" /> {t('dashboard.user_menu.manage_profile')}
            </button>

            {isUserAdmin && (
              <button
                onClick={() => { setActiveView('ADMIN_PANEL'); setIsMobileMenuOpen(false); }}
                className="w-full p-4 mt-2 border border-blue-900/30 bg-blue-900/5 text-blue-400 flex items-center justify-center gap-2 uppercase tracking-widest text-xs shrink-0"
              >
                <ShieldAlert className="w-4 h-4" /> Admin Console
              </button>
            )}
          </div>

          <div className="py-6 border-t border-neutral-900 mt-auto shrink-0 space-y-2">
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 text-crimson-500 font-bold uppercase tracking-widest"
            >
              <LogOut className="w-5 h-5" />
              {t('dashboard.mobile.disconnect')}
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-neutral-950 pt-16 md:pt-0 relative">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')] opacity-20 pointer-events-none"></div>
        {/* Added pb-16 to avoid content being hidden behind the legal bar */}
        <div className={`${activeView === 'RADAR' || activeView === 'COMPANION' ? 'p-0 md:p-8 h-full' : 'p-4 md:p-8 max-w-7xl mx-auto pb-16'} min-h-full relative z-10`}>
          {renderContent()}
        </div>

        {/* Velvet Legal Bar - Persistent and Fixed at the bottom right of the sidebar */}
        <Footer
          onViewChange={(view) => setActiveView(view)}
          onContactClick={() => setShowContactModal(true)}
        />
      </main>
    </div>
  );
};

export default Dashboard;
