import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthProvider';
import api, { deleteReminders } from '../services/api';
import { LayoutDashboard, Users, Search, Trash2, Save, Filter, MessageSquare, DollarSign, Megaphone, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ChatViewer } from '../components/ChatViewer';
import { PaymentModal } from '../components/PaymentModal';
import { BroadcastModal } from '../components/BroadcastModal';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { StatsModal } from '../components/StatsModal';
import { useSocket } from '../hooks/useSocket';


export const ClientsPage = () => {
    const { user, token } = useAuth();
    const { socket } = useSocket(token);
    const [clients, setClients] = useState([]);
    const [stats, setStats] = useState({
        statusCounts: { LEAD: 0, HOT: 0, CUSTOMER: 0, BLOCKED: 0, ARCHIVED: 0 },
        newToday: 0,
        total: 0
    });
    const [selectedClient, setSelectedClient] = useState(null);
    const [paymentClient, setPaymentClient] = useState(null);
    const [showBroadcast, setShowBroadcast] = useState(false);
    const [showStatsModal, setShowStatsModal] = useState(false);

    // Confirmation Modal State
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        isDangerous: false
    });

    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [filter, setFilter] = useState({ status: '', search: '' });
    const [selectedRows, setSelectedRows] = useState([]);

    const toggleSelectAll = () => {
        if (selectedRows.length === clients.length) {
            setSelectedRows([]);
        } else {
            setSelectedRows(clients.map(c => c.id));
        }
    };

    const toggleRow = (id) => {
        if (selectedRows.includes(id)) {
            setSelectedRows(selectedRows.filter(rowId => rowId !== id));
        } else {
            setSelectedRows([...selectedRows, id]);
        }
    };

    const fetchClients = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/clients', {
                params: {
                    page,
                    limit: 10,
                    status: filter.status,
                    search: filter.search
                }
            });
            setClients(data.data);
            setTotalPages(Math.ceil(data.total / 10));
            setSelectedRows([]); // Clear selection on fetch

            // AUTO-SELECT LOGIC:
            // If we have clients, no selected client, and on page 1 (initial load mostly)
            // Or if we just want to ensure *someone* is selected always if list not empty.
            if (data.data.length > 0 && !selectedClient) {
                // Select the first one (most recent due to sort order)
                setSelectedClient(data.data[0]);
            }

        } catch (error) {
            console.error('Failed to load clients', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const { data } = await api.get('/clients/stats');
            setStats(data);
        } catch (error) {
            console.error('Failed to load stats', error);
        }
    };

    useEffect(() => {
        fetchClients();
        fetchStats();
    }, [page, filter]);

    const handleStatusChange = async (id, newStatus) => {
        try {
            await api.put(`/clients/${id}`, { status: newStatus });
            setClients(clients.map(c => c.id === id ? { ...c, status: newStatus } : c));
        } catch (error) {
            alert('Error updating status');
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
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                } catch (error) {
                    alert('Error deleting client');
                }
            }
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
                    const payload = selectedRows.length > 0
                        ? { ids: selectedRows }
                        : { status: filter.status };

                    // Double confirmation safety for "DELETE ALL" implicit
                    if (!selectedRows.length && !filter.status) {
                        // Simplify for now, just allow proceed from modal logic
                    }

                    await api.post('/clients/bulk-delete', payload);
                    alert('Limpieza completada');
                    fetchClients();
                    fetchStats();
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                } catch (error) {
                    alert('Error in bulk delete');
                }
            }
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
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                } catch (err) {
                    alert('Error al cancelar recordatorio');
                }
            }
        });
    };


    return (
        <div className="min-h-screen bg-wa-dark text-white font-sans p-8 flex flex-col h-screen overflow-hidden">
            <header className="flex items-center justify-between mb-6 gap-8">
                {/* Title Section */}
                <div className="flex items-center gap-4 min-w-max">
                    <Link to="/" className="bg-white/5 p-3 rounded-xl hover:bg-white/10 transition-colors">
                        <LayoutDashboard size={24} className="text-white" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2 text-white">
                            <Users className="text-[#00a884]" />
                            Gestión de Clientes
                        </h1>
                        <p className="text-xs text-white/50">CRM & Estadísticas</p>
                    </div>
                </div>

                {/* Stats Button */}
                <button
                    onClick={() => setShowStatsModal(true)}
                    className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 px-4 py-2 rounded-lg flex items-center gap-2 transition-all shadow-lg hover:shadow-purple-500/50 min-w-max h-fit"
                >
                    <span className="text-lg">📊</span>
                    <span className="font-bold text-white text-sm">Reportes</span>
                </button>


                {/* Dashboard KPI Cards - Horizontal Grid */}
                <div className="grid grid-cols-5 gap-3 flex-1 h-full">
                    <div onClick={() => setFilter({ ...filter, status: 'LEAD' })} className="bg-white/5 border border-white/10 p-3 rounded-xl cursor-pointer hover:bg-white/10 transition-all group flex flex-col justify-center">
                        <div className="flex justify-between items-center mb-1">
                            <div className="text-[10px] text-blue-400 font-bold group-hover:text-blue-300">LEADS</div>
                            <div className="text-xl font-bold text-white">{stats.statusCounts.LEAD || 0}</div>
                        </div>
                        <div className="text-[9px] text-white/30 truncate">Potenciales</div>
                    </div>

                    <div onClick={() => setFilter({ ...filter, status: 'HOT' })} className="bg-white/5 border border-white/10 p-3 rounded-xl cursor-pointer hover:bg-white/10 transition-all group flex flex-col justify-center">
                        <div className="flex justify-between items-center mb-1">
                            <div className="text-[10px] text-orange-400 font-bold group-hover:text-orange-300">HOT 🔥</div>
                            <div className="text-xl font-bold text-white">{stats.statusCounts.HOT || 0}</div>
                        </div>
                        <div className="text-[9px] text-white/30 truncate">Alta Prioridad</div>
                    </div>

                    <div onClick={() => setFilter({ ...filter, status: 'CUSTOMER' })} className="bg-white/5 border border-white/10 p-3 rounded-xl cursor-pointer hover:bg-white/10 transition-all group flex flex-col justify-center">
                        <div className="flex justify-between items-center mb-1">
                            <div className="text-[10px] text-green-400 font-bold group-hover:text-green-300">CLIENTES ⭐</div>
                            <div className="text-xl font-bold text-white">{stats.statusCounts.CUSTOMER || 0}</div>
                        </div>
                        <div className="text-[9px] text-white/30 truncate">Ventas Cerradas</div>
                    </div>

                    <div className="bg-white/5 border border-white/10 p-3 rounded-xl relative overflow-hidden flex flex-col justify-center">
                        <div className="absolute -right-2 -top-2 opacity-5">
                            <Users size={48} />
                        </div>
                        <div className="flex justify-between items-center mb-1">
                            <div className="text-[10px] text-purple-400 font-bold">NUEVOS</div>
                            <div className="text-xl font-bold text-white">{stats.newToday || 0}</div>
                        </div>
                        <div className="text-[9px] text-white/30 truncate">Crecimiento Hoy</div>
                    </div>

                    <div onClick={() => setFilter({ ...filter, status: 'BLOCKED' })} className="bg-white/5 border border-white/10 p-3 rounded-xl cursor-pointer hover:bg-white/10 transition-all group flex flex-col justify-center">
                        <div className="flex justify-between items-center mb-1">
                            <div className="text-[10px] text-red-400 font-bold group-hover:text-red-300">BLOQUEADOS</div>
                            <div className="text-xl font-bold text-white">{stats.statusCounts.BLOCKED || 0}</div>
                        </div>
                        <div className="text-[9px] text-white/30 truncate">Filtrados</div>
                    </div>
                </div>
            </header>

            {/* Main Content Area - Split 70/30 */}
            <div className="flex flex-1 gap-6 overflow-hidden min-h-0">
                {/* Left Column: 70% - Filters & List - UPDATED COLORS */}
                <div className="w-[70%] flex flex-col overflow-hidden">
                    {/* Filters - Header Style (#f0f2f5) */}
                    <div className="bg-[#f0f2f5] p-4 rounded-xl mb-6 flex flex-wrap gap-4 items-center justify-between flex-shrink-0 shadow-sm border border-gray-200">
                        <div className="flex gap-4 flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 text-[#54656f] w-4 h-4" />
                                <input
                                    type="text"
                                    placeholder="Buscar por teléfono o nombre..."
                                    className="pl-10 pr-4 py-2 rounded-lg text-sm w-64 bg-white border border-gray-300 text-[#111b21] focus:outline-none focus:border-[#00a884] focus:ring-1 focus:ring-[#00a884] placeholder-[#54656f]/70"
                                    value={filter.search}
                                    onChange={(e) => setFilter({ ...filter, search: e.target.value })}
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <Filter className="text-[#54656f] w-4 h-4" />
                                <select
                                    className="px-3 py-2 rounded-lg text-sm bg-white border border-gray-300 text-[#111b21] cursor-pointer focus:outline-none focus:border-[#00a884]"
                                    value={filter.status}
                                    onChange={(e) => setFilter({ ...filter, status: e.target.value })}
                                >
                                    <option value="">Todos los Estados</option>
                                    <option value="LEAD">LEAD</option>
                                    <option value="HOT">HOT 🔥</option>
                                    <option value="CUSTOMER">CLIENTE ⭐</option>
                                    <option value="ARCHIVED">ARCHIVADO</option>
                                    <option value="BLOCKED">BLOQUEADO ⛔</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowBroadcast(true)}
                                className="flex items-center gap-2 bg-purple-100 hover:bg-purple-200 text-purple-700 px-4 py-2 rounded-lg text-sm font-bold transition-colors border border-purple-200"
                            >
                                <Megaphone size={16} />
                                {selectedRows.length > 0 ? `DIFUSIÓN (${selectedRows.length})` : 'DIFUSIÓN'}
                            </button>
                            <button
                                onClick={handleBulkDelete}
                                className="flex items-center gap-2 bg-red-100 hover:bg-red-200 text-red-600 px-4 py-2 rounded-lg text-sm font-bold transition-colors border border-red-200"
                            >
                                <Trash2 size={16} />
                                {selectedRows.length > 0 ? `BORRAR (${selectedRows.length})` : 'LIMPIEZA'}
                            </button>
                            <button
                                onClick={() => { fetchClients(); fetchStats(); }}
                                className="bg-[#008069] text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#006c59] shadow-sm"
                            >
                                REFRESH
                            </button>
                        </div>
                    </div>

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
                                        <th className="px-6 py-4">Difusión</th>
                                        <th className="px-6 py-4">Próximo Cobro</th>
                                        <th className="px-6 py-4">Última Actividad</th>
                                        <th className="px-6 py-4 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-black/5">
                                    {loading ? (
                                        <tr><td colSpan="7" className="text-center py-8 text-[#54656f]">Cargando...</td></tr>
                                    ) : clients.length === 0 ? (
                                        <tr><td colSpan="7" className="text-center py-8 text-[#54656f]">No hay clientes encontrados</td></tr>
                                    ) : (
                                        clients.map(client => (
                                            <tr key={client.id} className={`hover:bg-[#f5f6f6] transition-colors ${selectedRows.includes(client.id) ? 'bg-[#f0f2f5]' : ''}`}>
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
                                                        {client.profilePicUrl ? (
                                                            <img
                                                                src={client.profilePicUrl}
                                                                alt={client.name}
                                                                className="w-10 h-10 rounded-full object-cover border border-gray-200"
                                                                onError={(e) => { e.target.onerror = null; e.target.src = 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png?20150327203541'; }} // Fallback
                                                            />
                                                        ) : (
                                                            <div className="w-10 h-10 rounded-full bg-[#f0f2f5] flex items-center justify-center text-[#54656f] border border-gray-200">
                                                                <Users size={20} />
                                                            </div>
                                                        )}
                                                        <div>
                                                            <div className="font-bold text-[#111b21]">
                                                                {client.name?.includes('@') ? client.name.split('@')[0] : (client.name || 'Sin Nombre')}
                                                            </div>
                                                            <div className="text-xs text-[#54656f] font-mono">{client.chatId.split('@')[0]}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <select
                                                        value={client.status}
                                                        onChange={(e) => handleStatusChange(client.id, e.target.value)}
                                                        className={`bg-transparent border border-gray-300 rounded px-2 py-1 text-xs font-bold cursor-pointer
                                                    ${client.status === 'LEAD' ? 'text-blue-600' : ''}
                                                    ${client.status === 'HOT' ? 'text-orange-600' : ''}
                                                    ${client.status === 'CUSTOMER' ? 'text-green-600' : ''}
                                                    ${client.status === 'BLOCKED' ? 'text-red-600' : ''}
                                                    ${client.status === 'ARCHIVED' ? 'text-[#54656f]' : ''}
                                                `}
                                                    >
                                                        <option value="LEAD">LEAD</option>
                                                        <option value="HOT">HOT 🔥</option>
                                                        <option value="CUSTOMER">CLIENTE ⭐</option>
                                                        <option value="ARCHIVED">ARCHIVADO</option>
                                                        <option value="BLOCKED">BLOQUEADO ⛔</option>
                                                    </select>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {(() => {
                                                        if (!client.lastBroadcastAt) return <span className="text-[#54656f]">-</span>;

                                                        const lastDate = new Date(client.lastBroadcastAt);
                                                        const now = new Date();
                                                        const diffHours = (now - lastDate) / (1000 * 60 * 60);

                                                        if (diffHours < 24) {
                                                            return (
                                                                <div className="flex flex-col">
                                                                    <div className="flex items-center gap-1 text-xs text-[#00a884] font-semibold">
                                                                        <Megaphone size={12} />
                                                                        ✅ Enviada
                                                                    </div>
                                                                    <span className="text-[10px] text-[#54656f] pl-4">
                                                                        {lastDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                                                                        📅 {new Date(client.nextReminder.dueDate).toLocaleDateString()}
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
                                                                    {new Date(client.nextReminder.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                                                    <div className="text-[10px]">{new Date(client.updatedAt).toLocaleTimeString()}</div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={() => setSelectedClient(client)}
                                                        className={`transition-all p-2 mr-2 rounded-full ${selectedClient?.id === client.id
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
                            <span>Página {page} de {totalPages}</span>
                            <div className="flex gap-2">
                                <button
                                    disabled={page === 1}
                                    onClick={() => setPage(p => p - 1)}
                                    className="bg-white border border-gray-300 px-3 py-1 rounded disabled:opacity-50 hover:bg-gray-50 text-[#111b21]"
                                >
                                    Anterior
                                </button>
                                <button
                                    disabled={page >= totalPages}
                                    onClick={() => setPage(p => p + 1)}
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
                        <ChatViewer
                            client={selectedClient}
                            onClose={() => setSelectedClient(null)}
                            socket={socket}
                        />
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

            {/* Payment Modal */}
            {
                paymentClient && (
                    <PaymentModal
                        client={paymentClient}
                        onClose={() => {
                            setPaymentClient(null);
                            fetchClients(); // Refresh to show updated reminder
                        }}
                    />
                )
            }

            {/* Broadcast Modal */}
            {
                showBroadcast && (
                    <BroadcastModal
                        onClose={() => {
                            setShowBroadcast(false);
                            fetchClients(); // Refresh after broadcast
                        }}
                        selectedIds={selectedRows}
                    />
                )
            }

            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                confirmText={confirmModal.confirmText}
                isDangerous={confirmModal.isDangerous}
            />

            {/* Stats Modal */}
            <StatsModal
                isOpen={showStatsModal}
                onClose={() => setShowStatsModal(false)}
            />
        </div >
    );
};
