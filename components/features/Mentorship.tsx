import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Confession } from '../../types';
import { VenetianMask, Heart, MessageCircle, Send, Loader, Lock } from 'lucide-react';
import { api } from '../../services/db';

interface MentorshipProps {
    currentUser: User;
}

const Mentorship: React.FC<MentorshipProps> = ({ currentUser }) => {
    const { t } = useTranslation();
    const [confessions, setConfessions] = useState<Confession[]>([]);
    const [loading, setLoading] = useState(true);

    // New Confession Form State
    const [showForm, setShowForm] = useState(false);
    const [newContent, setNewContent] = useState('');
    const [selectedTag, setSelectedTag] = useState<string>('Fantasy');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const TAGS = ['Fantasy', 'Real Story', 'Voyeur', 'Exhibitionist', 'Desire', 'Secret'];

    const getTranslatedTag = (tag: string) => {
        const key = tag.toLowerCase().replace(' ', '_');
        return t(`confessional.tags.${key}`, tag);
    };

    const loadConfessions = async () => {
        try {
            const data = await api.getConfessions();
            setConfessions(data);
        } catch (e) {
            console.error("Error loading confessions", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadConfessions();
    }, []);

    const handleSubmit = async () => {
        if (!newContent.trim()) return;
        setIsSubmitting(true);
        try {
            const newConfession: Partial<Confession> = {
                author_alias: t('confessional.anonymous'),
                author_role: currentUser.role,
                avatar: 'https://ui-avatars.com/api/?name=A&background=000&color=333',
                content: newContent,
                tags: [selectedTag],
                likes: 0
            };
            await api.createConfession(newConfession);
            setNewContent('');
            setShowForm(false);
            loadConfessions();
        } catch (e) {
            console.error(e);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleLike = async (id: string, currentLikes: number) => {
        setConfessions(prev => prev.map(c => c.id === id ? { ...c, likes: currentLikes + 1 } : c));
        try {
            await api.likeConfession(id, currentLikes);
        } catch (e) {
            loadConfessions();
        }
    };

    return (
        <div className="max-w-4xl mx-auto pb-20">
            <div className="bg-neutral-900 border border-neutral-800 p-8 mb-10 text-center relative overflow-hidden rounded-xl">
                <VenetianMask className="w-20 h-20 text-neutral-800 absolute -top-4 -left-4 opacity-50" />
                <h2 className="text-3xl font-serif text-white mb-2 relative z-10">{t('confessional.title')}</h2>
                <p className="text-neutral-400 max-w-xl mx-auto font-serif italic relative z-10 mb-6">
                    {t('confessional.desc')}
                </p>

                <div className="flex flex-col md:flex-row justify-center gap-4 relative z-10">
                    {!showForm && (
                        currentUser.isVip ? (
                            <button
                                onClick={() => setShowForm(true)}
                                className="bg-crimson-900 text-white px-8 py-3 font-serif uppercase tracking-widest text-xs hover:bg-crimson-800 transition-all border border-crimson-700 shadow-[0_0_15px_rgba(185,28,28,0.2)] rounded"
                            >
                                {t('confessional.new_btn')}
                            </button>
                        ) : (
                            <button
                                disabled
                                className="bg-neutral-800/50 text-neutral-600 px-8 py-3 font-serif uppercase tracking-widest text-xs border border-neutral-800 flex items-center gap-2 opacity-50 rounded"
                            >
                                <Lock className="w-3 h-3" /> {t('confessional.vip_reserved')}
                            </button>
                        )
                    )}
                </div>

                {showForm && (
                    <div className="max-w-lg mx-auto bg-black p-6 border border-neutral-800 animate-fade-in relative z-20 mt-8 rounded-lg shadow-2xl">
                        <textarea
                            value={newContent}
                            onChange={(e) => setNewContent(e.target.value)}
                            placeholder={t('confessional.placeholder')}
                            className="w-full bg-neutral-900 border border-neutral-800 text-neutral-200 p-4 min-h-[120px] focus:border-crimson-900 outline-none font-serif mb-4 placeholder:italic rounded"
                        />
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div className="flex gap-2 overflow-x-auto pb-2 w-full sm:w-auto scrollbar-hide">
                                {TAGS.map(tag => (
                                    <button
                                        key={tag}
                                        onClick={() => setSelectedTag(tag)}
                                        className={`text-[10px] uppercase px-3 py-1.5 border transition-all rounded whitespace-nowrap ${selectedTag === tag ? 'bg-crimson-900 border-crimson-700 text-white' : 'border-neutral-800 text-neutral-500 hover:border-neutral-600'}`}
                                    >
                                        {getTranslatedTag(tag)}
                                    </button>
                                ))}
                            </div>
                            <div className="flex gap-3 ml-auto">
                                <button onClick={() => setShowForm(false)} className="text-neutral-500 text-xs hover:text-white px-2 transition-colors">{t('common.cancel')}</button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting || !newContent.trim()}
                                    className="bg-white text-black px-6 py-2 uppercase font-bold text-xs flex items-center gap-2 hover:bg-neutral-200 disabled:opacity-50 transition-all rounded shadow-lg"
                                >
                                    {isSubmitting ? <Loader className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                                    {t('confessional.send_btn')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {loading ? (
                <div className="flex justify-center p-10"><Loader className="animate-spin text-crimson-800 w-8 h-8" /></div>
            ) : (
                <div className="space-y-6">
                    {confessions.length === 0 && (
                        <div className="text-center text-neutral-600 font-serif italic py-20 bg-neutral-950/50 border border-dashed border-neutral-900 rounded-xl">
                            {t('confessional.empty')}
                        </div>
                    )}

                    {confessions.map(post => (
                        <div key={post.id} className="bg-black border border-neutral-900 p-6 md:p-8 hover:border-crimson-900/30 transition-all group animate-fade-in rounded-xl">
                            <div className="flex items-start gap-4 md:gap-6">
                                <div className="flex-shrink-0 hidden sm:block">
                                    <div className="w-14 h-14 bg-neutral-900 rounded-full flex items-center justify-center border border-neutral-800 group-hover:border-crimson-900/50 transition-colors">
                                        <VenetianMask className="w-7 h-7 text-neutral-700 group-hover:text-crimson-700 transition-colors" />
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="sm:hidden w-8 h-8 bg-neutral-900 rounded-full flex items-center justify-center border border-neutral-800">
                                                <VenetianMask className="w-4 h-4 text-neutral-700" />
                                            </div>
                                            <span className="font-serif text-neutral-400 text-sm flex items-center gap-2">
                                                {post.author_alias}
                                                <span className="text-[10px] text-neutral-600 uppercase tracking-widest px-2 py-0.5 border border-neutral-800 rounded bg-neutral-950">
                                                    {t(`roles.${post.author_role}`, post.author_role.replace('_', ' '))}
                                                </span>
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap justify-end gap-2">
                                            {post.tags && post.tags.map(tag => (
                                                <span key={tag} className="text-[9px] uppercase tracking-widest text-crimson-500 bg-crimson-950/20 px-2.5 py-1 border border-crimson-900/30 rounded-full">
                                                    {getTranslatedTag(tag)}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <p className="text-neutral-200 text-lg font-serif leading-relaxed mb-6 whitespace-pre-line">
                                        "{post.content}"
                                    </p>

                                    <div className="flex items-center gap-6 border-t border-neutral-900/50 pt-4 mt-6">
                                        <button
                                            onClick={() => handleLike(post.id, post.likes)}
                                            className="flex items-center gap-2 text-neutral-500 hover:text-crimson-500 transition-all text-sm group/btn"
                                        >
                                            <Heart className={`w-4 h-4 transition-all ${post.likes > 0 ? 'text-crimson-600 group-hover/btn:scale-110' : 'group-hover/btn:fill-crimson-500'}`} />
                                            <span className="font-mono">{post.likes}</span>
                                        </button>
                                        <button className="flex items-center gap-2 text-neutral-500 hover:text-white transition-colors text-sm cursor-not-allowed opacity-40">
                                            <MessageCircle className="w-4 h-4" />
                                            {t('confessional.comments_disabled')}
                                        </button>
                                        <span className="ml-auto text-[9px] text-neutral-800 font-mono tracking-tighter uppercase hidden sm:block">
                                            REF: {post.id.slice(0, 8)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Mentorship;
