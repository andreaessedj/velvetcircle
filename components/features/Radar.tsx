
import React, { useState, useEffect, useRef } from 'react';
import { Radar, Navigation, MapPin, Loader, Radio, Map as MapIcon, List, MessageSquare, Plus, ShieldCheck, X, Activity, Lock, Bot } from 'lucide-react';
import { User, RadarSignal } from '../../types';
import { api } from '../../services/db';
import { supabase } from '../../lib/supabase';
import L from 'leaflet';

interface RadarProps {
    currentUser: User;
    onOpenChat: (user: { id: string, name: string, avatar: string }) => void;
}

// Coordinate Città Italiane per garantire terraferma
const ITALIAN_CITIES = [
    { name: "Milano", lat: 45.4642, lng: 9.1900 },
    { name: "Roma", lat: 41.9028, lng: 12.4964 },
    { name: "Napoli", lat: 40.8518, lng: 14.2681 },
    { name: "Torino", lat: 45.0703, lng: 7.6869 },
    { name: "Palermo", lat: 38.1157, lng: 13.3615 },
    { name: "Genova", lat: 44.4056, lng: 8.9463 },
    { name: "Bologna", lat: 44.4949, lng: 11.3426 },
    { name: "Firenze", lat: 43.7696, lng: 11.2558 },
    { name: "Bari", lat: 41.1171, lng: 16.8719 },
    { name: "Catania", lat: 37.5079, lng: 15.0830 },
    { name: "Verona", lat: 45.4384, lng: 10.9916 },
    { name: "Venezia", lat: 45.4408, lng: 12.3155 }, // Mestre/Terraferma
    { name: "Messina", lat: 38.1938, lng: 15.5540 },
    { name: "Padova", lat: 45.4064, lng: 11.8768 },
    { name: "Trieste", lat: 45.6495, lng: 13.7768 },
    { name: "Lecce", lat: 40.3515, lng: 18.1750 },
    { name: "Cagliari", lat: 39.2238, lng: 9.1217 }
];

// Haversine formula to calculate distance in km
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
};

const RadarView: React.FC<RadarProps> = ({ currentUser, onOpenChat }) => {
    const [signals, setSignals] = useState<RadarSignal[]>([]);
    const [myLocation, setMyLocation] = useState<{ lat: number, lng: number } | null>(null);
    const [broadcastMessage, setBroadcastMessage] = useState("Disponibili per un drink");
    const [loading, setLoading] = useState(false);
    const [broadcasting, setBroadcasting] = useState(false);
    const [permissionError, setPermissionError] = useState('');
    const [viewMode, setViewMode] = useState<'LIST' | 'MAP'>('MAP');
    const [showMobileBroadcast, setShowMobileBroadcast] = useState(false);

    // LIVE TRACKING STATE
    const [liveTracking, setLiveTracking] = useState(false);
    const [activeCheckinId, setActiveCheckinId] = useState<string | null>(null);

    // Refs per gestire lo stato asincrono nei callback del GPS
    const watchIdRef = useRef<number | null>(null);
    const checkinIdRef = useRef<string | null>(null);
    const ignoreMySignalRef = useRef(false);

    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<L.Map | null>(null);
    const markersRef = useRef<L.Marker[]>([]);

    // Sincronizza il ref con lo stato
    useEffect(() => {
        checkinIdRef.current = activeCheckinId;
    }, [activeCheckinId]);

    const refreshSignals = async (isBackground = false) => {
        if (!isBackground) setLoading(true);
        try {
            const data = await api.getRadarSignals();

            // Filtro ignora: se ho appena cancellato, ignora il mio segnale se il DB è lento
            const filteredRealData = ignoreMySignalRef.current
                ? data.filter(s => s.user_id !== currentUser.id)
                : data;

            // Unione dati reali
            setSignals(filteredRealData);

            // LOGICA DI SINC:
            // Se non ho un ID locale, controllo se il server ne ha uno per me (recupero sessione/refresh pagina)
            if (!activeCheckinId && !ignoreMySignalRef.current) {
                const mySignal = filteredRealData.find(s => s.user_id === currentUser.id);
                if (mySignal) {
                    setActiveCheckinId(mySignal.id);
                    checkinIdRef.current = mySignal.id;
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            if (!isBackground) setLoading(false);
        }
    };

    useEffect(() => {
        refreshSignals(false);

        // 1. Polling di backup (ogni 30s)
        const intervalId = setInterval(() => {
            refreshSignals(true);
        }, 30000);

        // 2. Realtime Subscription (Reazione istantanea)
        const channel = supabase.channel('radar-updates')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'radar_checkins' },
                (payload) => {
                    // CHANGE: Immediate local update for deletions to feel instant
                    if (payload.eventType === 'DELETE') {
                        setSignals(prev => prev.filter(s => s.id !== payload.old.id));

                        // Se l'evento di cancellazione riguarda il MIO check-in attivo
                        // Nota: payload.old contiene l'id del record
                        if (payload.old.id === checkinIdRef.current) {
                            stopLiveTracking();
                        }
                    }

                    // Per inserimenti o aggiornamenti, ricarica la lista completa (se non sto ignorando)
                    if (payload.eventType !== 'DELETE' && !ignoreMySignalRef.current) {
                        refreshSignals(true);
                    }
                }
            )
            .subscribe();

        return () => {
            clearInterval(intervalId);
            stopLiveTracking(); // Cleanup on unmount
            supabase.removeChannel(channel);
        };
    }, [currentUser.id]);

    // Expose global function for map popup interactions
    useEffect(() => {
        (window as any).velvetOpenChat = (userId: string, userName: string, userAvatar: string) => {
            onOpenChat({ id: userId, name: decodeURIComponent(userName), avatar: decodeURIComponent(userAvatar) });
        };
        return () => { delete (window as any).velvetOpenChat; }
    }, [onOpenChat]);

    // Map Initialization Logic
    useEffect(() => {
        return () => {
            if (mapInstance.current) {
                mapInstance.current.remove();
                mapInstance.current = null;
                markersRef.current = [];
            }
        };
    }, []);

    useEffect(() => {
        if (viewMode === 'MAP' && mapRef.current) {
            if (!mapInstance.current) {
                const initialLat = myLocation?.lat || 41.9028;
                const initialLng = myLocation?.lng || 12.4964;
                const initialZoom = myLocation ? 13 : 5; // Zoom out se non localizzato per vedere l'Italia

                const map = L.map(mapRef.current, {
                    zoomControl: false,
                    attributionControl: false
                }).setView([initialLat, initialLng], initialZoom);

                L.control.zoom({ position: 'bottomright' }).addTo(map);

                L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                    subdomains: 'abcd',
                    maxZoom: 19
                }).addTo(map);

                mapInstance.current = map;

                setTimeout(() => {
                    if (map && map.getContainer()) {
                        map.invalidateSize();
                    }
                }, 200);

            } else {
                setTimeout(() => {
                    if (mapInstance.current && mapInstance.current.getContainer()) {
                        mapInstance.current.invalidateSize();
                    }
                }, 100);
            }
        } else if (viewMode === 'LIST' && mapInstance.current) {
            mapInstance.current.remove();
            mapInstance.current = null;
            markersRef.current = [];
        }
    }, [viewMode, myLocation]);

    // Marker Update Logic
    useEffect(() => {
        if (viewMode === 'MAP' && mapInstance.current) {
            // Rimuovi vecchi marker
            markersRef.current.forEach(marker => marker.remove());
            markersRef.current = [];

            signals.forEach(signal => {
                if (!signal.profile) return;
                const isMe = signal.user_id === currentUser.id;

                const customIcon = L.divIcon({
                    className: 'custom-div-icon',
                    html: `
                    <div class="marker-pin ${isMe ? 'border-green-500 shadow-[0_0_10px_#22c55e]' : ''}">
                        <img src="${signal.profile.avatar}" />
                    </div>
                `,
                    iconSize: [40, 40],
                    iconAnchor: [20, 20],
                    popupAnchor: [0, -20]
                });

                const actionButtons = `<div class="flex gap-2">
                        <a href="https://www.google.com/maps/dir/?api=1&destination=${signal.latitude},${signal.longitude}" 
                           target="_blank" 
                           class="flex-1 inline-flex items-center justify-center gap-2 bg-neutral-900 hover:bg-neutral-800 text-white text-[10px] uppercase font-bold px-3 py-2 border border-neutral-700 transition-colors hover:border-crimson-800">
                           Raggiungi
                        </a>
                        <button 
                           onclick="window.velvetOpenChat('${signal.user_id}', '${encodeURIComponent(signal.profile.name)}', '${encodeURIComponent(signal.profile.avatar)}')"
                           class="flex-1 inline-flex items-center justify-center gap-2 bg-crimson-900 hover:bg-crimson-800 text-white text-[10px] uppercase font-bold px-3 py-2 border border-crimson-700 transition-colors">
                           Scrivi
                        </button>
                    </div>`;

                const popupContent = `
                <div class="min-w-[180px] text-center font-sans p-2">
                    <div class="mb-3">
                        <strong class="block text-base font-serif uppercase text-crimson-600">${signal.profile.name}</strong>
                        <span class="text-[10px] uppercase tracking-widest text-neutral-400 block mb-2">${signal.profile.role.replace('_', ' ')}</span>
                        <p class="text-sm italic text-neutral-300 mb-3">"${signal.message}"</p>
                    </div>
                    ${actionButtons}
                </div>
            `;

                const marker = L.marker([signal.latitude, signal.longitude], { icon: customIcon })
                    .addTo(mapInstance.current!)
                    .bindPopup(popupContent);

                markersRef.current.push(marker);
            });

            if (myLocation) {
                const myIcon = L.divIcon({
                    className: 'custom-div-icon',
                    html: `<div class="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg animate-pulse"></div>`,
                    iconSize: [16, 16],
                    iconAnchor: [8, 8]
                });
                L.marker([myLocation.lat, myLocation.lng], { icon: myIcon, zIndexOffset: 1000 }).addTo(mapInstance.current!);
            }
        }
    }, [signals, viewMode, myLocation, currentUser.id]);

    const stopLiveTracking = () => {
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
        setBroadcasting(false);
        setActiveCheckinId(null);
        checkinIdRef.current = null;
    };

    const handleBroadcast = async () => {
        if (!navigator.geolocation) {
            setPermissionError("La geolocalizzazione non è supportata dal tuo browser.");
            return;
        }

        // If already tracking, stop it (DELETE action)
        if (activeCheckinId) {
            // Attiva il buffer "ignore" per evitare che il segnale riappaia per latenza DB
            ignoreMySignalRef.current = true;
            setTimeout(() => { ignoreMySignalRef.current = false; }, 10000);

            stopLiveTracking();

            // Optimistic UI: Remove my signal immediately from list
            setSignals(prev => prev.filter(s => s.user_id !== currentUser.id));

            try {
                await api.deleteActiveCheckin(currentUser.id);
            } catch (e) {
                console.error("Error deleting checkin:", e);
            }
            return;
        }

        setBroadcasting(true);
        setPermissionError('');

        const geoOptions = { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 };

        const successCallback = async (position: GeolocationPosition): Promise<string | null> => {
            const { latitude, longitude } = position.coords;
            setMyLocation({ lat: latitude, lng: longitude });

            try {
                // Use ref to check existence to avoid closure staleness
                let currentId = checkinIdRef.current;

                if (!currentId) {
                    // First broadcast (INSERT)
                    const newId = await api.broadcastLocation(currentUser.id, latitude, longitude, broadcastMessage);
                    setActiveCheckinId(newId);
                    checkinIdRef.current = newId; // Update ref manually for immediate use
                    currentId = newId;

                    // OPTIMISTIC UPDATE
                    const myOptimisticSignal: RadarSignal = {
                        id: newId,
                        user_id: currentUser.id,
                        latitude: latitude,
                        longitude: longitude,
                        message: broadcastMessage,
                        expires_at: new Date(Date.now() + 14400000).toISOString(),
                        profile: {
                            name: currentUser.name,
                            avatar: currentUser.avatar,
                            role: currentUser.role
                        }
                    };
                    setSignals(prev => [...prev.filter(s => s.user_id !== currentUser.id), myOptimisticSignal]);

                    if (mapInstance.current) {
                        mapInstance.current.setView([latitude, longitude], 14);
                        setTimeout(() => mapInstance.current?.invalidateSize(), 100);
                    }
                    setShowMobileBroadcast(false);
                    setBroadcasting(false);
                } else {
                    // Subsequent updates (UPDATE) - called by live logic
                    await api.updateLocation(currentId, latitude, longitude);
                }
                return currentId;
            } catch (e: any) {
                const errorDetails = e.message || e.details || JSON.stringify(e);
                setPermissionError(`Errore salvataggio: ${errorDetails}`);
                setBroadcasting(false);
                throw e;
            }
        };

        const errorCallback = (error: GeolocationPositionError) => {
            setBroadcasting(false);
            if (error.code === 1) setPermissionError("Permesso di localizzazione negato.");
            else if (error.code === 2) setPermissionError("Posizione non disponibile.");
            else setPermissionError("Timeout rilevazione posizione.");
        };

        if (liveTracking) {
            // LIVE MODE: Watch Position
            navigator.geolocation.getCurrentPosition(async (pos) => {
                try {
                    // Get initial ID
                    const createdId = await successCallback(pos);

                    // Start watcher using the ID we just got or from ref
                    const id = navigator.geolocation.watchPosition((newPos) => {
                        const targetId = createdId || checkinIdRef.current;

                        if (targetId) {
                            const { latitude, longitude } = newPos.coords;

                            // 1. Update DB (Background)
                            api.updateLocation(targetId, latitude, longitude);

                            // 2. Optimistic Local Update (Live Feedback)
                            setMyLocation({ lat: latitude, lng: longitude });

                            setSignals(prev => prev.map(s => {
                                if (s.id === targetId) {
                                    return { ...s, latitude: latitude, longitude: longitude };
                                }
                                return s;
                            }));
                        }
                    }, errorCallback, geoOptions);
                    watchIdRef.current = id;
                } catch (e) {
                    // handled in successCallback
                }
            }, errorCallback, geoOptions);
        } else {
            // STATIC MODE: Get Current Position once
            navigator.geolocation.getCurrentPosition(async (pos) => {
                await successCallback(pos);
            }, errorCallback, geoOptions);
        }
    };

    const BroadcastFormContent = () => (
        <div className="space-y-4">
            <div className="flex items-center gap-3 bg-neutral-950 border border-green-900/30 p-4 rounded-lg">
                <div className="bg-green-900/20 p-2 rounded-full">
                    <ShieldCheck className="w-5 h-5 text-green-500" />
                </div>
                <div className="flex-1">
                    <span className="text-green-500 font-serif font-bold uppercase tracking-widest text-xs block mb-1">Privacy Shield Attivo</span>
                    <p className="text-[10px] text-neutral-400 leading-tight">La tua posizione è offuscata (50m-200m). {liveTracking && "In modalità Live, il percorso verrà aggiornato mantenendo l'offuscamento."}</p>
                </div>
            </div>

            <div>
                <label className="text-[10px] uppercase text-neutral-500 font-bold block mb-2">Messaggio Check-in</label>
                <select
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    className="w-full bg-black border border-neutral-700 text-white text-sm p-3 focus:border-crimson-700 outline-none"
                >
                    <option>Disponibili per un drink</option>
                    <option>Cerchiamo after party</option>
                    <option>Solo curiosità</option>
                    <option>In cerca di compagnia</option>
                    <option>Privé riservato</option>
                </select>
            </div>

            {/* Live Tracking Toggle */}
            <div className={`flex items-center justify-between bg-neutral-900 p-3 border border-neutral-800 ${!currentUser.isVip ? 'opacity-70' : ''}`}>
                <div className="flex items-center gap-2">
                    <Activity className={`w-4 h-4 ${liveTracking ? 'text-crimson-500' : 'text-neutral-500'}`} />
                    <div>
                        <span className="text-xs text-white font-bold flex items-center gap-2">
                            Live Tracking
                            {!currentUser.isVip && <span className="text-[9px] bg-gold-600 text-black px-1 rounded font-bold uppercase">VIP</span>}
                        </span>
                        <span className="text-[10px] text-neutral-500 block">Condividi spostamenti in tempo reale</span>
                    </div>
                </div>
                <div
                    onClick={() => {
                        if (!currentUser.isVip) {
                            alert("Il Live Tracking è riservato ai membri VIP. Effettua l'upgrade nella sezione Membership per attivare il tracciamento in tempo reale.");
                            return;
                        }
                        setLiveTracking(!liveTracking);
                    }}
                    className={`w-10 h-5 rounded-full relative transition-colors ${!currentUser.isVip ? 'cursor-not-allowed bg-neutral-800' : 'cursor-pointer'} ${liveTracking ? 'bg-crimson-900' : 'bg-neutral-700'}`}
                >
                    {!currentUser.isVip && <Lock className="w-3 h-3 text-neutral-400 absolute top-1 left-3.5 z-10" />}
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${liveTracking ? 'left-6' : 'left-1'} ${!currentUser.isVip ? 'opacity-0' : ''}`}></div>
                </div>
            </div>

            {permissionError && (
                <div className="text-crimson-500 text-xs bg-crimson-900/10 p-2 border border-crimson-900/30 break-words">
                    {permissionError}
                </div>
            )}

            <button
                onClick={handleBroadcast}
                disabled={broadcasting && !activeCheckinId} // Disable only during initial load
                className={`w-full py-4 font-serif uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(20,83,45,0.4)] disabled:opacity-50 disabled:cursor-not-allowed ${activeCheckinId
                    ? 'bg-red-900/80 hover:bg-red-800 border border-red-700'
                    : 'bg-green-900/80 hover:bg-green-800 border border-green-700'
                    }`}
            >
                {broadcasting && !activeCheckinId ? <Loader className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                {activeCheckinId ? "Interrompi Tracking" : (liveTracking ? "Avvia Tracking Live" : "Attiva Radar (Statico)")}
            </button>
        </div>
    );

    return (
        <div className="flex flex-col h-full relative bg-neutral-950">

            {/* MOBILE HEADER */}
            <div className="lg:hidden flex justify-between items-center p-4 bg-neutral-950 border-b border-neutral-800 z-10 sticky top-0">
                <div className="flex items-center gap-2">
                    <Radar className={`w-6 h-6 text-green-600 ${activeCheckinId ? 'animate-spin' : 'animate-pulse'}`} />
                    <span className="font-serif text-white text-lg">Radar {activeCheckinId && "(Live)"}</span>
                </div>
                <div className="flex bg-neutral-900 rounded-lg p-1 border border-neutral-800">
                    <button
                        onClick={() => setViewMode('LIST')}
                        className={`p-2 rounded ${viewMode === 'LIST' ? 'bg-crimson-900 text-white' : 'text-neutral-500'}`}
                    >
                        <List className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setViewMode('MAP')}
                        className={`p-2 rounded ${viewMode === 'MAP' ? 'bg-crimson-900 text-white' : 'text-neutral-500'}`}
                    >
                        <MapIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* DESKTOP HEADER */}
            <div className="hidden lg:flex mb-6 justify-between items-end border-b border-neutral-800 pb-4">
                <div>
                    <h2 className="text-3xl font-serif text-white mb-1 flex items-center gap-3">
                        <Radar className={`w-8 h-8 text-green-600 ${activeCheckinId ? 'animate-spin' : 'animate-pulse'}`} /> Radar
                    </h2>
                    <p className="text-neutral-500 text-sm tracking-wide uppercase">Trova membri nelle vicinanze {activeCheckinId && "• Tracking Attivo"}</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex bg-neutral-900 border border-neutral-800 rounded-lg p-1">
                        <button onClick={() => setViewMode('LIST')} className={`p-2 rounded flex items-center gap-2 text-xs uppercase font-bold transition-all ${viewMode === 'LIST' ? 'bg-crimson-900 text-white' : 'text-neutral-500 hover:text-white'}`}><List className="w-4 h-4" /> Lista</button>
                        <button onClick={() => setViewMode('MAP')} className={`p-2 rounded flex items-center gap-2 text-xs uppercase font-bold transition-all ${viewMode === 'MAP' ? 'bg-crimson-900 text-white' : 'text-neutral-500 hover:text-white'}`}><MapIcon className="w-4 h-4" /> Mappa</button>
                    </div>
                    <button onClick={() => refreshSignals(false)} className="text-xs text-neutral-500 hover:text-white underline">Aggiorna</button>
                </div>
            </div>

            <div className="flex-1 flex flex-col lg:grid lg:grid-cols-4 lg:gap-6 overflow-hidden relative">

                {/* DESKTOP LEFT: Broadcast Controls */}
                <div className="hidden lg:flex lg:col-span-1 flex-col gap-6 order-2 lg:order-1">
                    <div className="bg-neutral-900 border border-neutral-800 p-6 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-green-900/20 rounded-full blur-2xl -mr-10 -mt-10"></div>
                        <h3 className="text-lg font-serif text-white mb-4 flex items-center gap-2"><Radio className="w-5 h-5 text-crimson-500" /> Trasmetti</h3>
                        <p className="text-xs text-neutral-400 mb-6 leading-relaxed">Renditi visibile sulla mappa per 4 ore.</p>
                        <BroadcastFormContent />
                    </div>
                    <div className="bg-neutral-950 border border-neutral-900 p-4 text-center">
                        <div className="text-2xl font-serif text-white">{signals.length}</div>
                        <div className="text-[10px] uppercase text-neutral-500 tracking-widest">Utenti nel raggio</div>
                    </div>
                </div>

                {/* MAIN AREA */}
                <div className="flex-1 lg:col-span-3 bg-neutral-950 border border-neutral-900 overflow-hidden relative order-1 lg:order-2 h-full w-full">
                    {loading && <div className="absolute inset-0 z-50 bg-black/50 flex justify-center items-center"><Loader className="animate-spin text-green-600" /></div>}

                    {viewMode === 'MAP' ? (
                        <div ref={mapRef} className="w-full h-full bg-neutral-900 z-10" style={{ height: '100%', width: '100%' }} />
                    ) : (
                        <div className="h-full w-full bg-neutral-950 overflow-y-auto custom-scrollbar p-4 space-y-4 z-20 absolute inset-0">
                            {signals.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-full text-neutral-600 space-y-4">
                                    <Radar className="w-16 h-16 opacity-20" />
                                    <p className="font-serif">Nessun segnale rilevato.</p>
                                </div>
                            )}
                            {signals.map((signal) => {
                                if (!signal.profile) return null;
                                let distance = null;
                                if (myLocation) { distance = calculateDistance(myLocation.lat, myLocation.lng, signal.latitude, signal.longitude); }
                                const isMe = signal.user_id === currentUser.id;

                                return (
                                    <div key={signal.id} className={`p-4 flex items-center gap-4 border transition-colors ${isMe ? 'bg-green-900/10 border-green-900/30' : 'bg-black border-neutral-800 hover:border-neutral-600'}`}>
                                        <div className="relative">
                                            <img src={signal.profile.avatar} alt={signal.profile.name} className="w-14 h-14 rounded-full object-cover border border-neutral-700" />
                                            <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border border-black shadow-[0_0_5px_#22c55e] bg-green-500`}></div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <h4 className="text-white font-serif text-lg truncate flex items-center gap-2">
                                                    {signal.profile.name}
                                                    {isMe && <span className="text-xs text-neutral-500">(Tu)</span>}
                                                </h4>
                                                <span className="text-[10px] uppercase text-neutral-500 border border-neutral-800 px-2 py-0.5 rounded">{signal.profile.role.replace('_', ' ')}</span>
                                            </div>
                                            <p className="text-crimson-400 text-sm italic mb-1">"{signal.message}"</p>
                                            <div className="flex items-center gap-4 text-xs text-neutral-600 font-mono">
                                                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {distance !== null ? `${distance.toFixed(1)} km` : '? km'}</span>
                                                <span>Scade: {new Date(signal.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>

                                            <div className="flex gap-2 mt-3">
                                                <a href={`https://www.google.com/maps/dir/?api=1&destination=${signal.latitude},${signal.longitude}`} target="_blank" className="inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-white border border-neutral-800 hover:border-neutral-500 px-3 py-1.5 transition-colors"><Navigation className="w-3 h-3" /> Raggiungi</a>
                                                <button onClick={() => onOpenChat({ id: signal.user_id, name: signal.profile.name, avatar: signal.profile.avatar })} className="inline-flex items-center gap-1 text-xs bg-crimson-900 text-white border border-crimson-700 px-3 py-1.5 hover:bg-crimson-800 transition-colors"><MessageSquare className="w-3 h-3" /> Scrivi</button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* MOBILE FLOATING ACTION BUTTON */}
            <button
                onClick={() => setShowMobileBroadcast(true)}
                className="lg:hidden fixed bottom-20 right-6 z-30 bg-crimson-900 text-white p-4 rounded-full shadow-[0_0_20px_rgba(220,38,38,0.5)] border border-crimson-500 animate-fade-in"
            >
                {activeCheckinId ? <Activity className="w-6 h-6 animate-pulse" /> : <Plus className="w-6 h-6" />}
            </button>

            {/* MOBILE BROADCAST MODAL */}
            {showMobileBroadcast && (
                <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-end animate-fade-in lg:hidden">
                    <div className="bg-neutral-900 w-full p-6 border-t border-neutral-800 rounded-t-2xl shadow-2xl pb-10">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-serif text-white flex items-center gap-2">
                                <Radio className="w-5 h-5 text-crimson-500" /> Check-in Radar
                            </h3>
                            <button onClick={() => setShowMobileBroadcast(false)} className="text-neutral-500"><X className="w-6 h-6" /></button>
                        </div>
                        <BroadcastFormContent />
                    </div>
                </div>
            )}
        </div>
    );
};

export default RadarView;
