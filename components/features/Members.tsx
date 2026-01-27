import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { User, UserRole, VaultItem } from '../../types';
import { api } from '../../services/db';
import { Search, Users as UsersIcon, Loader, ShieldCheck, Sparkles, MessageSquare, Info, Lock, Key, Shield, ThumbsUp, X, Filter, MapPin, Image as ImageIcon, Zap, Coins, CreditCard, ChevronRight, ShoppingCart, Eye, Flame, Timer, UserX, Flag, Check as CheckIcon, Globe } from 'lucide-react';

interface MembersProps {
    currentUser: User;
    onOpenChat: (user: { id: string, name: string, avatar: string }) => void;
    onUpdateUser: (data: Partial<User>) => void;
}

const Members: React.FC<MembersProps> = ({ currentUser, onOpenChat, onUpdateUser }) => {
    const { t } = useTranslation();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [boosting, setBoosting] = useState(false);

    // State for Profile Modal
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [hasEndorsed, setHasEndorsed] = useState(false);
    const [loadingTrust, setLoadingTrust] = useState(false);
    const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);

    // State for Photo Purchase
    const [photoToBuy, setPhotoToBuy] = useState<VaultItem | null>(null);
    const [buyingPhoto, setBuyingPhoto] = useState(false);

    // State for Credits Modal
    const [showRechargeModal, setShowRechargeModal] = useState(false);

    // State for Tipping
    const [tippingUser, setTippingUser] = useState<User | null>(null);
    const [sendingTip, setSendingTip] = useState(false);

    // Full Screen Photo
    const [fullScreenPhoto, setFullScreenPhoto] = useState<string | null>(null);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRole, setSelectedRole] = useState<UserRole | 'ALL'>('ALL');

    // Advanced Filters (VIP)
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [filterVerified, setFilterVerified] = useState(false);
    const [filterLocation, setFilterLocation] = useState('');
    const [filterDesire, setFilterDesire] = useState('');
    const [filterWithVault, setFilterWithVault] = useState(false);

    const COMMON_DESIRES = [
        t('members.desires_list.swinging'),
        t('members.desires_list.threesome_mmf'),
        t('members.desires_list.threesome_ffm'),
        t('members.desires_list.bdsm_soft'),
        t('members.desires_list.just_drink'),
        t('members.desires_list.voyeurism')
    ];

    // Helper check for admin role safely
    const isAdmin = (user: User) => {
        const email = user.email || '';
        return user.role === UserRole.ADMIN || user.role?.toUpperCase() === 'ADMIN' || email.toLowerCase() === 'andreaesse@live.it';
    };

    const loadUsers = async () => {
        setLoading(true);
        try {
            const data = await api.getUsers();
            // All profiles including current user
            const allProfiles = data;

            const now = new Date().getTime();

            // LOGICA DI ORDINAMENTO:
            // 1. Profili con Boost attivo: ordinati per scadenza decrescente (i più recenti in alto)
            const boosted = allProfiles
                .filter(u => u.boostUntil && new Date(u.boostUntil).getTime() > now)
                .sort((a, b) => new Date(b.boostUntil!).getTime() - new Date(a.boostUntil!).getTime());

            // 2. Profili normali: ordine casuale (per dare visibilità a tutti a rotazione)
            const normal = allProfiles.filter(u => !u.boostUntil || new Date(u.boostUntil).getTime() <= now);
            const shuffledNormal = [...normal].sort(() => Math.random() - 0.5);

            setUsers([...boosted, ...shuffledNormal]);
        } catch (e) {
            console.error("Errore caricamento membri:", e);
        } finally {
            setLoading(false);
        }
    };

    const loadBlockedUsers = async () => {
        try {
            const ids = await api.getBlockedUserIds();
            setBlockedUserIds(ids);
        } catch (e) {
            console.error(e);
        }
    };

    // Refresh list when ID or Boost status changes
    useEffect(() => {
        loadUsers();
        loadBlockedUsers();
    }, [currentUser.id, currentUser.boostUntil]);

    // Load Trust Status when opening modal AND RECORD VISIT
    useEffect(() => {
        if (selectedUser) {
            checkTrust(selectedUser.id);
            // VISITOR TRACKING: No tracking self-visits
            if (selectedUser.id !== currentUser.id) {
                api.recordVisit(selectedUser.id);
            }
        }
    }, [selectedUser, currentUser.id]);

    const checkTrust = async (targetId: string) => {
        setLoadingTrust(true);
        const endorsed = await api.checkTrustStatus(targetId);
        setHasEndorsed(endorsed);
        setLoadingTrust(false);
    };

    const handleBoost = async () => {
        const isUserAdmin = isAdmin(currentUser);
        if (currentUser.credits < 3 && !isUserAdmin) {
            setShowRechargeModal(true);
            return;
        }

        if (!confirm(t('members.boost_confirm'))) return;

        setBoosting(true);
        try {
            const expiry = await api.boostProfile(currentUser.id);
            // Aggiorna lo stato globale
            onUpdateUser({
                credits: isUserAdmin ? currentUser.credits : currentUser.credits - 3,
                boostUntil: expiry
            });
            alert(t('members.boost_success'));
            // Ricarica immediata della lista locale per riflettere il nuovo ordine
            await loadUsers();
        } catch (e: any) {
            alert(e.message || t('members.boost_error'));
        } finally {
            setBoosting(false);
        }
    };

    const handleOpenChatInternal = (user: User) => {
        if (blockedUserIds.includes(user.id)) {
            alert(t('members.blocked_message_error'));
            return;
        }
        onOpenChat({ id: user.id, name: user.name, avatar: user.avatar });
    };

    const handleBlock = async (userId: string) => {
        if (!confirm(t('members.block_confirm'))) return;
        try {
            await api.blockUser(userId);
            setBlockedUserIds(prev => [...prev, userId]);
            setSelectedUser(null);
            alert(t('members.block_success'));
        } catch (e) {
            alert(t('members.block_error'));
        }
    };

    const handleReport = async (userId: string) => {
        const reason = prompt(t('members.report_reason_prompt'));
        if (!reason) return;
        try {
            await api.reportContent(userId, 'USER', reason);
            alert(t('members.report_success'));
        } catch (e) {
            alert(t('members.report_error'));
        }
    };

    const handleBuyPhoto = async () => {
        if (!selectedUser || !photoToBuy) return;

        const isUserAdmin = isAdmin(currentUser);

        if (!isUserAdmin && currentUser.credits < photoToBuy.price) {
            setPhotoToBuy(null);
            setShowRechargeModal(true);
            return;
        }

        setBuyingPhoto(true);
        try {
            await api.buyPhoto(currentUser.id, selectedUser.id, photoToBuy.id, photoToBuy.price);
            const newUnlocked = [...(currentUser.unlockedMedia || []), photoToBuy.id];
            onUpdateUser({
                credits: isUserAdmin ? currentUser.credits : currentUser.credits - photoToBuy.price,
                unlockedMedia: newUnlocked
            });
            setPhotoToBuy(null);
        } catch (e: any) {
            console.error(e);
            alert(e.message || t('members.buy_photo_error'));
        } finally {
            setBuyingPhoto(false);
        }
    };

    const handleToggleTrust = async () => {
        if (!selectedUser) return;
        if (selectedUser.id === currentUser.id) {
            alert(t('members.trust_self_error'));
            return;
        }
        setLoadingTrust(true);
        try {
            const newState = await api.toggleTrust(selectedUser.id);
            setHasEndorsed(newState);
            setUsers(prev => prev.map(u => {
                if (u.id === selectedUser.id) {
                    const currentScore = u.trustScore || 0;
                    return { ...u, trustScore: newState ? currentScore + 1 : currentScore - 1 };
                }
                return u;
            }));
            setSelectedUser(prev => {
                if (!prev) return null;
                const currentScore = prev.trustScore || 0;
                return { ...prev, trustScore: newState ? currentScore + 1 : currentScore - 1 };
            });

        } catch (e: any) {
            console.error(e);
            alert(e.message || t('members.trust_error'));
        } finally {
            setLoadingTrust(false);
        }
    };

    const handleSendTip = async (amount: number) => {
        if (!tippingUser) return;

        const isUserAdmin = isAdmin(currentUser);

        if (!isUserAdmin && currentUser.credits < amount) {
            setShowRechargeModal(true);
            setTippingUser(null);
            return;
        }

        setSendingTip(true);
        try {
            await api.sendTip(currentUser.id, tippingUser.id, amount);
            alert(t('chat.tip_success', { amount, name: tippingUser.name }));
            if (!isUserAdmin) {
                onUpdateUser({ credits: currentUser.credits - amount });
            }
            setTippingUser(null);
        } catch (e: any) {
            console.error(e);
            alert(e.message || t('chat.tip_error'));
        } finally {
            setSendingTip(false);
        }
    };

    const uniqueLocations = Array.from(new Set(users.map(u => u.location).filter(Boolean))).sort();

    // Filter Logic: preserves the pre-sorted order of 'users' array
    const filteredUsers = users.filter(user => {
        // Essential: Do not show blocked users
        if (blockedUserIds.includes(user.id)) return false;

        // Essential: Do not show banned users to normal members
        if (user.is_banned && !isAdmin(currentUser)) return false;

        // Essential: Do not show clubs in the Followers list
        if (user.role === UserRole.CLUB) return false;

        const query = searchQuery.toLowerCase();
        const matchesSearch =
            user.name.toLowerCase().includes(query) ||
            user.bio.toLowerCase().includes(query);
        const matchesRole = selectedRole === 'ALL' || user.role === selectedRole;

        let matchesAdvanced = true;
        if (currentUser.isVip && showAdvanced) {
            if (filterVerified && !user.isVerified) matchesAdvanced = false;
            if (filterWithVault && (!user.gallery || user.gallery.length === 0)) matchesAdvanced = false;
            if (filterLocation && user.location !== filterLocation) matchesAdvanced = false;
            if (filterDesire && !user.desires.includes(filterDesire)) matchesAdvanced = false;
        }

        return matchesSearch && matchesRole && matchesAdvanced;
    });

    const isPhotoUnlocked = (photoId: string) => {
        return (currentUser.unlockedMedia || []).includes(photoId);
    };

    const isBoostActive = (dateStr?: string) => {
        if (!dateStr) return false;
        return new Date(dateStr).getTime() > new Date().getTime();
    };

    if (loading) return <div className="flex justify-center p-20"><Loader className="animate-spin text-crimson-600" /></div>;

    return (
        <div className="max-w-6xl mx-auto pb-20">

            {/* Header */}
            <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-neutral-800 pb-6">
                <div>
                    <h2 className="text-3xl font-serif text-white mb-2 flex items-center gap-3">
                        <UsersIcon className="w-8 h-8 text-crimson-700" /> {t('members.title')}
                    </h2>
                    <p className="text-neutral-500 text-sm">{t('members.subtitle')}</p>
                </div>

                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-3.5 w-4 h-4 text-neutral-500" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t('members.search_placeholder')}
                        className="w-full bg-neutral-900 border border-neutral-800 text-white pl-10 pr-4 py-3 focus:border-crimson-900 outline-none font-serif text-sm rounded-lg"
                    />
                </div>
            </div>

            {/* VELVET BOOST PANEL */}
            <div className="mb-8 bg-gradient-to-r from-crimson-900/40 via-black to-crimson-900/40 border border-crimson-600/30 p-5 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 rounded-xl shadow-2xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
                <div className="flex items-center gap-6 relative z-10">
                    <div className="bg-crimson-900/40 p-4 rounded-full animate-pulse border border-crimson-500/50 shadow-[0_0_20px_rgba(220,38,38,0.3)]">
                        <Flame className="w-8 h-8 text-crimson-500" />
                    </div>
                    <div>
                        <h3 className="text-white font-serif text-xl flex items-center gap-3">
                            Velvet Boost 24h
                            {isBoostActive(currentUser.boostUntil) && <span className="text-[10px] bg-green-900 text-green-400 px-2 py-0.5 border border-green-700 rounded-full font-bold uppercase tracking-wider">{t('members.active')}</span>}
                        </h3>
                        <p className="text-neutral-400 text-sm max-w-md">{t('members.boost_desc')}</p>
                    </div>
                </div>

                <button
                    onClick={handleBoost}
                    disabled={boosting}
                    className="group relative px-10 py-4 bg-crimson-900 hover:bg-crimson-800 text-white font-bold uppercase text-xs tracking-[0.2em] transition-all shadow-[0_0_30px_rgba(220,38,38,0.4)] hover:shadow-crimson-600/60 flex items-center gap-3 rounded-lg border border-crimson-500/30"
                >
                    {boosting ? <Loader className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5 fill-current" />}
                    {isBoostActive(currentUser.boostUntil) ? t('members.renew_boost') : t('members.boost_profile_btn')}
                    <span className="bg-black/40 px-3 py-1 rounded-full ml-2 text-[10px]">{isAdmin(currentUser) ? 'Free' : '3cr'}</span>
                </button>
            </div>

            {/* Filters Toolbar */}
            <div className="mb-8 space-y-4">
                <div className="flex flex-wrap gap-2 justify-between items-center">
                    <div className="flex gap-2">
                        <button onClick={() => setSelectedRole('ALL')} className={`px-5 py-2.5 text-[10px] uppercase font-bold border transition-all rounded-lg tracking-widest ${selectedRole === 'ALL' ? 'bg-white text-black border-white' : 'bg-black text-neutral-500 border-neutral-800 hover:border-neutral-700'}`}>{t('members.filter_all')}</button>
                        <button onClick={() => setSelectedRole(UserRole.COUPLE)} className={`px-5 py-2.5 text-[10px] uppercase font-bold border transition-all rounded-lg tracking-widest ${selectedRole === UserRole.COUPLE ? 'bg-crimson-900 text-white border-crimson-700 shadow-lg' : 'bg-black text-neutral-500 border-neutral-800 hover:border-neutral-700'}`}>{t('roles.COUPLE')}</button>
                        <button onClick={() => setSelectedRole(UserRole.SINGLE_MALE)} className={`px-5 py-2.5 text-[10px] uppercase font-bold border transition-all rounded-lg tracking-widest ${selectedRole === UserRole.SINGLE_MALE ? 'bg-neutral-800 text-white border-neutral-600' : 'bg-black text-neutral-500 border-neutral-800 hover:border-neutral-700'}`}>{t('roles.SINGLE_MALE')}</button>
                        <button onClick={() => setSelectedRole(UserRole.SINGLE_FEMALE)} className={`px-5 py-2.5 text-[10px] uppercase font-bold border transition-all rounded-lg tracking-widest ${selectedRole === UserRole.SINGLE_FEMALE ? 'bg-neutral-800 text-white border-neutral-600' : 'bg-black text-neutral-500 border-neutral-800 hover:border-neutral-700'}`}>{t('roles.SINGLE_FEMALE')}</button>
                    </div>

                    <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className={`flex items-center gap-2 px-5 py-2.5 text-[10px] uppercase font-bold border transition-all rounded-lg tracking-widest ${showAdvanced ? 'bg-gold-900/20 text-gold-500 border-gold-600 shadow-[0_0_15px_rgba(234,179,8,0.2)]' : 'bg-black text-neutral-500 border-neutral-800 hover:text-white hover:border-neutral-700'}`}
                    >
                        <Filter className="w-3.5 h-3.5" /> {t('members.advanced_filters')} {currentUser.isVip && <span className="bg-gold-600 text-black text-[9px] px-1.5 py-0.5 rounded-full ml-1 font-black">VIP</span>}
                    </button>
                </div>

                {showAdvanced && (
                    <div className="relative bg-neutral-900/30 border border-neutral-800 p-8 animate-fade-in overflow-hidden rounded-xl">
                        {!currentUser.isVip && (
                            <div className="absolute inset-0 bg-neutral-950/90 backdrop-blur-md z-20 flex flex-col items-center justify-center text-center p-6 rounded-xl">
                                <Lock className="w-10 h-10 text-gold-500 mb-4" />
                                <h3 className="text-gold-400 font-serif text-xl mb-2">{t('members.vip_feature_title')}</h3>
                                <p className="text-neutral-400 text-sm mb-6 max-w-xs">{t('members.vip_filters_desc')}</p>
                                <button
                                    onClick={() => window.open('https://ko-fi.com/s/00fd0caa74', '_blank')}
                                    className="px-8 py-3 bg-gold-600 hover:bg-gold-500 text-black font-bold uppercase text-xs tracking-[0.2em] transition-all shadow-[0_0_20px_rgba(234,179,8,0.4)] rounded"
                                >
                                    {t('members.unlock_now')}
                                </button>
                            </div>
                        )}

                        <div className={`grid grid-cols-1 md:grid-cols-4 gap-8 ${!currentUser.isVip ? 'opacity-20 pointer-events-none' : ''}`}>
                            <div>
                                <label className="block text-[10px] uppercase text-neutral-500 font-bold mb-3 flex items-center gap-2 tracking-[0.1em]">
                                    <MapPin className="w-3.5 h-3.5" /> {t('members.city_label')}
                                </label>
                                <select
                                    value={filterLocation}
                                    onChange={(e) => setFilterLocation(e.target.value)}
                                    className="w-full bg-black border border-neutral-800 text-neutral-300 text-xs p-3 focus:border-gold-600 outline-none rounded-lg font-serif"
                                >
                                    <option value="">{t('members.everywhere')}</option>
                                    {uniqueLocations.map(loc => (
                                        <option key={loc} value={loc as string}>{loc}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] uppercase text-neutral-500 font-bold mb-3 flex items-center gap-2 tracking-[0.1em]">
                                    <Sparkles className="w-3.5 h-3.5" /> {t('members.desire_label')}
                                </label>
                                <select
                                    value={filterDesire}
                                    onChange={(e) => setFilterDesire(e.target.value)}
                                    className="w-full bg-black border border-neutral-800 text-neutral-300 text-xs p-3 focus:border-gold-600 outline-none rounded-lg font-serif"
                                >
                                    <option value="">{t('members.any_desire')}</option>
                                    {COMMON_DESIRES.map(d => (
                                        <option key={d} value={d}>{d}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="col-span-2 flex flex-col justify-center gap-4">
                                <label className="flex items-center gap-4 cursor-pointer group">
                                    <div className={`w-5 h-5 border rounded flex items-center justify-center transition-all ${filterVerified ? 'bg-gold-600 border-gold-600' : 'border-neutral-700 bg-black group-hover:border-neutral-500'}`}>
                                        {filterVerified && <CheckIcon className="w-4 h-4 text-black font-bold" />}
                                    </div>
                                    <input type="checkbox" className="hidden" checked={filterVerified} onChange={() => setFilterVerified(!filterVerified)} />
                                    <span className={`text-xs uppercase font-bold tracking-widest transition-colors ${filterVerified ? 'text-gold-500 font-black' : 'text-neutral-500 group-hover:text-neutral-300'}`}>{t('members.only_verified')}</span>
                                </label>

                                <label className="flex items-center gap-4 cursor-pointer group">
                                    <div className={`w-5 h-5 border rounded flex items-center justify-center transition-all ${filterWithVault ? 'bg-gold-600 border-gold-600' : 'border-neutral-700 bg-black group-hover:border-neutral-500'}`}>
                                        {filterWithVault && <CheckIcon className="w-4 h-4 text-black font-bold" />}
                                    </div>
                                    <input type="checkbox" className="hidden" checked={filterWithVault} onChange={() => setFilterWithVault(!filterWithVault)} />
                                    <span className={`text-xs uppercase font-bold tracking-widest transition-colors ${filterWithVault ? 'text-gold-500 font-black' : 'text-neutral-500 group-hover:text-neutral-300'}`}>{t('members.only_with_vault')}</span>
                                </label>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredUsers.length === 0 ? (
                    <div className="col-span-full text-center py-32 text-neutral-600 italic font-serif border border-dashed border-neutral-900 bg-neutral-950/20 rounded-2xl">
                        {t('members.no_results')}
                    </div>
                ) : (
                    filteredUsers.map(user => {
                        const boosted = isBoostActive(user.boostUntil);
                        const isMe = user.id === currentUser.id;

                        return (
                            <div
                                key={user.id}
                                className={`group bg-neutral-900/40 border transition-all duration-500 relative overflow-hidden flex flex-col h-full rounded-2xl ${boosted
                                    ? 'border-crimson-600/50 shadow-[0_0_30px_rgba(220,38,38,0.2)] scale-[1.03] z-10 bg-gradient-to-br from-neutral-900/60 to-black/60'
                                    : 'border-neutral-800 hover:border-crimson-900/40 hover:shadow-[0_10px_40px_rgba(0,0,0,0.5)] hover:-translate-y-1'
                                    }`}
                            >
                                {boosted && (
                                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-crimson-600 via-white to-crimson-600 animate-pulse z-20"></div>
                                )}

                                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-neutral-800/10 to-transparent transform rotate-45 translate-x-12 -translate-y-12 group-hover:from-crimson-900/20 transition-all duration-700"></div>

                                <div className="p-8 flex items-start gap-6">
                                    <div className="relative cursor-pointer group/avatar" onClick={() => setSelectedUser(user)}>
                                        <div className={`absolute -inset-1.5 rounded-full opacity-0 group-hover/avatar:opacity-100 transition-opacity blur-md ${boosted ? 'bg-crimson-600' : 'bg-crimson-900/30'}`}></div>
                                        <img
                                            src={user.avatar}
                                            alt={user.name}
                                            className={`relative w-16 h-16 rounded-full object-cover border-2 shadow-xl transition-all duration-500 ${boosted ? 'border-crimson-600' : 'border-neutral-800 group-hover:border-crimson-900/50'}`}
                                        />
                                        {user.isVerified && (
                                            <div className="absolute -bottom-0.5 -right-0.5 bg-neutral-950 rounded-full p-1 border border-gold-900 shadow-xl" title={t('members.verified_user')}>
                                                <ShieldCheck className="w-4 h-4 text-gold-500" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2.5 mb-2">
                                            <h3 className={`text-xl font-serif truncate group-hover:text-crimson-500 transition-colors cursor-pointer ${boosted ? 'text-white font-bold' : 'text-neutral-200'}`} onClick={() => setSelectedUser(user)}>
                                                {user.name}
                                            </h3>
                                            {boosted && <Flame className="w-4 h-4 text-crimson-500 animate-pulse fill-current" />}
                                            {isMe && <span className="text-[9px] bg-crimson-900 text-white px-2 py-0.5 rounded-full uppercase font-bold tracking-widest border border-crimson-700">Tu</span>}
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2 mb-3">
                                            <span className={`text-[9px] uppercase font-black tracking-[0.15em] px-2 py-1 border rounded-md ${user.role === UserRole.COUPLE ? 'text-purple-400 border-purple-900/30 bg-purple-900/10' :
                                                user.role === UserRole.SINGLE_FEMALE ? 'text-pink-400 border-pink-900/30 bg-pink-900/10' :
                                                    'text-blue-400 border-blue-900/30 bg-blue-900/10'
                                                }`}>
                                                {t(`roles.${user.role}`)}
                                            </span>
                                            {boosted && (
                                                <span className="text-[9px] bg-crimson-900 text-white px-2 py-1 rounded border border-crimson-500 font-bold uppercase tracking-[0.15em]">BOOST</span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-3">
                                            {user.trustScore && user.trustScore > 0 ? (
                                                <div className="flex items-center gap-1.5 bg-black/40 w-fit px-2.5 py-1 border border-gold-900/30 rounded-full">
                                                    <Shield className="w-3 h-3 text-gold-500 fill-current" />
                                                    <span className="text-[10px] text-gold-400 font-black">{user.trustScore}</span>
                                                </div>
                                            ) : null}
                                            {user.location && (
                                                <p className="text-[10px] text-neutral-500 truncate flex items-center gap-1.5 font-sans tracking-wide"><MapPin className="w-3 h-3 text-neutral-700" />{user.location}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="px-8 pb-6 flex-1">
                                    <p className="text-sm text-neutral-400 italic line-clamp-3 font-serif mb-6 min-h-[60px] leading-relaxed">
                                        {user.bio ? `"${user.bio}"` : <span className="text-neutral-700 not-italic opacity-50">{t('members.no_bio')}</span>}
                                    </p>

                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {user.desires?.slice(0, 3).map(tag => (
                                            <span key={tag} className="text-[9px] uppercase tracking-widest text-neutral-500 bg-neutral-950 border border-neutral-800 px-3 py-1.5 rounded-full group-hover:border-crimson-900/20 transition-colors">
                                                {tag}
                                            </span>
                                        ))}
                                        {user.desires && user.desires.length > 3 && (
                                            <span className="text-[9px] text-neutral-700 font-bold px-2 py-1.5">+{user.desires.length - 3}</span>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-auto border-t border-neutral-900/50 p-6 bg-black/20 flex gap-3">
                                    <button
                                        className="flex-1 py-3 bg-neutral-950 hover:bg-neutral-900 text-neutral-500 hover:text-white border border-neutral-800 transition-all uppercase text-[10px] font-black tracking-[0.2em] flex items-center justify-center gap-2 hover:border-neutral-600 rounded-lg"
                                        onClick={() => setSelectedUser(user)}
                                    >
                                        <Info className="w-4 h-4" /> {t('members.view_profile')}
                                    </button>
                                    {!isMe && (
                                        <button
                                            className="flex-1 py-3 bg-crimson-950/30 hover:bg-crimson-900 text-crimson-500 hover:text-white border border-crimson-900/30 hover:border-crimson-600 transition-all uppercase text-[10px] font-black tracking-[0.2em] flex items-center justify-center gap-2 rounded-lg"
                                            onClick={() => handleOpenChatInternal(user)}
                                        >
                                            <MessageSquare className="w-4 h-4" /> {t('members.message_btn')}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* MEMBER PROFILE MODAL */}
            {selectedUser && (
                <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center p-4">
                    <div className="bg-neutral-950 border border-neutral-800 w-full max-w-4xl shadow-[0_0_100px_rgba(0,0,0,1)] relative animate-fade-in max-h-[92vh] overflow-hidden flex flex-col rounded-2xl">
                        <button onClick={() => setSelectedUser(null)} className="absolute top-6 right-6 text-neutral-500 hover:text-white z-20 transition-colors bg-black/50 p-2 rounded-full hover:bg-crimson-900/50">
                            <X className="w-7 h-7" />
                        </button>

                        <div className="relative h-64 flex-shrink-0">
                            <div className="absolute inset-0 bg-gradient-to-b from-neutral-800/20 via-neutral-950 to-neutral-950 overflow-hidden">
                                <img src={selectedUser.avatar} className="w-full h-full object-cover blur-3xl opacity-20 scale-150" alt="blur" />
                                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')] opacity-30"></div>
                            </div>

                            <div className="absolute -bottom-12 left-10 flex items-end gap-6">
                                <div className="relative">
                                    <div className={`absolute -inset-2 rounded-full blur-lg opacity-40 ${isBoostActive(selectedUser.boostUntil) ? 'bg-crimson-600 animate-pulse' : 'bg-crimson-900/30'}`}></div>
                                    <img src={selectedUser.avatar} alt={selectedUser.name} className={`relative w-32 h-32 rounded-full border-4 shadow-2xl object-cover ${isBoostActive(selectedUser.boostUntil) ? 'border-crimson-600' : 'border-neutral-950'}`} />
                                    {isBoostActive(selectedUser.boostUntil) && (
                                        <div className="absolute -top-1 -right-1 bg-crimson-600 text-white rounded-full p-2 border-2 border-neutral-950 shadow-xl">
                                            <Flame className="w-5 h-5 fill-current" />
                                        </div>
                                    )}
                                </div>
                                {selectedUser.isVerified && (
                                    <div className="mb-4 -ml-4 bg-neutral-950 rounded-full p-1.5 border border-gold-600 shadow-2xl relative z-10">
                                        <ShieldCheck className="w-6 h-6 text-gold-500" />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="pt-20 px-10 pb-10 flex-1 overflow-y-auto custom-scrollbar">
                            <div className="flex flex-col lg:flex-row justify-between items-start mb-12 gap-8 sticky top-0 bg-neutral-950/80 backdrop-blur-md pt-2 pb-6 z-10 border-b border-neutral-900/50">
                                <div>
                                    <h2 className="text-4xl font-serif text-white tracking-tight flex items-center gap-4">
                                        {selectedUser.name}
                                        {selectedUser.id === currentUser.id && <span className="text-xs bg-neutral-900 text-neutral-500 px-3 py-1 rounded-full uppercase tracking-widest border border-neutral-800 font-bold">(TU)</span>}
                                    </h2>
                                    <div className="flex flex-wrap items-center gap-4 mt-3">
                                        <p className="text-crimson-500 text-[10px] uppercase tracking-[0.25em] font-black flex items-center gap-2">
                                            {t(`roles.${selectedUser.role}`)}
                                            {isBoostActive(selectedUser.boostUntil) && <span className="bg-crimson-900 text-white px-2 py-0.5 rounded text-[8px] animate-pulse">PROFILE BOOSTED</span>}
                                        </p>
                                        <div className="w-1.5 h-1.5 rounded-full bg-neutral-800"></div>
                                        {selectedUser.location && <p className="text-neutral-500 text-[11px] font-mono tracking-widest uppercase flex items-center gap-2"><MapPin className="w-3.5 h-3.5" /> {selectedUser.location}</p>}
                                    </div>

                                    {selectedUser.trustScore !== undefined && (
                                        <div className="flex items-center gap-3 mt-6 text-gold-400 bg-gold-950/10 w-fit px-4 py-1.5 border border-gold-900/30 rounded-full shadow-lg">
                                            <Shield className="w-4 h-4 fill-current" />
                                            <span className="text-xs font-black tracking-widest uppercase">Trust Level: {selectedUser.trustScore}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-3">
                                    {selectedUser.id !== currentUser.id && (
                                        <>
                                            <button
                                                onClick={() => setTippingUser(selectedUser)}
                                                className="px-6 py-3 uppercase font-black text-[10px] tracking-[0.2em] border border-yellow-700/50 text-yellow-500 hover:bg-yellow-900/30 shadow-xl flex items-center gap-2.5 transition-all rounded-lg group"
                                            >
                                                <Coins className="w-4 h-4 group-hover:scale-110 transition-transform" /> {t('chat.send_tip')}
                                            </button>
                                            <button
                                                onClick={handleToggleTrust}
                                                disabled={loadingTrust}
                                                className={`px-6 py-3 uppercase font-black text-[10px] tracking-[0.2em] border shadow-xl flex items-center gap-2.5 transition-all rounded-lg ${hasEndorsed ? 'bg-gold-900/20 text-gold-400 border-gold-700/50 hover:bg-red-900/20 hover:text-red-400 hover:border-red-700' : 'bg-neutral-900/50 text-neutral-400 border-neutral-800 hover:border-gold-500 hover:text-gold-400'}`}
                                            >
                                                {loadingTrust ? <Loader className="w-4 h-4 animate-spin" /> : hasEndorsed ? <Shield className="w-4 h-4 fill-current" /> : <ThumbsUp className="w-4 h-4" />}
                                                {hasEndorsed ? t('members.endorsed_btn') : t('members.endorse_btn')}
                                            </button>
                                            <button
                                                onClick={() => { handleOpenChatInternal(selectedUser); setSelectedUser(null); }}
                                                className="bg-crimson-900 text-white px-8 py-3 bg-gradient-to-r from-crimson-900 to-crimson-800 uppercase font-black text-[10px] tracking-[0.2em] hover:brightness-125 border border-crimson-600/50 shadow-[0_10px_30px_rgba(220,38,38,0.3)] flex items-center gap-2.5 transition-all rounded-lg"
                                            >
                                                <MessageSquare className="w-4 h-4" /> {t('members.message_btn')}
                                            </button>

                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleReport(selectedUser.id)}
                                                    className="p-3 border border-neutral-800 text-neutral-600 hover:text-red-500 hover:border-red-900 transition-all rounded-lg bg-neutral-950"
                                                    title={t('members.report_btn')}
                                                >
                                                    <Flag className="w-4 h-4" />
                                                </button>

                                                <button
                                                    onClick={() => handleBlock(selectedUser.id)}
                                                    className="p-3 border border-neutral-800 text-neutral-600 hover:text-red-500 hover:border-red-900 transition-all rounded-lg bg-neutral-950"
                                                    title={t('members.block_user_btn')}
                                                >
                                                    <UserX className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-16">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                                    <div>
                                        <h3 className="text-[10px] uppercase text-neutral-600 mb-6 tracking-[0.3em] font-black border-b border-neutral-900 pb-3 flex items-center justify-between">
                                            {t('profile_editor.details.bio_label')}
                                            <div className="h-0.5 w-12 bg-crimson-900/50"></div>
                                        </h3>
                                        <p className="text-neutral-200 font-serif text-xl leading-loose italic opacity-90 first-letter:text-4xl first-letter:font-black first-letter:text-crimson-800 first-letter:mr-1 first-letter:float-left">
                                            {selectedUser.bio ? `"${selectedUser.bio}"` : t('members.no_bio_available')}
                                        </p>
                                    </div>
                                    <div className="space-y-10">
                                        <div>
                                            <h3 className="text-[10px] uppercase text-green-700/80 mb-4 tracking-[0.3em] font-black flex items-center gap-3">
                                                <Sparkles className="w-4 h-4" /> {t('profile_editor.details.desires_label')}
                                            </h3>
                                            <div className="flex flex-wrap gap-3">
                                                {selectedUser.desires && selectedUser.desires.length > 0 ? (
                                                    selectedUser.desires.map(tag => (
                                                        <span key={tag} className="text-[11px] uppercase font-bold tracking-widest bg-green-950/10 text-green-500 border border-green-900/30 px-4 py-2 rounded-lg">
                                                            {tag}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-neutral-800 text-xs italic">{t('members.no_desires')}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="text-[10px] uppercase text-crimson-700/80 mb-4 tracking-[0.3em] font-black flex items-center gap-3">
                                                <ShieldCheck className="w-4 h-4" /> {t('profile_editor.details.limits_label')}
                                            </h3>
                                            <div className="flex flex-wrap gap-3">
                                                {selectedUser.limits && selectedUser.limits.length > 0 ? (
                                                    selectedUser.limits.map(tag => (
                                                        <span key={tag} className="text-[11px] uppercase font-bold tracking-widest bg-crimson-950/10 text-crimson-500 border border-crimson-900/30 px-4 py-2 rounded-lg">
                                                            {tag}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-neutral-800 text-xs italic">{t('members.no_limits')}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-gradient-to-br from-neutral-900/40 via-black/40 to-neutral-950 border border-neutral-800/50 p-10 relative overflow-hidden rounded-3xl group/vault shadow-2xl">
                                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover/vault:opacity-20 transition-opacity">
                                        <Lock className="w-24 h-24 text-neutral-500" />
                                    </div>

                                    <div className="relative z-10 mb-10">
                                        <h3 className="text-2xl font-serif text-white mb-2 flex items-center gap-4">
                                            The Vault <span className="text-[10px] bg-crimson-950 text-crimson-500 px-3 py-1 rounded-full border border-crimson-900/50 font-sans tracking-[0.2em] font-black">PRIVATE ACCESS</span>
                                        </h3>
                                        <p className="text-neutral-600 text-xs uppercase tracking-widest">
                                            {t('members.gallery_desc')}
                                        </p>
                                    </div>

                                    {selectedUser.gallery && selectedUser.gallery.length > 0 ? (
                                        <div className="relative z-10">
                                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                                {selectedUser.gallery.map((item, i) => {
                                                    const isOwner = selectedUser.id === currentUser.id;
                                                    const isUnlocked = item.price === 0 || isPhotoUnlocked(item.id) || isOwner;
                                                    const isLink = item.type === 'LINK';

                                                    return (
                                                        <div
                                                            key={i}
                                                            className={`aspect-square bg-neutral-950 relative group/photo overflow-hidden border border-neutral-800 rounded-xl transition-all ${isUnlocked && !isLink ? 'cursor-zoom-in' : isUnlocked && isLink ? 'cursor-pointer' : ''} ${!isUnlocked ? 'hover:border-gold-900/50' : 'hover:border-crimson-900/50'}`}
                                                            onClick={() => {
                                                                if (isUnlocked) {
                                                                    if (isLink) {
                                                                        window.open(item.url.startsWith('http') ? item.url : `https://${item.url}`, '_blank');
                                                                    } else {
                                                                        setFullScreenPhoto(item.url);
                                                                    }
                                                                }
                                                            }}
                                                        >
                                                            {isLink ? (
                                                                <div className={`w-full h-full flex flex-col items-center justify-center p-4 text-center transition-all duration-500 ${isUnlocked ? 'bg-crimson-900/10 group-hover:bg-crimson-900/20' : 'blur-sm opacity-40'}`}>
                                                                    <Globe className={`w-10 h-10 mb-2 ${isUnlocked ? 'text-crimson-500' : 'text-neutral-500'}`} />
                                                                    <p className="text-[10px] text-white font-bold uppercase tracking-widest truncate max-w-full px-2">
                                                                        {isUnlocked ? item.url.replace(/^https?:\/\//, '').split('/')[0] : 'Private Link'}
                                                                    </p>
                                                                    {isUnlocked && (
                                                                        <span className="text-[8px] mt-2 bg-crimson-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                                                                            <ChevronRight className="w-2 h-2" /> {t('members.view_profile')}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <img
                                                                    src={item.url}
                                                                    className={`w-full h-full object-cover transition-all duration-[1.5s] ease-in-out ${isUnlocked ? 'group-hover/photo:scale-110' : 'blur-2xl opacity-40 grayscale scale-110'}`}
                                                                    alt="Vault Photo"
                                                                />
                                                            )}

                                                            {isUnlocked && !isLink && (
                                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center justify-center">
                                                                    <div className="bg-white/10 backdrop-blur-md rounded-full p-3 border border-white/20">
                                                                        <Eye className="w-5 h-5 text-white" />
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {!isUnlocked && (
                                                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-10 p-4 text-center">
                                                                    <Lock className="w-6 h-6 text-gold-600 mb-2 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]" />
                                                                    <div className="flex items-center gap-1.5 bg-black/80 px-3 py-1.5 rounded-full border border-gold-900/50 mb-3 shadow-xl">
                                                                        <Coins className="w-3.5 h-3.5 text-gold-500" />
                                                                        <span className="text-white font-black text-xs">{item.price}</span>
                                                                    </div>
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); setPhotoToBuy(item); }}
                                                                        className="w-full text-[10px] bg-gold-600 hover:bg-gold-500 text-black font-black py-2 uppercase rounded-lg transition-all shadow-[0_5px_15px_rgba(234,179,8,0.3)] hover:scale-105 active:scale-95"
                                                                    >
                                                                        {t('profile_editor.vault.pay_per_view')}
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-16 border-2 border-dashed border-neutral-900 text-neutral-800 text-[10px] uppercase tracking-[0.5em] font-black relative z-10 rounded-2xl bg-black/30">
                                            {t('members.empty_gallery')}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TIPPING MODAL */}
            {tippingUser && (
                <div className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6 animate-fade-in">
                    <div className="bg-neutral-950 border border-yellow-600/50 w-full max-w-sm shadow-[0_0_100px_rgba(234,179,8,0.1)] relative p-10 text-center rounded-3xl">
                        <div className="bg-yellow-900/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border border-yellow-700/30">
                            <Coins className="w-10 h-10 text-yellow-500" />
                        </div>
                        <h3 className="text-3xl font-serif text-white mb-3">{t('chat.send_tip')}</h3>
                        <p className="text-neutral-500 text-sm mb-10 leading-relaxed">
                            {t('chat.select_tip_amount', { name: tippingUser.name })}
                        </p>

                        <div className="grid grid-cols-3 gap-4 mb-8">
                            {[10, 50, 100].map(amt => (
                                <button
                                    key={amt}
                                    onClick={() => handleSendTip(amt)}
                                    disabled={sendingTip}
                                    className="py-4 bg-neutral-900 border border-neutral-800 hover:border-yellow-600 hover:text-yellow-500 text-white font-black rounded-xl transition-all hover:scale-105 hover:bg-yellow-950/20 active:scale-95"
                                >
                                    {amt} <span className="text-[10px] opacity-50 block mt-1">CR</span>
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => setTippingUser(null)}
                            className="text-neutral-600 hover:text-white text-xs uppercase font-black tracking-widest transition-colors py-2"
                        >
                            {t('common.cancel')}
                        </button>
                    </div>
                </div>
            )}

            {/* RECHARGE MODAL */}
            {showRechargeModal && (
                <div className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6 animate-fade-in">
                    <div className="bg-neutral-950 border border-gold-600/50 w-full max-w-sm shadow-[0_0_100px_rgba(234,179,8,0.1)] relative p-10 text-center rounded-3xl">
                        <div className="bg-gold-900/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border border-gold-700/30">
                            <Lock className="w-10 h-10 text-gold-500" />
                        </div>
                        <h3 className="text-3xl font-serif text-white mb-3">{t('chat.insufficient_credits')}</h3>
                        <p className="text-neutral-500 text-sm mb-10">
                            {t('members.not_enough_credits_desc')}
                        </p>

                        <div className="space-y-4">
                            <button
                                onClick={() => window.open('https://ko-fi.com/velvetcircle', '_blank')}
                                className="w-full bg-gold-600 hover:bg-gold-500 text-black font-black py-4 rounded-xl uppercase tracking-widest shadow-2xl transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3"
                            >
                                <CreditCard className="w-5 h-5" /> {t('membership.buy_credits')}
                            </button>
                            <button
                                onClick={() => setShowRechargeModal(false)}
                                className="w-full text-neutral-600 hover:text-white text-xs uppercase font-black tracking-widest py-3 transition-colors"
                            >
                                {t('common.cancel')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* FULL SCREEN PHOTO PREVIEW */}
            {fullScreenPhoto && (
                <div className="fixed inset-0 z-[100] bg-black/98 backdrop-blur-2xl flex items-center justify-center p-4 animate-fade-in cursor-zoom-out" onClick={() => setFullScreenPhoto(null)}>
                    <button className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors bg-white/5 p-3 rounded-full">
                        <X className="w-8 h-8" />
                    </button>
                    <img src={fullScreenPhoto} className="max-w-full max-h-[90vh] object-contain shadow-[0_0_100px_rgba(0,0,0,1)] rounded-lg animate-scale-up" alt="Preview" />
                </div>
            )}

            {/* PHOTO/LINK BUY CONFIRMATION */}
            {photoToBuy && (
                <div className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6 animate-fade-in">
                    <div className="bg-neutral-950 border border-gold-600/50 w-full max-w-sm shadow-[0_0_100px_rgba(234,179,8,0.1)] relative p-10 text-center rounded-3xl">
                        <div className="aspect-square w-32 h-32 mx-auto mb-8 rounded-2xl overflow-hidden border border-neutral-800 shadow-2xl relative">
                            {photoToBuy.type === 'LINK' ? (
                                <div className="w-full h-full flex items-center justify-center bg-neutral-900">
                                    <Globe className="w-16 h-16 text-crimson-600" />
                                </div>
                            ) : (
                                <>
                                    <img src={photoToBuy.url} className="w-full h-full object-cover blur-lg opacity-40" alt="blur" />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <ShoppingCart className="w-10 h-10 text-gold-500" />
                                    </div>
                                </>
                            )}
                        </div>
                        <h3 className="text-3xl font-serif text-white mb-3">
                            {photoToBuy.type === 'LINK' ? t('members.unlock_item_title') : t('members.unlock_photo_title')}
                        </h3>
                        <p className="text-neutral-500 text-sm mb-10">
                            {photoToBuy.type === 'LINK'
                                ? t('members.unlock_link_desc', { price: photoToBuy.price })
                                : t('members.unlock_photo_desc', { price: photoToBuy.price })}
                        </p>

                        <div className="space-y-4">
                            <button
                                onClick={handleBuyPhoto}
                                disabled={buyingPhoto}
                                className="w-full bg-gold-600 hover:bg-gold-500 disabled:opacity-50 text-black font-black py-4 rounded-xl uppercase tracking-widest shadow-2xl transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3"
                            >
                                {buyingPhoto ? <Loader className="w-5 h-5 animate-spin" /> : <Key className="w-5 h-5" />}
                                {t('members.confirm_unlock_btn')}
                            </button>
                            <button
                                onClick={() => setPhotoToBuy(null)}
                                className="w-full text-neutral-600 hover:text-white text-xs uppercase font-black tracking-widest py-3 transition-colors"
                            >
                                {t('common.cancel')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Members;
