import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { User, VaultItem, RadarSignal, UserRole, ClubProfile } from '../types';
import { Save, User as UserIcon, X, Lock, Upload, Check, Loader, MapPin, Trash2, Coins, Shield, Edit2, AlertTriangle, UserX, Camera, Bell, Grid, LayoutGrid, Image as ImageIcon, Eye, EyeOff, Plus, RefreshCw, Ghost, Phone, Map, Globe } from 'lucide-react';
import { api } from '../services/db';
import { notificationService } from '../services/notificationService';

interface ProfileEditorProps {
    user: User;
    onUpdate: (updates: Partial<User>) => void;
    onClose: () => void;
}

const DESIRE_OPTIONS = ['Scambio Coppie', 'Threesome MMF', 'Threesome FFM', 'Voyeurismo', 'Esibizionismo', 'BDSM Soft', 'Gangbang', 'Tantra', 'Solo Drink'];
const LIMIT_OPTIONS = ['No Singoli', 'No BDSM', 'No Fumatori', 'No Foto', 'Solo Location Private', 'Igiene Massima', 'No Alcool'];

const ProfileEditor: React.FC<ProfileEditorProps> = ({ user, onUpdate, onClose }) => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'DETAILS' | 'VAULT' | 'SETTINGS'>('DETAILS');
    const [bio, setBio] = useState(user.bio || '');
    const [desires, setDesires] = useState<string[]>(user.desires || []);
    const [limits, setLimits] = useState<string[]>(user.limits || []);
    const [avatar, setAvatar] = useState(user.avatar);
    const [activeCheckin, setActiveCheckin] = useState<RadarSignal | null>(null);
    const [showAvatarInput, setShowAvatarInput] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [vault, setVault] = useState<VaultItem[]>(user.gallery || []);
    const [uploadingVault, setUploadingVault] = useState(false);
    const [vaultPrice, setVaultPrice] = useState<number>(0);
    const [editingPhotoId, setEditingPhotoId] = useState<string | null>(null);
    const [editPrice, setEditPrice] = useState<number>(0);
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [saving, setSaving] = useState(false);
    const [vaultViewMode, setVaultViewMode] = useState<'grid' | 'masonry'>('grid');
    const [clubProfile, setClubProfile] = useState<ClubProfile | null>(null);
    const [clubPhotos, setClubPhotos] = useState<string[]>([]);
    const [photoInput, setPhotoInput] = useState('');
    const [linkInput, setLinkInput] = useState('');
    const [geoLoading, setGeoLoading] = useState(false);
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);

    const geocodeAddress = async () => {
        if (!clubProfile?.address || !clubProfile?.city) {
            alert("Inserisci indirizzo e città per localizzare il locale sulla mappa.");
            return;
        }
        setGeoLoading(true);
        try {
            const query = encodeURIComponent(`${clubProfile.address}, ${clubProfile.city}`);
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}`);
            const data = await res.json();
            if (data && data.length > 0) {
                setClubProfile({
                    ...clubProfile,
                    latitude: parseFloat(data[0].lat),
                    longitude: parseFloat(data[0].lon)
                });
                alert(t('clubs.location_success'));
            } else {
                alert(t('clubs.location_error'));
            }
        } catch (e) {
            console.error(e);
        } finally {
            setGeoLoading(false);
        }
    };

    useEffect(() => {
        if (user.gallery) setVault(user.gallery);
    }, [user.gallery]);

    useEffect(() => {
        const checkStatus = async () => {
            const signal = await api.getMyActiveCheckin(user.id);
            setActiveCheckin(signal);
        };
        const loadClubProfile = async () => {
            if (user.role === UserRole.CLUB) {
                const profile = await api.getClubProfile(user.id);
                if (profile) {
                    setClubProfile(profile);
                    setClubPhotos(profile.photos || []);
                }
            }
        };
        checkStatus();
        loadClubProfile();
    }, [user.id, user.role]);

    const toggleItem = (list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, item: string) => {
        if (list.includes(item)) {
            setList(list.filter(i => i !== item));
        } else {
            setList([...list, item]);
        }
    };

    const handleSave = async () => {
        if (user.role !== UserRole.CLUB) {
            if (!bio.trim()) {
                alert(t('auth.errors.bio_required'));
                return;
            }
            if (desires.length === 0) {
                alert(t('auth.errors.desires_required'));
                return;
            }
            if (limits.length === 0) {
                alert(t('auth.errors.limits_required'));
                return;
            }
        }
        setSaving(true);
        try {
            const updates: Partial<User> = { bio, desires, limits, avatar, gallery: vault };
            await onUpdate(updates);

            if (user.role === UserRole.CLUB && clubProfile) {
                await api.updateClubProfile(user.id, {
                    address: clubProfile.address,
                    city: clubProfile.city,
                    phone: clubProfile.phone,
                    photos: clubPhotos,
                    latitude: clubProfile.latitude,
                    longitude: clubProfile.longitude
                });
            }

            alert(t('profile_editor.alerts.save_success'));
        } catch (e: any) {
            console.error(e);
            alert(t('profile_editor.alerts.save_error', { details: e.message }));
        } finally {
            setSaving(false);
        }
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingAvatar(true);
        try {
            const uploaded = await api.uploadVaultPhoto(file, user.id, 0);
            setAvatar(uploaded.url);
            await onUpdate({ avatar: uploaded.url });
            alert(t('profile_editor.alerts.avatar_success'));
        } catch (err: any) {
            console.error("Avatar upload failed", err);
            alert(t('profile_editor.alerts.upload_error', { details: err.message }));
        } finally {
            setUploadingAvatar(false);
        }
    };

    const addToVault = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        // Limit removed: users can now set prices from 1 credit upwards. 0 is free.

        setUploadingVault(true);
        try {
            const newPhotos: VaultItem[] = [];
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const newPhoto = await api.uploadVaultPhoto(file, user.id, vaultPrice);
                newPhotos.push(newPhoto);
            }
            const updatedVault = [...vault, ...newPhotos];
            setVault(updatedVault);
            await api.updateProfile(user.id, { gallery: updatedVault });
            onUpdate({ gallery: updatedVault });
            setVaultPrice(0);
            alert(t('profile_editor.alerts.vault_success'));
        } catch (err: any) {
            console.error("Upload failed", err);
            alert(t('profile_editor.alerts.upload_error', { details: err.message }));
        } finally {
            setUploadingVault(false);
        }
    };

    const addLinkToVault = async () => {
        if (!linkInput.trim()) return;

        // Limit removed: users can now set prices from 1 credit upwards. 0 is free.

        setUploadingVault(true);
        try {
            const newLink = await api.addVaultLink(linkInput, user.id, vaultPrice);
            const updatedVault = [...vault, newLink];
            setVault(updatedVault);
            await api.updateProfile(user.id, { gallery: updatedVault });
            onUpdate({ gallery: updatedVault });
            setLinkInput('');
            setVaultPrice(0);
            alert(t('profile_editor.alerts.vault_success'));
        } catch (err: any) {
            console.error("Add link failed", err);
            alert(t('profile_editor.alerts.upload_error', { details: err.message }));
        } finally {
            setUploadingVault(false);
        }
    };

    const deletePhoto = async (photoId: string) => {
        if (!confirm(t('profile_editor.alerts.delete_photo_confirm'))) return;
        const newVault = vault.filter(item => item.id !== photoId);
        setVault(newVault);
        try {
            await api.updateProfile(user.id, { gallery: newVault });
            onUpdate({ gallery: newVault });
        } catch (e) {
            console.error("Delete failed", e);
            alert(t('profile_editor.alerts.delete_error'));
            setVault(vault);
        }
    };

    const savePhotoEdit = async () => {
        // Limit removed: users can now set prices from 1 credit upwards. 0 is free.
        const newVault = vault.map(item =>
            item.id === editingPhotoId ? { ...item, price: editPrice } : item
        );
        setVault(newVault);
        setEditingPhotoId(null);
        try {
            await api.updateProfile(user.id, { gallery: newVault });
            onUpdate({ gallery: newVault });
        } catch (e) {
            console.error("Update failed", e);
            alert(t('profile_editor.alerts.update_error'));
        }
    };

    const stopCheckin = async () => {
        if (!activeCheckin) return;
        try {
            await api.deleteActiveCheckin(user.id);
            setActiveCheckin(null);
        } catch (e) {
            console.error(e);
            alert(t('profile_editor.alerts.checkin_delete_error'));
        }
    };

    const handleDeleteAccount = async () => {
        if (!confirmDelete) {
            setConfirmDelete(true);
            return;
        }
        setIsDeleting(true);
        try {
            await api.deleteAccount();
            window.location.href = '/';
        } catch (err) {
            console.error("Account deletion failed:", err);
            alert(t('profile_editor.alerts.delete_account_error'));
            setIsDeleting(false);
        }
    };

    const SettingToggle = ({ label, value, onChange, description }: any) => (
        <div className="flex items-center justify-between p-4 bg-black/40 border border-neutral-800 rounded-lg hover:border-neutral-700 transition-colors">
            <div className="flex-1 pr-4">
                <p className="text-sm font-bold text-white mb-1 uppercase tracking-tight">{label}</p>
                {description && <p className="text-[10px] text-neutral-500 leading-tight">{description}</p>}
            </div>
            <button
                onClick={() => {
                    onChange(!value);
                    if (label.includes(t('profile_editor.settings.realtime_notif'))) {
                        notificationService.setEnabled(!value);
                        if (!value) {
                            notificationService.requestPermission();
                        }
                    }
                }}
                className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${value ? 'bg-crimson-600' : 'bg-neutral-800'}`}
            >
                <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 ${value ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4">
            <div className="w-full max-w-4xl bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-fade-in relative">
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 text-neutral-500 hover:text-white hover:bg-neutral-800 rounded-full transition-all z-10"
                >
                    <X className="w-6 h-6" />
                </button>

                <div className="p-8 border-b border-neutral-800 bg-gradient-to-r from-velvet-950 to-crimson-900/10">
                    <h2 className="text-3xl font-serif text-white mb-2">{t('profile_editor.title')}</h2>
                    <p className="text-neutral-500 text-sm italic">{t('profile_editor.subtitle')}</p>
                    <div className="flex gap-6 border-b border-neutral-800/50 mt-6 overflow-x-auto no-scrollbar">
                        <button
                            onClick={() => setActiveTab('DETAILS')}
                            className={`pb-3 text-sm font-bold uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'DETAILS' ? 'text-crimson-500 border-b-2 border-crimson-500' : 'text-neutral-500 hover:text-neutral-300'}`}
                        >
                            {t('profile_editor.tabs.details')}
                        </button>
                        {user.role !== UserRole.CLUB && (
                            <button
                                onClick={() => setActiveTab('VAULT')}
                                className={`pb-3 text-sm font-bold uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === 'VAULT' ? 'text-gold-500 border-b-2 border-gold-500' : 'text-neutral-500 hover:text-neutral-300'}`}
                            >
                                <Lock className="w-3 h-3" /> {t('profile_editor.tabs.vault')}
                            </button>
                        )}
                        <button
                            onClick={() => setActiveTab('SETTINGS')}
                            className={`pb-3 text-sm font-bold uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'SETTINGS' ? 'text-white border-b-2 border-white' : 'text-neutral-500 hover:text-neutral-300'}`}
                        >
                            {t('profile_editor.tabs.settings')}
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {activeTab === 'DETAILS' && (
                        <div className="space-y-10 animate-fade-in">
                            {activeCheckin && (
                                <div className="bg-green-900/10 border border-green-900/30 p-4 flex items-center justify-between rounded-lg">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-green-900/20 rounded-full flex items-center justify-center">
                                            <MapPin className="w-4 h-4 text-green-500" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-serif text-green-400">{t('profile_editor.details.radar_active')}</p>
                                            <p className="text-[10px] text-neutral-500">{t('profile_editor.details.expires_at', { time: new Date(activeCheckin.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) })}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={stopCheckin}
                                        className="bg-red-900/20 hover:bg-red-900/40 text-red-500 border border-red-900 px-3 py-1.5 rounded flex items-center gap-2 text-xs uppercase font-bold transition-colors"
                                    >
                                        <Trash2 className="w-3 h-3" /> {t('common.delete')}
                                    </button>
                                </div>
                            )}

                            <div className="space-y-4">
                                <h3 className="text-lg font-serif text-white flex items-center gap-2">
                                    <Camera className="w-5 h-5 text-crimson-500" />
                                    {t('profile_editor.details.profile_image')}
                                </h3>
                                <div className="flex items-center gap-6">
                                    <div className="relative group">
                                        <img src={avatar || '/default-avatar.png'} className="w-24 h-24 rounded-2xl object-cover border-2 border-neutral-800" alt="Avatar" />
                                        <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer rounded-2xl">
                                            <Upload className="w-6 h-6 text-white" />
                                            <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                                        </label>
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <p className="text-sm text-neutral-400">{t('profile_editor.details.click_to_upload_avatar')}</p>
                                        <button
                                            onClick={() => setShowAvatarInput(!showAvatarInput)}
                                            className="text-xs text-crimson-500 hover:text-crimson-400 underline transition-colors"
                                        >
                                            {showAvatarInput ? t('profile_editor.details.hide_url') : t('profile_editor.details.or_enter_url')}
                                        </button>
                                        {showAvatarInput && (
                                            <input
                                                type="text"
                                                value={avatar}
                                                onChange={e => setAvatar(e.target.value)}
                                                className="w-full bg-black border border-neutral-800 text-white px-3 py-2 text-xs focus:border-crimson-600 outline-none rounded"
                                                placeholder="https://..."
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs uppercase text-neutral-500 mb-2 font-bold">{t('profile_editor.details.bio_label')}</label>
                                <textarea
                                    value={bio}
                                    onChange={e => setBio(e.target.value)}
                                    className="w-full bg-black border border-neutral-800 text-white p-4 text-sm focus:border-crimson-600 outline-none min-h-[120px] rounded-lg font-serif"
                                    placeholder={t('profile_editor.details.bio_placeholder')}
                                />
                            </div>

                            {user.role === UserRole.CLUB && clubProfile && (
                                <div className="space-y-6 pt-6 border-t border-neutral-900 animate-fade-in">
                                    <h3 className="text-lg font-serif text-white flex items-center gap-2">
                                        <MapPin className="w-5 h-5 text-crimson-500" />
                                        {t('clubs.club_info')}
                                    </h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs uppercase text-neutral-500 mb-2 font-bold">{t('clubs.address')}</label>
                                            <input
                                                type="text"
                                                value={clubProfile.address}
                                                onChange={e => setClubProfile({ ...clubProfile, address: e.target.value })}
                                                className="w-full bg-black border border-neutral-800 text-white p-3 text-sm focus:border-crimson-600 outline-none rounded"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs uppercase text-neutral-500 mb-2 font-bold">{t('clubs.city')}</label>
                                            <input
                                                type="text"
                                                value={clubProfile.city}
                                                onChange={e => setClubProfile({ ...clubProfile, city: e.target.value })}
                                                className="w-full bg-black border border-neutral-800 text-white p-3 text-sm focus:border-crimson-600 outline-none rounded"
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={geocodeAddress}
                                        disabled={geoLoading}
                                        className="w-full py-2 bg-neutral-900 border border-neutral-800 text-[10px] text-neutral-400 uppercase font-bold hover:text-white transition-colors"
                                    >
                                        {geoLoading ? t('clubs.locating') : t('clubs.locate_on_map')}
                                    </button>

                                    <div>
                                        <label className="block text-xs uppercase text-neutral-500 mb-2 font-bold">{t('clubs.phone')}</label>
                                        <input
                                            type="text"
                                            value={clubProfile.phone}
                                            onChange={e => setClubProfile({ ...clubProfile, phone: e.target.value })}
                                            className="w-full bg-black border border-neutral-800 text-white p-3 text-sm focus:border-crimson-600 outline-none rounded"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs uppercase text-neutral-500 mb-2 font-bold">{t('clubs.photos')}</label>
                                        <div className="flex gap-2 mb-4">
                                            <input
                                                type="text"
                                                value={photoInput}
                                                onChange={e => setPhotoInput(e.target.value)}
                                                className="flex-1 bg-black border border-neutral-800 text-white p-3 text-xs focus:border-crimson-600 outline-none rounded"
                                                placeholder="https://immagine-locale.jpg"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => { if (photoInput) { setClubPhotos([...clubPhotos, photoInput]); setPhotoInput(''); } }}
                                                className="bg-neutral-800 px-4 text-white font-bold rounded"
                                            >
                                                +
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                                            {clubPhotos.map((p, idx) => (
                                                <div key={idx} className="relative group aspect-square cursor-zoom-in" onClick={() => setZoomedImage(p)}>
                                                    <img src={p} className="w-full h-full object-cover rounded border border-neutral-800" />
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); setClubPhotos(clubPhotos.filter((_, i) => i !== idx)); }}
                                                        className="absolute -top-1 -right-1 bg-crimson-600 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs uppercase text-green-700 mb-3 font-bold">{t('profile_editor.details.desires_label')}</label>
                                <div className="flex flex-wrap gap-2">
                                    {DESIRE_OPTIONS.map(opt => (
                                        <button
                                            key={opt}
                                            onClick={() => toggleItem(desires, setDesires, opt)}
                                            className={`px-3 py-1.5 text-[10px] uppercase font-bold border transition-all rounded ${desires.includes(opt) ? 'bg-green-900/20 text-green-400 border-green-800/50' : 'bg-transparent text-neutral-600 border-neutral-800 hover:border-neutral-700'}`}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs uppercase text-crimson-700 mb-3 font-bold">{t('profile_editor.details.limits_label')}</label>
                                <div className="flex flex-wrap gap-2">
                                    {LIMIT_OPTIONS.map(opt => (
                                        <button
                                            key={opt}
                                            onClick={() => toggleItem(limits, setLimits, opt)}
                                            className={`px-3 py-1.5 text-[10px] uppercase font-bold border transition-all rounded ${limits.includes(opt) ? 'bg-crimson-900/20 text-crimson-400 border-crimson-800/50' : 'bg-transparent text-neutral-600 border-neutral-800 hover:border-neutral-700'}`}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="w-full bg-white text-black py-4 font-bold uppercase tracking-[0.2em] text-xs hover:bg-neutral-200 transition-all flex items-center justify-center gap-2 rounded-lg"
                            >
                                {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {t('profile_editor.details.save_profile')}
                            </button>
                        </div>
                    )}

                    {activeTab === 'VAULT' && (
                        <div className="space-y-8 animate-fade-in">
                            <div className="bg-gradient-to-br from-crimson-900/10 to-gold-900/10 border border-crimson-800/30 p-6 rounded-lg">
                                <h3 className="text-white font-serif mb-2 flex items-center gap-2 text-xl">
                                    <Shield className="w-5 h-5 text-gold-500" /> {t('profile_editor.vault.title')}
                                </h3>
                                <p className="text-xs text-neutral-400 leading-relaxed">
                                    {t('profile_editor.vault.description_part1')} <strong className="text-gold-500">{t('profile_editor.vault.pay_per_view')}</strong>.
                                    <br />
                                    <span className="text-gold-500">{t('profile_editor.vault.price_free')} • {t('profile_editor.vault.price_min')}</span>
                                </p>
                            </div>

                            <div className="flex justify-between items-center mb-4">
                                <div className="flex gap-2 p-1 bg-black rounded-lg border border-neutral-800 shadow-inner">
                                    <button
                                        onClick={() => setVaultViewMode('grid')}
                                        className={`p-1.5 rounded-md transition-all ${vaultViewMode === 'grid' ? 'bg-neutral-800 text-gold-500' : 'text-neutral-600 hover:text-neutral-400'}`}
                                    >
                                        <LayoutGrid className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setVaultViewMode('masonry')}
                                        className={`p-1.5 rounded-md transition-all ${vaultViewMode === 'masonry' ? 'bg-neutral-800 text-gold-500' : 'text-neutral-600 hover:text-neutral-400'}`}
                                    >
                                        <Grid className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="relative">
                                        <Coins className="w-3 h-3 text-gold-500 absolute left-3 top-1/2 -translate-y-1/2" />
                                        <input
                                            type="number"
                                            value={vaultPrice}
                                            onChange={(e) => setVaultPrice(Number(e.target.value))}
                                            placeholder={t('profile_editor.vault.price_placeholder')}
                                            className="w-24 bg-black border border-neutral-700 text-white pl-8 pr-2 py-2 text-xs focus:border-gold-500 outline-none rounded"
                                            min="0"
                                            step="1"
                                        />
                                    </div>
                                    <label className="bg-crimson-900 hover:bg-crimson-800 text-white px-4 py-2 text-xs uppercase font-bold cursor-pointer flex items-center gap-2 transition-all border border-crimson-700 rounded">
                                        {uploadingVault ? <Loader className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                        {t('profile_editor.vault.upload_btn')}
                                        <input type="file" className="hidden" accept="image/*" onChange={addToVault} disabled={uploadingVault} />
                                    </label>
                                    <div className="flex-1 flex gap-2">
                                        <input
                                            type="text"
                                            value={linkInput}
                                            onChange={(e) => setLinkInput(e.target.value)}
                                            placeholder={t('profile_editor.vault.link_placeholder')}
                                            className="flex-1 bg-black border border-neutral-700 text-white px-3 py-2 text-[10px] focus:border-gold-500 outline-none rounded"
                                        />
                                        <button
                                            onClick={addLinkToVault}
                                            disabled={uploadingVault || !linkInput.trim()}
                                            className="bg-neutral-800 hover:bg-neutral-700 text-white px-3 py-2 text-[10px] uppercase font-bold rounded flex items-center gap-2 border border-neutral-700 transition-all disabled:opacity-50"
                                        >
                                            <Plus className="w-3.5 h-3.5" /> {t('profile_editor.vault.add_link_btn')}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {vault.length > 0 ? (
                                <div className={vaultViewMode === 'grid' ? "grid grid-cols-2 md:grid-cols-3 gap-4" : "columns-2 md:columns-3 gap-4 space-y-4"}>
                                    {vault.map((item) => (
                                        <div key={item.id} className={`relative group bg-black border border-neutral-800 overflow-hidden hover:border-crimson-700 transition-all rounded-lg ${vaultViewMode === 'grid' ? 'aspect-square' : ''}`}>
                                            {editingPhotoId === item.id ? (
                                                <div className="absolute inset-0 bg-neutral-900 z-50 flex flex-col items-center justify-center p-4">
                                                    <p className="text-xs text-neutral-400 mb-2 font-bold uppercase">{t('profile_editor.vault.new_price')}</p>
                                                    <div className="flex items-center justify-center relative w-full mb-3">
                                                        <Coins className="w-4 h-4 text-gold-500 absolute left-8" />
                                                        <input
                                                            type="number"
                                                            value={editPrice}
                                                            onChange={(e) => setEditPrice(Number(e.target.value))}
                                                            className="bg-black border border-neutral-700 text-white py-3 pl-14 pr-4 w-full text-center text-xl font-bold focus:border-gold-500 outline-none rounded-lg"
                                                            min="0"
                                                        />
                                                    </div>
                                                    <div className="flex gap-2 w-full">
                                                        <button onClick={savePhotoEdit} className="flex-1 bg-gold-600 text-black py-2 rounded font-bold text-xs uppercase">{t('common.save')}</button>
                                                        <button onClick={() => setEditingPhotoId(null)} className="flex-1 bg-neutral-800 text-white py-2 rounded font-bold text-xs uppercase">{t('common.cancel')}</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    {item.type === 'LINK' ? (
                                                        <div
                                                            className="w-full h-full flex flex-col items-center justify-center bg-neutral-900 p-4 text-center cursor-pointer group-hover:bg-neutral-800 transition-colors"
                                                            onClick={() => {
                                                                setEditingPhotoId(item.id);
                                                                setEditPrice(item.price);
                                                            }}
                                                        >
                                                            <Globe className="w-8 h-8 text-crimson-500 mb-2" />
                                                            <p className="text-[10px] text-white font-bold truncate max-w-full uppercase tracking-tighter px-2">
                                                                {item.url.replace(/^https?:\/\//, '').split('/')[0]}
                                                            </p>
                                                            <p className="text-[8px] text-neutral-500 mt-1 uppercase">Link</p>
                                                        </div>
                                                    ) : (
                                                        <img
                                                            src={item.url}
                                                            className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110"
                                                            loading="lazy"
                                                            onClick={() => {
                                                                setEditingPhotoId(item.id);
                                                                setEditPrice(item.price);
                                                            }}
                                                        />
                                                    )}
                                                    <div className={`absolute top-2 right-2 text-[10px] font-bold px-2 py-1 border rounded flex items-center gap-1 ${item.price > 0 ? 'bg-black/80 text-gold-500 border-gold-900/50' : 'bg-green-900/80 text-white border-green-700'}`}>
                                                        {item.price > 0 ? <><Coins className="w-3 h-3" /> {item.price}</> : t('profile_editor.vault.free')}
                                                    </div>
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center gap-2 pb-4">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setZoomedImage(item.url); }}
                                                            className="p-2 bg-neutral-900/90 hover:bg-neutral-800 text-white rounded-full border border-neutral-700 transition-colors shadow-lg"
                                                            title="Zoom"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setEditingPhotoId(item.id); setEditPrice(item.price); }}
                                                            className="p-2 bg-neutral-900/90 hover:bg-neutral-800 text-white rounded-full border border-neutral-700 transition-colors shadow-lg"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); deletePhoto(item.id); }}
                                                            className="p-2 bg-red-900/90 hover:bg-red-800 text-white rounded-full border border-red-700 transition-colors shadow-lg"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-20 border-2 border-dashed border-neutral-800 text-neutral-600 text-xs uppercase tracking-widest rounded-xl">
                                    <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-30" />
                                    {t('profile_editor.vault.empty')}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'SETTINGS' && (
                        <div className="space-y-10 animate-fade-in">
                            <div>
                                <h3 className="text-lg font-serif text-white mb-4 flex items-center gap-2">
                                    <Bell className="w-5 h-5 text-crimson-500" />
                                    {t('profile_editor.settings.notif_title')}
                                </h3>
                                <div className="space-y-2">
                                    <SettingToggle
                                        label={t('profile_editor.settings.realtime_notif')}
                                        value={notificationsEnabled}
                                        onChange={setNotificationsEnabled}
                                        description={t('profile_editor.settings.notif_hint')}
                                    />
                                </div>
                                <div className="mt-4 p-4 bg-neutral-900/30 border border-neutral-800 rounded-lg">
                                    <p className="text-[10px] text-neutral-500 leading-relaxed">
                                        <strong className="text-white">{t('profile_editor.settings.notif_receive_for')}:</strong>
                                        <br />• {t('profile_editor.settings.notif_private_messages')}
                                        <br />• {t('profile_editor.settings.notif_credits_received')}
                                        <br />• {t('profile_editor.settings.notif_vault_access_requests')}
                                        <br />• {t('profile_editor.settings.notif_new_profile_visitors')}
                                        <br />• {t('profile_editor.settings.notif_oracle_matches')}
                                    </p>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-neutral-800">
                                <h3 className="text-lg font-serif text-red-500 mb-4 flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5" />
                                    {t('profile_editor.settings.danger_zone')}
                                </h3>
                                <div className="p-6 border border-red-900/30 bg-red-900/5 rounded-lg">
                                    <p className="text-sm text-neutral-400 mb-6 leading-relaxed">
                                        {t('profile_editor.settings.delete_desc_part1')} <strong className="text-red-500">{t('profile_editor.settings.delete_desc_permanent')}</strong> {t('profile_editor.settings.delete_desc_part2')}
                                    </p>
                                    {confirmDelete ? (
                                        <div className="space-y-4 text-center">
                                            <p className="text-red-500 font-bold uppercase text-xs tracking-widest">{t('profile_editor.settings.are_you_sure')}</p>
                                            <div className="flex gap-4">
                                                <button
                                                    onClick={handleDeleteAccount}
                                                    disabled={isDeleting}
                                                    className="flex-1 py-3 bg-red-900 hover:bg-red-800 text-white font-bold uppercase text-xs tracking-widest rounded transition-colors disabled:opacity-50"
                                                >
                                                    {isDeleting ? <Loader className="animate-spin" /> : t('profile_editor.settings.confirm_delete_btn')}
                                                </button>
                                                <button
                                                    onClick={() => setConfirmDelete(false)}
                                                    className="flex-1 py-3 bg-neutral-800 hover:bg-neutral-700 text-white font-bold uppercase text-xs tracking-widest rounded transition-colors"
                                                >
                                                    {t('common.cancel')}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setConfirmDelete(true)}
                                            className="w-full py-3 border border-red-900 text-red-500 hover:bg-red-900 hover:text-white font-bold uppercase text-xs tracking-[0.2em] transition-all rounded"
                                        >
                                            <UserX className="w-4 h-4 inline mr-2" />
                                            {t('profile_editor.settings.delete_account_btn')}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Image Zoom Overlay */}
            {zoomedImage && (
                <div
                    className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 p-4 animate-fade-in backdrop-blur-md"
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

export default ProfileEditor;
