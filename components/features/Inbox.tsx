import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/db';
import { User, InboxConversation } from '../../types';
import { MessageSquare, Clock, ShieldCheck, Loader, ChevronRight, Flower } from 'lucide-react';

interface InboxProps {
    currentUser: User;
    onOpenChat: (user: { id: string, name: string, avatar: string }) => void;
}

const Inbox: React.FC<InboxProps> = ({ currentUser, onOpenChat }) => {
    const { t } = useTranslation();
    const [conversations, setConversations] = useState<InboxConversation[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadInbox = async () => {
            try {
                const data = await api.getInbox();
                setConversations(data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        loadInbox();
    }, [currentUser.id]);

    const isExpired = (dateStr: string) => {
        const msgDate = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - msgDate.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        return diffHours > 36;
    };

    if (loading) return <div className="flex justify-center p-20"><Loader className="animate-spin text-crimson-600 w-10 h-10" /></div>;

    return (
        <div className="max-w-4xl mx-auto pb-10 px-4 md:px-0">
            <div className="mb-10 border-b border-neutral-900 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-4xl font-serif text-white mb-2 flex items-center gap-4">
                        <MessageSquare className="w-10 h-10 text-crimson-700" /> {t('inbox.title')}
                    </h2>
                    <p className="text-neutral-500 text-sm max-w-xl">{t('inbox.desc')}</p>
                </div>
                <div className="bg-neutral-900/50 px-4 py-2 rounded-lg border border-neutral-800 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-crimson-600" />
                    <span className="text-[10px] uppercase font-black tracking-widest text-neutral-400">36H TTL</span>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {conversations.length === 0 && (
                    <div className="text-center py-32 text-neutral-600 font-serif italic border border-dashed border-neutral-900 rounded-2xl bg-neutral-950/30">
                        {t('inbox.empty')}
                    </div>
                )}

                {conversations.map((conv, idx) => {
                    const expired = isExpired(conv.last_message_at);
                    const isPriority = conv.has_black_rose;

                    return (
                        <div
                            key={idx}
                            onClick={() => onOpenChat({
                                id: conv.partner.id,
                                name: conv.partner.name,
                                avatar: conv.partner.avatar
                            })}
                            className={`group p-6 transition-all duration-300 cursor-pointer flex items-center gap-6 relative overflow-hidden rounded-2xl border ${isPriority ? 'bg-gradient-to-r from-gold-950/20 to-neutral-900/40 border-gold-600/30 hover:border-gold-500 shadow-[0_10px_30px_rgba(234,179,8,0.05)]' : 'bg-neutral-900/40 border-neutral-900 hover:bg-neutral-900/60 hover:border-crimson-900/30'}`}
                        >
                            {isPriority && (
                                <div className="absolute top-0 right-0 w-12 h-12 bg-gold-600/10 rounded-bl-3xl border-l border-b border-gold-600/20 flex items-center justify-center">
                                    <Flower className="w-5 h-5 text-gold-500 fill-current animate-pulse" />
                                </div>
                            )}

                            <div className="relative flex-shrink-0">
                                <div className={`absolute -inset-1 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity ${isPriority ? 'bg-gold-600/30' : 'bg-crimson-600/20'}`}></div>
                                <img
                                    src={conv.partner.avatar}
                                    alt={conv.partner.name}
                                    className={`relative w-16 h-16 rounded-full object-cover border-2 shadow-2xl transition-all duration-500 ${expired ? 'border-neutral-800 grayscale scale-95 opacity-50' : isPriority ? 'border-gold-500 group-hover:scale-105' : 'border-neutral-800 group-hover:border-crimson-600 group-hover:scale-105'}`}
                                />
                                {conv.partner.isVerified && (
                                    <div className="absolute -bottom-0.5 -right-0.5 bg-neutral-950 rounded-full p-1 border border-black shadow-lg">
                                        <ShieldCheck className="w-4 h-4 text-gold-500" />
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                                    <h3 className={`text-xl font-serif flex items-center gap-3 transition-colors ${expired ? 'text-neutral-600' : isPriority ? 'text-gold-400' : 'text-neutral-100 group-hover:text-white'}`}>
                                        {conv.partner.name}
                                        {conv.unread_count > 0 && (
                                            <span className="bg-crimson-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse shadow-lg">
                                                {conv.unread_count}
                                            </span>
                                        )}
                                        {isPriority && <span className="text-[8px] bg-gold-600 text-black px-2 py-0.5 rounded-full font-black tracking-widest shadow-lg">BLACK ROSE</span>}
                                    </h3>
                                    <span className={`text-[9px] uppercase font-black tracking-[0.2em] border px-3 py-1 rounded-full transition-colors ${expired ? 'text-neutral-700 border-neutral-900' : 'text-neutral-500 border-neutral-800 group-hover:text-neutral-300 group-hover:border-neutral-700'}`}>
                                        {t(`roles.${conv.partner.role}`, conv.partner.role.replace('_', ' '))}
                                    </span>
                                </div>

                                <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-xs">
                                    <span className={`flex items-center gap-2 font-bold tracking-tight ${expired ? 'text-neutral-700' : 'text-green-600'}`}>
                                        <div className={`w-2 h-2 rounded-full ${expired ? 'bg-neutral-800' : 'bg-green-600 animate-pulse border border-green-500/50 shadow-[0_0_8px_rgba(22,163,74,0.5)]'}`}></div>
                                        {expired ? t('inbox.archived') : t('inbox.active')}
                                    </span>
                                    <span className="text-neutral-600 flex items-center gap-2 font-mono text-[10px]">
                                        <Clock className="w-3.5 h-3.5 opacity-50" />
                                        {t('inbox.last_contact', { date: new Date(conv.last_message_at).toLocaleDateString(t('common.date_locale', 'it-IT'), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) })}
                                    </span>
                                </div>
                            </div>

                            <div className="text-neutral-800 group-hover:text-crimson-600 transition-all transform group-hover:translate-x-1 hidden sm:block">
                                <ChevronRight className="w-6 h-6" />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Inbox;
