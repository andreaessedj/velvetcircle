import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, MapPin, Clock, Tag, ChevronLeft, Plus, Trash2, Edit, X, ImageIcon, Share2, Copy } from 'lucide-react';
import { api } from '../../services/db';
import { ClubProfile, ClubEvent, User, UserRole } from '../../types';

interface ClubEventsProps {
    currentUser: User;
    club?: ClubProfile;
    onBack?: () => void;
}

const ClubEvents: React.FC<ClubEventsProps> = ({ currentUser, club, onBack }) => {
    const { t } = useTranslation();
    const [events, setEvents] = useState<ClubEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [newEvent, setNewEvent] = useState<Partial<ClubEvent>>({
        title: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        price: '',
        location: club?.address || '',
        images: []
    });
    const [eventPhotoInput, setEventPhotoInput] = useState('');
    const [editingEventId, setEditingEventId] = useState<string | null>(null);
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);

    const isOwner = currentUser.role === UserRole.CLUB && currentUser.id === club?.id;

    useEffect(() => {
        const loadEvents = async () => {
            try {
                const data = await api.getClubEvents(club?.id);
                setEvents(data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        loadEvents();
    }, [club]);

    const handleCreateEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!club) return;
        try {
            if (editingEventId) {
                await api.updateClubEvent(editingEventId, newEvent);
                alert("Evento aggiornato con successo");
            } else {
                await api.createClubEvent({
                    ...newEvent,
                    club_id: club.id,
                });
                alert("Evento pubblicato con successo");
            }
            setIsAdding(false);
            setEditingEventId(null);
            setNewEvent({ title: '', description: '', date: new Date().toISOString().split('T')[0], price: '', location: club.address, images: [] });
            setEventPhotoInput('');
            // Reload
            const data = await api.getClubEvents(club.id);
            setEvents(data);
        } catch (e) {
            alert("Errore durante il salvataggio dell'evento");
        }
    };

    const handleDeleteEvent = async (eventId: string) => {
        if (!confirm("Sei sicuro di voler eliminare questo evento?")) return;
        try {
            await api.deleteClubEvent(eventId);
            setEvents(events.filter(e => e.id !== eventId));
        } catch (e) {
            alert("Errore durante l'eliminazione dell'evento");
        }
    };

    const startEditing = (event: ClubEvent) => {
        setNewEvent({
            title: event.title,
            description: event.description,
            date: event.date.split('T')[0],
            price: event.price,
            location: event.location,
            images: event.images || []
        });
        setEditingEventId(event.id);
        setIsAdding(true);
    };

    if (loading) return <div className="p-10 text-neutral-500 animate-pulse font-serif text-center">Loading event whispers...</div>;

    return (
        <div className="space-y-8 animate-fade-in pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-neutral-900 pb-6">
                <div>
                    {onBack && (
                        <button onClick={onBack} className="text-neutral-500 hover:text-white flex items-center gap-2 text-xs uppercase font-bold mb-4 transition-colors group">
                            <div className="bg-neutral-900 p-1.5 rounded-full group-hover:bg-neutral-800 transition-colors">
                                <ChevronLeft className="w-4 h-4" />
                            </div>
                            {t('common.back_to_list', 'Torna alla lista')}
                        </button>
                    )}
                    <h2 className="text-4xl font-serif text-white mb-2">{club ? `${t('clubs.events_at')} ${club.name}` : t('clubs.all_events')}</h2>
                    <p className="text-neutral-500 uppercase tracking-widest text-xs">Explore the next 6 months of exclusive events</p>
                </div>

                {isOwner && (
                    <button
                        onClick={() => {
                            setEditingEventId(null);
                            setNewEvent({ title: '', description: '', date: new Date().toISOString().split('T')[0], price: '', location: club?.address || '', images: [] });
                            setIsAdding(!isAdding);
                        }}
                        className="bg-amber-600 hover:bg-amber-500 text-black px-6 py-3 text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2"
                    >
                        {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        {isAdding ? t('common.cancel') : 'Create New Event'}
                    </button>
                )}
            </div>

            {isAdding && (
                <div className="bg-neutral-900/50 border border-amber-900/30 p-8 mb-8 animate-fade-in">
                    <h3 className="text-xl font-serif text-white mb-6">
                        {editingEventId ? "Modifica Evento" : "Crea Nuovo Evento"}
                    </h3>
                    <form onSubmit={handleCreateEvent} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-xs uppercase text-neutral-500 mb-2">Event Title</label>
                            <input
                                type="text"
                                value={newEvent.title}
                                onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                                className="w-full bg-black border border-neutral-800 text-white p-3 outline-none focus:border-amber-600"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs uppercase text-neutral-500 mb-2">Date</label>
                            <input
                                type="date"
                                value={newEvent.date?.split('T')[0]}
                                onChange={e => setNewEvent({ ...newEvent, date: new Date(e.target.value).toISOString() })}
                                className="w-full bg-black border border-neutral-800 text-white p-3 outline-none focus:border-amber-600"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs uppercase text-neutral-500 mb-2">Price / Entry</label>
                            <input
                                type="text"
                                value={newEvent.price}
                                onChange={e => setNewEvent({ ...newEvent, price: e.target.value })}
                                className="w-full bg-black border border-neutral-800 text-white p-3 outline-none focus:border-amber-600"
                                placeholder="Free / 50€ / Members Only"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs uppercase text-neutral-500 mb-2">Description</label>
                            <textarea
                                value={newEvent.description}
                                onChange={e => setNewEvent({ ...newEvent, description: e.target.value })}
                                className="w-full bg-black border border-neutral-800 text-white p-3 h-32 outline-none focus:border-amber-600 resize-none"
                            ></textarea>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-xs uppercase text-neutral-500 mb-2">{t('clubs.event_photos')}</label>
                            <div className="flex gap-2 mb-4">
                                <input
                                    type="text"
                                    value={eventPhotoInput}
                                    onChange={e => setEventPhotoInput(e.target.value)}
                                    className="flex-1 bg-black border border-neutral-800 text-white p-3 text-xs focus:border-amber-600 outline-none"
                                    placeholder="https://event-image.jpg"
                                    disabled={(newEvent.images?.length || 0) >= 4}
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (eventPhotoInput && (newEvent.images?.length || 0) < 4) {
                                            setNewEvent({ ...newEvent, images: [...(newEvent.images || []), eventPhotoInput] });
                                            setEventPhotoInput('');
                                        }
                                    }}
                                    className="bg-neutral-800 px-4 text-white font-bold disabled:opacity-50"
                                    disabled={(newEvent.images?.length || 0) >= 4}
                                >
                                    +
                                </button>
                            </div>
                            <div className="flex gap-4">
                                {newEvent.images?.map((p, idx) => (
                                    <div key={idx} className="relative group w-20 h-20">
                                        <img src={p} className="w-full h-full object-cover border border-neutral-800 rounded" />
                                        <button
                                            type="button"
                                            onClick={() => setNewEvent({ ...newEvent, images: newEvent.images?.filter((_, i) => i !== idx) })}
                                            className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="md:col-span-2 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => { setIsAdding(false); setEditingEventId(null); }}
                                className="text-neutral-500 hover:text-white text-xs uppercase font-bold px-6"
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                type="submit"
                                className="bg-amber-600 hover:bg-amber-500 text-black px-8 py-3 text-xs font-bold uppercase transition-all"
                            >
                                {editingEventId ? "Salva Modifiche" : t('clubs.create_event')}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="space-y-6">
                {events.length === 0 ? (
                    <div className="py-20 text-center border border-dashed border-neutral-900 text-neutral-600 rounded-lg">
                        <Calendar className="w-12 h-12 mx-auto mb-4 opacity-10" />
                        <p className="font-serif">No events scheduled for this period.</p>
                    </div>
                ) : (
                    events.map(event => (
                        <div key={event.id} className="group bg-neutral-950 border border-neutral-900 p-6 flex flex-col md:flex-row gap-6 hover:border-amber-900/30 transition-all">
                            <div className="w-full md:w-32 flex flex-col items-center justify-center bg-neutral-900/50 p-4 border border-neutral-800">
                                <span className="text-3xl font-serif text-white">
                                    {new Date(event.date).getDate()}
                                </span>
                                <span className="text-[10px] uppercase text-amber-500 font-bold tracking-[0.2em]">
                                    {new Date(event.date).toLocaleString('default', { month: 'short' })}
                                </span>
                                <span className="text-[10px] text-neutral-600 mt-2 font-mono">
                                    {new Date(event.date).getFullYear()}
                                </span>
                            </div>

                            <div className="flex-1">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="text-2xl font-serif text-white group-hover:text-amber-500 transition-colors uppercase">{event.title}</h3>
                                    <div className="bg-neutral-900 px-3 py-1 rounded-full text-[10px] text-amber-400 font-bold border border-amber-900/20">
                                        {event.price ? (event.price.includes('€') ? event.price : `${event.price}€`) : 'Secret Entry'}
                                    </div>
                                </div>

                                <p className="text-neutral-400 text-sm mb-6 leading-relaxed">
                                    {event.description || 'Una serata dedicata all\'esplorazione dei sensi alle porte della mezzanotte.'}
                                </p>

                                <div className="flex flex-wrap items-center gap-6 text-[10px] uppercase font-bold tracking-widest text-neutral-500">
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-3.5 h-3.5 text-neutral-700" />
                                        <span>{new Date(event.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <a
                                        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent((event.location || club?.address || '') + ', ' + (club?.city || ''))}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 hover:text-amber-500 transition-colors"
                                    >
                                        <MapPin className="w-3.5 h-3.5 text-neutral-700" />
                                        <span>{event.location || club?.address} (Naviga)</span>
                                    </a>
                                </div>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    <SocialShareButtons event={event} clubName={club?.name} />
                                </div>

                                {event.images && event.images.length > 0 && (
                                    <div className="mt-6 flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                                        {event.images.map((img, i) => (
                                            <img
                                                key={i}
                                                src={img}
                                                className="w-24 h-24 object-cover border border-neutral-800 hover:border-amber-600 transition-colors cursor-zoom-in"
                                                alt={`Event ${i}`}
                                                onClick={() => setZoomedImage(img)}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>

                            {isOwner && (
                                <div className="flex md:flex-col gap-2 justify-end">
                                    <button
                                        onClick={() => startEditing(event)}
                                        className="p-3 bg-neutral-900 hover:bg-neutral-800 text-neutral-500 hover:text-white transition-colors border border-neutral-800"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteEvent(event.id)}
                                        className="p-3 bg-neutral-900 hover:bg-red-900/20 text-neutral-500 hover:text-red-500 transition-colors border border-neutral-800"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Image Zoom Overlay */}
            {zoomedImage && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 animate-fade-in backdrop-blur-sm"
                    onClick={() => setZoomedImage(null)}
                >
                    <button className="absolute top-6 right-6 text-white bg-neutral-900/50 p-3 rounded-full hover:bg-neutral-800 transition-colors">
                        <X className="w-8 h-8" />
                    </button>
                    <img
                        src={zoomedImage}
                        className="max-w-full max-h-full object-contain shadow-2xl animate-zoom-in"
                        alt="Zoomed"
                    />
                </div>
            )}
        </div>
    );
};

const SocialShareButtons = ({ event, clubName }: { event: ClubEvent; clubName?: string }) => {
    const { t } = useTranslation();
    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
    // Construct text in Italian as requested
    const shareText = `Scopri l'evento ${event.title} presso ${clubName || 'Velvet Club'}! 
📅 ${new Date(event.date).toLocaleDateString('it-IT')} 
📍 ${event.location || 'Secret Location'}
✨ Condiviso da Velvet Club`;

    const encodedText = encodeURIComponent(shareText);
    const encodedUrl = encodeURIComponent(shareUrl);

    const handleShare = (platform: string) => {
        let url = '';
        switch (platform) {
            case 'whatsapp':
                url = `https://wa.me/?text=${encodedText}%20${encodedUrl}`;
                break;
            case 'telegram':
                url = `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;
                break;
            case 'x':
                url = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
                break;
            case 'instagram':
                // Instagram logic: Copy text and open instagram
                navigator.clipboard.writeText(`${shareText} ${shareUrl}`).then(() => {
                    alert("Testo copiato! Apro Instagram...");
                    window.open('https://instagram.com', '_blank');
                });
                return;
        }
        if (url) window.open(url, '_blank');
    };

    return (
        <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-neutral-600 tracking-wider mr-2">{t('common.share', 'Condividi')}:</span>

            {/* Instagram */}
            <button onClick={() => handleShare('instagram')} className="p-2 bg-neutral-900 rounded hover:bg-[#E1306C] hover:text-white text-neutral-400 transition-colors group" title="Condividi su Instagram">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
            </button>

            {/* X (Twitter) */}
            <button onClick={() => handleShare('x')} className="p-2 bg-neutral-900 rounded hover:bg-white hover:text-black text-neutral-400 transition-colors group" title="Condividi su X">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M4 4l11.733 16h4.667L8.667 4H4z" fill="currentColor" stroke="none" /><path d="M4 20l6.768-6.768m2.46-2.46L20 4" /></svg>
            </button>

            {/* Telegram */}
            <button onClick={() => handleShare('telegram')} className="p-2 bg-neutral-900 rounded hover:bg-[#0088cc] hover:text-white text-neutral-400 transition-colors group" title="Condividi su Telegram">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            </button>

            {/* Whatsapp */}
            <button onClick={() => handleShare('whatsapp')} className="p-2 bg-neutral-900 rounded hover:bg-[#25D366] hover:text-white text-neutral-400 transition-colors group" title="Condividi su Whatsapp">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
            </button>
        </div>
    );
};

export default ClubEvents;
