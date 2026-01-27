import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Phone, ArrowLeft, Navigation, Camera, X } from 'lucide-react';
import { ClubProfile } from '../../types';

interface ClubProfileViewProps {
    club: ClubProfile;
    onBack: () => void;
}

const ClubProfileView: React.FC<ClubProfileViewProps> = ({ club, onBack }) => {
    const { t } = useTranslation();
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);

    return (
        <div className="max-w-4xl mx-auto py-10 px-6 animate-fade-in">
            <button
                onClick={onBack}
                className="flex items-center gap-2 text-neutral-500 hover:text-white transition-colors mb-8 group"
            >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span className="text-xs uppercase font-bold tracking-widest">{t('common.back_to_list', 'Torna alla lista')}</span>
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
                <div className="space-y-6">
                    <div className="relative aspect-square overflow-hidden rounded-lg border border-neutral-900 shadow-2xl group">
                        <img
                            src={club.photos?.[0] || club.avatar}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                            alt={club.name}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                        <div className="absolute bottom-6 left-6">
                            <h2 className="text-4xl font-serif text-white mb-2">{club.name}</h2>
                            <div className="flex items-center gap-3">
                                <span className="bg-amber-600/90 text-black text-[10px] font-bold px-2 py-0.5 rounded uppercase">{club.city}</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                        {club.photos?.slice(1).map((p, i) => (
                            <div
                                key={i}
                                className="aspect-square rounded border border-neutral-900 overflow-hidden cursor-zoom-in group"
                                onClick={() => setZoomedImage(p)}
                            >
                                <img src={p} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="space-y-10">
                    <div className="space-y-4">
                        <label className="text-[10px] uppercase text-neutral-600 font-bold tracking-[0.2em]">{t('clubs.club_info', 'Informazioni locale')}</label>
                        <div className="space-y-6">
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded bg-neutral-950 border border-neutral-900 flex items-center justify-center shrink-0">
                                    <MapPin className="w-5 h-5 text-amber-600" />
                                </div>
                                <div>
                                    <p className="text-white font-serif">{club.address}</p>
                                    <p className="text-neutral-500 text-sm">{club.city}</p>
                                    <a
                                        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(club.address + ', ' + club.city)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-[10px] text-amber-500 hover:text-amber-400 mt-2 font-bold uppercase tracking-wider"
                                    >
                                        <Navigation className="w-3 h-3" /> {t('clubs.get_directions', 'Ottieni indicazioni')}
                                    </a>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded bg-neutral-950 border border-neutral-900 flex items-center justify-center shrink-0">
                                    <Phone className="w-5 h-5 text-amber-600" />
                                </div>
                                <div>
                                    <p className="text-white font-serif">{club.phone}</p>
                                    <p className="text-neutral-500 text-sm">{t('clubs.contact_phone', 'Recapito telefonico')}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {club.bio && (
                        <div className="space-y-4">
                            <label className="text-[10px] uppercase text-neutral-600 font-bold tracking-[0.2em]">{t('profile_editor.details.bio_label', 'Descrizione')}</label>
                            <div className="bg-neutral-950 border-l-2 border-amber-600 p-6 rounded-r-lg">
                                <p className="text-neutral-300 italic font-serif leading-relaxed whitespace-pre-wrap">
                                    "{club.bio}"
                                </p>
                            </div>
                        </div>
                    )}

                    {!club.bio && (
                        <div className="bg-neutral-950 p-6 text-center border border-dashed border-neutral-900 rounded-lg">
                            <p className="text-neutral-600 text-sm italic">{t('clubs.no_desc', 'Nessuna descrizione disponibile per questo locale.')}</p>
                        </div>
                    )}
                </div>
            </div>

            {zoomedImage && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 animate-fade-in backdrop-blur-md"
                    onClick={() => setZoomedImage(null)}
                >
                    <button className="absolute top-6 right-6 text-white bg-neutral-900/50 p-3 rounded-full hover:bg-neutral-800 transition-colors">
                        <X className="w-8 h-8" />
                    </button>
                    <img
                        src={zoomedImage}
                        className="max-w-full max-h-full object-contain shadow-2xl animate-zoom-in rounded-lg"
                        alt="Zoomed"
                    />
                </div>
            )}
        </div>
    );
};

export default ClubProfileView;
