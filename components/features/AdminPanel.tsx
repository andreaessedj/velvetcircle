
import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../../types';
import { api } from '../../services/db';
import {
    Users,
    ShieldCheck,
    Crown,
    Coins,
    Search,
    Loader,
    Check,
    X,
    AlertTriangle,
    Mail,
    Edit3
} from 'lucide-react';

interface AdminPanelProps {
    currentUser: User;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ currentUser }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<User>>({});
    const [savingId, setSavingId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'USERS' | 'REPORTS'>('USERS');
    const [reports, setReports] = useState<any[]>([]);
    const [isBanning, setIsBanning] = useState<string | null>(null);
    const [roleFilter, setRoleFilter] = useState<UserRole | 'ALL'>('ALL');
    const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc'>('date_desc');
    const [selectedUserProfile, setSelectedUserProfile] = useState<User | null>(null);

    // Stats
    const [stats, setStats] = useState({
        total: 0,
        verified: 0,
        vip: 0,
        totalCredits: 0
    });

    const loadData = async () => {
        setLoading(true);
        try {
            const allUsers = await api.getUsers(true);
            setUsers(allUsers);

            setStats({
                total: allUsers.length,
                verified: allUsers.filter(u => u.isVerified).length,
                vip: allUsers.filter(u => u.isVip).length,
                totalCredits: allUsers.reduce((acc, u) => acc + (u.credits || 0), 0)
            });
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const loadReports = async () => {
        try {
            const data = await api.getReports();
            setReports(data);
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        loadData();
        loadReports();
    }, []);

    const handleToggleVerify = async (user: User) => {
        setSavingId(user.id);
        try {
            await api.adminUpdateProfile(user.id, { isVerified: !user.isVerified });
            setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isVerified: !u.isVerified } : u));
        } catch (e) {
            alert("Errore aggiornamento verifica");
        } finally {
            setSavingId(null);
        }
    };

    const handleToggleVip = async (user: User) => {
        setSavingId(user.id);
        try {
            await api.adminUpdateProfile(user.id, { isVip: !user.isVip });
            setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isVip: !u.isVip } : u));
        } catch (e) {
            alert("Errore aggiornamento VIP");
        } finally {
            setSavingId(null);
        }
    };
    const handleStartEdit = (user: User) => {
        setEditingUserId(user.id);
        setEditForm({
            name: user.name,
            email: user.email,
            role: user.role,
            credits: user.credits,
            isVerified: user.isVerified,
            isVip: user.isVip
        });
    };

    const handleSaveEdit = async () => {
        if (!editingUserId) return;
        setSavingId(editingUserId);
        try {
            await api.adminUpdateProfile(editingUserId, editForm);
            setUsers(prev => prev.map(u => u.id === editingUserId ? { ...u, ...editForm } : u));
            setEditingUserId(null);
            setEditForm({});
        } catch (e) {
            alert("Errore salvataggio modifiche");
        } finally {
            setSavingId(null);
        }
    };

    const handleUpdateReport = async (reportId: string, status: string) => {
        const notes = prompt("Note amministrative:");
        if (notes === null) return;
        try {
            await api.updateReportStatus(reportId, status, notes);
            setReports(prev => prev.map(r => r.id === reportId ? { ...r, status, admin_notes: notes } : r));
        } catch (e) {
            alert("Errore aggiornamento segnalazione");
        }
    };

    const handleToggleBan = async (user: User) => {
        if (!confirm(`Sei sicuro di voler ${user.is_banned ? 'sbannare' : 'bannare'} l'utente ${user.name}?`)) return;
        const reason = !user.is_banned ? prompt("Motivo del ban:") || "Violazione termini" : "";
        setIsBanning(user.id);
        try {
            if (user.is_banned) {
                await api.unbanUser(user.id);
            } else {
                await api.banUser(user.id, reason);
            }
            setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_banned: !user.is_banned, ban_reason: reason } : u));
        } catch (e) {
            alert("Errore operazione ban");
        } finally {
            setIsBanning(null);
        }
    };

    const filteredUsers = users
        .filter(u => {
            const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                u.email?.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
            return matchesSearch && matchesRole;
        })
        .sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return sortBy === 'date_desc' ? dateB - dateA : dateA - dateB;
        });

    if (loading) return <div className="flex justify-center p-20"><Loader className="animate-spin text-blue-600" /></div>;

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex justify-between items-end border-b border-neutral-800 pb-6">
                <div>
                    <h2 className="text-3xl font-serif text-white mb-2 flex items-center gap-3">
                        <AlertTriangle className="w-8 h-8 text-yellow-600" /> Velvet Admin Console
                    </h2>
                    <p className="text-neutral-500 text-sm uppercase tracking-widest">Gestione centralizzata membri e sistema</p>
                </div>
                <div className="flex gap-4">
                    <div className="flex bg-neutral-900 p-1 rounded border border-neutral-800 mr-4">
                        <button
                            onClick={() => setActiveTab('USERS')}
                            className={`px-4 py-1.5 text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'USERS' ? 'bg-blue-600 text-white shadow-lg' : 'text-neutral-500 hover:text-neutral-300'}`}
                        >
                            Membri
                        </button>
                        <button
                            onClick={() => setActiveTab('REPORTS')}
                            className={`px-4 py-1.5 text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'REPORTS' ? 'bg-red-600 text-white shadow-lg' : 'text-neutral-500 hover:text-neutral-300'}`}
                        >
                            Segnalazioni {reports.filter(r => r.status === 'PENDING').length > 0 && <span className="bg-white text-red-600 px-1.5 rounded-full text-[10px]">{reports.filter(r => r.status === 'PENDING').length}</span>}
                        </button>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-neutral-600" />
                        <input
                            type="text"
                            placeholder="Cerca utente..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-black border border-neutral-800 text-white pl-10 pr-4 py-2 text-sm focus:border-blue-900 outline-none rounded"
                        />
                    </div>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-wrap gap-4 items-center bg-neutral-900/50 p-4 border border-neutral-800 rounded">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold text-neutral-500">Filtra per Ruolo:</span>
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value as any)}
                        className="bg-black border border-neutral-800 text-white text-xs p-2 rounded outline-none focus:border-blue-600"
                    >
                        <option value="ALL">Tutti i ruoli</option>
                        {Object.values(UserRole).map(role => (
                            <option key={role} value={role}>{role.replace('_', ' ')}</option>
                        ))}
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold text-neutral-500">Ordina:</span>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="bg-black border border-neutral-800 text-white text-xs p-2 rounded outline-none focus:border-blue-600"
                    >
                        <option value="date_desc">Più recenti</option>
                        <option value="date_asc">Meno recenti</option>
                    </select>
                </div>
                <div className="ml-auto flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        <span className="text-[10px] text-neutral-400 uppercase">Verificato</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-gold-500"></div>
                        <span className="text-[10px] text-neutral-400 uppercase">VIP</span>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-neutral-900 p-6 border border-neutral-800 rounded">
                    <p className="text-[10px] text-neutral-500 uppercase font-bold tracking-widest mb-1">Totale Iscritti</p>
                    <div className="text-3xl font-serif text-white">{stats.total}</div>
                    <div className="flex items-center gap-1 text-[10px] text-neutral-600 mt-2"><Users className="w-3 h-3" /> Profili unici</div>
                </div>
                <div className="bg-neutral-900 p-6 border border-neutral-800 rounded">
                    <p className="text-[10px] text-neutral-500 uppercase font-bold tracking-widest mb-1">Membri VIP</p>
                    <div className="text-3xl font-serif text-gold-500">{stats.vip}</div>
                    <div className="flex items-center gap-1 text-[10px] text-neutral-600 mt-2"><Crown className="w-3 h-3" /> Abbonati attivi</div>
                </div>
                <div className="bg-neutral-900 p-6 border border-neutral-800 rounded">
                    <p className="text-[10px] text-neutral-500 uppercase font-bold tracking-widest mb-1">Verificati</p>
                    <div className="text-3xl font-serif text-blue-500">{stats.verified}</div>
                    <div className="flex items-center gap-1 text-[10px] text-neutral-600 mt-2"><ShieldCheck className="w-3 h-3" /> Identità confermate</div>
                </div>
                <div className="bg-neutral-900 p-6 border border-neutral-800 rounded">
                    <p className="text-[10px] text-neutral-500 uppercase font-bold tracking-widest mb-1">Crediti in Circolo</p>
                    <div className="text-3xl font-serif text-yellow-500">{stats.totalCredits}</div>
                    <div className="flex items-center gap-1 text-[10px] text-neutral-600 mt-2"><Coins className="w-3 h-3" /> Valuta totale</div>
                </div>
            </div>

            {/* Users Table */}
            {activeTab === 'USERS' ? (
                <div className="bg-neutral-900 border border-neutral-800 rounded overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-black text-[10px] uppercase font-bold text-neutral-500 border-b border-neutral-800">
                                    <th className="px-6 py-4">Utente</th>
                                    <th className="px-6 py-4">Iscrizione</th>
                                    <th className="px-6 py-4">Ruolo</th>
                                    <th className="px-6 py-4">Vault</th>
                                    <th className="px-6 py-4">Verifica</th>
                                    <th className="px-6 py-4">VIP</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Azioni</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-800">
                                {filteredUsers.map(user => (
                                    <tr key={user.id} className={`hover:bg-black/40 transition-colors group ${user.is_banned ? 'bg-red-950/10' : ''}`}>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <img src={user.avatar} className="w-10 h-10 rounded-full border border-neutral-800 object-cover" />
                                                <div className="flex-1">
                                                    {editingUserId === user.id ? (
                                                        <input
                                                            type="text"
                                                            value={editForm.name}
                                                            onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                                            className="bg-black border border-neutral-700 text-white text-xs p-1 w-full mb-1 focus:border-blue-500 outline-none"
                                                        />
                                                    ) : (
                                                        <div
                                                            onClick={() => setSelectedUserProfile(user)}
                                                            className="text-sm font-bold text-white flex items-center gap-1 cursor-pointer hover:text-blue-400 hover:underline transition-all"
                                                        >
                                                            {user.name}
                                                            {user.id === currentUser.id && <span className="text-[8px] bg-neutral-800 text-neutral-500 px-1 rounded">TU</span>}
                                                        </div>
                                                    )}

                                                    {editingUserId === user.id ? (
                                                        <input
                                                            type="email"
                                                            value={editForm.email}
                                                            onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                                                            className="bg-black border border-neutral-700 text-neutral-500 text-[10px] p-1 w-full focus:border-blue-500 outline-none"
                                                        />
                                                    ) : (
                                                        <div className="text-[10px] text-neutral-500 flex items-center gap-1">
                                                            <Mail className="w-2.5 h-2.5" /> {user.email || 'N/A'}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-[10px] text-neutral-400 font-mono">
                                                {user.createdAt ? new Date(user.createdAt).toLocaleDateString('it-IT') : 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {editingUserId === user.id ? (
                                                <select
                                                    value={editForm.role}
                                                    onChange={e => setEditForm({ ...editForm, role: e.target.value as UserRole })}
                                                    className="bg-neutral-800 text-[10px] font-bold text-white p-1 rounded border border-neutral-700 outline-none"
                                                >
                                                    {Object.values(UserRole).map(role => (
                                                        <option key={role} value={role}>{role.replace('_', ' ')}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <span className="text-[10px] uppercase font-bold text-neutral-400 bg-neutral-800 px-2 py-1 rounded">
                                                    {user.role.replace('_', ' ')}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {user.gallery && user.gallery.length > 0 ? (
                                                <div className="flex items-center gap-1 text-green-500">
                                                    <ShieldCheck className="w-3.5 h-3.5" />
                                                    <span className="text-[10px] font-bold">{user.gallery.length}</span>
                                                </div>
                                            ) : (
                                                <span className="text-[10px] text-neutral-600">Vuoto</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => {
                                                    if (editingUserId === user.id) {
                                                        setEditForm({ ...editForm, isVerified: !editForm.isVerified });
                                                    } else {
                                                        handleToggleVerify(user);
                                                    }
                                                }}
                                                disabled={savingId === user.id}
                                                className={`p-2 rounded-full border transition-all ${(editingUserId === user.id ? editForm.isVerified : user.isVerified) ? 'bg-blue-900/20 border-blue-600 text-blue-500' : 'bg-neutral-950 border-neutral-800 text-neutral-700 hover:border-blue-900'}`}
                                            >
                                                {savingId === user.id && user.isVerified === undefined ? <Loader className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => {
                                                    if (editingUserId === user.id) {
                                                        setEditForm({ ...editForm, isVip: !editForm.isVip });
                                                    } else {
                                                        handleToggleVip(user);
                                                    }
                                                }}
                                                disabled={savingId === user.id}
                                                className={`p-2 rounded-full border transition-all ${(editingUserId === user.id ? editForm.isVip : user.isVip) ? 'bg-gold-900/20 border-gold-600 text-gold-500' : 'bg-neutral-950 border-neutral-800 text-neutral-700 hover:border-gold-900'}`}
                                            >
                                                {savingId === user.id && user.isVip === undefined ? <Loader className="w-4 h-4 animate-spin" /> : <Crown className="w-4 h-4" />}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => handleToggleBan(user)}
                                                disabled={isBanning === user.id}
                                                className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-all border ${user.is_banned ? 'bg-red-600 border-red-500 text-white' : 'bg-neutral-950 border-neutral-800 text-neutral-500 hover:text-red-500 hover:border-red-900'}`}
                                            >
                                                {isBanning === user.id ? <Loader className="w-3 h-3 animate-spin" /> : user.is_banned ? 'BANNATO' : 'ATTIVO'}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {editingUserId === user.id ? (
                                                <div className="flex flex-col gap-2 scale-90 origin-right">
                                                    <div className="flex items-center gap-2 bg-neutral-800 border border-neutral-700 rounded px-2 py-1">
                                                        <Coins className="w-3.5 h-3.5 text-yellow-500" />
                                                        <input
                                                            type="number"
                                                            value={editForm.credits}
                                                            onChange={e => setEditForm({ ...editForm, credits: parseInt(e.target.value) || 0 })}
                                                            className="bg-transparent text-white text-xs font-bold w-12 outline-none"
                                                        />
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={handleSaveEdit}
                                                            disabled={savingId === user.id}
                                                            className="flex-1 bg-green-600 hover:bg-green-500 text-white p-1 rounded transition-colors"
                                                        >
                                                            {savingId === user.id ? <Loader className="w-3.5 h-3.5 animate-spin mx-auto" /> : <Check className="w-3.5 h-3.5 mx-auto" />}
                                                        </button>
                                                        <button
                                                            onClick={() => { setEditingUserId(null); setEditForm({}); }}
                                                            className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 p-1 rounded transition-colors"
                                                        >
                                                            <X className="w-3.5 h-3.5 mx-auto" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-end gap-1">
                                                    <div
                                                        onClick={() => handleStartEdit(user)}
                                                        className="flex items-center gap-1 text-yellow-500 font-bold text-xs cursor-pointer hover:underline"
                                                    >
                                                        <Coins className="w-3.5 h-3.5" /> {user.credits}
                                                        <Edit3 className="w-3 h-3 ml-1 text-neutral-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </div>
                                                    <button className="text-[10px] text-neutral-600 hover:text-white underline">Logs</button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="bg-neutral-900 border border-neutral-800 rounded overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-black text-[10px] uppercase font-bold text-neutral-500 border-b border-neutral-800">
                                    <th className="px-6 py-4">Data</th>
                                    <th className="px-6 py-4">Segnalatore</th>
                                    <th className="px-6 py-4">Segnalato</th>
                                    <th className="px-6 py-4">Tipo</th>
                                    <th className="px-6 py-4">Motivo</th>
                                    <th className="px-6 py-4">Stato</th>
                                    <th className="px-6 py-4 text-right">Azioni</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-800">
                                {reports.map(report => (
                                    <tr key={report.id} className="hover:bg-black/40 transition-colors">
                                        <td className="px-6 py-4 text-[10px] text-neutral-500">
                                            {new Date(report.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-neutral-300">
                                            {report.reporter_profile?.name || 'Anonimo'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gold-500 font-bold">
                                            {report.target_profile?.name || (report.target_type === 'USER' ? 'Utente non trovato' : report.target_id.substring(0, 8))}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-[10px] px-2 py-0.5 bg-neutral-800 border border-neutral-700 text-neutral-400 rounded">
                                                {report.target_type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-white">
                                            {report.reason}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${report.status === 'PENDING' ? 'bg-yellow-900/20 text-yellow-500 border border-yellow-900' :
                                                report.status === 'RESOLVED' ? 'bg-green-900/20 text-green-500 border border-green-900' :
                                                    'bg-neutral-800 text-neutral-500 border border-neutral-700'
                                                }`}>
                                                {report.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right flex gap-2 justify-end">
                                            {report.status === 'PENDING' && (
                                                <>
                                                    <button
                                                        onClick={() => handleUpdateReport(report.id, 'RESOLVED')}
                                                        className="p-2 bg-green-900/20 text-green-500 hover:bg-green-600 hover:text-white rounded border border-green-900 transition-all"
                                                        title="Risolto"
                                                    >
                                                        <Check className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleUpdateReport(report.id, 'DISMISSED')}
                                                        className="p-2 bg-neutral-900 text-neutral-500 hover:bg-neutral-700 hover:text-white rounded border border-neutral-800 transition-all"
                                                        title="Archivia"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {reports.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-neutral-600 italic text-sm">Nessuna segnalazione trovata.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* User Profile Modal Implementation */}
            {selectedUserProfile && (
                <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-neutral-950 border border-neutral-800 w-full max-w-2xl rounded shadow-2xl overflow-hidden animate-fade-in relative">
                        <button
                            onClick={() => setSelectedUserProfile(null)}
                            className="absolute top-4 right-4 text-neutral-500 hover:text-white p-2"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        <div className="p-8">
                            <div className="flex gap-6 mb-8">
                                <img src={selectedUserProfile.avatar} className="w-24 h-24 rounded border-2 border-neutral-800 object-cover" />
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-2xl font-serif text-white">{selectedUserProfile.name}</h3>
                                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${selectedUserProfile.role === UserRole.ADMIN ? 'bg-red-900/30 text-red-500 border border-red-900/50' : 'bg-neutral-800 text-neutral-400'}`}>
                                            {selectedUserProfile.role.replace('_', ' ')}
                                        </span>
                                    </div>
                                    <div className="flex gap-4 mb-4">
                                        <div className="flex items-center gap-1 text-[10px] text-neutral-500">
                                            <Mail className="w-3 h-3" /> {selectedUserProfile.email || 'Nessuna Email'}
                                        </div>
                                        <div className="flex items-center gap-1 text-[10px] text-neutral-500">
                                            <Search className="w-3 h-3" /> ID: {selectedUserProfile.id.substring(0, 8)}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        {selectedUserProfile.isVerified && <span className="flex items-center gap-1 bg-blue-900/20 text-blue-500 text-[10px] font-bold px-2 py-1 rounded border border-blue-900/30"><ShieldCheck className="w-3 h-3" /> Verificato</span>}
                                        {selectedUserProfile.isVip && <span className="flex items-center gap-1 bg-gold-900/20 text-gold-500 text-[10px] font-bold px-2 py-1 rounded border border-gold-900/30"><Crown className="w-3 h-3" /> VIP</span>}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <div className="bg-neutral-900/50 p-4 border border-neutral-800 rounded">
                                    <p className="text-[10px] text-neutral-500 uppercase font-bold tracking-widest mb-3">Biografia</p>
                                    <p className="text-sm text-neutral-300 leading-relaxed italic">
                                        "{selectedUserProfile.bio || 'Nessuna biografia inserita.'}"
                                    </p>
                                </div>
                                <div className="space-y-4">
                                    <div className="bg-neutral-900/50 p-4 border border-neutral-800 rounded">
                                        <p className="text-[10px] text-neutral-500 uppercase font-bold tracking-widest mb-2">Iscrizione</p>
                                        <p className="text-sm text-white font-mono">
                                            {selectedUserProfile.createdAt ? new Date(selectedUserProfile.createdAt).toLocaleString('it-IT') : 'Data non disponibile'}
                                        </p>
                                    </div>
                                    <div className="bg-neutral-900/50 p-4 border border-neutral-800 rounded">
                                        <p className="text-[10px] text-neutral-500 uppercase font-bold tracking-widest mb-2">Contatti</p>
                                        <p className="text-sm text-white">
                                            {selectedUserProfile.email || 'N/A'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <p className="text-[10px] text-neutral-500 uppercase font-bold tracking-widest flex justify-between items-center">
                                    <span>The Vault & Gallery</span>
                                    <span className="text-neutral-700">{selectedUserProfile.gallery?.length || 0} items</span>
                                </p>
                                <div className="grid grid-cols-4 gap-2">
                                    {selectedUserProfile.gallery?.map((item, idx) => (
                                        <div key={idx} className="aspect-square relative group bg-black border border-neutral-800 overflow-hidden">
                                            <img src={item.url} className="w-full h-full object-cover" />
                                            {item.price > 0 && (
                                                <div className="absolute top-1 right-1 bg-yellow-500 text-black text-[8px] font-bold px-1 rounded">
                                                    {item.price} CR
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {(!selectedUserProfile.gallery || selectedUserProfile.gallery.length === 0) && (
                                        <div className="col-span-4 py-8 border-2 border-dashed border-neutral-900 rounded flex flex-center text-neutral-700 text-xs italic justify-center">
                                            Nessuna foto caricata nel vault
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPanel;
