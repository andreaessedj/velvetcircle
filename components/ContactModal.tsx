import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Send, LifeBuoy, CheckCircle, Loader, MessageSquare } from 'lucide-react';
import { User } from '../types';

interface ContactModalProps {
    currentUser: User;
    onClose: () => void;
}

const ContactModal: React.FC<ContactModalProps> = ({ currentUser, onClose }) => {
    const { t } = useTranslation();
    const [topic, setTopic] = useState('Problemi Tecnici');
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const topics = [
        t('contact.topics.technical'),
        t('contact.topics.report'),
        t('contact.topics.payments'),
        t('contact.topics.suggestions'),
        t('contact.topics.other')
    ];

    const handleSend = async () => {
        if (!message.trim() || message.length > 400) return;

        setIsSending(true);
        try {
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: currentUser.id,
                    userName: currentUser.name,
                    userEmail: currentUser.email,
                    topic: topic,
                    message: message
                })
            });

            if (response.ok) {
                setIsSuccess(true);
                setTimeout(() => {
                    onClose();
                }, 3000);
            } else {
                alert(t('contact.error_send'));
            }
        } catch (e) {
            console.error(e);
            alert(t('contact.error_conn'));
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-neutral-950 border border-neutral-800 w-full max-w-md shadow-2xl relative overflow-hidden rounded-xl">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-crimson-700 to-transparent"></div>

                <button onClick={onClose} className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors">
                    <X className="w-6 h-6" />
                </button>

                <div className="p-8">
                    {isSuccess ? (
                        <div className="text-center py-10 animate-fade-in">
                            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                            <h3 className="text-2xl font-serif text-white mb-2">{t('contact.success_title')}</h3>
                            <p className="text-neutral-400 text-sm">
                                {t('contact.success_desc')}
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center gap-3 mb-6">
                                <LifeBuoy className="w-8 h-8 text-crimson-600" />
                                <div>
                                    <h3 className="text-xl font-serif text-white">{t('contact.title')}</h3>
                                    <p className="text-[10px] uppercase text-neutral-500 tracking-widest">{t('contact.subtitle')}</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-[10px] uppercase text-neutral-500 font-bold mb-2">{t('contact.topic_label')}</label>
                                    <select
                                        value={topic}
                                        onChange={(e) => setTopic(e.target.value)}
                                        className="w-full bg-black border border-neutral-800 text-white text-sm p-3 focus:border-crimson-900 outline-none font-serif rounded"
                                    >
                                        {topics.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="block text-[10px] uppercase text-neutral-500 font-bold">{t('contact.message_label')}</label>
                                        <span className={`text-[10px] font-mono ${message.length > 380 ? 'text-crimson-500' : 'text-neutral-600'}`}>
                                            {message.length} / 400
                                        </span>
                                    </div>
                                    <textarea
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value.substring(0, 400))}
                                        placeholder={t('contact.placeholder')}
                                        className="w-full bg-black border border-neutral-800 text-neutral-200 p-4 min-h-[140px] focus:border-crimson-900 outline-none font-sans text-sm rounded-lg resize-none placeholder:italic placeholder:text-neutral-700"
                                    />
                                    <p className="text-[9px] text-neutral-600 mt-2 italic">
                                        {t('contact.discretion_hint')}
                                    </p>
                                </div>

                                <button
                                    onClick={handleSend}
                                    disabled={isSending || !message.trim()}
                                    className="w-full bg-crimson-900 hover:bg-crimson-800 text-white py-4 uppercase font-serif tracking-widest text-xs font-bold flex items-center justify-center gap-2 transition-all border border-crimson-700 rounded-lg disabled:opacity-50 shadow-[0_0_15px_rgba(185,28,28,0.2)]"
                                >
                                    {isSending ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                    {t('contact.send_btn')}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ContactModal;
