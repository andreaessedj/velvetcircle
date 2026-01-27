import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, Lock, ShieldAlert, Image as ImageIcon, Loader } from 'lucide-react';
import { ChatMessage, User } from '../../types';
import { api } from '../../services/db';

interface LoungeProps {
  currentUser: User;
}

const Lounge: React.FC<LoungeProps> = ({ currentUser }) => {
  const { t } = useTranslation();

  // Disclaimer iniziale obbligatorio
  const privacyDisclaimer: ChatMessage = {
    id: 'system-privacy',
    userId: 'system',
    userName: t('lounge.ghost_protocol'),
    userAvatar: 'https://ui-avatars.com/api/?name=Ghost&background=000&color=dc2626',
    content: t('lounge.privacy_warning'),
    timestamp: new Date(),
    isAi: true
  };

  const [messages, setMessages] = useState<ChatMessage[]>([privacyDisclaimer]);
  const [inputValue, setInputValue] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatConnectionRef = useRef<{ sendMessage: (msg: ChatMessage) => Promise<void>, leave: () => void } | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Connessione al canale Realtime all'avvio
  useEffect(() => {
    const connection = api.joinClubChat((incomingMessage) => {
      setMessages((prev) => {
        // Evita duplicati controllando l'ID
        if (prev.some(m => m.id === incomingMessage.id)) return prev;
        return [...prev, incomingMessage];
      });
    });

    chatConnectionRef.current = connection;

    return () => {
      connection.leave();
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (text = inputValue, imageUrl?: string) => {
    if (!text.trim() && !imageUrl) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      content: text,
      imageUrl: imageUrl,
      timestamp: new Date()
    };

    // 1. Mostra subito il messaggio localmente (Optimistic UI)
    setMessages(prev => [...prev, newMessage]);
    if (text === inputValue) setInputValue('');

    // 2. Trasmetti agli altri tramite Supabase
    if (chatConnectionRef.current) {
      await chatConnectionRef.current.sendMessage(newMessage);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const uploaded = await api.uploadVaultPhoto(file, currentUser.id, 0);
      await handleSend(`(${t('chat.photo')})`, uploaded.url);
    } catch (err) {
      console.error("Lounge image upload failed:", err);
      alert(t('chat.image_upload_error'));
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] bg-neutral-900 rounded-none border border-neutral-800 shadow-2xl relative">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleImageUpload}
      />

      {/* Header */}
      <div className="bg-neutral-950 p-4 border-b border-neutral-800 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-serif text-white tracking-widest flex items-center gap-2 uppercase">
            {t('dashboard.nav.club')} <span className="w-2 h-2 rounded-full bg-green-800 animate-pulse"></span>
          </h2>
          <p className="text-xs text-neutral-500 uppercase tracking-wide">{t('lounge.subtitle')}</p>
        </div>
        <div className="px-3 py-1 border border-crimson-900/50 rounded text-xs text-crimson-500 font-serif flex items-center gap-1">
          <ShieldAlert className="w-3 h-3" /> {t('lounge.ghost_status')}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-900 via-black to-black">
        {messages.map((msg) => {
          const isMe = msg.userId === currentUser.id;
          const isSystem = msg.userId === 'system';

          if (isSystem) {
            return (
              <div key={msg.id} className="flex justify-center my-8 animate-fade-in">
                <div className="bg-crimson-900/10 border border-crimson-900/40 p-6 max-w-2xl text-center backdrop-blur-sm rounded-lg">
                  <Lock className="w-5 h-5 text-crimson-500 mx-auto mb-3" />
                  <p className="text-crimson-400 text-xs uppercase tracking-widest font-bold mb-2">{msg.userName}</p>
                  <p className="text-crimson-200/80 text-sm font-serif italic leading-relaxed">{msg.content}</p>
                </div>
              </div>
            )
          }

          return (
            <div key={msg.id} className={`flex gap-4 ${isMe ? 'flex-row-reverse' : ''} animate-fade-in`}>
              <img src={msg.userAvatar} alt={msg.userName} className="w-10 h-10 rounded-full object-cover self-start border border-neutral-700" />
              <div className={`max-w-[75%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className={`flex items-center gap-2 mb-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                  <span className={`text-xs font-bold uppercase tracking-wider ${msg.isAi ? 'text-crimson-500' : 'text-neutral-400'}`}>
                    {msg.userName}
                  </span>
                  <span className="text-[10px] text-neutral-600">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className={`px-5 py-3 text-sm leading-relaxed font-sans rounded-2xl ${isMe
                  ? 'bg-crimson-900/20 border border-crimson-900/50 text-neutral-200 rounded-tr-none'
                  : msg.isAi
                    ? 'bg-neutral-900 border border-crimson-800/80 text-crimson-100 italic rounded-tl-none'
                    : 'bg-neutral-800/50 border border-neutral-800 text-neutral-300 rounded-tl-none'
                  }`}>
                  {msg.imageUrl && (
                    <div className="mb-2 rounded border border-white/10 overflow-hidden">
                      <img src={msg.imageUrl} className="max-w-full max-h-64 object-contain" alt="Chat content" />
                    </div>
                  )}
                  {msg.content}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-neutral-950 border-t border-neutral-800">
        <div className="flex gap-2 max-w-5xl mx-auto">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingImage}
            className="bg-neutral-900 hover:bg-crimson-900 text-neutral-400 hover:text-white border border-neutral-800 hover:border-crimson-800 px-5 transition-all flex items-center justify-center rounded-lg"
            title={t('chat.tooltips.send_image')}
          >
            {uploadingImage ? <Loader className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
          </button>

          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={t('lounge.input_placeholder')}
            className="flex-1 bg-black border border-neutral-800 text-neutral-200 px-5 py-3 focus:outline-none focus:border-crimson-900 transition-colors font-serif placeholder:text-neutral-700 placeholder:italic rounded-lg"
          />
          <button
            onClick={() => handleSend()}
            className="bg-neutral-900 hover:bg-crimson-900 text-neutral-400 hover:text-white border border-neutral-800 hover:border-crimson-800 px-5 transition-all rounded-lg"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Lounge;
