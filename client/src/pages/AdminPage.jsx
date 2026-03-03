import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthProvider';
import {
    Users, UserPlus, Shield, X, CheckCircle, Lock,
    Key, Search, Edit3, Trash2, Calendar, Clock,
    AlertCircle, ChevronRight, UserCircle, Settings
} from 'lucide-react';
import clsx from 'clsx';
import api from '../services/api';

export const AdminPage = () => {
    const { user, login } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [settings, setSettings] = useState({ allowRegistration: true });
    const [planCatalog, setPlanCatalog] = useState([]);
    const [planCatalogLoading, setPlanCatalogLoading] = useState(false);
    const [planCatalogError, setPlanCatalogError] = useState('');

    // User Creation State
    const [newUser, setNewUser] = useState({ username: '', password: '', role: 'user' });
    const [createError, setCreateError] = useState('');
    const [createSuccess, setCreateSuccess] = useState('');

    // Editing State (Unified Modal)
    const [editTarget, setEditTarget] = useState(null); // Full user object
    const [editForm, setEditForm] = useState({
        username: '',
        role: '',
        planType: '',
        expiresAt: ''
    });
    const [editError, setEditError] = useState('');
    const [editSuccess, setEditSuccess] = useState('');

    // Reset Password State
    const [resetTarget, setResetTarget] = useState(null);
    const [resetPassword, setResetPassword] = useState('');
    const [resetSuccess, setResetSuccess] = useState('');

    // Security Access State
    const [adminCreds, setAdminCreds] = useState({ username: '', password: '' });
    const [accessError, setAccessError] = useState('');

    const planLookup = useMemo(() => {
        return planCatalog.reduce((acc, plan) => {
            acc[plan.id] = plan;
            return acc;
        }, {});
    }, [planCatalog]);

    const fallbackPlans = useMemo(() => ([
        {
            id: 'none',
            label: 'Sin plan',
            description: 'Usuario sin suscripción activa.',
            quotaType: 'restricted',
            monthlyLimit: 0,
            allowsPlatformKey: true,
            requiresCustomKey: false,
            upgradeHint: 'Contrata un plan para habilitar el bot.',
            priceUsd: 0,
            billingCycle: null,
            currency: 'USD',
            trialDays: 0,
            visible: false
        },
        {
            id: 'prueba',
            label: 'Plan Trial 3 días',
            description: 'Incluye 50 créditos para validar el bot en menos de 72h.',
            quotaType: 'credits',
            monthlyLimit: 50,
            allowsPlatformKey: true,
            requiresCustomKey: false,
            upgradeHint: 'Tu prueba terminó. Contrata un plan para continuar.',
            priceUsd: 0,
            billingCycle: 'trial',
            currency: 'USD',
            trialDays: 3,
            visible: true
        },
        {
            id: 'starter',
            label: 'Plan Esencial',
            description: '800 créditos mensuales para pequeños negocios.',
            quotaType: 'credits',
            monthlyLimit: 800,
            allowsPlatformKey: true,
            requiresCustomKey: false,
            upgradeHint: 'Alcanza Infinito ($17) o Business para más mensajes.',
            priceUsd: 12,
            billingCycle: 'monthly',
            currency: 'USD',
            trialDays: 0,
            visible: true
        },
        {
            id: 'infinito',
            label: 'Plan Infinito (BYOK)',
            description: 'Uso ilimitado con tu propia API Key de OpenAI.',
            quotaType: 'custom-key',
            monthlyLimit: null,
            allowsPlatformKey: false,
            requiresCustomKey: true,
            upgradeHint: 'Agrega tu propia OpenAI API Key para uso ilimitado.',
            priceUsd: 17,
            billingCycle: 'monthly',
            currency: 'USD',
            trialDays: 0,
            visible: true
        },
        {
            id: 'business',
            label: 'Plan Business',
            description: '2,500 créditos al mes + soporte prioritario.',
            quotaType: 'credits',
            monthlyLimit: 2500,
            allowsPlatformKey: true,
            requiresCustomKey: false,
            upgradeHint: 'Contacta a soporte para subir a Enterprise.',
            priceUsd: 25,
            billingCycle: 'monthly',
            currency: 'USD',
            trialDays: 0,
            visible: true
        }
    ]), []);

    const resolvePlanMeta = (planId) => planLookup[planId] || fallbackPlans.find((plan) => plan.id === planId) || planLookup.none || fallbackPlans[0];

    const featuredPlans = useMemo(() => planCatalog.filter((plan) => plan.visible !== false && plan.id !== 'admin' && plan.id !== 'none'), [planCatalog]);

    const editablePlanOptions = useMemo(() => {
        const catalog = planCatalog.length ? planCatalog : fallbackPlans;
        return catalog.filter((plan) => plan.id !== 'admin');
    }, [planCatalog, fallbackPlans]);

    const selectedEditPlanMeta = useMemo(() => resolvePlanMeta(editForm.planType), [editForm.planType, planLookup, fallbackPlans]);

    const formatPlanPrice = (plan) => {
        if (!plan) return 'Sin información';
        if (plan.billingCycle === 'trial') {
            return `${plan.trialDays || 0} días gratis`;
        }
        if (plan.priceUsd === 0 || plan.priceUsd == null) {
            return 'Incluido';
        }
        const cycleLabel = plan.billingCycle === 'monthly' ? 'mes' : plan.billingCycle === 'annual' ? 'año' : plan.billingCycle === 'lifetime' ? 'de por vida' : (plan.billingCycle || '').toLowerCase();
        return `$${plan.priceUsd}/${cycleLabel}`;
    };

    const formatCreditLabel = (plan, user) => {
        if (!plan) return '—';
        if (plan.quotaType === 'credits') {
            const limit = plan.monthlyLimit ?? user?.monthlyLimit;
            return `${limit ?? '—'} créditos / mes`;
        }
        if (plan.quotaType === 'custom-key') {
            return 'BYOK · Ilimitado';
        }
        if (plan.quotaType === 'unlimited') {
            return 'Ilimitado';
        }
        return 'Restringido';
    };

    const getPlanBadgeTone = (plan) => {
        if (!plan) return 'bg-white/5 text-white/40 border-white/10';
        if (plan.id === 'prueba') return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
        if (plan.id === 'starter') return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';
        if (plan.id === 'business') return 'bg-blue-500/10 text-blue-300 border-blue-500/20';
        if (plan.id === 'infinito') return 'bg-purple-500/10 text-purple-300 border-purple-500/20';
        return 'bg-white/5 text-white/40 border-white/10';
    };

    const summarizeExpirationLabel = (plan) => {
        if (!plan) return '—';
    if (plan.billingCycle === 'trial') return `${plan.trialDays || 0} días de vigencia`;
        if (plan.billingCycle === 'monthly') return 'Renueva cada 30 días';
        if (plan.billingCycle === 'annual') return 'Renueva cada 12 meses';
        if (plan.billingCycle === 'lifetime') return 'Sin caducidad automática';
        return 'Expiración manual';
    };

    useEffect(() => {
        const bootstrap = async () => {
            if (user?.role?.toUpperCase() === 'ADMIN') {
                await Promise.all([
                    fetchUsers(),
                    fetchSettings(),
                    fetchPlanCatalog()
                ]);
            }
            setInitialLoading(false);
        };
        bootstrap();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    const fetchSettings = async () => {
        try {
            const res = await api.get('/auth/settings');
            setSettings(res.data);
        } catch (e) {
            console.error('Failed to fetch settings', e);
        }
    };

    const fetchPlanCatalog = async () => {
        try {
            setPlanCatalogLoading(true);
            const res = await api.get('/plans/catalog');
            setPlanCatalog(res.data?.plans || []);
        } catch (e) {
            console.error('Failed to fetch plan catalog', e);
            setPlanCatalogError('No se pudo cargar el catálogo de planes');
            setTimeout(() => setPlanCatalogError(''), 4000);
        } finally {
            setPlanCatalogLoading(false);
        }
    };

    const toggleRegistration = async () => {
        const newStatus = !settings.allowRegistration;
        // Optimistic update
        setSettings(prev => ({ ...prev, allowRegistration: newStatus }));

        try {
            const res = await api.put('/auth/settings', { allowRegistration: newStatus });
            setSettings(res.data);
        } catch (e) {
            // Rollback on error
            setSettings(prev => ({ ...prev, allowRegistration: !newStatus }));
            setEditError('Error actualizando configuración');
            setTimeout(() => setEditError(''), 3000);
        }
    };

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const res = await api.get('/auth/users');
            setUsers(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateSettings = async (e) => {
        e.preventDefault();
        try {
            await api.put('/auth/settings', settings);
            setEditSuccess('Configuración de sistema actualizada ✅');
            setTimeout(() => setEditSuccess(''), 3000);
        } catch (e) {
            setEditError('Error al guardar configuración global');
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        setCreateError('');
        setCreateSuccess('');
        try {
            await api.post('/auth/register', newUser);
            setCreateSuccess('Usuario creado exitosamente 🚀');
            setNewUser({ username: '', password: '', role: 'user' });
            fetchUsers();
            setTimeout(() => {
                document.getElementById('createUserModal').close();
                setCreateSuccess('');
            }, 1500);
        } catch (err) {
            setCreateError(err.response?.data?.error || 'Error al crear usuario');
        }
    };

    const openEditModal = (u) => {
        const sanitizedPlan = resolvePlanMeta(u.planType)?.id || editablePlanOptions[0]?.id || 'none';
        setEditTarget(u);
        setEditForm({
            username: u.username || '',
            role: u.role === 'prueba' ? 'user' : (u.role || 'user'),
            planType: sanitizedPlan,
            expiresAt: u.expiresAt ? new Date(u.expiresAt).toISOString().split('T')[0] : ''
        });
        setEditError('');
        setEditSuccess('');
        document.getElementById('editUserModal').showModal();
    };

    const handleUpdateUser = async (e) => {
        e.preventDefault();
        setEditError('');
        setEditSuccess('');
        try {
            await api.put(`/auth/users/${editTarget.id}`, editForm);
            setEditSuccess('Usuario actualizado correctamente');
            fetchUsers();
            setTimeout(() => {
                document.getElementById('editUserModal').close();
                setEditTarget(null);
                setEditSuccess('');
            }, 1000);
        } catch (err) {
            setEditError(err.response?.data?.error || 'Error al actualizar');
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        try {
            await api.post(`/auth/users/${resetTarget.id}/reset`, { newPassword: resetPassword });
            setResetSuccess(`Contraseña actualizada correctamente.`);
            setResetPassword('');
            setTimeout(() => {
                setResetTarget(null);
                setResetSuccess('');
            }, 2000);
        } catch (err) {
            alert('Error al restablecer contraseña');
        }
    };

    const handleDeleteUser = async (u) => {
        if (confirm(`¿ELIMINAR a ${u.username}? Se perderán todos sus datos.`)) {
            try {
                await api.delete(`/auth/users/${u.id}`);
                fetchUsers();
            } catch (err) {
                alert('Error al eliminar');
            }
        }
    };

    const handleAdminAccess = async (e) => {
        e.preventDefault();
        setAccessError('');
        try {
            const res = await login(adminCreds.username, adminCreds.password);
            if (res.success) {
                if (res.user?.role?.toUpperCase() !== 'ADMIN') {
                    setAccessError('Privilegios de Admin requeridos.');
                }
            } else {
                setAccessError(res.error || 'Credenciales inválidas');
            }
        } catch (err) {
            setAccessError('Error de conexión');
        }
    };

    const filteredUsers = users.filter(u =>
        u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const checkStatus = (u) => {
        if (!u.expiresAt) return 'active';
        return new Date() > new Date(u.expiresAt) ? 'expired' : 'active';
    };

    const addTime = (months) => {
        let baseDate = editForm.expiresAt ? new Date(editForm.expiresAt) : new Date();
        if (baseDate < new Date()) baseDate = new Date();

        baseDate.setMonth(baseDate.getMonth() + months);
        setEditForm({ ...editForm, expiresAt: baseDate.toISOString().split('T')[0] });
    };

    if (initialLoading) {
        return <div className="min-h-screen bg-wa-dark flex items-center justify-center text-white">Cargando...</div>;
    }

    if (user?.role?.toUpperCase() !== 'ADMIN') {
        return (
            <div className="min-h-screen bg-wa-dark flex items-center justify-center p-4">
                <div className="glass-panel w-full max-w-md p-8 rounded-2xl shadow-2xl border border-red-500/20">
                    <div className="text-center mb-6">
                        <Lock size={48} className="text-red-500 mx-auto mb-4 animate-pulse" />
                        <h1 className="text-2xl font-bold text-white">Acceso Restringido</h1>
                        <p className="text-wa-secondary text-sm mt-2">Usa credenciales de Administrador para continuar.</p>
                    </div>
                    {accessError && <div className="bg-red-500/10 text-red-400 p-3 rounded-lg text-sm mb-6 text-center border border-red-500/20">{accessError}</div>}
                    <form onSubmit={handleAdminAccess} className="space-y-4">
                        <input type="text" placeholder="Usuario Admin" className="w-full glass-input p-3 rounded-xl" required value={adminCreds.username} onChange={e => setAdminCreds({ ...adminCreds, username: e.target.value })} />
                        <input type="password" placeholder="Contraseña" className="w-full glass-input p-3 rounded-xl" required value={adminCreds.password} onChange={e => setAdminCreds({ ...adminCreds, password: e.target.value })} />
                        <button type="submit" className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-red-500/20">DESBLOQUEAR</button>
                    </form>
                    <a href="/" className="block text-center text-xs text-wa-secondary mt-6 hover:text-white transition-colors">← Volver al Dashboard</a>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-950 text-white font-sans selection:bg-purple-500/30">
            {/* Nav & Stats */}
            <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-4">
                        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-3.5 rounded-2xl shadow-lg shadow-purple-500/20">
                            <Shield className="text-white w-7 h-7" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">Centro de Control</h1>
                            <p className="text-wa-secondary text-sm font-medium">Gestión avanzada de suscripciones y usuarios</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2.5 rounded-2xl backdrop-blur-md">
                            <span className="text-[10px] font-bold text-wa-secondary uppercase tracking-widest">Registros</span>
                            <button onClick={toggleRegistration} className={clsx('w-10 h-5 rounded-full relative transition-all duration-300', settings.allowRegistration ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]' : 'bg-white/10')}>
                                <div className={clsx('w-3 h-3 bg-white rounded-full absolute top-1 transition-all duration-300', settings.allowRegistration ? 'left-6' : 'left-1')}></div>
                            </button>
                        </div>
                        <div className="h-8 w-[1px] bg-white/10 mx-2 hidden md:block"></div>
                        <button
                            onClick={() => document.getElementById('systemSettingsModal').showModal()}
                            className="bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 px-6 py-2.5 rounded-2xl border border-purple-500/20 flex items-center gap-2.5 transition-all active:scale-95 group"
                        >
                            <Settings className="group-hover:rotate-90 transition-transform" size={18} />
                            <span className="text-xs font-bold uppercase tracking-widest">Negocio</span>
                        </button>
                        <button
                            onClick={() => document.getElementById('createUserModal').showModal()}
                            className="bg-white hover:bg-gray-200 text-black px-6 py-2.5 rounded-2xl flex items-center gap-2.5 transition-all active:scale-95 shadow-lg shadow-white/5"
                        >
                            <UserPlus size={18} />
                            <span className="text-xs font-bold uppercase tracking-widest">Nuevo Usuario</span>
                        </button>
                    </div>
                </div>

                {/* --- Business Settings Modal --- */}
                <dialog id="systemSettingsModal" className="glass-panel p-0 bg-transparent backdrop:backdrop-blur-md w-full max-w-2xl shadow-none border-none">
                    <div className="bg-neutral-900 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl m-4">
                        <div className="p-8 space-y-8">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                                        <Settings className="text-blue-400" size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold">Configuración de Negocio</h2>
                                        <p className="text-wa-secondary text-[10px] uppercase font-bold tracking-widest mt-1">Datos Globales del Sistema</p>
                                    </div>
                                </div>
                                <button onClick={() => document.getElementById('systemSettingsModal').close()} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleUpdateSettings} className="space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <h3 className="text-xs font-black text-purple-400 uppercase tracking-widest border-l-2 border-purple-500 pl-3">Precios de Suscripción</h3>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-[10px] font-bold text-wa-secondary uppercase mb-1 block">Mensual ($)</label>
                                                <input type="text" className="w-full glass-input px-4 py-3 rounded-xl border-white/5" value={settings.priceMonthly || ''} onChange={e => setSettings({ ...settings, priceMonthly: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-wa-secondary uppercase mb-1 block">Trimestral ($)</label>
                                                <input type="text" className="w-full glass-input px-4 py-3 rounded-xl border-white/5" value={settings.priceQuarterly || ''} onChange={e => setSettings({ ...settings, priceQuarterly: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-wa-secondary uppercase mb-1 block">Anual ($)</label>
                                                <input type="text" className="w-full glass-input px-4 py-3 rounded-xl border-white/5" value={settings.priceAnnual || ''} onChange={e => setSettings({ ...settings, priceAnnual: e.target.value })} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h3 className="text-xs font-black text-blue-400 uppercase tracking-widest border-l-2 border-blue-500 pl-3">Contacto & Links</h3>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-[10px] font-bold text-wa-secondary uppercase mb-1 block">Contacto (Tel/WhatsApp)</label>
                                                <input type="text" className="w-full glass-input px-4 py-3 rounded-xl border-white/5" value={settings.businessContact || ''} onChange={e => setSettings({ ...settings, businessContact: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-wa-secondary uppercase mb-1 block">OpenAI Link</label>
                                                <input type="text" className="w-full glass-input px-4 py-3 rounded-xl border-white/5" value={settings.openaiLink || ''} onChange={e => setSettings({ ...settings, openaiLink: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-wa-secondary uppercase mb-1 block">Facebook Page</label>
                                                <input type="text" className="w-full glass-input px-4 py-3 rounded-xl border-white/5" value={settings.facebookLink || ''} onChange={e => setSettings({ ...settings, facebookLink: e.target.value })} />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-wa-secondary uppercase mb-1 block pl-1">Créditos de Pie de Página</label>
                                    <input type="text" className="w-full glass-input px-4 py-3 rounded-xl border-white/5 font-mono text-xs" value={settings.credits || ''} onChange={e => setSettings({ ...settings, credits: e.target.value })} />
                                </div>

                                {/* Public Registration Toggle */}
                                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-white">Registro Público</span>
                                        <span className="text-[10px] text-wa-secondary">Nuevos usuarios pueden registrarse solos</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={toggleRegistration}
                                        className={clsx('w-10 h-5 rounded-full relative transition-all duration-300', settings.allowRegistration ? 'bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.4)]' : 'bg-white/10')}
                                    >
                                        <div className={clsx('w-3 h-3 bg-white rounded-full absolute top-1 transition-all duration-300', settings.allowRegistration ? 'left-6' : 'left-1')}></div>
                                    </button>
                                </div>

                                {/* Security / Rate Limiting Section */}
                                <div className="space-y-4">
                                    <h3 className="text-xs font-black text-red-400 uppercase tracking-widest border-l-2 border-red-500 pl-3">Seguridad & Anti-BruteForce</h3>

                                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-white">Protección Rate Limit</span>
                                                <span className="text-[10px] text-wa-secondary">Bloquea intentos excesivos de login</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setSettings({ ...settings, rateLimitEnabled: !settings.rateLimitEnabled })}
                                                className={clsx('w-10 h-5 rounded-full relative transition-all duration-300', settings.rateLimitEnabled ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]' : 'bg-white/10')}
                                            >
                                                <div className={clsx('w-3 h-3 bg-white rounded-full absolute top-1 transition-all duration-300', settings.rateLimitEnabled ? 'left-6' : 'left-1')}></div>
                                            </button>
                                        </div>

                                        {settings.rateLimitEnabled && (
                                            <div className="grid grid-cols-2 gap-4 animate-fadeIn">
                                                <div>
                                                    <label className="text-[10px] font-bold text-wa-secondary uppercase mb-1 block">Max. Intentos</label>
                                                    <input type="number" className="w-full glass-input px-3 py-2 rounded-xl border-white/5" value={settings.maxLoginAttempts || 5} onChange={e => setSettings({ ...settings, maxLoginAttempts: parseInt(e.target.value) })} />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-wa-secondary uppercase mb-1 block">Bloqueo (Minutos)</label>
                                                    <input type="number" className="w-full glass-input px-3 py-2 rounded-xl border-white/5" value={settings.loginWindowMinutes || 60} onChange={e => setSettings({ ...settings, loginWindowMinutes: parseInt(e.target.value) })} />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-3xl transition-all shadow-xl shadow-blue-600/20">
                                    ACTUALIZAR CONFIGURACIÓN GLOBAL
                                </button>
                            </form>

                            {editSuccess && <div className="bg-green-500/10 text-green-400 p-4 rounded-2xl text-sm border border-green-500/20 flex items-center justify-center gap-2 animate-fadeIn"><CheckCircle size={18} /> {editSuccess}</div>}
                            {editError && <div className="bg-red-500/10 text-red-400 p-4 rounded-2xl text-sm border border-red-500/20 flex items-center justify-center gap-2 animate-fadeIn"><AlertCircle size={18} /> {editError}</div>}
                        </div>
                    </div>
                </dialog>

                {planCatalogError && (
                    <div className="p-4 rounded-2xl border border-red-500/20 bg-red-500/5 text-red-200 text-sm">
                        {planCatalogError}
                    </div>
                )}

                {planCatalogLoading && featuredPlans.length === 0 && (
                    <div className="p-4 rounded-2xl border border-white/5 bg-white/[0.02] text-sm text-wa-secondary">
                        Cargando catálogo de planes...
                    </div>
                )}

                {featuredPlans.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {featuredPlans.map((plan) => (
                            <div key={plan.id} className="rounded-[2rem] border border-white/5 bg-gradient-to-br from-white/[0.03] to-white/[0.01] p-6 flex flex-col gap-4 shadow-lg shadow-black/20">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-wa-secondary">Plan</p>
                                        <h3 className="text-xl font-bold text-white">{plan.label}</h3>
                                    </div>
                                    <span className={clsx('text-[10px] font-bold px-3 py-1 rounded-full border', plan.billingCycle === 'trial' ? 'border-amber-400/40 text-amber-300 bg-amber-500/10' : 'border-purple-400/30 text-purple-200 bg-purple-500/10')}>
                                        {plan.billingCycle === 'monthly' ? 'Mensual' : plan.billingCycle === 'trial' ? 'Trial' : 'Flexible'}
                                    </span>
                                </div>
                                <div className="text-3xl font-black text-white">
                                    {plan.priceUsd ? `$${plan.priceUsd}` : 'GRATIS'}
                                    {plan.billingCycle === 'monthly' && <span className="text-sm font-medium text-wa-secondary ml-1">/ mes</span>}
                                    {plan.billingCycle === 'trial' && plan.trialDays ? <span className="text-sm font-medium text-wa-secondary ml-1">· {plan.trialDays} días</span> : null}
                                </div>
                                <p className="text-sm text-wa-secondary leading-snug min-h-[48px]">{plan.description}</p>
                                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-white/70">
                                    <span>
                                        {plan.quotaType === 'credits' && plan.monthlyLimit ? `${plan.monthlyLimit} créditos / mes` : plan.quotaType === 'custom-key' ? 'BYOK · Ilimitado' : 'Ilimitado'}
                                    </span>
                                    <span className="text-wa-secondary">{plan.requiresCustomKey ? 'BYOK' : 'Key incluida'}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Table Section */}
                <div className="glass-panel rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl relative">
                    {/* Table Toolbar */}
                    <div className="p-6 border-b border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 bg-white/[0.02]">
                        <div className="relative w-full md:w-96 group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-purple-400 transition-colors" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar por usuario o ID..."
                                className="w-full bg-white/5 border border-white/10 pl-12 pr-4 py-3 rounded-2xl outline-none focus:border-purple-500/50 focus:bg-white/[0.08] transition-all text-sm"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="text-xs font-bold text-wa-secondary uppercase tracking-widest">
                            Mostrando {filteredUsers.length} usuarios
                        </div>
                    </div>

                    {/* Desktop Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white/[0.01] text-[10px] font-black uppercase tracking-[0.2em] text-wa-secondary border-b border-white/5">
                                    <th className="px-8 py-5">Usuario</th>
                                    <th className="px-6 py-5">Rol</th>
                                    <th className="px-6 py-5">Plan</th>
                                    <th className="px-6 py-5">Créditos</th>
                                    <th className="px-6 py-5">Vencimiento</th>
                                    <th className="px-6 py-5">Estado</th>
                                    <th className="px-8 py-5 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredUsers.map((u) => {
                                    const planMeta = planLookup[u.planType] || planLookup.none || null;
                                    return (
                                        <tr key={u.id} className="group hover:bg-white/[0.02] transition-colors">
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white/10 to-transparent flex items-center justify-center border border-white/5">
                                                        <UserCircle className="text-white/40" size={20} />
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-white">{u.username}</div>
                                                        <div className="text-[10px] font-mono text-white/20">ID: {u.id.substring(0, 8)}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className={clsx(
                                                    "text-[9px] font-black px-2 py-1 rounded-md tracking-wider border",
                                                    u.role?.toUpperCase() === 'ADMIN' ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
                                                        u.role?.toUpperCase() === 'PRUEBA' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                                                            "bg-white/5 text-white/40 border-white/10"
                                                )}>
                                                    {u.role?.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col gap-1 text-sm text-white/80">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar size={14} className="text-purple-400/50" />
                                                        <span className="font-semibold">{planMeta?.label || (u.planType || 'Sin plan')}</span>
                                                    </div>
                                                    <div className="text-[11px] text-wa-secondary">{formatPlanPrice(planMeta)}</div>
                                                    <div className={clsx('text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border w-fit', getPlanBadgeTone(planMeta))}>
                                                        {(planMeta?.id || u.planType || 'none').toUpperCase()}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="text-sm font-mono text-white/70">
                                                    {typeof u.remainingCredits === 'number' ? `${u.remainingCredits}` : '—'}
                                                </div>
                                                <div className="text-[10px] text-wa-secondary uppercase tracking-wide">
                                                    {formatCreditLabel(planMeta, u)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="text-sm font-mono text-white/60">
                                                    {u.expiresAt ? new Date(u.expiresAt).toLocaleDateString() : '∞'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className={clsx(
                                                    "flex items-center gap-2 text-[10px] font-bold uppercase",
                                                    checkStatus(u) === 'active' ? "text-green-400" : "text-red-400"
                                                )}>
                                                    <div className={clsx("w-1.5 h-1.5 rounded-full animate-pulse", checkStatus(u) === 'active' ? "bg-green-400" : "bg-red-400")}></div>
                                                    {checkStatus(u) === 'active' ? 'Activo' : 'Expirado'}
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => openEditModal(u)} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-wa-secondary hover:text-white" title="Editar">
                                                        <Edit3 size={16} />
                                                    </button>
                                                    <button onClick={() => setResetTarget(u)} className="p-2.5 bg-white/5 hover:bg-yellow-500/20 rounded-xl transition-all text-wa-secondary hover:text-yellow-400" title="Password">
                                                        <Key size={16} />
                                                    </button>
                                                    {u.id !== user?.id && (
                                                        <button onClick={() => handleDeleteUser(u)} className="p-2.5 bg-white/5 hover:bg-red-500/20 rounded-xl transition-all text-wa-secondary hover:text-red-400" title="Eliminar">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {
                            filteredUsers.length === 0 && (
                                <div className="py-20 text-center text-wa-secondary">
                                    <Search size={48} className="mx-auto mb-4 opacity-10" />
                                    <p>No se encontraron usuarios coincidentes.</p>
                                </div>
                            )
                        }
                    </div>
                </div>
            </div>

            {/* Unified Edit Modal */}
            <dialog id="editUserModal" className="glass-panel p-0 bg-transparent backdrop:backdrop-blur-md w-full max-w-lg shadow-none border-none">
                {editTarget && (
                    <div className="bg-neutral-900 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl animate-scaleIn m-4">
                        <div className="p-8 space-y-8">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
                                        <Edit3 className="text-purple-400" size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold">Editar Perfil</h2>
                                        <p className="text-wa-secondary text-xs uppercase tracking-widest font-bold mt-1">Usuario: {editTarget.username}</p>
                                    </div>
                                </div>
                                <button onClick={() => document.getElementById('editUserModal').close()} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            {editError && <div className="bg-red-500/10 text-red-400 p-4 rounded-2xl text-sm border border-red-500/20">{editError}</div>}
                            {editSuccess && <div className="bg-green-500/10 text-green-400 p-4 rounded-2xl text-sm border border-green-500/20 flex items-center gap-2"><CheckCircle size={18} /> {editSuccess}</div>}

                            <form onSubmit={handleUpdateUser} className="space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-wa-secondary tracking-widest pl-2">Username</label>
                                        <input type="text" className="w-full glass-input px-5 py-3 rounded-2xl border-white/5" value={editForm.username} onChange={e => setEditForm({ ...editForm, username: e.target.value })} required />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-wa-secondary tracking-widest pl-2">Rol del Sistema</label>
                                        <select className="w-full glass-input px-5 py-3 rounded-2xl border-white/5" value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value })}>
                                            <option value="user" className="bg-neutral-900">Usuario Dashboard</option>
                                            <option value="admin" className="bg-neutral-900">Administrador</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl space-y-6">
                                    <h3 className="text-sm font-bold flex items-center gap-2 text-purple-400">
                                        <Clock size={16} /> Configuración de Suscripción
                                    </h3>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-wa-secondary tracking-widest">Plan Actual</label>
                                            <select
                                                className="w-full glass-input px-4 py-3 rounded-xl border-white/5"
                                                value={editForm.planType}
                                                onChange={e => setEditForm({ ...editForm, planType: e.target.value })}
                                            >
                                                {editablePlanOptions.map((plan) => (
                                                    <option key={plan.id} value={plan.id} className="bg-neutral-900">
                                                        {plan.label}
                                                    </option>
                                                ))}
                                            </select>
                                            <p className="text-[11px] text-wa-secondary mt-1">
                                                {selectedEditPlanMeta?.description || 'Selecciona un plan del catálogo oficial'}
                                            </p>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-wa-secondary tracking-widest">Fecha Expiración</label>
                                            <input type="date" className="w-full glass-input px-4 py-3 rounded-xl border-white/5" value={editForm.expiresAt} onChange={e => setEditForm({ ...editForm, expiresAt: e.target.value })} />
                                        </div>
                                        {selectedEditPlanMeta && (
                                            <div className="col-span-2 bg-white/[0.03] border border-white/5 rounded-2xl p-4 space-y-3">
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="text-wa-secondary">Precio oficial</span>
                                                    <span className="font-semibold text-white">{formatPlanPrice(selectedEditPlanMeta)}</span>
                                                </div>
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="text-wa-secondary">Cobertura</span>
                                                    <span className="font-semibold text-white">{formatCreditLabel(selectedEditPlanMeta, editTarget)}</span>
                                                </div>
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="text-wa-secondary">Expiración automática</span>
                                                    <span className="font-semibold text-white">{summarizeExpirationLabel(selectedEditPlanMeta)}</span>
                                                </div>
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="text-wa-secondary">Acceso a llave</span>
                                                    <span className="font-semibold text-white">
                                                        {selectedEditPlanMeta.quotaType === 'custom-key' ? 'Requiere BYOK' : 'Incluye clave del bot'}
                                                    </span>
                                                </div>
                                                {selectedEditPlanMeta.upgradeHint && (
                                                    <p className="text-[11px] text-wa-secondary flex items-center gap-2">
                                                        <ChevronRight size={14} className="text-purple-400" />
                                                        {selectedEditPlanMeta.upgradeHint}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-3">
                                        <p className="text-[10px] font-black uppercase text-wa-secondary tracking-widest">Acciones Rápidas (+ Tiempo)</p>
                                        <div className="grid grid-cols-3 gap-3">
                                            <button type="button" onClick={() => addTime(1)} className="py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 font-bold rounded-xl border border-purple-500/20 text-xs transition-all">+ 1 Mes</button>
                                            <button type="button" onClick={() => addTime(3)} className="py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 font-bold rounded-xl border border-purple-500/20 text-xs transition-all">+ 3 Meses</button>
                                            <button type="button" onClick={() => addTime(12)} className="py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 font-bold rounded-xl border border-purple-500/20 text-xs transition-all">+ 1 Año</button>
                                        </div>
                                    </div>
                                </div>

                                <button type="submit" className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 rounded-3xl transition-all shadow-2xl shadow-purple-600/20">
                                    GUARDAR CAMBIOS
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </dialog>

            {/* Modal: Create User */}
            <dialog id="createUserModal" className="glass-panel p-0 bg-transparent backdrop:backdrop-blur-md w-full max-w-md shadow-none border-none">
                <div className="bg-neutral-900 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl m-4">
                    <div className="p-8 space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-black uppercase tracking-widest flex items-center gap-3">
                                <UserPlus className="text-purple-400" /> Nuevo Registro
                            </h2>
                            <button onClick={() => document.getElementById('createUserModal').close()} className="text-wa-secondary hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {createError && <div className="bg-red-500/10 text-red-400 p-4 rounded-2xl text-xs border border-red-500/20">{createError}</div>}
                        {createSuccess && <div className="bg-green-500/10 text-green-400 p-4 rounded-2xl text-xs border border-green-500/20 flex items-center gap-2"><CheckCircle size={16} /> {createSuccess}</div>}

                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <input type="text" placeholder="ID de Usuario" className="w-full glass-input px-5 py-3 rounded-2xl border-white/5" required value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} />
                            <input type="text" placeholder="Contraseña Temporal" className="w-full glass-input px-5 py-3 rounded-2xl border-white/5" required value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} />
                            <select className="w-full glass-input px-5 py-3 rounded-2xl border-white/5" value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
                                <option value="user" className="bg-neutral-900">Usuario estándar</option>
                                <option value="admin" className="bg-neutral-900">Administrador</option>
                            </select>
                            <button type="submit" className="w-full bg-white text-black font-black py-4 rounded-2xl mt-4 hover:bg-gray-200 transition-all">CONSTRUIR CUENTA</button>
                        </form>
                    </div>
                </div>
            </dialog>

            {/* Modal: Reset Password */}
            {
                resetTarget && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fadeIn">
                        <div className="bg-neutral-900 w-full max-w-sm p-8 rounded-[2.5rem] border border-white/10 shadow-3xl text-center relative">
                            <button onClick={() => setResetTarget(null)} className="absolute top-6 right-6 text-wa-secondary hover:text-white">
                                <X size={20} />
                            </button>
                            <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Key className="text-yellow-400" size={28} />
                            </div>
                            <h2 className="text-2xl font-bold">Cambiar Clave</h2>
                            <p className="text-wa-secondary text-xs font-bold uppercase tracking-widest mt-2">{resetTarget.username}</p>

                            {resetSuccess ? (
                                <div className="mt-8 bg-green-500/10 text-green-400 p-4 rounded-2xl flex flex-col items-center gap-2 border border-green-500/20">
                                    <CheckCircle size={32} /> {resetSuccess}
                                </div>
                            ) : (
                                <form onSubmit={handleResetPassword} className="mt-8 space-y-4">
                                    <input type="text" placeholder="Nueva Contraseña" className="w-full glass-input px-6 py-4 rounded-2xl border-white/10 text-center font-mono text-xl" value={resetPassword} onChange={e => setResetPassword(e.target.value)} required autoFocus />
                                    <button type="submit" className="w-full bg-yellow-400 hover:bg-yellow-300 text-black font-black py-4 rounded-2xl transition-all shadow-xl shadow-yellow-400/20">ACTUALIZAR LLAVE</button>
                                </form>
                            )}
                        </div>
                    </div>
                )
            }
        </div>
    );
};
