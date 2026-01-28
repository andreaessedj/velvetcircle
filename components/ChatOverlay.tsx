
import React, { useState, useEffect, useRef } from 'react';
import { User, PrivateMessage } from '../types';
import { api } from '../services/db';
import { X, Clock, Send, Loader, Gamepad2, Sparkles, Flame, Zap, Flower, Coins, Image as ImageIcon, ZapOff, Plus } from 'lucide-react';
import EphemeralMoment from './features/EphemeralMoment';
import { useTranslation } from 'react-i18next';

interface ChatOverlayProps {
    currentUser: User;
    targetUser: { id: string; name: string; avatar: string };
    onClose: () => void;
}

const ChatOverlay: React.FC<ChatOverlayProps> = ({ currentUser, targetUser, onClose }) => {
    const { t } = useTranslation();
    const [messages, setMessages] = useState<PrivateMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [showCardMenu, setShowCardMenu] = useState(false);
    const [showTipMenu, setShowTipMenu] = useState(false);
    const [playingCard, setPlayingCard] = useState(false);
    const [sendingTip, setSendingTip] = useState(false);
    const [sendingBlackRose, setSendingBlackRose] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [isEphemeralMode, setIsEphemeralMode] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showActions, setShowActions] = useState(false);
    const isInitialLoad = useRef(true);

    // Fetch and Poll messages
    useEffect(() => {
        let interval: any;
        const fetchMessages = async () => {
            try {
                const msgs = await api.getPrivateMessages(currentUser.id, targetUser.id);
                setMessages(prev => {
                    // Solo se i messaggi sono cambiati davvero (lunghezza o contenuto ultimo msg)
                    if (prev.length === msgs.length && prev[prev.length - 1]?.id === msgs[msgs.length - 1]?.id) {
                        return prev;
                    }
                    return msgs;
                });

                // Marca come letti se ci sono messaggi non letti per me
                const hasUnread = msgs.some(m => m.receiver_id === currentUser.id && !m.is_read);
                if (hasUnread) {
                    await api.markMessagesAsRead(currentUser.id, targetUser.id);
                    // Forza aggiornamento immediato della Dashboard
                    window.dispatchEvent(new Event('velvetRefreshUnreadCount'));
                }

                setLoading(false);
            } catch (e) {
                console.error(e);
            }
        };

        fetchMessages();
        interval = setInterval(fetchMessages, 5000); // Poll every 5s

        return () => clearInterval(interval);
    }, [currentUser.id, targetUser.id]);

    // Scroll to bottom logic
    useEffect(() => {
        if (!scrollContainerRef.current) return;

        const container = scrollContainerRef.current;
        const isSelfMessage = messages[messages.length - 1]?.sender_id === currentUser.id;

        // Calcola se l'utente è vicino al fondo (entro 150px)
        const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;

        if (isInitialLoad.current || isSelfMessage || isAtBottom) {
            chatEndRef.current?.scrollIntoView({ behavior: isInitialLoad.current ? 'instant' : 'smooth' });
            isInitialLoad.current = false;
        }
    }, [messages, currentUser.id]);

    const handleSendMessage = async (text = newMessage, isBlackRose = false, imageUrl?: string, isEphemeral = isEphemeralMode) => {
        if (!text.trim() && !imageUrl) return;
        try {
            // Optimistic update
            const tempMsg: PrivateMessage = {
                id: 'temp-' + Date.now(),
                sender_id: currentUser.id,
                receiver_id: targetUser.id,
                content: text,
                image_url: imageUrl,
                created_at: new Date().toISOString(),
                is_read: false,
                is_black_rose: isBlackRose,
                is_ephemeral: isEphemeral
            };
            setMessages(prev => [...prev, tempMsg]);

            if (text === newMessage) setNewMessage(''); // Clear input if it's the text field
            setIsEphemeralMode(false);

            await api.sendPrivateMessage(currentUser.id, targetUser.id, text, currentUser.name, isBlackRose, imageUrl, isEphemeral);

            // Refetch to get real ID and server timestamp
            const msgs = await api.getPrivateMessages(currentUser.id, targetUser.id);
            setMessages(msgs);
        } catch (e) {
            console.error("Send failed", e);
            alert(t('chat.send_error'));
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingImage(true);
        try {
            const uploaded = await api.uploadVaultPhoto(file, currentUser.id, 0);
            await handleSendMessage("(Immagine)", false, uploaded.url);
        } catch (err) {
            console.error("Upload failed:", err);
            alert(t('chat.upload_error'));
        } finally {
            setUploadingImage(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };



    const handleBlackRose = () => {
        if (!currentUser.isVip) {
            alert(t('chat.black_rose_vip'));
            return;
        }
        setSendingBlackRose(!sendingBlackRose);
    };

    const handlePlayCard = async (category: 'SOFT' | 'INTENSE' | 'DARE') => {
        setPlayingCard(true);
        setShowCardMenu(false);
        try {
            const cardContent = await api.drawVelvetCard(category);
            // Protocollo speciale: :::VELVET_CARD|CATEGORY|CONTENT:::
            const formattedMsg = `:::VELVET_CARD|${category}|${cardContent}:::`;
            await handleSendMessage(formattedMsg);
        } catch (e) {
            console.error(e);
        } finally {
            setPlayingCard(false);
        }
    };

    const handleSendTip = async (amount: number) => {
        if (currentUser.credits < amount && currentUser.role !== 'ADMIN') {
            alert(t('chat.insufficient_credits'));
            return;
        }

        if (!confirm(t('chat.tip_confirm', { amount, name: targetUser.name }))) return;

        setSendingTip(true);
        setShowTipMenu(false);
        try {
            await api.sendTip(currentUser.id, targetUser.id, amount);
            // The message is added by the backend logic, we just refetch
            const msgs = await api.getPrivateMessages(currentUser.id, targetUser.id);
            setMessages(msgs);
        } catch (e: any) {
            console.error(e);
            alert(e.message || t('chat.tip_error'));
        } finally {
            setSendingTip(false);
        }
    };



    // Renderizza il contenuto interno del messaggio (Body)
    const renderMessageBody = (msg: PrivateMessage) => {
        const { content, is_black_rose: isBlackRose, image_url: imageUrl, is_ephemeral: isEphemeral, ephemeral_reveals: ephemeralReveals } = msg;

        // 1. Velvet Cards
        if (content.startsWith(':::VELVET_CARD|')) {
            const parts = content.split('|');
            const category = parts[1];
            const text = parts[2]?.replace(':::', '');

            let cardStyle = '';
            let icon = null;
            let label = '';

            switch (category) {
                case 'SOFT':
                    cardStyle = 'border-pink-500 bg-pink-900/20 text-pink-200';
                    icon = <Sparkles className="w-4 h-4 text-pink-500" />;
                    label = 'Velvet Soft';
                    break;
                case 'INTENSE':
                    cardStyle = 'border-crimson-600 bg-crimson-900/30 text-crimson-200';
                    icon = <Flame className="w-4 h-4 text-crimson-500" />;
                    label = 'Velvet Intense';
                    break;
                case 'DARE':
                    cardStyle = 'border-gold-500 bg-gold-900/20 text-gold-200';
                    icon = <Zap className="w-4 h-4 text-gold-500" />;
                    label = 'Velvet Dare';
                    break;
                default:
                    return <p className="text-sm font-sans whitespace-pre-wrap">{text}</p>;
            }

            return (
                <div className={`mt-1 mb-1 p-4 border rounded-lg ${cardStyle} shadow-lg relative overflow-hidden group-card`}>
                    <div className="absolute top-0 right-0 p-2 opacity-20">
                        <Gamepad2 className="w-12 h-12" />
                    </div>
                    <div className="flex items-center gap-2 mb-2 font-bold text-xs uppercase tracking-widest border-b border-white/10 pb-2">
                        {icon} {label}
                    </div>
                    <p className="font-serif text-lg leading-relaxed italic relative z-10">
                        "{text}"
                    </p>
                </div>
            );
        }

        // 2. Tips
        if (content.startsWith(':::TIP|')) {
            const parts = content.split('|');
            const amount = parts[1];
            const text = parts[2]?.replace(':::', '');

            return (
                <div className="mt-1 mb-1 p-4 border border-yellow-500 bg-yellow-900/20 rounded-lg shadow-[0_0_15px_rgba(234,179,8,0.2)] text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-yellow-500"></div>
                    <Coins className="w-8 h-8 text-yellow-500 mx-auto mb-2 animate-bounce" />
                    <p className="font-bold text-yellow-500 text-lg">{amount} {t('chat.credits_plural')}</p>
                    <p className="text-xs text-yellow-200 italic mt-1">{text}</p>
                </div>
            );
        }

        // 3. Regular Message / Image / Ephemeral
        return (
            <div className={isBlackRose ? 'pl-2' : ''}>
                {isBlackRose && (
                    <div className="flex items-center gap-2 mb-1 border-b border-gold-800/30 pb-1">
                        <Flower className="w-3 h-3 text-black fill-gold-500" />
                        <span className="text-[9px] uppercase font-bold text-gold-500 tracking-widest">{t('chat.priority_message')}</span>
                    </div>
                )}
                {imageUrl && (
                    isEphemeral ? (
                        <div className="mb-2 min-w-[240px]">
                            <EphemeralMoment
                                imageUrl={imageUrl}
                                isExpired={(() => {
                                    if (!ephemeralReveals || !ephemeralReveals[currentUser.id]) return false;
                                    const revealedAt = new Date(ephemeralReveals[currentUser.id]).getTime();
                                    return (Date.now() - revealedAt) > 10000;
                                })()}
                                onReveal={() => api.revealEphemeralMessage(msg.id, 'PRIVATE')}
                            />
                        </div>
                    ) : (
                        <div className="mb-2 rounded-lg overflow-hidden border border-white/10">
                            <img src={imageUrl} className="max-w-full max-h-64 object-contain" alt="Message content" />
                        </div>
                    )
                )}
                <p className="text-sm font-sans whitespace-pre-wrap">{content}</p>
            </div>
        );
    };

    return (
        <div className="fixed inset-x-0 top-6 bottom-6 z-[1000] bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-6 animate-fade-in">
            <div className="bg-neutral-900 w-full max-w-lg h-[90vh] md:h-[600px] border border-neutral-800 shadow-2xl flex flex-col">
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                />

                {/* Chat Header */}
                <div className="p-4 bg-neutral-950 border-b border-neutral-800 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <img src={targetUser.avatar} className="w-10 h-10 rounded-full border border-neutral-700 object-cover" alt={targetUser.name} />
                        <div>
                            <h3 className="text-white font-serif">{targetUser.name}</h3>
                            <div className="flex items-center gap-1 text-xs text-crimson-500">
                                <Clock className="w-3 h-3" />
                                {t('chat.ephemeral_36h')}
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Chat Messages */}
                <div
                    ref={scrollContainerRef}
                    className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/50 custom-scrollbar relative"
                >
                    {loading && messages.length === 0 ? (
                        <div className="flex justify-center p-4"><Loader className="animate-spin text-crimson-800" /></div>
                    ) : messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full space-y-4">
                            <p className="text-neutral-600 italic font-serif">{t('chat.empty_conv')}</p>
                            <button
                                onClick={() => setShowCardMenu(true)}
                                className="flex items-center gap-2 px-6 py-3 bg-gold-900/20 border border-gold-600/50 text-gold-500 hover:bg-gold-900/40 hover:text-gold-400 transition-all uppercase text-xs font-bold tracking-widest rounded-full shadow-[0_0_20px_rgba(245,158,11,0.2)] animate-pulse"
                            >
                                <Sparkles className="w-4 h-4" /> {t('chat.break_ice_card')}
                            </button>
                        </div>
                    ) : (
                        messages.map(msg => {
                            const isMe = msg.sender_id === currentUser.id;
                            const isCard = msg.content.startsWith(':::VELVET_CARD|');
                            const isTip = msg.content.startsWith(':::TIP|');
                            const isBlackRose = msg.is_black_rose;

                            return (
                                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] p-3 border shadow-lg ${isMe
                                        ? 'bg-crimson-900/20 border-crimson-900/50 text-neutral-200 rounded-tl-lg rounded-bl-lg rounded-br-lg'
                                        : isTip
                                            ? 'bg-black border-yellow-600/50 text-yellow-100 rounded-lg shadow-[0_0_20px_rgba(234,179,8,0.1)]'
                                            : isBlackRose
                                                ? 'bg-neutral-900 border-gold-600 text-gold-100 rounded-tr-lg rounded-br-lg rounded-bl-lg shadow-[0_0_15px_rgba(234,179,8,0.2)]'
                                                : 'bg-neutral-800 border-neutral-700 text-neutral-300 rounded-tr-lg rounded-br-lg rounded-bl-lg'
                                        } ${isCard || isTip ? 'w-full' : ''}`}>
                                        {renderMessageBody(msg)}
                                        <span className={`text-[10px] block text-right mt-1 ${isBlackRose ? 'text-gold-600' : 'text-neutral-500'}`}>
                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            )
                        })
                    )}
                    <div ref={chatEndRef} />

                    {/* Card Menu Overlay */}
                    {showCardMenu && (
                        <div className="absolute bottom-2 left-4 right-4 bg-neutral-900 border border-crimson-900 rounded-lg shadow-2xl p-4 animate-fade-in z-20">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="text-white font-serif flex items-center gap-2"><Gamepad2 className="w-4 h-4 text-crimson-500" /> Velvet Cards</h4>
                                <button onClick={() => setShowCardMenu(false)}><X className="w-4 h-4 text-neutral-500" /></button>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <button onClick={() => handlePlayCard('SOFT')} className="p-3 bg-pink-900/20 hover:bg-pink-900/40 border border-pink-900/50 rounded flex flex-col items-center gap-2 transition-colors">
                                    <Sparkles className="w-5 h-5 text-pink-400" />
                                    <span className="text-[10px] uppercase font-bold text-pink-300">Soft</span>
                                </button>
                                <button onClick={() => handlePlayCard('INTENSE')} className="p-3 bg-crimson-900/20 hover:bg-crimson-900/40 border border-crimson-900/50 rounded flex flex-col items-center gap-2 transition-colors">
                                    <Flame className="w-5 h-5 text-crimson-500" />
                                    <span className="text-[10px] uppercase font-bold text-crimson-400">Intense</span>
                                </button>
                                <button onClick={() => handlePlayCard('DARE')} className="p-3 bg-yellow-900/20 hover:bg-yellow-900/40 border border-yellow-900/50 rounded flex flex-col items-center gap-2 transition-colors">
                                    <Zap className="w-5 h-5 text-yellow-500" />
                                    <span className="text-[10px] uppercase font-bold text-yellow-400">Dare</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Tip Menu Overlay */}
                    {showTipMenu && (
                        <div className="absolute bottom-2 left-4 right-4 bg-neutral-900 border border-yellow-600 rounded-lg shadow-2xl p-4 animate-fade-in z-20">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="text-white font-serif flex items-center gap-2"><Coins className="w-4 h-4 text-yellow-500" /> {t('chat.send_tip')}</h4>
                                <button onClick={() => setShowTipMenu(false)}><X className="w-4 h-4 text-neutral-500" /></button>
                            </div>
                            <p className="text-xs text-neutral-400 mb-4">{t('chat.select_tip_amount', { name: targetUser.name })}</p>
                            <div className="grid grid-cols-4 gap-2">
                                {[10, 50, 100, 500].map(amount => (
                                    <button
                                        key={amount}
                                        onClick={() => handleSendTip(amount)}
                                        disabled={sendingTip}
                                        className="p-3 bg-neutral-800 hover:bg-yellow-900/30 border border-neutral-700 hover:border-yellow-500 rounded flex flex-col items-center justify-center gap-1 transition-colors"
                                    >
                                        <span className="text-yellow-500 font-bold text-lg">{amount}</span>
                                        <span className="text-[9px] uppercase text-neutral-500">{t('chat.credits_indicator')}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Chat Input */}
                <div className={`p-3 md:p-4 bg-neutral-950 border-t transition-all duration-300 ${sendingBlackRose ? 'border-gold-600' : 'border-neutral-800'}`}>
                    {sendingBlackRose && (
                        <div className="text-[10px] text-gold-500 uppercase font-bold tracking-widest mb-2 flex items-center gap-1 animate-pulse px-2">
                            <Flower className="w-3 h-3 fill-gold-500 text-black" /> {t('chat.black_rose_active')}
                        </div>
                    )}

                    {/* Expandable Actions Toolbar */}
                    <div className={`flex items-center gap-2 mb-3 overflow-x-auto pb-2 custom-scrollbar transition-all duration-300 origin-bottom ${showActions ? 'max-h-24 opacity-100' : 'max-h-0 opacity-0 pointer-events-none mb-0 overflow-hidden'}`}>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingImage}
                            className="flex flex-col items-center justify-center min-w-[70px] p-3 bg-neutral-900 text-neutral-500 border border-neutral-800 hover:border-crimson-800 hover:text-crimson-500 transition-all gap-1 rounded-xl"
                            title={t('chat.tooltips.send_image')}
                        >
                            {uploadingImage ? <Loader className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                            <span className="text-[9px] uppercase font-bold">{t('chat.photo')}</span>
                        </button>

                        <button
                            onClick={() => { setShowTipMenu(!showTipMenu); setShowCardMenu(false); }}
                            disabled={sendingTip}
                            className={`flex flex-col items-center justify-center min-w-[70px] p-3 border transition-all gap-1 rounded-xl ${showTipMenu
                                ? 'bg-yellow-600 text-black border-yellow-500'
                                : 'bg-neutral-900 text-yellow-500 border-neutral-800 hover:border-yellow-500'
                                }`}
                            title={t('chat.tooltips.send_tip')}
                        >
                            {sendingTip ? <Loader className="w-4 h-4 animate-spin" /> : <Coins className="w-4 h-4" />}
                            <span className="text-[9px] uppercase font-bold">{t('chat.tip')}</span>
                        </button>

                        <button
                            onClick={() => { setShowCardMenu(!showCardMenu); setShowTipMenu(false); }}
                            disabled={playingCard}
                            className={`flex flex-col items-center justify-center min-w-[70px] p-3 border transition-all gap-1 rounded-xl ${showCardMenu
                                ? 'bg-gold-600 text-black border-gold-500'
                                : 'bg-neutral-900 text-gold-500 border-gold-800 hover:border-gold-500'
                                }`}
                            title={t('chat.tooltips.play_cards')}
                        >
                            {playingCard ? <Loader className="w-4 h-4 animate-spin" /> : <Gamepad2 className="w-4 h-4" />}
                            <span className="text-[9px] uppercase font-bold">{t('chat.cards')}</span>
                        </button>

                        <button
                            onClick={handleBlackRose}
                            className={`flex flex-col items-center justify-center min-w-[70px] p-3 border transition-all gap-1 rounded-xl ${sendingBlackRose
                                ? 'bg-black text-gold-500 border-gold-500 shadow-[0_0_10px_rgba(234,179,8,0.4)]'
                                : 'bg-neutral-900 text-neutral-600 border-neutral-800 hover:text-gold-500 hover:border-gold-800'
                                }`}
                            title={t('chat.tooltips.black_rose')}
                        >
                            <Flower className={`w-4 h-4 ${sendingBlackRose ? 'fill-gold-500 text-black' : ''}`} />
                            <span className="text-[9px] uppercase font-bold text-center leading-tight">Black<br />Rose</span>
                        </button>

                        {currentUser.isVip && (
                            <button
                                onClick={() => setIsEphemeralMode(!isEphemeralMode)}
                                className={`flex flex-col items-center justify-center min-w-[70px] p-3 border transition-all gap-1 rounded-xl ${isEphemeralMode
                                    ? 'bg-crimson-900/40 border-crimson-500 text-crimson-500'
                                    : 'bg-neutral-900 border-neutral-800 text-neutral-500 hover:text-neutral-300'
                                    }`}
                                title={isEphemeralMode ? t('chat.tooltips.ephemeral_active') : t('chat.tooltips.ephemeral_inactive')}
                            >
                                {isEphemeralMode ? <Zap className="w-4 h-4 fill-current" /> : <ZapOff className="w-4 h-4" />}
                                <span className="text-[9px] uppercase font-bold text-center leading-tight">{t('chat.ephemeral').substring(0, 4)}<br />{t('chat.ephemeral').substring(4)}</span>
                            </button>
                        )}
                    </div>





                    {/* Main Input Row */}
                    <div className="flex gap-2 items-center">
                        <button
                            onClick={() => setShowActions(!showActions)}
                            className={`p-3 rounded-xl border transition-all flex items-center justify-center ${showActions ? 'bg-crimson-900 border-crimson-700 text-white rotate-45' : 'bg-neutral-900 border-neutral-800 text-neutral-500 hover:text-white'}`}
                        >
                            <Plus className="w-5 h-5" />
                        </button>

                        <div className="flex-1 relative">
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(newMessage, sendingBlackRose)}
                                placeholder={t('chat.write_placeholder')}
                                className="w-full bg-black border border-neutral-800 text-white px-4 py-3 focus:border-crimson-900 outline-none font-sans rounded-xl text-sm"
                            />
                        </div>

                        <button
                            onClick={() => handleSendMessage(newMessage, sendingBlackRose)}
                            disabled={!newMessage.trim()}
                            className={`p-3 rounded-xl transition-all disabled:opacity-50 text-white shadow-lg ${sendingBlackRose ? 'bg-gold-600 text-black hover:bg-gold-500 shadow-gold-500/20' : 'bg-crimson-900 hover:bg-crimson-800 shadow-crimson-900/20'}`}
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatOverlay;
