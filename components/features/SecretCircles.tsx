import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { User, CircleMessage } from '../../types';
import { api } from '../../services/db';
import { Users, Plus, Key, Lock, Copy, Check, ChevronRight, Shield, X, Clock, Trash2, Zap, ZapOff } from 'lucide-react';
import EphemeralMoment from './EphemeralMoment';

interface SecretCirclesProps {
    currentUser: User;
}

const SecretCircles: React.FC<SecretCirclesProps> = ({ currentUser }) => {
    const { t } = useTranslation();
    const [view, setView] = useState<'LIST' | 'CREATE' | 'JOIN' | 'DETAIL'>('LIST');
    const [circles, setCircles] = useState<any[]>([]);
    const [selectedCircle, setSelectedCircle] = useState<any | null>(null);
    const [loading, setLoading] = useState(false);

    // Create Form State
    const [newName, setNewName] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [newTheme, setNewTheme] = useState('Generico');
    const [createdCode, setCreatedCode] = useState<string | null>(null);

    // Join Form State
    const [inviteCode, setInviteCode] = useState('');
    const [joinError, setJoinError] = useState('');

    // Membri e Messaggi
    const [members, setMembers] = useState<any[]>([]);
    const [messages, setMessages] = useState<CircleMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
    const [isEphemeralMode, setIsEphemeralMode] = useState(false);

    useEffect(() => {
        loadCircles();
    }, []);

    // Polling per i messaggi quando un cerchio è aperto
    useEffect(() => {
        let interval: any;
        if (view === 'DETAIL' && selectedCircle) {
            loadMessages();
            interval = setInterval(loadMessages, 5000); // Polling ogni 5 secondi
        }
        return () => clearInterval(interval);
    }, [view, selectedCircle]);

    const loadCircles = async () => {
        const data = await api.getMyCircles();
        setCircles(data);
    };

    const loadMessages = async () => {
        if (!selectedCircle) return;
        const data = await api.getCircleMessages(selectedCircle.id);
        setMessages(data);
    };

    const handleCreate = async () => {
        setLoading(true);
        try {
            const code = await api.createCircle(newName, newDesc, newTheme);
            setCreatedCode(code);
            await loadCircles();
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleJoin = async () => {
        setLoading(true);
        setJoinError('');
        try {
            await api.joinCircle(inviteCode.trim().toUpperCase());
            await loadCircles();
            setView('LIST');
        } catch (e: any) {
            setJoinError(e?.message || t('secret_circles.join_error', "Errore durante l'accesso."));
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = async (e?: React.FormEvent, file?: File) => {
        if (e) e.preventDefault();
        if (!chatInput.trim() && !file) return;
        if (!selectedCircle) return;

        setIsSending(true);
        try {
            await api.sendCircleMessage(selectedCircle.id, chatInput, file, isEphemeralMode);
            setChatInput('');
            setIsEphemeralMode(false);
            await loadMessages();
        } catch (error) {
            console.error(error);
        } finally {
            setIsSending(false);
        }
    };

    const handleDeleteCircle = async () => {
        if (!selectedCircle || !window.confirm(t('secret_circles.delete_confirm'))) return;

        setLoading(true);
        try {
            await api.deleteCircle(selectedCircle.id);
            setView('LIST');
            loadCircles();
        } catch (error) {
            console.error(error);
            alert(t('secret_circles.delete_error'));
        } finally {
            setLoading(false);
        }
    };

    const openCircle = async (circle: any) => {
        setSelectedCircle(circle);
        setLoading(true);
        const mems = await api.getCircleMembers(circle.id);
        setMembers(mems);
        setLoading(false);
        setView('DETAIL');
    };

    if (view === 'DETAIL' && selectedCircle) {
        return (
            <div className="h-full flex flex-col bg-neutral-950">
                {/* FullScreen Image Modal */}
                {fullScreenImage && (
                    <div
                        className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 cursor-zoom-out"
                        onClick={() => setFullScreenImage(null)}
                    >
                        <button className="absolute top-8 right-8 text-white/50 hover:text-white">
                            <X className="w-8 h-8" />
                        </button>
                        <img src={fullScreenImage} className="max-w-full max-h-full object-contain shadow-2xl" alt="Full screen" />
                    </div>
                )}

                {/* Header Cerchio */}
                <div className="p-4 md:p-6 border-b border-neutral-800 bg-neutral-900 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setView('LIST')} className="p-2 hover:bg-neutral-800 rounded-full text-neutral-400">
                            <ChevronRight className="w-6 h-6 rotate-180" />
                        </button>
                        <div>
                            <h2 className="text-xl md:text-2xl font-serif text-white">{selectedCircle.name}</h2>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-crimson-500 uppercase font-bold tracking-widest flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> {t('secret_circles.ephemeral_timer')}
                                </span>
                                <span className="text-neutral-600 font-bold">•</span>
                                <span className="text-[10px] text-neutral-500 uppercase">{selectedCircle.theme}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden md:block text-right">
                            <span className="text-[10px] text-neutral-500 uppercase block mb-1">{t('secret_circles.key_code')}</span>
                            <div
                                className="bg-black border border-crimson-900/30 px-3 py-1 font-mono text-crimson-500 font-bold text-sm select-all cursor-pointer flex items-center gap-2 hover:border-crimson-500 transition-colors"
                                onClick={() => navigator.clipboard.writeText(selectedCircle.code)}
                            >
                                {selectedCircle.code} <Copy className="w-3 h-3 opacity-50" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Viewport */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Chat Area */}
                    <div className="flex-1 flex flex-col bg-black/40 relative">
                        {/* Messages List */}
                        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 flex flex-col-reverse">
                            <div className="space-y-6">
                                {messages.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center py-20 text-neutral-700">
                                        <Lock className="w-12 h-12 mb-4 opacity-20" />
                                        <p className="italic font-serif">{t('secret_circles.start_conv')}</p>
                                    </div>
                                ) : (
                                    messages.map((msg) => (
                                        <div key={msg.id} className={`flex gap-3 ${msg.user_id === currentUser.id ? 'flex-row-reverse' : ''}`}>
                                            <img src={msg.profile?.avatar} className="w-8 h-8 rounded-full border border-neutral-800 shrink-0" alt={msg.profile?.name} />
                                            <div className={`max-w-[80%] md:max-w-[60%] ${msg.user_id === currentUser.id ? 'items-end' : 'items-start'} flex flex-col`}>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-[10px] font-bold text-neutral-500">{msg.profile?.name}</span>
                                                    <span className="text-[9px] text-neutral-700">
                                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>

                                                <div
                                                    className={`p-3 rounded-2xl ${msg.user_id === currentUser.id
                                                            ? 'bg-crimson-900/20 text-white rounded-tr-none border border-crimson-900/30'
                                                            : 'bg-neutral-900 text-neutral-200 rounded-tl-none border border-neutral-800'
                                                        }`}
                                                >
                                                    {msg.content && <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>}

                                                    {msg.image_url &&
                                                        (msg.is_ephemeral ? (
                                                            <div className="mt-2 min-w-[240px]">
                                                                <EphemeralMoment
                                                                    imageUrl={msg.image_url}
                                                                    isExpired={(() => {
                                                                        if (!msg.ephemeral_reveals || !msg.ephemeral_reveals[currentUser.id]) return false;
                                                                        const revealedAt = new Date(msg.ephemeral_reveals[currentUser.id]).getTime();
                                                                        return Date.now() - revealedAt > 10000;
                                                                    })()}
                                                                    onReveal={() => api.revealEphemeralMessage(msg.id, 'CIRCLE')}
                                                                />
                                                            </div>
                                                        ) : (
                                                            <img
                                                                src={msg.image_url}
                                                                className="mt-2 rounded-lg max-h-64 object-cover cursor-zoom-in hover:opacity-90 transition-opacity"
                                                                onClick={() => setFullScreenImage(msg.image_url)}
                                                                alt="Shared"
                                                            />
                                                        ))}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-neutral-950 border-t border-neutral-800">
                            <form onSubmit={handleSendMessage} className="flex items-center gap-3 max-w-4xl mx-auto">
                                <label className="p-2 text-neutral-500 hover:text-crimson-500 cursor-pointer transition-colors">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) handleSendMessage(undefined, file);
                                        }}
                                    />
                                    <Plus className="w-6 h-6" />
                                </label>

                                <input
                                    type="text"
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    placeholder={t('secret_circles.input_placeholder')}
                                    className="flex-1 bg-neutral-900 border border-neutral-800 rounded-full py-3 px-6 text-white focus:border-crimson-800 outline-none text-sm"
                                />

                                <button
                                    type="submit"
                                    disabled={isSending || !chatInput.trim()}
                                    className="p-3 bg-crimson-900 hover:bg-crimson-800 text-white rounded-full disabled:opacity-50 disabled:grayscale transition-all"
                                >
                                    {isSending ? (
                                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <Key className="w-5 h-5 rotate-90" />
                                    )}
                                </button>

                                {currentUser.isVip && (
                                    <button
                                        type="button"
                                        onClick={() => setIsEphemeralMode(!isEphemeralMode)}
                                        className={`p-3 rounded-full transition-all border ${isEphemeralMode
                                                ? 'bg-crimson-900/40 border-crimson-500 text-crimson-500 shadow-[0_0_10px_rgba(220,38,38,0.3)]'
                                                : 'bg-neutral-900 border-neutral-800 text-neutral-500 hover:text-neutral-300'
                                            }`}
                                        title={isEphemeralMode ? t('chat.ephemeral_active') : t('chat.activate_ephemeral')}
                                    >
                                        {isEphemeralMode ? <Zap className="w-5 h-5 fill-current" /> : <ZapOff className="w-5 h-5" />}
                                    </button>
                                )}
                            </form>
                        </div>
                    </div>

                    {/* Sidebar Membri (Desktop Only) */}
                    <div className="hidden lg:block w-72 border-l border-neutral-800 bg-neutral-950 p-6 overflow-y-auto">
                        <h3 className="text-[10px] uppercase text-neutral-500 font-bold tracking-widest mb-6">
                            {t('secret_circles.members_title', { count: members.length })}
                        </h3>

                        <div className="space-y-4">
                            {members.map((m) => (
                                <div key={m.id} className="flex items-center gap-3 p-2 rounded hover:bg-neutral-900/50 transition-colors">
                                    <img src={m.profile?.avatar} className="w-8 h-8 rounded-full border border-neutral-800" alt={m.profile?.name} />
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-1">
                                            <span className="text-xs font-bold text-neutral-200 truncate">{m.profile?.name}</span>
                                            {m.role === 'ADMIN' && <Shield className="w-3 h-3 text-gold-500" />}
                                        </div>
                                        <p className="text-[9px] text-neutral-600 uppercase tracking-tighter">{t(`roles.${m.profile?.role}`)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-10 p-4 border border-neutral-800 rounded-lg bg-neutral-900/30">
                            <h4 className="text-[10px] text-white font-bold uppercase mb-2">{t('secret_circles.description_label')}</h4>
                            <p className="text-xs text-neutral-500 leading-relaxed mb-4">
                                {selectedCircle.description || t('secret_circles.no_desc_hint')}
                            </p>

                            {selectedCircle.created_by === currentUser.id && (
                                <button
                                    onClick={handleDeleteCircle}
                                    className="w-full flex items-center justify-center gap-2 py-2 mt-2 border border-crimson-900/50 text-crimson-500 hover:bg-crimson-900/10 text-[10px] uppercase font-bold tracking-widest transition-colors"
                                >
                                    <Trash2 className="w-3 h-3" /> {t('secret_circles.delete_btn')}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // CREATE VIEW
    if (view === 'CREATE') {
        return (
            <div className="max-w-2xl mx-auto py-12 px-6">
                <button
                    onClick={() => setView('LIST')}
                    className="text-neutral-500 hover:text-white text-xs uppercase tracking-widest mb-8 flex items-center gap-1"
                >
                    <ChevronRight className="w-4 h-4 rotate-180" /> {t('common.cancel')}
                </button>

                <h2 className="text-3xl font-serif text-white mb-2">{t('secret_circles.create_title')}</h2>
                <p className="text-neutral-500 mb-8">{t('secret_circles.create_desc')}</p>

                {createdCode ? (
                    <div className="bg-green-900/20 border border-green-900 p-8 text-center animate-fade-in">
                        <Check className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <h3 className="text-2xl font-serif text-white mb-4">{t('secret_circles.created_title')}</h3>
                        <p className="text-neutral-400 mb-6">{t('secret_circles.created_desc')}</p>

                        <div className="bg-black/50 p-6 mb-8 inline-block rounded-lg border border-green-900/50">
                            <span className="block text-xs uppercase text-green-500 mb-2 font-bold tracking-widest">
                                {t('secret_circles.key_code_label')}
                            </span>
                            <span className="text-4xl font-mono text-white tracking-wider select-all">{createdCode}</span>
                        </div>

                        <button
                            onClick={() => {
                                setCreatedCode(null);
                                setView('LIST');
                            }}
                            className="block w-full bg-neutral-800 hover:bg-neutral-700 text-white uppercase font-bold py-4 tracking-widest transition-colors"
                        >
                            {t('secret_circles.back_to_list')}
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div>
                            <label className="text-xs uppercase text-neutral-500 font-bold block mb-2">{t('secret_circles.circle_name_label')}</label>
                            <input
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder={t('secret_circles.name_placeholder')}
                                className="w-full bg-neutral-900 border border-neutral-800 p-4 text-white focus:border-crimson-800 outline-none"
                            />
                        </div>

                        <div>
                            <label className="text-xs uppercase text-neutral-500 font-bold block mb-2">{t('secret_circles.circle_desc_label')}</label>
                            <textarea
                                value={newDesc}
                                onChange={(e) => setNewDesc(e.target.value)}
                                placeholder={t('secret_circles.desc_placeholder')}
                                className="w-full bg-neutral-900 border border-neutral-800 p-4 text-white focus:border-crimson-800 outline-none h-32"
                            />
                        </div>

                        <div>
                            <label className="text-xs uppercase text-neutral-500 font-bold block mb-2">{t('secret_circles.theme_label')}</label>
                            <select
                                value={newTheme}
                                onChange={(e) => setNewTheme(e.target.value)}
                                className="w-full bg-neutral-900 border border-neutral-800 p-4 text-white focus:border-crimson-800 outline-none"
                            >
                                <option value="Generico">{t('secret_circles.themes.generic')}</option>
                                <option value="BDSM">{t('secret_circles.themes.bdsm')}</option>
                                <option value="Scambisti">{t('secret_circles.themes.swingers')}</option>
                                <option value="Eventi">{t('secret_circles.themes.events')}</option>
                                <option value="Solo Donne">{t('secret_circles.themes.women_only')}</option>
                                <option value="Solo Uomini">{t('secret_circles.themes.men_only')}</option>
                            </select>
                        </div>

                        <button
                            onClick={handleCreate}
                            disabled={loading || !newName}
                            className="w-full bg-crimson-900 hover:bg-crimson-800 disabled:opacity-50 text-white font-serif uppercase tracking-widest py-4 border border-crimson-700 shadow-[0_0_20px_rgba(220,38,38,0.2)]"
                        >
                            {loading ? t('common.creating') : t('secret_circles.create_btn_action')}
                        </button>
                    </div>
                )}
            </div>
        );
    }

    // JOIN VIEW
    if (view === 'JOIN') {
        return (
            <div className="max-w-md mx-auto py-20 px-6 text-center">
                <Key className="w-16 h-16 text-neutral-700 mx-auto mb-6" />
                <h2 className="text-3xl font-serif text-white mb-2">{t('secret_circles.join_title')}</h2>
                <p className="text-neutral-500 mb-8">{t('secret_circles.join_desc')}</p>

                <input
                    type="text"
                    maxLength={6}
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder={t('secret_circles.code_placeholder')}
                    className="w-full bg-black border-2 border-neutral-800 p-4 text-center text-2xl font-mono text-white focus:border-crimson-500 outline-none mb-6 uppercase tracking-[0.5em]"
                />

                {joinError && (
                    <div className="text-crimson-500 text-sm mb-6 bg-crimson-900/10 p-2 border border-crimson-900/30">{joinError}</div>
                )}

                <div className="flex gap-4">
                    <button onClick={() => setView('LIST')} className="flex-1 py-3 text-neutral-500 hover:text-white uppercase font-bold text-xs">
                        {t('common.cancel')}
                    </button>
                    <button
                        onClick={handleJoin}
                        disabled={loading || inviteCode.length < 3}
                        className="flex-1 bg-white text-black hover:bg-neutral-200 uppercase font-bold tracking-widest py-3 disabled:opacity-50"
                    >
                        {loading ? t('common.verifying') : t('secret_circles.join_btn_action')}
                    </button>
                </div>
            </div>
        );
    }

    // LIST VIEW
    return (
        <div className="h-full p-4 md:p-8 overflow-y-auto">
            <div className="flex justify-between items-end mb-8 border-b border-neutral-800 pb-4">
                <div>
                    <h2 className="text-3xl font-serif text-white mb-2 flex items-center gap-3">
                        <Users className="w-8 h-8 text-neutral-400" /> {t('secret_circles.list_title')}
                    </h2>
                    <p className="text-neutral-500 text-sm">{t('secret_circles.list_subtitle')}</p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => setView('JOIN')}
                        className="flex items-center gap-2 px-4 py-2 border border-neutral-700 text-neutral-300 hover:text-white hover:border-white transition-colors text-xs uppercase font-bold tracking-widest"
                    >
                        <Key className="w-4 h-4" /> {t('secret_circles.join_nav_btn')}
                    </button>
                    <button
                        onClick={() => setView('CREATE')}
                        className="flex items-center gap-2 px-6 py-2 bg-crimson-900 hover:bg-crimson-800 text-white border border-crimson-700 transition-colors text-xs uppercase font-bold tracking-widest"
                    >
                        <Plus className="w-4 h-4" /> {t('secret_circles.create_nav_btn')}
                    </button>
                </div>
            </div>

            {circles.length === 0 ? (
                <div className="text-center py-20 border border-dashed border-neutral-800 rounded-lg">
                    <div className="w-20 h-20 bg-neutral-900 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Shield className="w-10 h-10 text-neutral-700" />
                    </div>
                    <h3 className="text-xl text-white font-serif mb-2">{t('secret_circles.empty_title')}</h3>
                    <p className="text-neutral-500 max-w-sm mx-auto mb-8">{t('secret_circles.empty_desc')}</p>
                    <div className="flex justify-center gap-4">
                        <button onClick={() => setView('CREATE')} className="px-6 py-3 bg-white text-black font-bold uppercase tracking-widest hover:bg-neutral-200 text-xs">
                            {t('secret_circles.start_now')}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {circles.map((circle) => (
                        <div
                            key={circle.id}
                            onClick={() => openCircle(circle)}
                            className="group bg-neutral-900 border border-neutral-800 p-6 hover:border-crimson-900/50 transition-all cursor-pointer hover:shadow-[0_0_20px_rgba(220,38,38,0.1)] relative overflow-hidden rounded-xl"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-50 group-hover:opacity-100 transition-opacity">
                                <ChevronRight className="w-5 h-5 text-neutral-600 group-hover:text-crimson-500" />
                            </div>

                            <span className="text-[10px] bg-neutral-950 text-neutral-500 px-2 py-1 uppercase tracking-widest border border-neutral-800 mb-4 inline-block">
                                {circle.theme}
                            </span>

                            <h3 className="text-xl font-serif text-white mb-2 group-hover:text-crimson-500 transition-colors">{circle.name}</h3>
                            <p className="text-neutral-500 text-sm line-clamp-2 mb-6">{circle.description || t('secret_circles.no_desc')}</p>

                            <div className="flex items-center justify-between border-t border-neutral-800 pt-4 mt-auto">
                                <span className="text-xs text-neutral-600 uppercase font-bold">
                                    {circle.circle_members?.role === 'ADMIN' ? t('secret_circles.role_admin') : t('secret_circles.role_member')}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SecretCircles;
