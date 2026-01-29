import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { User, InviteCode } from '../../types';
import { api } from '../../services/db';
import { Crown, Check, Star, Gem, Heart, RefreshCw, CalendarClock, Key, Copy, Coins, CreditCard, ArrowRight, Wallet, X, AlertTriangle, Radar } from 'lucide-react';

interface MembershipProps {
    currentUser: User;
    onRefreshUser: () => Promise<void>;
}

const Membership: React.FC<MembershipProps> = ({ currentUser, onRefreshUser }) => {
    const { t } = useTranslation();
    const [refreshing, setRefreshing] = useState(false);
    const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
    const [generatingCode, setGeneratingCode] = useState(false);

    // State for Payout Modal
    const [showPayoutModal, setShowPayoutModal] = useState(false);
    const [payPalEmail, setPayPalEmail] = useState('');
    const [isSubmittingPayout, setIsSubmittingPayout] = useState(false);

    useEffect(() => {
        if (currentUser.isVip) {
            loadCodes();
        }
    }, [currentUser]);

    const loadCodes = async () => {
        const codes = await api.getMyInviteCodes();
        setInviteCodes(codes);
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            await onRefreshUser();
        } catch (e) {
            console.error(e);
        } finally {
            setTimeout(() => setRefreshing(false), 800);
        }
    };

    const generateInvite = async () => {
        setGeneratingCode(true);
        try {
            await api.generateInviteCode();
            await loadCodes();
        } catch (e) {
            console.error(e);
            alert(t('membership.errors.limit_reached'));
        } finally {
            setGeneratingCode(false);
        }
    };

    const copyToClipboard = (code: string) => {
        navigator.clipboard.writeText(code);
        alert(t('membership.errors.copy_success'));
    };

    const handlePayoutRequest = async () => {
        if (!payPalEmail || !payPalEmail.includes('@')) {
            alert(t('membership.errors.invalid_paypal'));
            return;
        }
        setIsSubmittingPayout(true);
        try {
            await api.requestPayout(payPalEmail);
            alert(t('membership.errors.request_success'));
            setShowPayoutModal(false);
            setPayPalEmail('');
        } catch (e: any) {
            console.error(e);
            alert(e.message || t('membership.errors.request_error'));
        } finally {
            setIsSubmittingPayout(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto pb-20">

            {/* Header */}
            <div className="text-center mb-16">
                <Gem className="w-16 h-16 text-gold-500 mx-auto mb-6 animate-pulse" />
                <h2 className="text-4xl md:text-5xl font-serif text-transparent bg-clip-text bg-gradient-to-r from-gold-400 via-yellow-200 to-gold-600 mb-4">
                    {t('membership.title')}
                </h2>
                <p className="text-neutral-400 font-serif italic max-w-xl mx-auto">
                    {t('membership.subtitle')}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start mb-16">

                {/* VIP Card - Redesigned as a Premium Invitation */}
                <div className="relative group overflow-hidden rounded-2xl bg-gradient-to-br from-neutral-900 via-neutral-950 to-black border border-gold-600/30 p-8 shadow-2xl transition-all duration-700 hover:border-gold-500/60 flex flex-col items-center">
                    {/* Background Decorative Element */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gold-600/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-gold-600/10 transition-colors"></div>
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-gold-600/5 blur-3xl rounded-full -ml-16 -mb-16 group-hover:bg-gold-600/10 transition-colors"></div>

                    <div className="relative z-10 flex flex-col items-center w-full">
                        <div className="bg-gold-600/10 p-3 rounded-full mb-4 border border-gold-600/20 shadow-[0_0_15px_rgba(234,179,8,0.1)] group-hover:scale-110 transition-transform duration-500">
                            <Crown className="w-8 h-8 text-gold-500 fill-current" />
                        </div>

                        <h3 className="text-xl font-serif text-white uppercase tracking-[0.3em] text-center mb-2">
                            {t('membership.vip_access')}
                        </h3>
                        <div className="h-0.5 w-12 bg-gold-600/40 mb-6"></div>

                        <div className="flex items-baseline gap-2 mb-8">
                            <span className="text-5xl font-serif text-white tracking-tighter">€5</span>
                            <span className="text-gold-500/60 uppercase text-[9px] font-bold tracking-widest">{t('membership.per_month')}</span>
                        </div>

                        <div className="w-full space-y-4 mb-10">
                            {[
                                { icon: Radar, text: t('membership.vip_features.radar_tracking') },
                                { icon: Star, text: t('membership.vip_features.velvet_key') },
                                { icon: Star, text: t('membership.vip_features.shadows') },
                                { icon: Crown, text: t('membership.vip_features.badge') }
                            ].map((feature, idx) => (
                                <div key={idx} className="flex items-start gap-3 group/item">
                                    <feature.icon className="w-3.5 h-3.5 text-gold-500 mt-0.5 group-hover/item:scale-125 transition-transform" />
                                    <span className="text-[11px] text-neutral-400 font-serif leading-relaxed line-clamp-2">
                                        {feature.text.includes(':') ? (
                                            <><strong>{feature.text.split(':')[0]}</strong>{feature.text.split(':')[1]}</>
                                        ) : feature.text}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {currentUser.isVip ? (
                            <div className="w-full space-y-4">
                                <div className="py-3 px-6 bg-gold-600/5 border border-gold-600/30 rounded-lg flex items-center justify-center gap-2 group/btn relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gold-600/5 group-hover/btn:translate-x-full transition-transform duration-1000"></div>
                                    <Crown className="w-4 h-4 text-gold-500 fill-current" />
                                    <span className="text-[10px] text-gold-500 uppercase font-black tracking-widest leading-none">
                                        {t('membership.already_vip')}
                                    </span>
                                </div>
                                {currentUser.vipUntil && (
                                    <div className="text-center opacity-60">
                                        <span className="text-[8px] text-neutral-500 uppercase tracking-[0.2em] block mb-1">Membership Ends</span>
                                        <span className="text-[11px] text-white font-serif italic">
                                            {new Date(currentUser.vipUntil).toLocaleDateString()}
                                        </span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <a
                                href='https://ko-fi.com/s/00fd0caa74'
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full py-4 bg-white text-black font-serif uppercase tracking-[0.2em] text-xs font-bold rounded-lg hover:bg-gold-500 hover:text-black transition-all duration-300 shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex items-center justify-center gap-3 active:scale-95"
                            >
                                <Heart className="w-3.5 h-3.5 fill-current" /> {t('membership.activate_vip')}
                            </a>
                        )}
                    </div>
                </div>

                {/* Credits Section - Redesigned as a Refined List */}
                <div className="bg-neutral-900/30 backdrop-blur-md rounded-2xl border border-neutral-800 p-8 flex flex-col items-center relative transition-all duration-300">
                    <div className="absolute top-0 right-8 -translate-y-1/2 bg-neutral-900 border border-neutral-800 px-4 py-1.5 flex items-center gap-2 rounded-full">
                        <div className="w-2 h-2 rounded-full bg-gold-500 animate-pulse"></div>
                        <span className="text-[9px] uppercase font-black tracking-widest text-neutral-400">Secure Store</span>
                    </div>

                    <div className="w-full mb-8">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex flex-col">
                                <span className="text-gold-500 text-[9px] uppercase font-black tracking-[0.3em] mb-1">{t('membership.current_balance')}</span>
                                <div className="flex items-center gap-3">
                                    <span className="text-4xl font-serif text-white">{currentUser.credits}</span>
                                    <Coins className="w-5 h-5 text-gold-500" />
                                </div>
                            </div>
                            <button
                                onClick={handleRefresh}
                                className="p-3 bg-neutral-800/50 hover:bg-neutral-800 rounded-xl transition-colors group"
                                title="Refresh Balance"
                            >
                                <RefreshCw className={`w-4 h-4 text-neutral-500 group-hover:text-white transition-all ${refreshing ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                        <div className="h-px bg-neutral-800/50 w-full"></div>
                    </div>

                    <div className="w-full space-y-3">
                        {[
                            { amount: 10, bonus: 0, price: '€10', link: 'https://ko-fi.com/s/f4ec730844', tier: 'Starter', icon: Coins, color: 'text-amber-500/60' },
                            { amount: 21, bonus: 1, price: '€20', link: 'https://ko-fi.com/s/5e4bbc60c9', tier: 'Silver', icon: CreditCard, color: 'text-slate-400', popular: true },
                            { amount: 32, bonus: 2, price: '€30', link: 'https://ko-fi.com/s/01e0915950', tier: 'Gold', icon: Star, color: 'text-yellow-500' },
                            { amount: 44, bonus: 4, price: '€40', link: 'https://ko-fi.com/s/24bc25a629', tier: 'Platinum', icon: Gem, color: 'text-cyan-400' },
                            { amount: 56, bonus: 6, price: '€50', link: 'https://ko-fi.com/s/fa098d3767', tier: 'Diamond', icon: Crown, color: 'text-gold-400', special: true },
                        ].map((pkg) => (
                            <a
                                key={pkg.amount}
                                href={pkg.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group/row relative flex items-center justify-between p-4 bg-neutral-900/40 hover:bg-neutral-800/40 border border-neutral-800 hover:border-gold-600/30 rounded-xl transition-all duration-300"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-black/40 border border-white/5 flex items-center justify-center group-hover/row:scale-110 transition-transform">
                                        <pkg.icon className={`w-5 h-5 ${pkg.color}`} />
                                    </div>
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg font-serif text-white tracking-tighter">{pkg.amount} Credits</span>
                                            {pkg.bonus > 0 && (
                                                <span className="text-[8px] bg-gold-600/10 text-gold-500 border border-gold-600/20 px-1.5 py-0.5 rounded font-black uppercase tracking-tighter shadow-sm">
                                                    +{pkg.bonus} Free
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-[9px] text-neutral-500 font-bold uppercase tracking-widest text-left">{pkg.tier} Pack</span>
                                    </div>
                                </div>

                                <div className="flex items-baseline gap-2">
                                    <span className="text-[10px] text-neutral-600 uppercase font-black group-hover/row:text-neutral-400 transition-colors">Price</span>
                                    <span className="text-xl font-serif text-white font-bold tracking-tighter group-hover/row:text-gold-500 transition-colors">{pkg.price}</span>
                                </div>

                                <div className="absolute right-0 top-1/2 -translate-y-1/2 -mr-1 opacity-0 group-hover/row:opacity-100 group-hover/row:mr-2 transition-all duration-300">
                                    <ArrowRight className="w-4 h-4 text-gold-500" />
                                </div>
                            </a>
                        ))}
                    </div>

                    <button
                        onClick={() => setShowPayoutModal(true)}
                        className="mt-6 flex items-center gap-2 text-[10px] text-neutral-500 uppercase font-bold tracking-[0.2em] hover:text-white transition-colors py-2 border-b border-white/0 hover:border-crimson-600/50"
                    >
                        <Wallet className="w-3.5 h-3.5" />
                        {t('membership.convert_to_euro')}
                    </button>

                    <p className="text-[9px] text-neutral-700 mt-4 text-center italic opacity-60">
                        * Credits may take up to 60 seconds to appear.
                    </p>
                </div>
            </div>


            <div className="text-center">
                <button
                    onClick={handleRefresh}
                    className="text-xs text-neutral-500 hover:text-white underline flex items-center justify-center gap-2 mx-auto"
                >
                    <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
                    {t('membership.refresh_status')}
                </button>
            </div>

            {/* THE VELVET KEY SECTION (VIP ONLY) */}
            {
                currentUser.isVip && (
                    <div className="bg-neutral-900/50 border border-gold-900/30 p-8 shadow-xl relative overflow-hidden mt-12">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Key className="w-24 h-24 text-gold-500" />
                        </div>

                        <h3 className="text-2xl font-serif text-white mb-2 flex items-center gap-2">
                            <Key className="w-6 h-6 text-gold-500" /> {t('membership.velvet_key_section.title')}
                        </h3>
                        <p className="text-neutral-400 text-sm mb-6 max-w-2xl">
                            {t('membership.velvet_key_section.desc')}
                        </p>

                        <div className="flex flex-wrap gap-4 mb-8">
                            {inviteCodes.map((invite) => (
                                <div key={invite.code} className={`flex items-center gap-3 p-3 border rounded ${invite.is_used ? 'bg-neutral-900 border-neutral-800 opacity-50' : 'bg-black border-gold-900/50'}`}>
                                    <span className={`font-mono font-bold ${invite.is_used ? 'text-neutral-500 line-through' : 'text-gold-400'}`}>
                                        {invite.code}
                                    </span>
                                    {!invite.is_used && (
                                        <button onClick={() => copyToClipboard(invite.code)} title="Copia">
                                            <Copy className="w-4 h-4 text-neutral-500 hover:text-white" />
                                        </button>
                                    )}
                                    <span className="text-[10px] uppercase text-neutral-600 ml-2">
                                        {invite.is_used ? t('membership.velvet_key_section.used') : t('membership.velvet_key_section.active')}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={generateInvite}
                            disabled={generatingCode}
                            className="px-6 py-3 bg-neutral-800 hover:bg-gold-900/30 text-gold-500 border border-gold-900/50 uppercase tracking-widest text-xs font-bold flex items-center gap-2 transition-all"
                        >
                            {generatingCode ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                            {t('membership.velvet_key_section.forge_key')}
                        </button>
                    </div>
                )
            }

            {/* PAYOUT MODAL */}
            {
                showPayoutModal && (
                    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
                        <div className="bg-neutral-950 border border-neutral-800 w-full max-w-md shadow-2xl relative p-8">
                            <button onClick={() => setShowPayoutModal(false)} className="absolute top-4 right-4 text-neutral-500 hover:text-white">
                                <X className="w-6 h-6" />
                            </button>

                            <h3 className="text-2xl font-serif text-white mb-2 flex items-center gap-2">
                                <Wallet className="w-6 h-6 text-crimson-600" /> {t('membership.payout_modal.title')}
                            </h3>
                            <p className="text-neutral-400 text-sm mb-6">
                                {t('membership.payout_modal.desc')}
                            </p>

                            <div className="bg-yellow-900/10 border border-yellow-900/30 p-4 mb-6">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                                    <p className="text-yellow-500/80 text-xs leading-relaxed">
                                        <strong>{t('membership.payout_modal.warning_title')}</strong> {t('membership.payout_modal.warning_text')}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs uppercase text-neutral-500 mb-2 font-bold tracking-wider">{t('membership.payout_modal.balance_label')}</label>
                                    <div className="text-white font-serif text-xl border-b border-neutral-800 pb-2">
                                        {currentUser.credits} {t('membership.credits_label')}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs uppercase text-neutral-500 mb-2 font-bold tracking-wider">{t('membership.payout_modal.paypal_email_label')}</label>
                                    <input
                                        type="email"
                                        value={payPalEmail}
                                        onChange={(e) => setPayPalEmail(e.target.value)}
                                        placeholder="esempio@email.com"
                                        className="w-full bg-black border border-neutral-700 text-white p-3 focus:border-crimson-700 outline-none"
                                    />
                                </div>

                                <button
                                    onClick={handlePayoutRequest}
                                    disabled={isSubmittingPayout}
                                    className="w-full py-4 bg-crimson-900 hover:bg-crimson-800 text-white font-serif uppercase tracking-widest text-xs font-bold flex items-center justify-center gap-2 transition-all mt-4 border border-crimson-700 disabled:opacity-50"
                                >
                                    {isSubmittingPayout ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                                    {t('membership.payout_modal.send_request')}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

        </div >
    );
};

export default Membership;
