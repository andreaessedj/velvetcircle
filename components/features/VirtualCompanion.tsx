import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { User, AiMessage } from '../../types';
import { api } from '../../services/db';
import { sendCompanionMessage } from '../../services/geminiService';
import { Lock, Sparkles, Send, ArrowLeft, Loader, Bot, MessageSquare, X, ShieldAlert, Heart } from 'lucide-react';

interface VirtualCompanionProps {
    currentUser: User;
}

const VirtualCompanion: React.FC<VirtualCompanionProps> = ({ currentUser }) => {
    const { t } = useTranslation();
    const [selectedCompanion, setSelectedCompanion] = useState<any | null>(null);
    const [messages, setMessages] = useState<AiMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [typing, setTyping] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (selectedCompanion) {
            loadHistory(selectedCompanion.id);
        }
    }, [selectedCompanion]);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, typing]);

    const loadHistory = async (companionId: string) => {
        setLoading(true);
        const history = await api.getAiHistory(companionId);
        setMessages(history);
        setLoading(false);
    };

    const handleSend = async () => {
        if (!input.trim() || !selectedCompanion) return;

        const userMsgContent = input;
        setInput('');

        // 1. Optimistic UI Update
        const tempId = Date.now().toString();
        const userMsg: AiMessage = {
            id: tempId,
            role: 'user',
            content: userMsgContent,
            created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, userMsg]);
        setTyping(true);

        // 2. Save User Msg & Get Response
        try {
            // Save user message to DB
            await api.saveAiMessage(selectedCompanion.id, 'user', userMsgContent);

            // Call Gemini
            const aiResponseText = await sendCompanionMessage(messages, userMsgContent, selectedCompanion.id, currentUser.name);

            // Save AI message to DB
            await api.saveAiMessage(selectedCompanion.id, 'model', aiResponseText);

            const aiMsg: AiMessage = {
                id: (Date.now() + 1).toString(),
                role: 'model',
                content: aiResponseText,
                created_at: new Date().toISOString()
            };
            setMessages(prev => [...prev, aiMsg]);

        } catch (e) {
            console.error(e);
        } finally {
            setTyping(false);
        }
    };

    if (!selectedCompanion) {
        return (
            <div className="max-w-4xl mx-auto h-full flex flex-col justify-center p-4">
                <div className="mb-10 text-center">
                    <Bot className="w-12 h-12 text-crimson-600 mx-auto mb-4" />
                    <h2 className="text-3xl font-serif text-white mb-2">{t('companion.title')}</h2>
                    <p className="text-neutral-500 text-sm max-w-md mx-auto" dangerouslySetInnerHTML={{ __html: t('companion.desc') }}></p>
                </div>

                {!currentUser.isVip ? (
                    <div className="bg-neutral-900 border border-crimson-900/30 p-8 text-center rounded relative overflow-hidden group">
                        <div className="absolute inset-0 bg-crimson-900/5 pointer-events-none group-hover:bg-crimson-900/10 transition-colors"></div>
                        <ShieldAlert className="w-10 h-10 text-crimson-500 mx-auto mb-4" />
                        <h3 className="text-xl font-serif text-white mb-2">{t('companion.access_denied')}</h3>
                        <p className="text-neutral-400 text-sm mb-6">
                            {t('oracle.vip_description')}
                        </p>
                        <button disabled className="bg-neutral-800 text-neutral-500 border border-neutral-700 px-6 py-2 text-xs uppercase font-bold tracking-widest cursor-not-allowed">
                            {t('common.upgrade_required', 'Upgrade Necessario')}
                        </button>
                    </div>
                ) : (
                    <div className="space-y-8 animate-fade-in">
                        <div className="text-center">
                            <h3 className="text-gold-500 font-serif text-xl mb-1">{t('companion.choose_companion')}</h3>
                            <p className="text-neutral-500 text-xs italic">{t('companion.who_to_spend')}</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Isabella */}
                            <div
                                onClick={() => setSelectedCompanion({ id: 'ISABELLA', name: 'Isabella', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200', role: t('companion.isabella_title') })}
                                className="bg-neutral-900/40 border border-neutral-800 p-6 hover:border-crimson-600/50 transition-all cursor-pointer group rounded-lg"
                            >
                                <div className="flex gap-4 items-center mb-4">
                                    <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200" className="w-16 h-16 rounded-full object-cover grayscale group-hover:grayscale-0 transition-all border border-neutral-700" alt="Isabella" />
                                    <div>
                                        <h4 className="text-white font-serif text-lg">Isabella</h4>
                                        <span className="text-[10px] uppercase text-crimson-500 font-bold tracking-widest">{t('companion.isabella_title')}</span>
                                    </div>
                                </div>
                                <p className="text-neutral-400 text-sm italic mb-4">{t('companion.isabella_quote')}</p>
                                <div className="flex gap-2">
                                    <span className="text-[9px] bg-neutral-800 text-neutral-500 px-2 py-0.5 border border-neutral-700 rounded-full">{t('companion.smart')}</span>
                                    <span className="text-[9px] bg-neutral-800 text-neutral-500 px-2 py-0.5 border border-neutral-700 rounded-full">{t('companion.seductive')}</span>
                                </div>
                            </div>

                            {/* Gabriel */}
                            <div
                                onClick={() => setSelectedCompanion({ id: 'GABRIEL', name: 'Gabriel', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200', role: t('companion.gabriel_title') })}
                                className="bg-neutral-900/40 border border-neutral-800 p-6 hover:border-crimson-600/50 transition-all cursor-pointer group rounded-lg"
                            >
                                <div className="flex gap-4 items-center mb-4">
                                    <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200" className="w-16 h-16 rounded-full object-cover grayscale group-hover:grayscale-0 transition-all border border-neutral-700" alt="Gabriel" />
                                    <div>
                                        <h4 className="text-white font-serif text-lg">Gabriel</h4>
                                        <span className="text-[10px] uppercase text-crimson-500 font-bold tracking-widest">{t('companion.gabriel_title')}</span>
                                    </div>
                                </div>
                                <p className="text-neutral-400 text-sm italic mb-4">{t('companion.gabriel_quote')}</p>
                                <div className="flex gap-2">
                                    <span className="text-[9px] bg-neutral-800 text-neutral-500 px-2 py-0.5 border border-neutral-700 rounded-full">{t('companion.dominant')}</span>
                                    <span className="text-[9px] bg-neutral-800 text-neutral-500 px-2 py-0.5 border border-neutral-700 rounded-full">{t('companion.charismatic')}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-neutral-950 border-x border-neutral-900 max-w-5xl mx-auto shadow-2xl">
            {/* Header */}
            <div className="p-4 border-b border-neutral-800 flex justify-between items-center bg-black">
                <div className="flex items-center gap-4">
                    <button onClick={() => setSelectedCompanion(null)} className="text-neutral-500 hover:text-white">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-3">
                        <img
                            src={selectedCompanion.avatar}
                            className="w-10 h-10 rounded-full object-cover border border-neutral-700"
                            alt={selectedCompanion.name}
                        />
                        <div>
                            <h3 className="text-white font-serif">{selectedCompanion.name}</h3>
                            <p className="text-[10px] text-green-500 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> {t('companion.online')}
                            </p>
                        </div>
                    </div>
                </div>
                <Sparkles className="w-5 h-5 text-gold-500 animate-pulse" />
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')]">
                {loading ? (
                    <div className="flex justify-center p-10"><Loader className="animate-spin text-neutral-600" /></div>
                ) : (
                    <>
                        <div className="text-center py-6">
                            <span className="text-[10px] text-neutral-600 uppercase tracking-widest border-b border-neutral-800 pb-1">{t('companion.conversation_start')}</span>
                        </div>
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] p-4 rounded-lg text-sm leading-relaxed font-serif shadow-lg ${msg.role === 'user'
                                        ? 'bg-neutral-800 text-white rounded-br-none border border-neutral-700'
                                        : selectedCompanion.id === 'ISABELLA'
                                            ? 'bg-pink-900/10 text-pink-100 rounded-bl-none border border-pink-900/30'
                                            : 'bg-blue-900/10 text-blue-100 rounded-bl-none border border-blue-900/30'
                                    }`}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        {typing && (
                            <div className="flex justify-start">
                                <div className="bg-neutral-900/50 p-3 rounded-lg rounded-bl-none flex gap-1">
                                    <span className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce"></span>
                                    <span className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce delay-75"></span>
                                    <span className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce delay-150"></span>
                                </div>
                            </div>
                        )}
                        <div ref={scrollRef} />
                    </>
                )}
            </div>

            {/* Input */}
            <div className="p-4 bg-black border-t border-neutral-800">
                <div className="flex gap-2 relative">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder={t('companion.typing_placeholder', { name: selectedCompanion.name })}
                        className="w-full bg-neutral-900 border border-neutral-800 text-white p-3 pr-12 focus:border-neutral-600 outline-none font-sans"
                        disabled={typing}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || typing}
                        className="absolute right-2 top-2 p-1.5 bg-neutral-800 text-white hover:bg-neutral-700 rounded transition-colors disabled:opacity-50"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
                <p className="text-[10px] text-neutral-600 mt-2 text-center">
                    {t('companion.ai_disclaimer')}
                </p>
            </div>
        </div>
    );
};

export default VirtualCompanion;
