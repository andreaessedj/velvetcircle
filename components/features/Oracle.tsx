import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { User, DailyMatch } from '../../types';
import { api } from '../../services/db';
import { Sparkles, Lock, Heart, Timer, Ghost, MessageSquare } from 'lucide-react';

interface OracleProps {
    currentUser: User;
    onOpenChat: (user: { id: string, name: string, avatar: string }) => void;
}

const Oracle: React.FC<OracleProps> = ({ currentUser, onOpenChat }) => {
    const { t } = useTranslation();
    const [match, setMatch] = useState<DailyMatch | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadMatch = async () => {
            if (currentUser.isVip) {
                const data = await api.getDailyMatch(currentUser);
                setMatch(data);
            }
            setLoading(false);
        };
        loadMatch();
    }, [currentUser]);

    return (
        <div className="max-w-4xl mx-auto py-10 px-6">
            <div className="mb-12 text-center">
                <Sparkles className="w-12 h-12 text-gold-500 mx-auto mb-4 animate-pulse" />
                <h2 className="text-4xl font-serif text-white mb-4">{t('oracle.title')}</h2>
                <p className="text-neutral-500 leading-relaxed max-w-xl mx-auto italic" dangerouslySetInnerHTML={{ __html: t('oracle.desc') }}>
                </p>
            </div>

            {!currentUser.isVip ? (
                <div className="bg-neutral-900/50 border border-gold-900/30 p-12 text-center rounded-lg relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gold-900/5 pointer-events-none group-hover:bg-gold-900/10 transition-colors"></div>
                    <Lock className="w-10 h-10 text-gold-500 mx-auto mb-4" />
                    <h3 className="text-xl font-serif text-gold-400 mb-4">{t('oracle.vip_reserved')}</h3>
                    <p className="text-neutral-400 text-sm mb-8 max-w-sm mx-auto">
                        {t('oracle.vip_description', 'Effettua l\'upgrade alla Membership VIP per consultare l\'Oracolo ogni giorno.')}
                    </p>
                    <button disabled className="bg-neutral-800 text-neutral-500 border border-neutral-700 px-8 py-3 text-xs uppercase font-bold tracking-widest cursor-not-allowed">
                        {t('visitors.upgrade_btn')}
                    </button>
                </div>
            ) : loading ? (
                <div className="py-20 text-center">
                    <div className="w-16 h-16 border-b-2 border-gold-500 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gold-500 font-serif italic text-lg">{t('oracle.consulting')}</p>
                </div>
            ) : match && match.match_profile ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center animate-fade-in">
                    <div className="relative aspect-[4/5] overflow-hidden rounded-lg border border-neutral-800 shadow-2xl">
                        <img src={match.match_profile.avatar} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                        <div className="absolute bottom-6 left-6">
                            <h3 className="text-3xl font-serif text-white mb-1">{match.match_profile.name}</h3>
                            <span className="text-[10px] uppercase text-gold-500 font-bold tracking-widest border border-gold-900/50 px-2 py-0.5 bg-black/50">{match.match_profile.role.replace('_', ' ')}</span>
                        </div>
                    </div>

                    <div className="space-y-8">
                        <div className="bg-neutral-900/30 border-l-2 border-gold-600 p-6">
                            <h4 className="text-[10px] uppercase text-gold-600 font-bold tracking-[0.2em] mb-3">{t('oracle.prophecy_title')}</h4>
                            <p className="text-white font-serif italic text-lg leading-relaxed">
                                "{match.reasoning}"
                            </p>
                        </div>

                        {match.match_profile.bio && (
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase text-neutral-600 font-bold tracking-widest">{t('oracle.bio_label')}</label>
                                <p className="text-neutral-400 text-sm leading-relaxed">{match.match_profile.bio}</p>
                            </div>
                        )}

                        <div className="flex items-center gap-6 pt-6">
                            <button
                                onClick={() => onOpenChat({ id: match.match_profile!.id, name: match.match_profile!.name, avatar: match.match_profile!.avatar })}
                                className="flex-1 bg-gold-600 hover:bg-gold-500 text-black font-serif uppercase tracking-widest py-4 font-bold shadow-[0_0_20px_rgba(234,179,8,0.3)] transition-all flex items-center justify-center gap-2"
                            >
                                <Heart className="w-5 h-5 fill-current" /> {t('oracle.start_destiny')}
                            </button>

                            <div className="text-right">
                                <div className="flex items-center gap-2 text-neutral-500 text-xs mb-1">
                                    <Timer className="w-3 h-3" /> <ClockCountdown t={t} expiresAt={match.expires_at} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="py-20 text-center border border-dashed border-neutral-800 p-12">
                    <Ghost className="w-12 h-12 text-neutral-700 mx-auto mb-4 opacity-50" />
                    <p className="text-neutral-500 font-serif italic">{t('oracle.no_match')}</p>
                </div>
            )}
        </div>
    );
};

const ClockCountdown = ({ expiresAt, t }: { expiresAt: string, t: any }) => {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            const end = new Date(expiresAt);
            const diff = end.getTime() - now.getTime();

            if (diff <= 0) {
                setTimeLeft(t('oracle.expired'));
                clearInterval(interval);
            } else {
                const hours = Math.floor(diff / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                setTimeLeft(t('oracle.time_remaining', { hours, minutes }));
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [expiresAt, t]);

    return <span>{timeLeft}</span>;
}

export default Oracle;
