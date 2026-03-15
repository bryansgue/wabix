import { useState, useEffect, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import { useAuth } from '../contexts/AuthProvider';
import api, { deleteReminders } from '../services/api';
import {
    LayoutDashboard,
    Users,
    Search,
    Trash2,
    Filter,
    MessageSquare,
    DollarSign,
    Megaphone,
    X,
    Settings,
    Tag as TagIcon,
    PlusCircle,
    CheckCircle,
    GripVertical,
    Wifi,
    WifiOff,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { ChatViewer } from '../components/ChatViewer';
import { PaymentModal } from '../components/PaymentModal';
import { BroadcastModal } from '../components/BroadcastModal';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { StatsModal } from '../components/StatsModal';
import { useSocket } from '../hooks/useSocket';

export const ClientsPage = () => {
    const { token } = useAuth();
    const { socket, status: connectionStatus, userInfo: connectionInfo } = useSocket(token);
    const [clients, setClients] = useState([]);
    const [stats, setStats] = useState({
        states: [],
        newToday: 0,
        total: 0,
    });
    const [states, setStates] = useState([]);
    const [tags, setTags] = useState([]);
    const [selectedClient, setSelectedClient] = useState(null);
    const [paymentClient, setPaymentClient] = useState(null);
    const [showBroadcast, setShowBroadcast] = useState(false);
    const [showStatsModal, setShowStatsModal] = useState(false);
    const [showStateManager, setShowStateManager] = useState(false);
    const [showTagManager, setShowTagManager] = useState(false);
    const [tagEditorClient, setTagEditorClient] = useState(null);

    // Confirmation Modal State
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
        isDangerous: false,
    });

    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [filter, setFilter] = useState({ search: '', stateId: '', tagIds: [] });
    const [selectedRows, setSelectedRows] = useState([]);
    const refreshTimerRef = useRef(null);
    const lastRefreshRef = useRef(0);

    const toggleSelectAll = () => {
        if (selectedRows.length === clients.length) {
            setSelectedRows([]);
        } else {
            setSelectedRows(clients.map((c) => c.id));
        }
    };

    const toggleRow = (id) => {
        if (selectedRows.includes(id)) {
            setSelectedRows(selectedRows.filter((rowId) => rowId !== id));
        } else {
            setSelectedRows([...selectedRows, id]);
        }
    };

    const formatWhatsAppId = (waId) => {
        if (!waId) return 'Número no vinculado';
        return waId.replace(/@.*/, '');
    };

    const updateFilter = (partial) => {
        setFilter((prev) => ({ ...prev, ...partial }));
        setPage(1);
    };

    const handleTagFilterToggle = (tagId) => {
        updateFilter({
            tagIds: filter.tagIds.includes(tagId)
                ? filter.tagIds.filter((id) => id !== tagId)
                : [...filter.tagIds, tagId],
        });
    };

    const fetchStates = useCallback(async () => {
        try {
            const { data } = await api.get('/states');
            const normalized = data.map((state) => ({
                ...state,
                count: state._count?.clients ?? state.count ?? 0,
            }));
            setStates(normalized);
        } catch (error) {
            console.error('Failed to load states', error);
        }
    }, []);

    const fetchTags = useCallback(async () => {
        try {
            const { data } = await api.get('/tags');
            setTags(data);
        } catch (error) {
            console.error('Failed to load tags', error);
        }
    }, []);

    const fetchClients = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/clients', {
                params: {
                    page,
                    limit: 10,
                    search: filter.search || undefined,
                    stateId: filter.stateId || undefined,
                    tags: filter.tagIds.length ? filter.tagIds.join(',') : undefined,
                },
            });
            const normalizedClients = data.data.map((client) => ({
                ...client,
                tags: Array.isArray(client.tags) ? client.tags : [],
            }));
            setClients(normalizedClients);
            setTotalPages(Math.ceil(data.total / 10));
            setSelectedRows([]); // Clear selection on fetch

            setSelectedClient((prev) => {
                if (prev) {
                    const stillExists = normalizedClients.find((c) => c.id === prev.id);
                    if (stillExists) return stillExists;
                }
                return normalizedClients[0] || null;
            });
        } catch (error) {
            console.error('Failed to load clients', error);
        } finally {
            setLoading(false);
        }
    }, [page, filter]);

    const fetchStats = useCallback(async () => {
        try {
            const { data } = await api.get('/clients/stats');
            setStats({
                ...data,
                states: data.states || [],
            });
        } catch (error) {
            console.error('Failed to load stats', error);
        }
    }, []);

    useEffect(() => {
        fetchClients();
        fetchStats();
    }, [fetchClients, fetchStats]);

    useEffect(() => {
        fetchStates();
        fetchTags();
    }, [fetchStates, fetchTags]);

    const scheduleDataRefresh = useCallback(() => {
        const MIN_INTERVAL = 2500;
        const now = Date.now();
        const timeSinceLast = now - lastRefreshRef.current;
        const delay = timeSinceLast >= MIN_INTERVAL ? 0 : MIN_INTERVAL - timeSinceLast;

        if (refreshTimerRef.current) return;

        refreshTimerRef.current = setTimeout(() => {
            fetchClients();
            fetchStats();
            lastRefreshRef.current = Date.now();
            refreshTimerRef.current = null;
        }, delay);
    }, [fetchClients, fetchStats]);

    useEffect(() => {
        if (!socket) return;

        const handleClientUpdated = () => {
            scheduleDataRefresh();
        };

        socket.on('client_updated', handleClientUpdated);

        return () => {
            socket.off('client_updated', handleClientUpdated);
        };
    }, [socket, scheduleDataRefresh]);

    useEffect(() => {
        return () => {
            if (refreshTimerRef.current) {
                clearTimeout(refreshTimerRef.current);
                refreshTimerRef.current = null;
            }
        };
    }, []);

    const handleSelectClient = async (client) => {
        setSelectedClient(client);

        // Mark messages as read when opening the chat
        try {
            await api.post(`/clients/${client.chatId}/messages/mark-read`);
            // Refresh client list to update the unread count
            await fetchClients();
        } catch (error) {
            console.error('Failed to mark messages as read:', error);
        }
    };

    const getStateById = (id) => {
        return states.find((state) => state.id === id) || stats.states.find((state) => state.id === id) || null;
    };

    const handleStateChange = async (id, newStateId) => {
        if (!newStateId) return;
        try {
            await api.put(`/clients/${id}`, { stateId: newStateId });
            const nextState = getStateById(newStateId);
            setClients((prev) =>
                prev.map((client) =>
                    client.id === id ? { ...client, stateId: newStateId, state: nextState } : client,
                ),
            );
            setSelectedClient((prev) =>
                prev && prev.id === id ? { ...prev, stateId: newStateId, state: nextState } : prev,
            );
            fetchStats();
            fetchStates();
        } catch (error) {
            alert('Error actualizando estado');
        }
    };

    const handleOpenTagEditor = (client) => {
        setTagEditorClient(client);
    };

    const handleSaveClientTags = async (clientId, tagIds) => {
        try {
            const { data } = await api.put(`/clients/${clientId}/tags`, { tagIds });
            const updatedTags = Array.isArray(data?.tags) ? data.tags : tags.filter((tag) => tagIds.includes(tag.id));

            setClients((prev) =>
                prev.map((client) => (client.id === clientId ? { ...client, tags: updatedTags } : client)),
            );

            setSelectedClient((prev) => (prev && prev.id === clientId ? { ...prev, tags: updatedTags } : prev));

            setTagEditorClient(null);
        } catch (error) {
            alert('Error actualizando etiquetas');
        }
    };

    const handleCreateState = async (name) => {
        if (!name?.trim()) return;
        try {
            await api.post('/states', { name });
            fetchStates();
            fetchStats();
        } catch (error) {
            alert(error?.response?.data?.error || 'Error creando estado');
        }
    };

    const handleRenameState = async (id, name) => {
        if (!name?.trim()) return;
        try {
            await api.put(`/states/${id}`, { name });
            fetchStates();
            fetchStats();
        } catch (error) {
            alert(error?.response?.data?.error || 'Error actualizando estado');
        }
    };

    const handleMakeDefaultState = async (id) => {
        try {
            await api.put(`/states/${id}`, { isDefault: true });
            fetchStates();
        } catch (error) {
            alert(error?.response?.data?.error || 'Error al definir estado por defecto');
        }
    };

    const handleDeleteState = async (id) => {
        try {
            await api.delete(`/states/${id}`);
            fetchStates();
            fetchClients();
            fetchStats();
        } catch (error) {
            alert(error?.response?.data?.error || 'No se pudo eliminar el estado');
        }
    };

    const handleReorderStates = async (orderedIds) => {
        setStates((prev) => {
            const map = new Map(prev.map((state) => [state.id, state]));
            return orderedIds.map((id) => map.get(id)).filter(Boolean);
        });
        try {
            await api.post('/states/reorder', { order: orderedIds });
            fetchStates();
        } catch (error) {
            console.error('Error reordenando estados', error);
        }
    };

    const handleCreateTag = async (data) => {
        if (!data?.name?.trim()) return;
        try {
            await api.post('/tags', data);
            fetchTags();
        } catch (error) {
            alert(error?.response?.data?.error || 'Error creando etiqueta');
        }
    };

    const handleUpdateTag = async (id, data) => {
        try {
            await api.put(`/tags/${id}`, data);
            fetchTags();
            fetchClients();
        } catch (error) {
            alert(error?.response?.data?.error || 'Error actualizando etiqueta');
        }
    };

    const handleDeleteTag = async (id) => {
        try {
            await api.delete(`/tags/${id}`);
            fetchTags();
            fetchClients();
        } catch (error) {
            alert(error?.response?.data?.error || 'No se pudo eliminar la etiqueta');
        }
    };

    const handleDelete = async (id) => {
        setConfirmModal({
            isOpen: true,
            title: 'Eliminar Cliente',
            message: '¿Estás seguro de que deseas eliminar este cliente? Esta acción no se puede deshacer.',
            isDangerous: true,
            onConfirm: async () => {
                try {
                    await api.delete(`/clients/${id}`);
                    fetchClients();
                    fetchStats();
                    fetchStates();
                    setConfirmModal((prev) => ({ ...prev, isOpen: false }));
                } catch (error) {
                    alert('Error deleting client');
                }
            },
        });
    };

    const handleBulkDelete = async () => {
        const count = selectedRows.length > 0 ? selectedRows.length : 'TODOS los';

        setConfirmModal({
            isOpen: true,
            title: 'Eliminación Masiva',
            message: `¿Estás a punto de eliminar ${count} clientes? IMPORTANTE: Esto borrará registros permanentemente.`,
            isDangerous: true,
            onConfirm: async () => {
                try {
                    const payload =
                        selectedRows.length > 0
                            ? { ids: selectedRows }
                            : {
                                  stateId: filter.stateId || undefined,
                                  tagIds: filter.tagIds.length ? filter.tagIds : undefined,
                              };

                    // Double confirmation safety for "DELETE ALL" implicit
                    if (!selectedRows.length && !filter.stateId && !filter.tagIds.length) {
                        // Simplify for now, just allow proceed from modal logic
                    }

                    await api.post('/clients/bulk-delete', payload);
                    alert('Limpieza completada');
                    fetchClients();
                    fetchStats();
                    fetchStates();
                    setConfirmModal((prev) => ({ ...prev, isOpen: false }));
                } catch (error) {
                    alert('Error in bulk delete');
                }
            },
        });
    };

    // Helper to open cancellation modal
    const confirmCancelReminder = (client) => {
        setConfirmModal({
            isOpen: true,
            title: 'Cancelar Recordatorio',
            message: `¿Estás seguro de cancelar el recordatorio de pago para ${client.name}?`,
            isDangerous: true,
            confirmText: 'Sí, Cancelar',
            onConfirm: async () => {
                try {
                    await deleteReminders(client.chatId);
                    fetchClients();
                    setConfirmModal((prev) => ({ ...prev, isOpen: false }));
                } catch (err) {
                    alert('Error al cancelar recordatorio');
                }
            },
        });
    };

    const isConnectionOnline = connectionStatus === 'connected';
    const connectionChipClasses = isConnectionOnline
        ? 'bg-[#00a884]/15 border-[#00a884]/40 text-white'
        : 'bg-red-500/10 border-red-400/40 text-white';
    const stateSummary = stats.states.length ? stats.states : states;
    const visibleStates = stateSummary.filter((state) => (state.count ?? 0) > 0 || state.isDefault);

    return (
        <div className="min-h-screen bg-wa-dark text-white font-sans p-8 flex flex-col h-screen overflow-hidden">
            <header className="mb-6">
                {/* Main Header Row */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 shadow-lg shadow-black/10 mb-4">
                    <div className="flex items-center justify-between gap-4">
                        {/* Logo & Title */}
                        <div className="flex items-center gap-4 min-w-max">
                            <Link to="/app" className="bg-white/10 p-2 rounded-xl hover:bg-white/20 transition-colors">
                                <LayoutDashboard size={20} className="text-white" />
                            </Link>
                            <div className="flex flex-col">
                                <h1 className="text-xl font-bold flex items-center gap-2 text-white">
                                    <Users className="text-[#00a884]" size={20} />
                                    Gestión de Clientes
                                </h1>
                                <p className="text-[10px] text-white/60">
                                    Embudo personalizable y estadísticas en vivo
                                </p>
                            </div>
                        </div>

                        {/* Search Bar */}
                        <div className="relative flex-1 min-w-[300px] max-w-[400px]">
                            <Search className="absolute left-3 top-2.5 text-white/60 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Buscar por teléfono o nombre..."
                                className="pl-10 pr-4 py-2 rounded-xl text-sm w-full bg-black/30 border border-white/10 text-white focus:outline-none focus:border-[#00a884] focus:ring-1 focus:ring-[#00a884]/70 placeholder-white/50"
                                value={filter.search}
                                onChange={(e) => updateFilter({ search: e.target.value })}
                            />
                        </div>

                        {/* Status Dropdown */}
                        <div className="flex items-center gap-2 bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-sm text-white/80 min-w-max">
                            <Filter className="text-white/60 w-4 h-4" />
                            <select
                                className="bg-transparent text-white text-sm focus:outline-none"
                                value={filter.stateId}
                                onChange={(e) => updateFilter({ stateId: e.target.value })}
                            >
                                <option value="" className="text-black">
                                    Todos los estados
                                </option>
                                {stateSummary.map((state) => (
                                    <option key={state.id} value={state.id} className="text-black">
                                        {state.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Connection Status */}
                        <div
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold tracking-wide min-w-max ${connectionChipClasses}`}
                        >
                            {isConnectionOnline ? (
                                <Wifi size={16} className="text-[#00e676]" />
                            ) : (
                                <WifiOff size={16} className="text-red-300" />
                            )}
                            <div className="leading-tight">
                                <p className="text-[11px] uppercase">
                                    {isConnectionOnline ? 'Online' : 'Offline'}
                                </p>
                                <p className="text-[10px] text-white/70">
                                    {formatWhatsAppId(connectionInfo?.id)}
                                </p>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 items-center min-w-max">
                            <button
                                onClick={() => setShowBroadcast(true)}
                                className="flex items-center gap-2 bg-purple-500/20 border border-purple-400/30 text-purple-50 px-3 py-2 rounded-xl text-xs font-semibold transition-colors hover:bg-purple-500/30"
                            >
                                <Megaphone size={14} />
                                {selectedRows.length > 0 ? `Difusión (${selectedRows.length})` : 'Difusión'}
                            </button>
                            <button
                                onClick={handleBulkDelete}
                                className="flex items-center gap-2 bg-red-500/20 border border-red-400/30 text-red-100 px-3 py-2 rounded-xl text-xs font-semibold transition-colors hover:bg-red-500/30"
                            >
                                <Trash2 size={14} />
                                {selectedRows.length > 0 ? `Limpieza (${selectedRows.length})` : 'Limpieza'}
                            </button>
                            <button
                                onClick={() => {
                                    fetchClients();
                                    fetchStats();
                                    fetchStates();
                                    fetchTags();
                                }}
                                className="bg-[#00a884]/80 text-white px-3 py-2 rounded-xl text-xs font-semibold hover:bg-[#00a884] shadow-lg shadow-emerald-500/20"
                            >
                                Refresh
                            </button>
                            <button
                                onClick={() => setShowStatsModal(true)}
                                className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 px-3 py-2 rounded-xl flex items-center gap-1 transition-all shadow-lg hover:shadow-purple-500/40"
                            >
                                <span className="text-sm">📊</span>
                                <span className="font-bold text-white text-xs">Reportes</span>
                            </button>
                        </div>

                        {/* Total Clients */}
                        <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl flex flex-col items-center min-w-max">
                            <div className="text-[10px] uppercase tracking-wider text-white/50 font-semibold">
                                Total
                            </div>
                            <div className="text-2xl font-bold text-white">{stats.total || 0}</div>
                        </div>
                    </div>
                </div>

                {/* Unified Compact Filters Panel */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-3 shadow-lg shadow-black/10">
                    <div className="flex items-start justify-between gap-4">
                        {/* Left Side: States & Tags */}
                        <div className="flex-1 flex flex-col gap-2">
                            {/* States */}
                            <div className="flex items-center gap-2">
                                <p className="text-xs font-semibold text-white/70 whitespace-nowrap">
                                    Estados:
                                </p>
                                {visibleStates.length === 0 ? (
                                    <span className="text-white/50 text-xs">—</span>
                                ) : (
                                    <div className="flex gap-1.5 flex-wrap">
                                        {visibleStates.map((state) => {
                                            const isActive = filter.stateId === state.id;
                                            return (
                                                <button
                                                    key={state.id}
                                                    onClick={() =>
                                                        updateFilter({
                                                            stateId: isActive ? '' : state.id,
                                                        })
                                                    }
                                                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${isActive ? 'bg-[#00a884] border border-transparent text-white shadow-lg shadow-emerald-500/30' : 'bg-black/20 border border-white/10 text-white/70 hover:bg-white/5'}`}
                                                >
                                                    {state.name}
                                                    <span className="ml-1 text-[9px] text-white/60">
                                                        ({state.count ?? 0})
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                                {filter.stateId && (
                                    <button
                                        onClick={() => updateFilter({ stateId: '' })}
                                        className="ml-1 px-1.5 py-0.5 text-xs rounded-md bg-white/10 text-white/60 border border-white/20 hover:bg-white/15 transition"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>

                            {/* Tags */}
                            <div className="flex items-center gap-2">
                                <p className="text-xs font-semibold text-white/70 whitespace-nowrap">
                                    Etiquetas:
                                </p>
                                {tags.length === 0 ? (
                                    <span className="text-white/50 text-xs">—</span>
                                ) : (
                                    <div className="flex gap-1.5 flex-wrap">
                                        {tags.map((tag) => {
                                            const isActive = filter.tagIds.includes(tag.id);
                                            return (
                                                <button
                                                    key={tag.id}
                                                    onClick={() => handleTagFilterToggle(tag.id)}
                                                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs transition ${isActive ? 'bg-[#00a884]/30 border-[#00a884] text-white' : 'bg-black/20 border-white/10 text-white/70 hover:bg-white/5'}`}
                                                >
                                                    <span
                                                        className="w-1.5 h-1.5 rounded-full"
                                                        style={{ backgroundColor: tag.color }}
                                                    ></span>
                                                    {tag.name}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                                {filter.tagIds.length > 0 && (
                                    <button
                                        onClick={() => updateFilter({ tagIds: [] })}
                                        className="ml-1 px-1.5 py-0.5 text-xs rounded-md bg-white/10 text-red-300 border border-white/20 hover:bg-white/15 transition"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Right Side: Management Buttons */}
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                            <button
                                onClick={() => setShowTagManager(true)}
                                className="px-2 py-1 text-xs rounded-lg bg-white/10 text-white/70 border border-white/20 hover:bg-white/15 transition flex items-center gap-1"
                                title="Gestionar etiquetas"
                            >
                                <TagIcon size={12} />
                            </button>
                            <button
                                onClick={() => setShowStateManager(true)}
                                className="px-2 py-1 text-xs rounded-lg bg-[#00a884]/20 text-white border border-[#00a884]/40 hover:bg-[#00a884]/30 transition flex items-center gap-1"
                                title="Gestionar estados"
                            >
                                <Settings size={12} />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content Area - Split 70/30 */}
            <div className="flex flex-1 gap-6 overflow-hidden min-h-0">
                {/* Left Column: 70% - Filters & List - UPDATED COLORS */}
                <div className="w-[70%] flex flex-col overflow-hidden">
                    {/* Table - List Background (#efeae2) & Content */}
                    <div className="bg-[#efeae2] rounded-xl overflow-hidden border border-gray-300 shadow-md flex flex-col flex-1">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-[#f0f2f5] text-[#54656f] uppercase text-xs font-bold border-b border-gray-300">
                                    <tr>
                                        <th className="px-6 py-4 w-10">
                                            <input
                                                type="checkbox"
                                                checked={clients.length > 0 && selectedRows.length === clients.length}
                                                onChange={toggleSelectAll}
                                                className="rounded border-gray-400 text-[#00a884] focus:ring-[#00a884]"
                                            />
                                        </th>
                                        <th className="px-6 py-4">Cliente</th>
                                        <th className="px-6 py-4">Estado</th>
                                        <th className="px-6 py-4">Etiquetas</th>
                                        <th className="px-6 py-4">Difusión</th>
                                        <th className="px-6 py-4">Próximo Cobro</th>
                                        <th className="px-6 py-4">Última Actividad</th>
                                        <th className="px-6 py-4 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-black/5">
                                    {loading ? (
                                        <tr>
                                            <td colSpan="8" className="text-center py-8 text-[#54656f]">
                                                Cargando...
                                            </td>
                                        </tr>
                                    ) : clients.length === 0 ? (
                                        <tr>
                                            <td colSpan="8" className="text-center py-8 text-[#54656f]">
                                                No hay clientes encontrados
                                            </td>
                                        </tr>
                                    ) : (
                                        clients.map((client) => (
                                            <tr
                                                key={client.id}
                                                className={`hover:bg-[#f5f6f6] transition-colors ${selectedRows.includes(client.id) ? 'bg-[#f0f2f5]' : ''}`}
                                            >
                                                <td className="px-6 py-4">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedRows.includes(client.id)}
                                                        onChange={() => toggleRow(client.id)}
                                                        className="rounded border-gray-400 text-[#00a884] focus:ring-[#00a884]"
                                                    />
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="relative">
                                                            {client.profilePicUrl ? (
                                                                <img
                                                                    src={client.profilePicUrl}
                                                                    alt={client.name}
                                                                    className="w-10 h-10 rounded-full object-cover border border-gray-200"
                                                                    onError={(e) => {
                                                                        e.target.onerror = null;
                                                                        e.target.src =
                                                                            'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png?20150327203541';
                                                                    }}
                                                                />
                                                            ) : (
                                                                <div className="w-10 h-10 rounded-full bg-[#f0f2f5] flex items-center justify-center text-[#54656f] border border-gray-200">
                                                                    <Users size={20} />
                                                                </div>
                                                            )}
                                                            {client.unreadCount > 0 && (
                                                                <span className="absolute -top-1 -right-1 bg-[#25d366] text-[#111b21] text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow shadow-emerald-500/40 border border-white">
                                                                    {client.unreadCount > 9 ? '9+' : client.unreadCount}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-[#111b21] flex items-center gap-2">
                                                                {client.name?.includes('@')
                                                                    ? client.name.split('@')[0]
                                                                    : client.name || 'Sin Nombre'}
                                                            </div>
                                                            <div className="text-xs text-[#54656f] font-mono">
                                                                {client.chatId.split('@')[0]}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <select
                                                        value={client.state?.id || client.stateId || ''}
                                                        onChange={(e) => handleStateChange(client.id, e.target.value)}
                                                        className="bg-white border border-gray-300 rounded px-2 py-1 text-xs font-bold cursor-pointer text-[#111b21]"
                                                    >
                                                        {stateSummary.length === 0 ? (
                                                            <option value="">Sin estados</option>
                                                        ) : (
                                                            stateSummary.map((state) => (
                                                                <option key={state.id} value={state.id}>
                                                                    {state.name}
                                                                </option>
                                                            ))
                                                        )}
                                                    </select>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-wrap gap-1 mb-1">
                                                        {client.tags && client.tags.length > 0 ? (
                                                            client.tags.map((tag) => (
                                                                <span
                                                                    key={tag.id}
                                                                    className="px-2 py-0.5 text-[11px] rounded-full border bg-white"
                                                                    style={{ borderColor: tag.color, color: '#111b21' }}
                                                                >
                                                                    {tag.name}
                                                                </span>
                                                            ))
                                                        ) : (
                                                            <span className="text-xs text-[#54656f]">
                                                                Sin etiquetas
                                                            </span>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={() => handleOpenTagEditor(client)}
                                                        className="text-[11px] text-[#00a884] font-semibold hover:underline"
                                                    >
                                                        Editar etiquetas
                                                    </button>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {(() => {
                                                        if (!client.lastBroadcastAt)
                                                            return <span className="text-[#54656f]">-</span>;

                                                        const lastDate = new Date(client.lastBroadcastAt);
                                                        const now = new Date();
                                                        const diffHours = (now - lastDate) / (1000 * 60 * 60);

                                                        if (diffHours < 24) {
                                                            return (
                                                                <div className="flex flex-col">
                                                                    <div className="flex items-center gap-1 text-xs text-[#00a884] font-semibold">
                                                                        <Megaphone size={12} />✅ Enviada
                                                                    </div>
                                                                    <span className="text-[10px] text-[#54656f] pl-4">
                                                                        {lastDate.toLocaleTimeString([], {
                                                                            hour: '2-digit',
                                                                            minute: '2-digit',
                                                                        })}
                                                                    </span>
                                                                </div>
                                                            );
                                                        }
                                                        return <span className="text-[#54656f]">-</span>;
                                                    })()}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {client.nextReminder ? (
                                                        <div className="flex items-start gap-2">
                                                            <div className="flex flex-col flex-1 min-w-0">
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="text-xs text-[#00a884] font-semibold">
                                                                        📅{' '}
                                                                        {new Date(
                                                                            client.nextReminder.dueDate,
                                                                        ).toLocaleDateString()}
                                                                    </span>
                                                                    <button
                                                                        onClick={() => confirmCancelReminder(client)}
                                                                        className="text-red-500 hover:text-red-600 transition-colors"
                                                                        title="Cancelar recordatorio"
                                                                    >
                                                                        <X size={12} />
                                                                    </button>
                                                                </div>
                                                                <div className="text-[10px] text-[#54656f]">
                                                                    {new Date(
                                                                        client.nextReminder.dueDate,
                                                                    ).toLocaleTimeString([], {
                                                                        hour: '2-digit',
                                                                        minute: '2-digit',
                                                                    })}
                                                                    {client.nextReminder.recurrenceDays && (
                                                                        <span className="ml-1 text-[#00a884]">
                                                                            🔄 c/{client.nextReminder.recurrenceDays}d
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-[#54656f]">-</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-[#54656f]">
                                                    {new Date(client.updatedAt).toLocaleDateString()}
                                                    <div className="text-[10px]">
                                                        {new Date(client.updatedAt).toLocaleTimeString()}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={() => handleSelectClient(client)}
                                                        className={`transition-all p-2 mr-2 rounded-full ${
                                                            selectedClient?.id === client.id
                                                                ? 'text-[#00a884] bg-[#00a884]/10 shadow-sm'
                                                                : 'text-[#54656f] hover:text-[#00a884] hover:bg-gray-100'
                                                        }`}
                                                        title="Ver Chat"
                                                    >
                                                        <MessageSquare size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => setPaymentClient(client)}
                                                        className="text-[#54656f] hover:text-green-600 transition-colors p-2 mr-2"
                                                        title="Cobrar"
                                                    >
                                                        <DollarSign size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(client.id)}
                                                        className="text-[#54656f] hover:text-red-500 transition-colors p-2"
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination - Light Theme */}
                        <div className="p-4 border-t border-gray-300 flex justify-between items-center text-xs text-[#54656f] flex-shrink-0 bg-[#f0f2f5]">
                            <span>
                                Página {page} de {totalPages}
                            </span>
                            <div className="flex gap-2">
                                <button
                                    disabled={page === 1}
                                    onClick={() => setPage((p) => p - 1)}
                                    className="bg-white border border-gray-300 px-3 py-1 rounded disabled:opacity-50 hover:bg-gray-50 text-[#111b21]"
                                >
                                    Anterior
                                </button>
                                <button
                                    disabled={page >= totalPages}
                                    onClick={() => setPage((p) => p + 1)}
                                    className="bg-white border border-gray-300 px-3 py-1 rounded disabled:opacity-50 hover:bg-gray-50 text-[#111b21]"
                                >
                                    Siguiente
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: 30% Chat Viewer */}
                <div className="w-[30%] flex flex-col h-full overflow-hidden">
                    {selectedClient ? (
                        <ChatViewer client={selectedClient} onClose={() => setSelectedClient(null)} socket={socket} />
                    ) : (
                        <div className="flex-1 bg-[#f0f2f5] rounded-xl border border-gray-300 flex items-center justify-center text-[#54656f]">
                            <div className="text-center">
                                <MessageSquare size={48} className="mx-auto mb-4 opacity-30" />
                                <p>Seleccione un cliente para ver el chat</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <StateManagerModal
                isOpen={showStateManager}
                onClose={() => setShowStateManager(false)}
                states={states}
                onCreate={handleCreateState}
                onRename={handleRenameState}
                onSetDefault={handleMakeDefaultState}
                onDelete={handleDeleteState}
                onReorder={handleReorderStates}
            />

            <TagManagerModal
                isOpen={showTagManager}
                onClose={() => setShowTagManager(false)}
                tags={tags}
                onCreate={handleCreateTag}
                onUpdate={handleUpdateTag}
                onDelete={handleDeleteTag}
            />

            <TagSelectorModal
                isOpen={Boolean(tagEditorClient)}
                client={tagEditorClient}
                tags={tags}
                onClose={() => setTagEditorClient(null)}
                onSave={(tagIds) => tagEditorClient && handleSaveClientTags(tagEditorClient.id, tagIds)}
            />

            {/* Payment Modal */}
            {paymentClient && (
                <PaymentModal
                    client={paymentClient}
                    onClose={() => {
                        setPaymentClient(null);
                        fetchClients(); // Refresh to show updated reminder
                    }}
                />
            )}

            {/* Broadcast Modal */}
            {showBroadcast && (
                <BroadcastModal
                    onClose={() => {
                        setShowBroadcast(false);
                        fetchClients(); // Refresh after broadcast
                    }}
                    selectedIds={selectedRows}
                />
            )}

            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                confirmText={confirmModal.confirmText}
                isDangerous={confirmModal.isDangerous}
            />

            {/* Stats Modal */}
            <StatsModal isOpen={showStatsModal} onClose={() => setShowStatsModal(false)} stateOptions={stateSummary} />
        </div>
    );
};

const StateManagerModal = ({ isOpen, onClose, states, onCreate, onRename, onSetDefault, onDelete, onReorder }) => {
    const [newName, setNewName] = useState('');
    const [drafts, setDrafts] = useState({});
    const [orderedStates, setOrderedStates] = useState(states);
    const [draggingId, setDraggingId] = useState(null);

    useEffect(() => {
        if (isOpen) {
            const initial = {};
            states.forEach((state) => {
                initial[state.id] = state.name;
            });
            setDrafts(initial);
            setOrderedStates(states);
        }
    }, [isOpen, states]);

    if (!isOpen) return null;

    const handleSave = (stateId) => {
        const name = drafts[stateId]?.trim();
        const current = states.find((state) => state.id === stateId);
        if (!name || !current || name === current.name) return;
        onRename(stateId, name);
    };

    const handleCreate = () => {
        const trimmed = newName.trim();
        if (!trimmed) return;
        onCreate(trimmed);
        setNewName('');
    };

    const handleDragStart = (id) => {
        setDraggingId(id);
    };

    const handleDragOver = (event, targetId) => {
        event.preventDefault();
        if (!draggingId || draggingId === targetId) return;
        setOrderedStates((prev) => {
            const updated = [...prev];
            const fromIndex = updated.findIndex((state) => state.id === draggingId);
            const toIndex = updated.findIndex((state) => state.id === targetId);
            if (fromIndex === -1 || toIndex === -1) return prev;
            const [moved] = updated.splice(fromIndex, 1);
            updated.splice(toIndex, 0, moved);
            return updated;
        });
    };

    const handleDragEnd = () => {
        if (draggingId) {
            onReorder(orderedStates.map((state) => state.id));
        }
        setDraggingId(null);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl p-5 border border-gray-100">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h3 className="text-lg font-bold text-[#111b21]">Gestionar Estados</h3>
                        <p className="text-xs text-[#54656f]">Reordena, renombra y define el estado por defecto</p>
                    </div>
                    <button onClick={onClose} className="text-[#54656f] hover:text-[#111b21]">
                        <X size={18} />
                    </button>
                </div>

                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                    {orderedStates.map((state) => {
                        const nameChanged = drafts[state.id] !== undefined && drafts[state.id] !== state.name;
                        return (
                            <div
                                key={state.id}
                                draggable
                                onDragStart={() => handleDragStart(state.id)}
                                onDragOver={(event) => handleDragOver(event, state.id)}
                                onDragEnd={handleDragEnd}
                                className={`bg-[#f0f2f5] p-3 rounded-xl border border-gray-200 flex flex-wrap items-center gap-3 cursor-grab ${draggingId === state.id ? 'ring-2 ring-[#00a884]' : ''}`}
                            >
                                <div className="flex items-center text-gray-500">
                                    <GripVertical size={18} />
                                </div>
                                <div className="flex flex-col flex-1 min-w-[200px]">
                                    <input
                                        value={drafts[state.id] ?? state.name}
                                        onChange={(e) => setDrafts((prev) => ({ ...prev, [state.id]: e.target.value }))}
                                        className="px-3 py-2 rounded-lg border border-gray-300 text-sm text-[#111b21] bg-white"
                                    />
                                    <div className="text-[11px] text-[#54656f] mt-1">
                                        {state.isDefault ? 'Estado por defecto' : `Asignados: ${state.count ?? 0}`}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {nameChanged && (
                                        <button
                                            onClick={() => handleSave(state.id)}
                                            className="p-2 rounded-lg bg-emerald-100 text-emerald-700"
                                        >
                                            <CheckCircle size={16} />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => onSetDefault(state.id)}
                                        disabled={state.isDefault}
                                        className={`px-3 py-1 rounded-lg text-xs font-semibold border ${state.isDefault ? 'border-emerald-300 text-emerald-700 bg-emerald-50 cursor-default' : 'border-gray-300 text-[#111b21]'}`}
                                    >
                                        Default
                                    </button>
                                    <button
                                        onClick={() => onDelete(state.id)}
                                        disabled={state.isDefault}
                                        className="p-2 rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-30"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-4 flex gap-2">
                    <input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Nuevo estado"
                        className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm text-[#111b21] placeholder-[#54656f]"
                    />
                    <button
                        onClick={handleCreate}
                        className="flex items-center gap-1 px-4 py-2 bg-[#00a884] text-white rounded-lg text-sm font-semibold"
                    >
                        <PlusCircle size={16} /> Agregar
                    </button>
                </div>
            </div>
        </div>
    );
};

const TagManagerModal = ({ isOpen, onClose, tags, onCreate, onUpdate, onDelete }) => {
    const [newTag, setNewTag] = useState({ name: '', color: '#00a884' });
    const [drafts, setDrafts] = useState({});
    const [colorDrafts, setColorDrafts] = useState({});

    useEffect(() => {
        if (isOpen) {
            const nameDrafts = {};
            const colors = {};
            tags.forEach((tag) => {
                nameDrafts[tag.id] = tag.name;
                colors[tag.id] = tag.color;
            });
            setDrafts(nameDrafts);
            setColorDrafts(colors);
        }
    }, [isOpen, tags]);

    if (!isOpen) return null;

    const handleSave = (tagId) => {
        const current = tags.find((tag) => tag.id === tagId);
        if (!current) return;
        const name = (drafts[tagId] ?? current.name).trim();
        const color = colorDrafts[tagId] ?? current.color;
        if (!name) return;
        if (name === current.name && color === current.color) return;
        onUpdate(tagId, { name, color });
    };

    const handleCreate = () => {
        const trimmed = newTag.name.trim();
        if (!trimmed) return;
        onCreate({ name: trimmed, color: newTag.color });
        setNewTag({ name: '', color: '#00a884' });
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-5 border border-gray-100">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h3 className="text-lg font-bold text-[#111b21]">Gestionar Etiquetas</h3>
                        <p className="text-xs text-[#54656f]">Crea categorías infinitas para segmentar contactos</p>
                    </div>
                    <button onClick={onClose} className="text-[#54656f] hover:text-[#111b21]">
                        <X size={18} />
                    </button>
                </div>

                <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
                    {tags.map((tag) => {
                        const changed =
                            (drafts[tag.id] ?? tag.name) !== tag.name ||
                            (colorDrafts[tag.id] ?? tag.color) !== tag.color;
                        return (
                            <div
                                key={tag.id}
                                className="bg-[#f0f2f5] p-3 rounded-xl border border-gray-200 flex flex-wrap items-center gap-3"
                            >
                                <input
                                    value={drafts[tag.id] ?? tag.name}
                                    onChange={(e) => setDrafts((prev) => ({ ...prev, [tag.id]: e.target.value }))}
                                    className="flex-1 min-w-[180px] px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white text-[#111b21] placeholder-[#54656f]"
                                />
                                <input
                                    type="color"
                                    value={colorDrafts[tag.id] ?? tag.color}
                                    onChange={(e) => setColorDrafts((prev) => ({ ...prev, [tag.id]: e.target.value }))}
                                    className="w-12 h-10 rounded-lg border border-gray-300"
                                />
                                {changed && (
                                    <button
                                        onClick={() => handleSave(tag.id)}
                                        className="p-2 rounded-lg bg-emerald-100 text-emerald-700"
                                    >
                                        <CheckCircle size={16} />
                                    </button>
                                )}
                                <button
                                    onClick={() => onDelete(tag.id)}
                                    className="p-2 rounded-lg text-red-500 hover:bg-red-50"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-4 flex flex-wrap gap-2 items-center">
                    <input
                        value={newTag.name}
                        onChange={(e) => setNewTag((prev) => ({ ...prev, name: e.target.value }))}
                        placeholder="Nueva etiqueta"
                        className="flex-1 min-w-[160px] px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white text-[#111b21] placeholder-[#54656f]"
                    />
                    <input
                        type="color"
                        value={newTag.color}
                        onChange={(e) => setNewTag((prev) => ({ ...prev, color: e.target.value }))}
                        className="w-12 h-10 rounded-lg border border-gray-300"
                    />
                    <button
                        onClick={handleCreate}
                        className="flex items-center gap-1 px-4 py-2 bg-[#00a884] text-white rounded-lg text-sm font-semibold"
                    >
                        <PlusCircle size={16} /> Agregar
                    </button>
                </div>
            </div>
        </div>
    );
};

const TagSelectorModal = ({ isOpen, onClose, client, tags, onSave }) => {
    const [selected, setSelected] = useState([]);

    useEffect(() => {
        if (client && isOpen) {
            setSelected(client.tags?.map((tag) => tag.id) || []);
        }
    }, [client, isOpen]);

    if (!isOpen || !client) return null;

    const toggle = (tagId) => {
        setSelected((prev) => (prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]));
    };

    const handleSave = () => {
        onSave(selected);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 border border-gray-100">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h3 className="text-lg font-bold text-[#111b21]">
                            Etiquetas de {client.name || client.chatId}
                        </h3>
                        <p className="text-xs text-[#54656f]">Selecciona todas las etiquetas que apliquen</p>
                    </div>
                    <button onClick={onClose} className="text-[#54656f] hover:text-[#111b21]">
                        <X size={18} />
                    </button>
                </div>

                <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                    {tags.length === 0 ? (
                        <p className="text-sm text-[#54656f]">
                            No hay etiquetas disponibles. Crea una desde el gestor.
                        </p>
                    ) : (
                        tags.map((tag) => (
                            <label
                                key={tag.id}
                                className="flex items-center gap-3 bg-[#f0f2f5] p-3 rounded-xl border border-gray-200 cursor-pointer"
                            >
                                <input
                                    type="checkbox"
                                    checked={selected.includes(tag.id)}
                                    onChange={() => toggle(tag.id)}
                                    className="accent-[#00a884]"
                                />
                                <span className="flex items-center gap-2 text-sm text-[#111b21]">
                                    <span
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: tag.color }}
                                    ></span>
                                    {tag.name}
                                </span>
                            </label>
                        ))
                    )}
                </div>

                <div className="mt-4 flex gap-2">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-[#54656f]"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex-1 px-4 py-2 rounded-lg bg-[#00a884] text-white text-sm font-semibold"
                    >
                        Guardar
                    </button>
                </div>
            </div>
        </div>
    );
};

StateManagerModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    states: PropTypes.arrayOf(
        PropTypes.shape({
            id: PropTypes.string.isRequired,
            name: PropTypes.string.isRequired,
            isDefault: PropTypes.bool,
            count: PropTypes.number,
        }),
    ).isRequired,
    onCreate: PropTypes.func.isRequired,
    onRename: PropTypes.func.isRequired,
    onSetDefault: PropTypes.func.isRequired,
    onDelete: PropTypes.func.isRequired,
    onReorder: PropTypes.func.isRequired,
};

TagManagerModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    tags: PropTypes.arrayOf(
        PropTypes.shape({
            id: PropTypes.string.isRequired,
            name: PropTypes.string.isRequired,
            color: PropTypes.string.isRequired,
        }),
    ).isRequired,
    onCreate: PropTypes.func.isRequired,
    onUpdate: PropTypes.func.isRequired,
    onDelete: PropTypes.func.isRequired,
};

TagSelectorModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    client: PropTypes.shape({
        id: PropTypes.string,
        name: PropTypes.string,
        chatId: PropTypes.string,
        tags: PropTypes.arrayOf(
            PropTypes.shape({
                id: PropTypes.string.isRequired,
            }),
        ),
    }),
    tags: PropTypes.arrayOf(
        PropTypes.shape({
            id: PropTypes.string.isRequired,
            name: PropTypes.string.isRequired,
            color: PropTypes.string.isRequired,
        }),
    ).isRequired,
    onSave: PropTypes.func.isRequired,
};
