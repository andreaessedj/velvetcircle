import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { User, InviteCode } from '../../types';
import { api } from '../../services/db';
import { Crown, Check, Star, Gem, Heart, RefreshCw, CalendarClock, Key, Copy, Coins, CreditCard, ArrowRight, Wallet, X, AlertTriangle } from 'lucide-react';

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

                {/* VIP Tier */}
                <div className="bg-gradient-to-b from-neutral-900 to-black border border-gold-600/50 p-8 flex flex-col items-center relative shadow-[0_0_50px_rgba(234,179,8,0.1)]">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gold-600 text-black px-4 py-1 uppercase text-[10px] font-bold tracking-widest shadow-lg">
                        {t('membership.membership_label')}
                    </div>

                    <h3 className="text-2xl font-serif text-gold-400 mb-6 uppercase tracking-widest flex items-center gap-2">
                        <Crown className="w-6 h-6 fill-current" /> {t('membership.vip_access')}
                    </h3>

                    <div className="text-center mb-8">
                        <span className="text-4xl font-serif text-white">€5.00</span>
                        <span className="text-neutral-500 text-sm block">{t('membership.per_month')}</span>
                    </div>

                    <ul className="space-y-4 text-sm text-neutral-300 w-full mb-10">
                        <li className="flex items-center gap-3"><Star className="w-4 h-4 text-gold-500 fill-current" /> <strong>{t('membership.vip_features.oracle').split(':')[0]}:</strong> {t('membership.vip_features.oracle').split(':')[1]}</li>
                        <li className="flex items-center gap-3"><Star className="w-4 h-4 text-gold-500 fill-current" /> <strong>{t('membership.vip_features.velvet_key').split(':')[0]}:</strong> {t('membership.vip_features.velvet_key').split(':')[1]}</li>
                        <li className="flex items-center gap-3"><Star className="w-4 h-4 text-gold-500 fill-current" /> <strong>{t('membership.vip_features.shadows').split(':')[0]}:</strong> {t('membership.vip_features.shadows').split(':')[1]}</li>
                        <li className="flex items-center gap-3"><Star className="w-4 h-4 text-gold-500 fill-current" /> {t('membership.vip_features.badge')}</li>
                    </ul>

                    {currentUser.isVip ? (
                        <div className="w-full text-center space-y-4">
                            <div className="w-full py-4 bg-gold-900/20 border border-gold-600 text-gold-500 uppercase tracking-widest text-xs font-bold flex items-center justify-center gap-2">
                                <Crown className="w-5 h-5 fill-current" /> {t('membership.already_vip')}
                            </div>

                            {currentUser.vipUntil && (
                                <div className="flex flex-col items-center gap-1">
                                    <span className="text-[10px] text-neutral-500 uppercase tracking-wider">{t('membership.expiry_label')}</span>
                                    <div className="text-white font-serif flex items-center gap-2">
                                        <CalendarClock className="w-4 h-4 text-neutral-400" />
                                        {new Date(currentUser.vipUntil).toLocaleDateString(t('common.date_locale', 'it-IT'), {
                                            day: 'numeric',
                                            month: 'long',
                                            year: 'numeric'
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="w-full text-center space-y-4">
                            <a
                                href='https://ko-fi.com/s/00fd0caa74'
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full py-4 bg-gold-600 hover:bg-gold-500 text-black font-serif uppercase tracking-widest text-sm font-bold flex items-center justify-center gap-3 transition-all shadow-[0_0_20px_rgba(234,179,8,0.4)]"
                            >
                                <Heart className="w-4 h-4 fill-current" /> {t('membership.activate_vip')}
                            </a>
                        </div>
                    )}
                </div>

                {/* CREDITS PACK */}
                <div className="bg-neutral-900/50 border border-neutral-800 p-8 flex flex-col items-center relative hover:border-yellow-600/50 transition-colors">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-neutral-800 text-yellow-500 px-4 py-1 uppercase text-[10px] font-bold tracking-widest border border-neutral-700">
                        {t('membership.recharge_label')}
                    </div>

                    <h3 className="text-2xl font-serif text-white mb-6 uppercase tracking-widest flex items-center gap-2">
                        <Coins className="w-6 h-6 text-yellow-500" /> {t('membership.credits_title')}
                    </h3>

                    <div className="text-center mb-8">
                        <div className="text-yellow-500 font-bold text-lg mb-2">{t('membership.current_balance')}</div>
                        <span className="text-5xl font-serif text-white">{currentUser.credits}</span>
                        <span className="text-neutral-500 text-sm block">{t('membership.credits_label')}</span>
                    </div>

                    <p className="text-sm text-neutral-400 text-center mb-8">
                        {t('membership.credits_desc')}
                    </p>

                    <div className="w-full space-y-3">
                        <div className="text-[10px] uppercase text-neutral-500 font-bold tracking-widest text-center mb-1">Seleziona Pacchetto</div>

                        <a
                            href='https://ko-fi.com/s/f4ec730844'
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-4 bg-neutral-800 hover:bg-yellow-900/30 text-yellow-500 border border-yellow-600/50 hover:border-yellow-500 font-serif uppercase tracking-widest text-sm font-bold flex items-center justify-center gap-3 transition-all group"
                        >
                            <div className="flex flex-col items-center">
                                <span className="flex items-center gap-2">
                                    <CreditCard className="w-4 h-4" /> 10 {t('membership.credits_label')}
                                </span>
                                <span className="text-[9px] text-neutral-500 group-hover:text-yellow-600/70 tracking-[0.2em] mt-0.5">Link Diretto Ko-fi</span>
                            </div>
                        </a>

                        <a
                            href='https://ko-fi.com/s/fa098d3767'
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-4 bg-yellow-950/20 hover:bg-yellow-900/30 text-gold-500 border border-gold-600/50 hover:border-gold-500 font-serif uppercase tracking-widest text-sm font-bold flex items-center justify-center gap-3 transition-all group shadow-[0_0_15px_rgba(234,179,8,0.1)]"
                        >
                            <div className="flex flex-col items-center">
                                <span className="flex items-center gap-2">
                                    <Gem className="w-4 h-4 text-gold-500" /> 50 {t('membership.credits_label')}
                                </span>
                                <span className="text-[9px] text-neutral-500 group-hover:text-gold-600/70 tracking-[0.2em] mt-0.5">Best Value • Ko-fi</span>
                            </div>
                        </a>

                        <button
                            onClick={() => setShowPayoutModal(true)}
                            className="w-full py-3 bg-transparent text-neutral-500 hover:text-white border border-neutral-800 hover:border-neutral-600 font-serif uppercase tracking-widest text-xs font-bold flex items-center justify-center gap-2 transition-all"
                        >
                            <Wallet className="w-4 h-4" /> {t('membership.convert_to_euro')}
                        </button>
                    </div>

                    <p className="text-[10px] text-neutral-600 mt-4 text-center">
                        {t('membership.secure_purchase_hint')}
                        <br />
                        <span className="opacity-50">I crediti potrebbero impiegare fino a 60 secondi per apparire. Se dopo aver ricaricato non appaiono, prova a cliccare "Aggiorna Stato" qui sotto.</span>
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
            {currentUser.isVip && (
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
            )}

            {/* PAYOUT MODAL */}
            {showPayoutModal && (
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
            )}

        </div>
    );
};

export default Membership;
