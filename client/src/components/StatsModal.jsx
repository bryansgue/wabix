import React, { useState, useEffect } from 'react';
import { X, Download, BarChart3, FileDown, TrendingUp, Users, MessageSquare, Send } from 'lucide-react';
import api from '../services/api';

export const StatsModal = ({ isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState('stats');
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [exportFormat, setExportFormat] = useState('csv');
    const [exportFilter, setExportFilter] = useState('all');

    useEffect(() => {
        if (isOpen) {
            fetchStats();
        }
    }, [isOpen]);

    const fetchStats = async () => {
        try {
            setLoading(true);
            const response = await api.get('/stats/dashboard');
            setStats(response.data);
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleExportClients = async () => {
        try {
            const statusParam = exportFilter !== 'all' ? `&status=${exportFilter}` : '';
            const response = await api.get(`/clients/export?format=${exportFormat}${statusParam}`, {
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            const extension = exportFormat === 'json' ? 'json' : 'csv';
            link.setAttribute('download', `clientes_${new Date().toISOString().split('T')[0]}.${extension}`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Error exporting clients:', error);
            alert('Error al exportar clientes');
        }
    };

    const downloadStatsReport = () => {
        if (!stats) return;

        const csvContent = `Reporte de Estadísticas - ${new Date().toLocaleDateString('es-ES')}

MENSAJES
Total de Mensajes,${stats.messages.total}
Mensajes de Usuarios,${stats.messages.userMessages}
Mensajes del Bot,${stats.messages.botMessages}
Difusiones Enviadas,${stats.messages.broadcasts}
Mensajes Manuales,${stats.messages.manual}
Recordatorios,${stats.messages.reminders}
Mensajes Hoy,${stats.messages.today}

DIFUSIONES
Total Enviadas,${stats.broadcasts.total}
Leídas,${stats.broadcasts.read}
Tasa de Lectura,${stats.broadcasts.readRate}%
Entregadas,${stats.broadcasts.delivered}
Tasa de Entrega,${stats.broadcasts.deliveryRate}%

PALABRAS CLAVE MÁS FRECUENTES
${stats.topKeywords.map((kw, i) => `${i + 1}. ${kw.word},${kw.count} veces`).join('\n')}

ACTIVIDAD DIARIA (Últimos 7 días)
Fecha,Total,Usuarios,Bot
${stats.dailyActivity.map(day => `${day.date},${day.total},${day.user},${day.bot}`).join('\n')}
`;

        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `reporte_estadisticas_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl w-full max-w-4xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-200">
                {/* Header */}
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-[#f0f2f5]">
                    <div className="flex items-center gap-3">
                        <div className="bg-[#008069] p-2 rounded-lg">
                            <BarChart3 size={20} className="text-white" />
                        </div>
                        <div>
                            <h3 className="font-bold text-[#111b21] text-base">Reportes y Exportación</h3>
                            <p className="text-xs text-[#54656f]">Estadísticas y datos de tu bot</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-[#54656f] hover:text-[#111b21] hover:bg-gray-200 rounded-full p-1 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 bg-white">
                    <button
                        onClick={() => setActiveTab('stats')}
                        className={`flex-1 px-6 py-2.5 text-sm font-bold transition-all ${activeTab === 'stats'
                            ? 'text-[#111b21] bg-[#f0f2f5] border-b-2 border-[#00a884]'
                            : 'text-[#54656f] hover:text-[#111b21] hover:bg-gray-50'
                            }`}
                    >
                        📊 Estadísticas
                    </button>
                    <button
                        onClick={() => setActiveTab('export')}
                        className={`flex-1 px-6 py-2.5 text-sm font-bold transition-all ${activeTab === 'export'
                            ? 'text-[#111b21] bg-[#f0f2f5] border-b-2 border-[#00a884]'
                            : 'text-[#54656f] hover:text-[#111b21] hover:bg-gray-50'
                            }`}
                    >
                        📥 Exportar Datos
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 bg-[#f0f2f5]">

                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00a884]"></div>
                        </div>
                    ) : activeTab === 'stats' ? (
                        <StatsTab stats={stats} onDownload={downloadStatsReport} />
                    ) : (
                        <ExportTab
                            format={exportFormat}
                            setFormat={setExportFormat}
                            filter={exportFilter}
                            setFilter={setExportFilter}
                            onExport={handleExportClients}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

const StatsTab = ({ stats, onDownload }) => {
    if (!stats) return null;

    // Calculate dynamic "nice" scale
    const rawMax = Math.max(...stats.dailyActivity.map(d => d.total), 1);
    const niceMax = rawMax <= 10 ? 10 :
        rawMax <= 50 ? 50 :
            rawMax <= 100 ? 100 :
                Math.ceil(rawMax / 50) * 50;

    return (
        <div className="space-y-4">
            {/* KPI Cards */}
            <div className="grid grid-cols-4 gap-3">
                <StatCard icon={<MessageSquare />} label="Total Mensajes" value={stats.messages.total} color="blue" />
                <StatCard icon={<Users />} label="Mensajes Usuarios" value={stats.messages.userMessages} color="green" />
                <StatCard icon={<Send />} label="Difusiones" value={stats.messages.broadcasts} color="purple" />
                <StatCard icon={<TrendingUp />} label="Hoy" value={stats.messages.today} color="orange" />
            </div>

            {/* Activity Chart */}
            <div className="bg-white rounded-lg p-4 border border-gray-200">
                <h4 className="text-[#111b21] font-bold mb-3 text-sm flex items-center gap-2">
                    <BarChart3 size={16} className="text-[#00a884]" />
                    Actividad (Últimos 7 días)
                </h4>
                <div className="relative mt-2 px-8">
                    {/* Drawing Area (Grid + Bars + Lines) */}
                    <div className="relative h-28">
                        {/* Background Grid Lines */}
                        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                            {[100, 75, 50, 25, 0].map((percent) => (
                                <div key={percent} className="w-full border-t border-gray-100 flex items-center relative">
                                    <span className="absolute -left-1 text-[8px] text-gray-300 transform -translate-x-full pr-1 font-mono">
                                        {Math.round((niceMax * percent) / 100)}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div className="flex items-end gap-2 h-full relative z-10">
                            {/* SVG Trend Line Overlay */}
                            <svg
                                className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
                                viewBox="0 0 100 100"
                                preserveAspectRatio="none"
                            >
                                <path
                                    d={stats.dailyActivity.map((day, i) => {
                                        const x = ((i + 0.5) / stats.dailyActivity.length) * 100;
                                        const y = 100 - (day.total / niceMax) * 100;
                                        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                                    }).join(' ')}
                                    fill="none"
                                    stroke="#f59e0b"
                                    strokeWidth="0.75"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="opacity-40 animate-in fade-in duration-1000"
                                />
                            </svg>

                            {stats.dailyActivity.map((day, i) => (
                                <div key={i} className="flex-1 flex flex-col justify-end items-center h-full">
                                    {/* Count Label */}
                                    <span className="text-[9px] font-bold text-[#00a884] mb-1 h-3 flex items-center">
                                        {day.total > 0 ? day.total : ''}
                                    </span>

                                    {/* Bar */}
                                    <div
                                        className="w-4 bg-[#00a884] rounded-t-[2px] shadow-sm transition-all duration-700 hover:brightness-110"
                                        style={{ height: `${(day.total / niceMax) * 100}%` }}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* X-Axis Date Labels Area (Below the zero line) */}
                    <div className="flex gap-2 mt-1">
                        {stats.dailyActivity.map((day, i) => (
                            <div key={i} className="flex-1 flex justify-center">
                                <span className="text-[10px] text-[#54656f] font-medium">
                                    {new Date(day.date).getDate()}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Top Keywords */}
            {stats.topKeywords.length > 0 && (
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <h4 className="text-[#111b21] font-bold mb-3 text-sm">🔥 Palabras Más Consultadas</h4>
                    <div className="space-y-1.5">
                        {stats.topKeywords.map((kw, i) => (
                            <div key={i} className="flex items-center justify-between">
                                <span className="text-[#54656f] text-sm">{i + 1}. {kw.word}</span>
                                <span className="text-[#00a884] font-bold text-sm">{kw.count} veces</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Download Button */}
            <button
                onClick={onDownload}
                className="w-full bg-[#008069] hover:bg-[#006c59] text-white font-bold py-2.5 px-6 rounded-lg flex items-center justify-center gap-2 transition-all shadow-sm"
            >
                <Download size={16} />
                Descargar Reporte Completo (CSV)
            </button>
        </div>
    );
};

const ExportTab = ({ format, setFormat, filter, setFilter, onExport }) => {
    return (
        <div className="space-y-4">
            <div className="bg-white rounded-lg p-4 border border-gray-200">
                <h4 className="text-[#111b21] font-bold mb-3 text-sm flex items-center gap-2">
                    <FileDown size={16} className="text-[#00a884]" />
                    Exportar Lista de Clientes
                </h4>

                <div className="space-y-3">
                    <div>
                        <label className="text-[#54656f] text-sm block mb-1.5">Formato:</label>
                        <select
                            value={format}
                            onChange={(e) => setFormat(e.target.value)}
                            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-[#111b21] text-sm focus:outline-none focus:border-[#00a884]"
                        >
                            <option value="csv">CSV (Excel)</option>
                            <option value="json">JSON (Backup Completo)</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-[#54656f] text-sm block mb-1.5">Filtrar por Estado:</label>
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-[#111b21] text-sm focus:outline-none focus:border-[#00a884]"
                        >
                            <option value="all">Todos los Clientes</option>
                            <option value="LEAD">Solo LEADS</option>
                            <option value="HOT">Solo HOT</option>
                            <option value="CUSTOMER">Solo CLIENTES</option>
                            <option value="ARCHIVED">Solo ARCHIVADOS</option>
                            <option value="BLOCKED">Solo BLOQUEADOS</option>
                        </select>
                    </div>

                    <button
                        onClick={onExport}
                        className="w-full bg-[#008069] hover:bg-[#006c59] text-white font-bold py-2.5 px-6 rounded-lg flex items-center justify-center gap-2 transition-all shadow-sm"
                    >
                        <Download size={16} />
                        Descargar Clientes
                    </button>
                </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-[#3b4a54] text-xs">
                    💡 <strong>Tip:</strong> El archivo CSV se puede abrir directamente en Excel. El formato JSON es útil para backups completos o migraciones.
                </p>
            </div>
        </div>
    );
};

const StatCard = ({ icon, label, value, color }) => {
    const colors = {
        blue: 'bg-blue-50 border-blue-200 text-blue-600',
        green: 'bg-green-50 border-green-200 text-green-600',
        purple: 'bg-purple-50 border-purple-200 text-purple-600',
        orange: 'bg-orange-50 border-orange-200 text-orange-600'
    };

    return (
        <div className={`${colors[color]} border rounded-lg p-3`}>
            <div className="flex items-center gap-1.5 mb-1.5">
                {React.cloneElement(icon, { size: 14 })}
                <span className="text-[10px] font-bold uppercase text-[#54656f]">{label}</span>
            </div>
            <div className="text-xl font-bold text-[#111b21]">{value.toLocaleString()}</div>
        </div>
    );
};
