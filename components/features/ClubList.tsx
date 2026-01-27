import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Phone, Calendar, ChevronRight, Star, Clock, Info, X, Navigation } from 'lucide-react';
import { api } from '../../services/db';
import { ClubProfile, ClubEvent, User } from '../../types';

interface ClubListProps {
    currentUser: User;
    onOpenEvents: (club: ClubProfile) => void;
    onOpenProfile: (club: ClubProfile) => void;
}

const ClubList: React.FC<ClubListProps> = ({ currentUser, onOpenEvents, onOpenProfile }) => {
    const { t } = useTranslation();
    const [clubs, setClubs] = useState<ClubProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [hoveredClubId, setHoveredClubId] = useState<string | null>(null);
    const [currentPhotoIdx, setCurrentPhotoIdx] = useState(0);
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);

    useEffect(() => {
        const loadClubs = async () => {
            try {
                const data = await api.getClubs();
                setClubs(data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        loadClubs();
    }, []);

    // Photo slider effect for hovered club
    useEffect(() => {
        let interval: any;
        if (hoveredClubId) {
            const club = clubs.find(c => c.id === hoveredClubId);
            if (club && club.photos && club.photos.length > 1) {
                interval = setInterval(() => {
                    setCurrentPhotoIdx(prev => (prev + 1) % club.photos.length);
                }, 2000);
            }
        } else {
            setCurrentPhotoIdx(0);
        }
        return () => clearInterval(interval);
    }, [hoveredClubId, clubs]);

    if (loading) return <div className="flex justify-center p-20 text-neutral-500 animate-pulse font-serif">Loading exclusive locations...</div>;

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="border-b border-neutral-900 pb-6">
                <h2 className="text-4xl font-serif text-white mb-2">{t('clubs.title')}</h2>
                <p className="text-neutral-500 uppercase tracking-widest text-xs">{t('clubs.subtitle')}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {clubs.map((club) => (
                    <div
                        key={club.id}
                        onMouseEnter={() => setHoveredClubId(club.id)}
                        onMouseLeave={() => setHoveredClubId(null)}
                        className="group relative bg-neutral-950 border border-neutral-900 overflow-hidden transition-all duration-500 hover:border-amber-900/50 hover:shadow-[0_0_30px_rgba(251,191,36,0.1)]"
                    >
                        {/* Background Image / Slider */}
                        <div className="h-48 relative overflow-hidden">
                            <img
                                src={(hoveredClubId === club.id && club.photos && club.photos.length > 0) ? club.photos[currentPhotoIdx] : (club.photos?.[0] || club.avatar)}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 cursor-zoom-in"
                                alt={club.name}
                                onClick={(e) => { e.stopPropagation(); setZoomedImage((hoveredClubId === club.id && club.photos && club.photos.length > 0) ? club.photos[currentPhotoIdx] : (club.photos?.[0] || club.avatar)); }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/20 to-transparent"></div>

                            {/* Photo Indicator */}
                            {hoveredClubId === club.id && club.photos && club.photos.length > 1 && (
                                <div className="absolute bottom-4 right-4 flex gap-1">
                                    {club.photos.map((_, i) => (
                                        <div key={i} className={`w-1 h-1 rounded-full transition-all ${i === currentPhotoIdx ? 'bg-amber-500 w-3' : 'bg-white/30'}`}></div>
                                    ))}
                                </div>
                            )}

                            <div className="absolute bottom-4 left-4">
                                <span className="bg-amber-600/90 text-black text-[10px] font-bold px-2 py-0.5 rounded uppercase flex items-center gap-1">
                                    <Star className="w-3 h-3 fill-current" /> Exclusive club
                                </span>
                            </div>
                        </div>

                        <div className="p-6">
                            <h3 className="text-xl font-serif text-white mb-2 group-hover:text-amber-500 transition-colors">{club.name}</h3>

                            <div className="space-y-2 mb-6">
                                <a
                                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(club.address + ', ' + club.city)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-neutral-400 text-xs hover:text-amber-500 transition-colors"
                                >
                                    <Navigation className="w-3.5 h-3.5 text-neutral-600" />
                                    <span>{club.address}, {club.city}</span>
                                </a>
                                <div className="flex items-center gap-2 text-neutral-400 text-xs">
                                    <Phone className="w-3.5 h-3.5 text-neutral-600" />
                                    <span>{club.phone}</span>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => onOpenProfile(club)}
                                    className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 py-3 text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                                >
                                    <Info className="w-3.5 h-3.5" />
                                    {t('clubs.view_profile', 'Profilo')}
                                </button>
                                <button
                                    onClick={() => onOpenEvents(club)}
                                    className="flex-1 bg-amber-900/20 hover:bg-amber-900/40 text-amber-500 border border-amber-900/30 py-3 text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                                >
                                    <Calendar className="w-3.5 h-3.5" />
                                    {t('clubs.view_events', 'Eventi')}
                                </button>
                            </div>
                        </div>

                        {/* Hover Decor */}
                        <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-amber-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </div>
                ))}
            </div>

            {clubs.length === 0 && (
                <div className="text-center py-20 border border-dashed border-neutral-900 text-neutral-600">
                    <MapPin className="w-12 h-12 mx-auto mb-4 opacity-10" />
                    <p className="font-serif">No clubs recorded in the shadow yet.</p>
                </div>
            )}

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

export default ClubList;
