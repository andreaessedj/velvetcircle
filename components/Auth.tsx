
import React, { useState } from 'react';
import { UserRole, User } from '../types';
import { api } from '../services/db';
import { Crown, ArrowRight, Loader, AlertTriangle, Key } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface AuthProps {
    onLogin: (user: User) => void;
    onCancel: () => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin, onCancel }) => {
    const { t } = useTranslation();
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isForgotPassword, setIsForgotPassword] = useState(false);

    const DESIRE_OPTIONS = ['Scambio Coppie', 'Threesome MMF', 'Threesome FFM', 'Voyeurismo', 'Esibizionismo', 'BDSM Soft', 'Gangbang', 'Tantra', 'Solo Drink'];
    const LIMIT_OPTIONS = ['No Singoli', 'No BDSM', 'No Fumatori', 'No Foto', 'Solo Location Private', 'Igiene Massima', 'No Alcool'];

    // Form State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [role, setRole] = useState<UserRole>(UserRole.COUPLE);
    const [inviteCode, setInviteCode] = useState('');
    const [regType, setRegType] = useState<'PERSON' | 'CLUB'>('PERSON');

    // Person Specific Optional but now Mandatory Fields
    const [bio, setBio] = useState('');
    const [desires, setDesires] = useState<string[]>([]);
    const [limits, setLimits] = useState<string[]>([]);

    // Club Specific Fields
    const [address, setAddress] = useState('');
    const [city, setCity] = useState('');
    const [phone, setPhone] = useState('');
    const [photos, setPhotos] = useState<string[]>([]);
    const [photoInput, setPhotoInput] = useState('');
    const [latitude, setLatitude] = useState<number | null>(null);
    const [longitude, setLongitude] = useState<number | null>(null);
    const [geoLoading, setGeoLoading] = useState(false);

    const geocodeAddress = async () => {
        if (!address || !city) {
            alert("Inserisci indirizzo e città per localizzare il locale sulla mappa.");
            return;
        }
        setGeoLoading(true);
        try {
            const query = encodeURIComponent(`${address}, ${city}`);
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}`);
            const data = await res.json();
            if (data && data.length > 0) {
                setLatitude(parseFloat(data[0].lat));
                setLongitude(parseFloat(data[0].lon));
                alert("Posizione individuata con successo!");
            } else {
                alert("Impossibile trovare le coordinate per questo indirizzo. Verranno usate coordinate predefinite.");
            }
        } catch (e) {
            console.error(e);
        } finally {
            setGeoLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (isForgotPassword) {
                await api.forgotPassword(email);
                alert(t('auth.forgot_password_success'));
                setIsForgotPassword(false);
                setIsLogin(true);
            } else if (isLogin) {
                const user = await api.login(email, password);
                onLogin(user);
            } else {
                let user;
                if (regType === 'CLUB') {
                    user = await api.registerClub({
                        email,
                        name,
                        password,
                        address,
                        city,
                        phone,
                        photos,
                        latitude: latitude || 45.4642,
                        longitude: longitude || 9.1900
                    });
                } else {
                    if (regType === 'PERSON') {
                        if (!bio.trim()) {
                            setError(t('auth.errors.bio_required', 'La biografia è obbligatoria.'));
                            setLoading(false);
                            return;
                        }
                        if (desires.length === 0) {
                            setError(t('auth.errors.desires_required', 'Seleziona almeno un\'opzione in "Cosa cercate".'));
                            setLoading(false);
                            return;
                        }
                        if (limits.length === 0) {
                            setError(t('auth.errors.limits_required', 'Seleziona almeno un\'opzione in "I vostri limiti".'));
                            setLoading(false);
                            return;
                        }
                    }
                    user = await api.register({
                        email,
                        name,
                        role,
                        password,
                        inviteCode,
                        bio,
                        desires,
                        limits
                    });
                }
                // Immediate login after register
                onLogin(user);
            }
        } catch (err: any) {
            console.error("Auth Error:", err);
            let msg = err.message || t('auth.errors.unknown');

            if (msg.includes('Email not confirmed')) {
                msg = t('auth.errors.email_not_confirmed');
            } else if (msg.includes('User already registered')) {
                msg = t('auth.errors.user_already_registered');
            } else if (msg.includes('JWT') || msg.includes('apikey')) {
                msg = t('auth.errors.api_error');
            } else if (msg.includes('rate limit')) {
                msg = t('auth.errors.rate_limit');
            } else if (msg.includes('Invalid login')) {
                msg = t('auth.errors.invalid_login');
            }

            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-black p-4 relative">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')] opacity-30"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-velvet-950/80 to-black pointer-events-none"></div>

            <div className="relative z-10 w-full max-w-md bg-neutral-950 border border-neutral-800 p-8 shadow-[0_0_40px_rgba(153,27,27,0.2)]">
                <div className="text-center mb-8">
                    <Crown className="w-12 h-12 text-crimson-700 mx-auto mb-4" />
                    <h2 className="text-3xl font-serif text-white mb-2">
                        {isForgotPassword ? t('auth.forgot_password_title') : isLogin ? t('auth.login_title') : t('auth.register_title')}
                    </h2>
                    <p className="text-neutral-500 text-sm uppercase tracking-widest">
                        {isForgotPassword ? t('auth.forgot_password_sub') : isLogin ? t('auth.login_sub') : t('auth.register_sub')}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {!isLogin && !isForgotPassword && (
                        <div className="space-y-4 animate-fade-in">
                            <div className="flex gap-2 p-1 bg-neutral-900 border border-neutral-800 rounded-lg mb-6">
                                <button
                                    type="button"
                                    onClick={() => { setRegType('PERSON'); setRole(UserRole.COUPLE); }}
                                    className={`flex-1 py-3 text-[10px] uppercase font-bold rounded-md transition-all duration-300 ${regType === 'PERSON' ? 'bg-crimson-900 text-white shadow-lg' : 'text-neutral-500 hover:text-neutral-300'}`}
                                >
                                    {t('auth.person_type')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setRegType('CLUB'); setRole(UserRole.CLUB); }}
                                    className={`flex-1 py-3 text-[10px] uppercase font-bold rounded-md transition-all duration-300 ${regType === 'CLUB' ? 'bg-crimson-900 text-white shadow-lg' : 'text-neutral-500 hover:text-neutral-300'}`}
                                >
                                    {t('auth.club_type')}
                                </button>
                            </div>

                            <div>
                                <label className="block text-xs uppercase text-neutral-500 mb-2 tracking-wider">{regType === 'CLUB' ? t('auth.club_name') : t('auth.pseudonym')}</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="w-full bg-black border border-neutral-800 text-white p-3 focus:border-crimson-700 outline-none font-serif"
                                    placeholder={regType === 'CLUB' ? t('auth.club_name') : t('auth.pseudonym_placeholder')}
                                    required
                                />
                            </div>

                            {regType === 'PERSON' ? (
                                <>
                                    <div>
                                        <label className="block text-xs uppercase text-neutral-500 mb-2 tracking-wider">{t('auth.role_select')}</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {[UserRole.COUPLE, UserRole.SINGLE_MALE, UserRole.SINGLE_FEMALE].map((r) => (
                                                <button
                                                    type="button"
                                                    key={r}
                                                    onClick={() => setRole(r)}
                                                    className={`p-2 text-[10px] uppercase font-bold border transition-colors ${role === r ? 'bg-crimson-900 border-crimson-700 text-white' : 'bg-neutral-900 border-neutral-800 text-neutral-500 hover:border-neutral-600'}`}
                                                >
                                                    {t(`auth.roles.${r}`)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* INVITE CODE FIELD */}
                                    <div>
                                        <label className="block text-xs uppercase text-gold-500 mb-2 tracking-wider flex items-center gap-1">
                                            <Key className="w-3 h-3" /> {t('auth.velvet_key')}
                                        </label>
                                        <input
                                            type="text"
                                            value={inviteCode}
                                            onChange={e => setInviteCode(e.target.value.toUpperCase())}
                                            className="w-full bg-black border border-gold-900/50 text-gold-400 p-3 focus:border-gold-600 outline-none font-mono placeholder:text-neutral-800"
                                            placeholder={t('auth.velvet_key_placeholder')}
                                        />
                                        <p className="text-[10px] text-neutral-500 mt-1">
                                            {t('auth.velvet_key_desc')}
                                        </p>
                                    </div>

                                    {/* MANDATORY FIELDS: BIO, DESIRES, LIMITS */}
                                    <div className="pt-4 border-t border-neutral-900 space-y-6">
                                        <div>
                                            <label className={`block text-xs uppercase mb-2 tracking-wider flex justify-between ${!bio.trim() ? 'text-crimson-500' : 'text-neutral-500'}`}>
                                                {t('profile_editor.details.bio_label', 'Biografia')}
                                                <span className="text-crimson-600 text-[10px] font-bold">Obbligatorio</span>
                                            </label>
                                            <textarea
                                                value={bio}
                                                onChange={e => setBio(e.target.value)}
                                                className={`w-full bg-black border ${!bio.trim() ? 'border-crimson-900/50' : 'border-neutral-800'} text-white p-3 text-sm focus:border-crimson-700 outline-none font-serif min-h-[100px] rounded`}
                                                placeholder={t('profile_editor.details.bio_placeholder', 'Esempio: "Siamo una coppia solare, cerchiamo nuove esperienze in contesti esclusivi..."')}
                                                required
                                            />
                                            {!bio.trim() && <p className="text-[9px] text-crimson-600 mt-1 uppercase font-bold tracking-tighter">Questo campo non può essere vuoto</p>}
                                        </div>

                                        <div>
                                            <label className={`block text-xs uppercase mb-3 tracking-wider flex justify-between ${desires.length === 0 ? 'text-crimson-500' : 'text-neutral-500'}`}>
                                                {t('profile_editor.details.desires_label', 'Cosa cercate')}
                                                <span className="text-crimson-600 text-[10px] font-bold">Almeno 1</span>
                                            </label>
                                            <div className="flex flex-wrap gap-2">
                                                {DESIRE_OPTIONS.map(opt => (
                                                    <button
                                                        type="button"
                                                        key={opt}
                                                        onClick={() => {
                                                            if (desires.includes(opt)) setDesires(desires.filter(d => d !== opt));
                                                            else setDesires([...desires, opt]);
                                                        }}
                                                        className={`px-3 py-1.5 text-[10px] uppercase font-bold border transition-all rounded ${desires.includes(opt) ? 'bg-green-900/20 text-green-400 border-green-800/50' : 'bg-transparent text-neutral-600 border-neutral-800 hover:border-neutral-700'}`}
                                                    >
                                                        {opt}
                                                    </button>
                                                ))}
                                            </div>
                                            {desires.length === 0 && <p className="text-[9px] text-crimson-600 mt-2 uppercase font-bold tracking-tighter">Seleziona almeno un interesse</p>}
                                        </div>

                                        <div>
                                            <label className={`block text-xs uppercase mb-3 tracking-wider flex justify-between ${limits.length === 0 ? 'text-crimson-500' : 'text-neutral-500'}`}>
                                                {t('profile_editor.details.limits_label', 'I vostri limiti')}
                                                <span className="text-crimson-600 text-[10px] font-bold">Almeno 1</span>
                                            </label>
                                            <div className="flex flex-wrap gap-2">
                                                {LIMIT_OPTIONS.map(opt => (
                                                    <button
                                                        type="button"
                                                        key={opt}
                                                        onClick={() => {
                                                            if (limits.includes(opt)) setLimits(limits.filter(l => l !== opt));
                                                            else setLimits([...limits, opt]);
                                                        }}
                                                        className={`px-3 py-1.5 text-[10px] uppercase font-bold border transition-all rounded ${limits.includes(opt) ? 'bg-crimson-900/20 text-crimson-400 border-crimson-800/50' : 'bg-transparent text-neutral-600 border-neutral-800 hover:border-neutral-700'}`}
                                                    >
                                                        {opt}
                                                    </button>
                                                ))}
                                            </div>
                                            {limits.length === 0 && <p className="text-[9px] text-crimson-600 mt-2 uppercase font-bold tracking-tighter">Seleziona almeno un limite</p>}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-xs uppercase text-neutral-500 mb-2 tracking-wider">{t('auth.club_address')}</label>
                                            <input
                                                type="text"
                                                value={address}
                                                onChange={e => setAddress(e.target.value)}
                                                className="w-full bg-black border border-neutral-800 text-white p-3 focus:border-crimson-700 outline-none"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs uppercase text-neutral-500 mb-2 tracking-wider">{t('auth.club_city')}</label>
                                            <input
                                                type="text"
                                                value={city}
                                                onChange={e => setCity(e.target.value)}
                                                className="w-full bg-black border border-neutral-800 text-white p-3 focus:border-crimson-700 outline-none"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={geocodeAddress}
                                        disabled={geoLoading}
                                        className="w-full py-2 bg-neutral-900 border border-neutral-800 text-[10px] text-neutral-400 uppercase font-bold hover:text-white transition-colors"
                                    >
                                        {geoLoading ? "Localizzazione..." : "Localizza sulla mappa (Opzionale)"}
                                    </button>
                                    <div>
                                        <label className="block text-xs uppercase text-neutral-500 mb-2 tracking-wider">{t('auth.club_phone')}</label>
                                        <input
                                            type="text"
                                            value={phone}
                                            onChange={e => setPhone(e.target.value)}
                                            className="w-full bg-black border border-neutral-800 text-white p-3 focus:border-crimson-700 outline-none"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs uppercase text-neutral-500 mb-2 tracking-wider">{t('auth.club_photos')}</label>
                                        <div className="flex gap-2 mb-2">
                                            <input
                                                type="text"
                                                value={photoInput}
                                                onChange={e => setPhotoInput(e.target.value)}
                                                className="flex-1 bg-black border border-neutral-800 text-white p-2 text-xs focus:border-crimson-700 outline-none"
                                                placeholder="https://image-url.com"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => { if (photoInput) { setPhotos([...photos, photoInput]); setPhotoInput(''); } }}
                                                className="bg-neutral-800 px-3 text-xs text-white"
                                            >
                                                +
                                            </button>
                                        </div>
                                        <div className="flex gap-2 overflow-x-auto pb-2">
                                            {photos.map((p, idx) => (
                                                <div key={idx} className="relative group flex-shrink-0">
                                                    <img src={p} className="w-12 h-12 object-cover border border-neutral-800" />
                                                    <button
                                                        type="button"
                                                        onClick={() => setPhotos(photos.filter((_, i) => i !== idx))}
                                                        className="absolute -top-1 -right-1 bg-crimson-900 text-white rounded-full w-4 h-4 text-[8px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        X
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div>
                        <label className="block text-xs uppercase text-neutral-500 mb-2 tracking-wider">{t('auth.email')}</label>
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="w-full bg-black border border-neutral-800 text-white p-3 focus:border-crimson-700 outline-none font-sans"
                            placeholder="email@privata.com"
                            required
                        />
                    </div>

                    {!isForgotPassword && (
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-xs uppercase text-neutral-500 tracking-wider">{t('auth.password')}</label>
                                {isLogin && (
                                    <button
                                        type="button"
                                        onClick={() => { setIsForgotPassword(true); setIsLogin(false); }}
                                        className="text-[10px] text-crimson-600 hover:text-crimson-500 uppercase font-bold"
                                    >
                                        {t('auth.forgot_password_link')}
                                    </button>
                                )}
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full bg-black border border-neutral-800 text-white p-3 focus:border-crimson-700 outline-none font-sans"
                                placeholder="••••••••"
                                required={!isForgotPassword}
                            />
                        </div>
                    )}

                    {error && (
                        <div className="bg-crimson-900/20 border border-crimson-800 p-3 flex gap-3 items-start animate-fade-in">
                            <AlertTriangle className="w-5 h-5 text-crimson-500 flex-shrink-0" />
                            <p className="text-crimson-200 text-xs leading-relaxed">{error}</p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full p-4 font-serif uppercase tracking-widest transition-all border flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${!isLogin && !isForgotPassword && regType === 'PERSON' && (!bio.trim() || desires.length === 0 || limits.length === 0)
                                ? 'bg-neutral-900 border-neutral-800 text-neutral-600'
                                : 'bg-gradient-to-r from-crimson-900 to-velvet-900 text-white border-crimson-800 hover:brightness-110 shadow-[0_0_20px_rgba(153,27,27,0.2)]'
                            }`}
                    >
                        {loading ? <Loader className="animate-spin w-5 h-5" /> : (isForgotPassword ? t('auth.reset_btn') : isLogin ? t('auth.login_btn') : t('auth.register_btn'))}
                        {!loading && <ArrowRight className="w-4 h-4" />}
                    </button>
                </form>

                <div className="mt-6 text-center space-y-4">
                    <button
                        onClick={() => {
                            if (isForgotPassword) {
                                setIsForgotPassword(false);
                                setIsLogin(true);
                            } else {
                                setIsLogin(!isLogin);
                                setRegType('PERSON');
                            }
                            setError('');
                        }}
                        className="text-neutral-500 text-xs hover:text-white transition-colors border-b border-transparent hover:border-white pb-1"
                    >
                        {isForgotPassword ? t('auth.back_to_login') : isLogin ? t('auth.no_account') : t('auth.already_account')}
                    </button>

                    {isLogin && (
                        <div className="pt-4 border-t border-neutral-900">
                            <button
                                onClick={() => {
                                    setIsLogin(false);
                                    setRegType('CLUB');
                                    setRole(UserRole.CLUB);
                                }}
                                className="text-crimson-500 text-[10px] uppercase font-bold tracking-[0.2em] hover:text-crimson-400 transition-colors"
                            >
                                Gestisci un locale? Registrati come Club
                            </button>
                        </div>
                    )}
                </div>

                <div className="mt-8 text-center">
                    <button onClick={onCancel} className="text-neutral-600 text-[10px] uppercase hover:text-crimson-500">
                        {t('auth.back_to_home')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Auth;
