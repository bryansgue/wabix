import React, { useEffect, useState } from 'react';
import { useConfig } from '../hooks/useConfig';
import api from '../services/api';
import clsx from 'clsx';
import {
    Save,
    Bot,
    BrainCircuit,
    Thermometer,
    Key,
    Eye,
    X,
    ShieldAlert,
    Mic,
    Settings,
    Clock,
    Zap,
    Terminal,
    ChevronRight,
} from 'lucide-react';
import { ConfirmationModal } from './ConfirmationModal';

export const ConfigForm = () => {
    const { config, updateConfig, loading, error } = useConfig();
    const [formData, setFormData] = useState(config);
    const [isDirty, setIsDirty] = useState(false);
    const [activeTab, setActiveTab] = useState('brain');
    const [systemSettings, setSystemSettings] = useState(null);
    const [alertModal, setAlertModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        isDangerous: false
    });

    useEffect(() => {
        if (config) {
            setFormData(config);
        }
    }, [config]);

    useEffect(() => {
        api.get('/auth/settings')
            .then(res => setSystemSettings(res.data))
            .catch((err) => console.error('[ConfigForm] Error fetching system settings:', err));
    }, []);

    const handleChange = (field, value) => {
        setFormData((prev) => {
            const next = { ...prev, [field]: value };
            setIsDirty(true);
            return next;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const cleanData = { ...formData };
        if (cleanData.badWords) {
            cleanData.badWords = cleanData.badWords.map((w) => w.trim()).filter((w) => w !== '');
        }
        await updateConfig(cleanData);
        setIsDirty(false);
        setFormData(cleanData);
    };

    if (loading && !config)
        return <div className="text-center p-4 text-wa-secondary animate-pulse">Cargando configuración...</div>;

    if (error)
        return (
            <div className="glass-panel p-8 rounded-xl border border-red-500/20 text-center max-w-lg mx-auto mt-10">
                <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Error de Conexión</h3>
                <p className="text-wa-secondary mb-4">No pudimos cargar la configuración del bot.</p>
                <p className="text-xs font-mono bg-black/40 p-2 rounded text-red-300 mb-6">
                    {error.message || 'Error desconocido'}
                </p>
                <button
                    onClick={() => window.location.reload()}
                    className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded-lg transition-colors"
                >
                    REINTENTAR
                </button>
            </div>
        );

    const tabs = [
        { id: 'brain', label: 'Cerebro', icon: BrainCircuit, color: 'text-purple-400', glow: 'shadow-purple-500/50' },
        { id: 'security', label: 'Seguridad', icon: ShieldAlert, color: 'text-red-400', glow: 'shadow-red-500/50' },
        { id: 'commands', label: 'Comandos', icon: Terminal, color: 'text-yellow-400', glow: 'shadow-yellow-500/50' },
        { id: 'settings', label: 'Ajustes', icon: Settings, color: 'text-cyan-400', glow: 'shadow-cyan-500/50' },
        { id: 'business', label: 'Negocio', icon: Zap, color: 'text-blue-400', glow: 'shadow-blue-500/50' },
    ];

    return (
        <div className="bg-[#f0f2f5] rounded-xl shadow-2xl w-full max-w-[920px] flex flex-col h-full mx-auto animate-fadeIn relative overflow-hidden border border-gray-200">
            {/* Header & Tabs */}
            <div className="bg-[#008069] text-white rounded-t-xl shrink-0">
                <div className="p-5 flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                        <Bot className="text-white w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold tracking-wide">CONFIGURACIÓN</h2>
                        <p className="text-xs text-white/80">Panel de Control Neural</p>
                    </div>
                </div>
                <div className="flex px-4 gap-1 overflow-x-auto">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={clsx(
                                    'flex items-center gap-2 pb-3 px-4 text-sm font-bold transition-all relative whitespace-nowrap outline-none rounded-t-lg mt-2',
                                    isActive
                                        ? 'bg-[#f0f2f5] text-[#008069]'
                                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                                )}
                            >
                                <Icon
                                    size={16}
                                    className={clsx(
                                        'transition-transform duration-300',
                                        isActive ? 'text-[#008069]' : 'text-current'
                                    )}
                                />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Scrollable Content Area */}
            <form
                onSubmit={handleSubmit}
                className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar relative z-10"
            >
                {/* --- TAB: CEREBRO --- */}
                {activeTab === 'brain' && (
                    <div className="space-y-6 animate-slideDown">
                        {/* System Prompt */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-[#008069] uppercase tracking-wider block mb-1">
                                Personalidad (System Prompt)
                            </label>
                            <textarea
                                className="w-full bg-white border border-gray-300 text-[#111b21] rounded-xl p-4 min-h-[120px] resize-y focus:outline-none focus:border-[#00a884] focus:ring-1 focus:ring-[#00a884] placeholder-[#54656f]/50"
                                value={formData?.systemPrompt || ''}
                                onChange={(e) => handleChange('systemPrompt', e.target.value)}
                                placeholder="Define cómo debe comportarse el bot..."
                            />
                        </div>

                        {/* Business Context */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center mb-1">
                                <label className="text-xs font-bold text-[#008069] uppercase tracking-wider block">
                                    Base de Conocimiento
                                </label>
                                <div className="relative">
                                    <input
                                        type="file"
                                        accept=".txt,.md,.json,.csv"
                                        id="contextFile"
                                        className="hidden"
                                        onChange={async (e) => {
                                            const file = e.target.files[0];
                                            if (!file) return;

                                            const formDataUpload = new FormData();
                                            formDataUpload.append('file', file);

                                            try {
                                                const { data } = await api.post('/upload-context', formDataUpload);
                                                handleChange('businessContext', data.content);
                                                setAlertModal({
                                                    isOpen: true,
                                                    title: 'Éxito',
                                                    message: '¡Contexto actualizado! Revisa el texto y guarda los cambios.'
                                                });
                                            } catch (err) {
                                                console.error(err);
                                                setAlertModal({
                                                    isOpen: true,
                                                    title: 'Error',
                                                    message: 'Error al subir el archivo.',
                                                    isDangerous: true
                                                });
                                            }
                                            e.target.value = '';
                                        }}
                                    />
                                    <label
                                        htmlFor="contextFile"
                                        className="cursor-pointer text-[10px] font-bold flex items-center gap-1 bg-[#00a884]/10 hover:bg-[#00a884]/20 text-[#008069] border border-[#00a884]/20 px-2 py-1 rounded-full transition-all"
                                    >
                                        📂 SUBIR TXT
                                    </label>
                                </div>
                            </div>
                            <textarea
                                className="w-full bg-white border border-gray-300 text-[#111b21] rounded-xl p-4 min-h-[150px] resize-y focus:outline-none focus:border-[#00a884] focus:ring-1 focus:ring-[#00a884] placeholder-[#54656f]/50"
                                value={formData?.businessContext || ''}
                                onChange={(e) => handleChange('businessContext', e.target.value)}
                                placeholder="Pega aquí tu lista de precios, servicios, horarios..."
                            />
                        </div>

                        {/* Sliders Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                                <div className="flex justify-between mb-3">
                                    <span className="text-xs font-bold text-[#54656f] flex items-center gap-2">
                                        <Thermometer size={14} className="text-[#008069]" /> CREATIVIDAD
                                    </span>
                                    <span className="text-[#008069] font-mono font-bold">
                                        {formData?.temperature}
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.1"
                                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#00a884]"
                                    value={formData?.temperature || 0.7}
                                    onChange={(e) => handleChange('temperature', e.target.value)}
                                />
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                                <div className="flex justify-between mb-3">
                                    <span className="text-xs font-bold text-[#54656f] flex items-center gap-2">
                                        <BrainCircuit size={14} className="text-[#008069]" /> MEMORIA
                                    </span>
                                    <span className="text-[#008069] font-mono font-bold">
                                        {formData?.memoryWindow} msg
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="20"
                                    step="1"
                                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#00a884]"
                                    value={formData?.memoryWindow || 10}
                                    onChange={(e) => handleChange('memoryWindow', parseInt(e.target.value))}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* --- TAB: SEGURIDAD --- */}
                {activeTab === 'security' && (
                    <div className="space-y-6 animate-slideDown">
                        {/* Business Hours */}
                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:border-[#00a884]/30 transition-colors">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3 text-[#111b21]">
                                    <div className="p-2 bg-[#00a884]/10 rounded-lg">
                                        <Clock className="text-[#008069] w-5 h-5" />
                                    </div>
                                    <span className="font-bold text-sm tracking-wide">HORARIO COMERCIAL</span>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={formData?.businessHours?.enabled ?? false}
                                        onChange={(e) => {
                                            const currentHours = formData.businessHours || {
                                                start: '09:00',
                                                end: '18:00',
                                                message: '',
                                            };
                                            handleChange('businessHours', {
                                                ...currentHours,
                                                enabled: e.target.checked,
                                            });
                                        }}
                                    />
                                    <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-[#008069] peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all after:shadow-sm"></div>
                                </label>
                            </div>

                            {formData?.businessHours?.enabled && (
                                <div className="grid grid-cols-2 gap-4 mt-4 animate-fadeIn border-t border-gray-100 pt-4">
                                    <div>
                                        <label className="text-[10px] uppercase font-bold text-[#54656f] block mb-1">
                                            Apertura
                                        </label>
                                        <input
                                            type="time"
                                            className="w-full bg-gray-50 border border-gray-200 text-[#111b21] rounded-lg p-2 text-sm text-center focus:outline-none focus:border-[#00a884]"
                                            value={formData?.businessHours?.start || '09:00'}
                                            onChange={(e) =>
                                                handleChange('businessHours', {
                                                    ...formData.businessHours,
                                                    start: e.target.value,
                                                })
                                            }
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] uppercase font-bold text-[#54656f] block mb-1">
                                            Cierre
                                        </label>
                                        <input
                                            type="time"
                                            className="w-full bg-gray-50 border border-gray-200 text-[#111b21] rounded-lg p-2 text-sm text-center focus:outline-none focus:border-[#00a884]"
                                            value={formData?.businessHours?.end || '18:00'}
                                            onChange={(e) =>
                                                handleChange('businessHours', {
                                                    ...formData.businessHours,
                                                    end: e.target.value,
                                                })
                                            }
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-[10px] uppercase font-bold text-[#54656f] block mb-1">
                                            Mensaje de Ausencia
                                        </label>
                                        <input
                                            type="text"
                                            className="w-full bg-white border border-gray-300 text-[#111b21] rounded-lg p-3 text-sm focus:outline-none focus:border-[#00a884]"
                                            placeholder="Nuestros asesores duermen..."
                                            value={formData?.businessHours?.message || ''}
                                            onChange={(e) =>
                                                handleChange('businessHours', {
                                                    ...formData.businessHours,
                                                    message: e.target.value,
                                                })
                                            }
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Rate Limit */}
                        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                            <div className="flex flex-col gap-1">
                                <span className="text-sm font-bold text-[#111b21] flex items-center gap-2">
                                    <Zap size={16} className="text-orange-500 fill-orange-500" /> ANTI-SPAM
                                </span>
                                <span className="text-xs text-[#54656f]">Limitar velocidad de mensajes</span>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={formData?.enableRateLimit ?? true}
                                    onChange={(e) => handleChange('enableRateLimit', e.target.checked)}
                                />
                                <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:bg-[#008069] peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all after:shadow-sm"></div>
                            </label>
                        </div>

                        {/* Anger Protocol */}
                        <div className="bg-red-50 p-5 rounded-xl border border-red-100">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 text-red-700">
                                    <div className="p-2 bg-red-100 rounded-lg">
                                        <ShieldAlert size={20} />
                                    </div>
                                    <span className="font-bold text-sm tracking-wide">PROTOCOLO DE IRA</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={formData?.enableAngerProtection !== false}
                                            onChange={(e) => handleChange('enableAngerProtection', e.target.checked)}
                                        />
                                        <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:bg-red-500 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all after:shadow-sm"></div>
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => document.getElementById('badWordsModal').showModal()}
                                        className="text-[10px] font-bold bg-white text-red-500 px-3 py-1.5 rounded-full border border-red-200 hover:bg-red-50 transition-all shadow-sm"
                                    >
                                        LISTA NEGRA
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Fallback Message */}
                        <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm space-y-2">
                            <label className="text-[10px] font-bold text-[#54656f] uppercase block">
                                Mensaje de Fallback (Error IA)
                            </label>
                            <input
                                type="text"
                                className="w-full bg-white border border-gray-300 text-[#111b21] rounded-lg p-3 text-sm focus:outline-none focus:border-[#00a884]"
                                value={formData?.fallbackMessage || ''}
                                onChange={(e) => handleChange('fallbackMessage', e.target.value)}
                                placeholder="Estamos ajustando nuestros sistemas..."
                            />
                        </div>
                    </div>
                )}

                {/* --- TAB: AJUSTES --- */}
                {activeTab === 'settings' && (
                    <div className="space-y-6 animate-slideDown">
                        {/* API Key */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-[#111b21] mb-1">
                                <Key className="text-[#008069] w-4 h-4" />
                                <label className="text-xs font-bold uppercase tracking-wider">OpenAI API Key</label>
                            </div>
                            <input
                                type="password"
                                className="w-full bg-white border border-gray-300 rounded-xl p-3 text-[#111b21] focus:outline-none focus:border-[#00a884]"
                                value={formData?.openaiApiKey || ''}
                                onChange={(e) => handleChange('openaiApiKey', e.target.value)}
                                placeholder="sk-..."
                            />
                        </div>

                        {/* AI Model */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-[#54656f] uppercase tracking-wider block mb-1">
                                Modelo de IA
                            </label>
                            <select
                                className="w-full bg-white border border-gray-300 text-[#111b21] rounded-xl p-3 outline-none focus:border-[#00a884]"
                                value={formData?.model || 'gpt-3.5-turbo'}
                                onChange={(e) => handleChange('model', e.target.value)}
                            >
                                <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Rápido)</option>
                                <option value="gpt-4">GPT-4 (Inteligente)</option>
                                <option value="gpt-4-turbo">GPT-4 Turbo</option>
                                <option value="gpt-4o">GPT-4o (Visión + Texto)</option>
                                <option value="gpt-4o-mini">GPT-4o Mini (Recomendado)</option>
                            </select>
                        </div>

                        {/* Capabilities */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                                <div className="flex items-center gap-2 text-[#54656f]">
                                    <Eye size={18} className="text-[#008069]" />{' '}
                                    <span className="text-sm font-bold text-[#111b21]">Visión</span>
                                </div>
                                <input
                                    type="checkbox"
                                    className="w-5 h-5 accent-[#00a884] rounded cursor-pointer"
                                    checked={formData?.enableVision || false}
                                    onChange={(e) => handleChange('enableVision', e.target.checked)}
                                />
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                                <div className="flex items-center gap-2 text-[#54656f]">
                                    <Mic size={18} className="text-[#008069]" />{' '}
                                    <span className="text-sm font-bold text-[#111b21]">Audio</span>
                                </div>
                                <input
                                    type="checkbox"
                                    className="w-5 h-5 accent-[#00a884] rounded cursor-pointer"
                                    checked={formData?.enableAudio !== false}
                                    onChange={(e) => handleChange('enableAudio', e.target.checked)}
                                />
                            </div>
                        </div>

                        {/* Max Tokens */}
                        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                            <div className="flex justify-between mb-2">
                                <span className="text-xs font-bold text-[#54656f] uppercase">Max Tokens</span>
                                <span className="text-[#008069] font-mono">{formData?.maxTokens}</span>
                            </div>
                            <input
                                type="range"
                                min="50"
                                max="1000"
                                step="50"
                                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#00a884]"
                                value={formData?.maxTokens || 150}
                                onChange={(e) => handleChange('maxTokens', parseInt(e.target.value))}
                            />
                        </div>
                    </div>
                )}

                {/* --- TAB: COMANDOS --- */}
                {activeTab === 'commands' && (
                    <div className="space-y-6 animate-slideDown">
                        {/* Cheatsheet */}
                        <div className="grid grid-cols-1 gap-4">
                            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                                <h3 className="text-sm font-bold text-[#111b21] mb-4 flex items-center gap-2">
                                    <Terminal size={18} className="text-[#008069]" />
                                    COMANDOS DE CHAT
                                </h3>
                                <div className="space-y-3">
                                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 flex items-center justify-between">
                                        <div className="font-mono text-[#008069] text-sm font-bold">
                                            !on
                                        </div>
                                        <div className="text-xs text-[#54656f]">Reactiva la IA en el chat</div>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 flex items-center justify-between">
                                        <div className="font-mono text-red-500 text-sm font-bold">
                                            !off &lt;minutos&gt;
                                        </div>
                                        <div className="text-xs text-[#54656f] text-right">
                                            Suspende la IA (Modo Humano)
                                            <br />
                                            <span className="text-[10px] opacity-70">Ej: !off 30</span>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 flex items-center justify-between">
                                        <div className="font-mono text-orange-500 text-sm font-bold">
                                            !pay &lt;dias&gt;
                                        </div>
                                        <div className="text-xs text-[#54656f] text-right">
                                            Programa recordatorio de pago
                                            <br />
                                            <span className="text-[10px] opacity-70">Ej: !pay 30</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Payment Message Config */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-[#54656f] uppercase tracking-wider block mb-1">
                                Mensaje de Cobro (Recordatorio)
                            </label>
                            <textarea
                                className="w-full bg-white border border-gray-300 text-[#111b21] rounded-xl p-4 min-h-[100px] resize-y focus:outline-none focus:border-[#00a884]"
                                value={formData?.paymentMessage || ''}
                                onChange={(e) => handleChange('paymentMessage', e.target.value)}
                                placeholder="Hola, recordatorio amable de tu pago..."
                            />
                            <p className="text-[10px] text-[#54656f]">
                                Este mensaje se enviará automáticamente cuando venza el plazo establecido.
                            </p>
                        </div>
                    </div>
                )}

                {/* --- TAB: NEGOCIO --- */}
                {activeTab === 'business' && (
                    <div className="space-y-6 animate-slideDown">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Contact Section */}
                            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/50 space-y-4">
                                <div className="flex items-center gap-3 text-[#111b21]">
                                    <div className="p-3 bg-blue-50 rounded-2xl">
                                        <Bot className="text-blue-600 w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-sm uppercase tracking-wider">Centro de Ayuda</h3>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase">Soporte y Ventas</p>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between group hover:border-blue-500/30 transition-all cursor-pointer" onClick={() => window.open(`https://wa.me/${systemSettings?.businessContact}`, '_blank')}>
                                        <div className="flex items-center gap-3">
                                            <Zap size={18} className="text-blue-500" />
                                            <span className="text-xs font-bold text-gray-600">WhatsApp Oficial</span>
                                        </div>
                                        <span className="text-xs font-black text-blue-600">{systemSettings?.businessContact || 'No definido'}</span>
                                    </div>
                                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between group hover:border-purple-500/30 transition-all cursor-pointer" onClick={() => window.open(systemSettings?.facebookLink, '_blank')}>
                                        <div className="flex items-center gap-3">
                                            <Zap size={18} className="text-purple-500" />
                                            <span className="text-xs font-bold text-gray-600">Facebook Page</span>
                                        </div>
                                        <ChevronRight size={16} className="text-gray-300 group-hover:text-purple-500 transition-colors" />
                                    </div>
                                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between group hover:border-[#00a884]/30 transition-all cursor-pointer" onClick={() => window.open(systemSettings?.openaiLink, '_blank')}>
                                        <div className="flex items-center gap-3">
                                            <BrainCircuit size={18} className="text-[#00a884]" />
                                            <span className="text-xs font-bold text-gray-600">OpenAI Dashboard</span>
                                        </div>
                                        <ChevronRight size={16} className="text-gray-300 group-hover:text-[#00a884] transition-colors" />
                                    </div>
                                </div>
                            </div>

                            {/* Pricing Section */}
                            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/50 space-y-4">
                                <div className="flex items-center gap-3 text-[#111b21]">
                                    <div className="p-3 bg-green-50 rounded-2xl">
                                        <Clock className="text-[#00a884] w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-sm uppercase tracking-wider">Planes & Costos</h3>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase">Suscripciones AutoBOT</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 gap-3">
                                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Mensual</span>
                                        <span className="text-xl font-black text-[#111b21]">${systemSettings?.priceMonthly || '0'}</span>
                                    </div>
                                    <div className="p-4 bg-[#00a884]/5 rounded-2xl border border-[#00a884]/10 flex items-center justify-between relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 bg-[#00a884] text-white text-[8px] font-black px-3 py-1 rounded-bl-xl tracking-tighter">POPULAR</div>
                                        <span className="text-[10px] font-black uppercase text-[#008069] tracking-widest">Trimestral</span>
                                        <span className="text-xl font-black text-[#008069] transition-transform group-hover:scale-110">${systemSettings?.priceQuarterly || '0'}</span>
                                    </div>
                                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Anual</span>
                                        <span className="text-xl font-black text-[#111b21]">${systemSettings?.priceAnnual || '0'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Credits Bar */}
                        <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-200 text-center relative overflow-hidden group">
                            <div className="relative z-10">
                                <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.4em] mb-1">Desarrollado con ❤️ por</p>
                                <p className="text-sm font-black text-[#111b21] tracking-tighter">{systemSettings?.credits || 'AutoBOT Neural Systems'}</p>
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent translate-x-[-100%] group-hover:animate-shine"></div>
                        </div>
                    </div>
                )}
            </form>

            {/* Footer Action Bar */}
            <div className="p-4 border-t border-gray-200 shrink-0 bg-[#f0f2f5] rounded-b-xl flex justify-between items-center z-20">
                <span
                    className={clsx(
                        'text-xs font-bold tracking-wider transition-opacity duration-300 flex items-center gap-2',
                        isDirty ? 'text-[#008069] opacity-100' : 'opacity-0',
                    )}
                >
                    ⚠️ CAMBIOS PENDIENTES
                </span>
                <button
                    onClick={handleSubmit}
                    disabled={!isDirty}
                    className={clsx(
                        'flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-all transform active:scale-95 text-sm tracking-widest uppercase shadow-md',
                        isDirty
                            ? 'bg-[#008069] hover:bg-[#006d59] text-white shadow-[#008069]/20'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none',
                    )}
                >
                    <Save size={18} />
                    GUARDAR
                </button>
            </div>

            {/* Bad Words Modal (Reused) */}
            <dialog
                id="badWordsModal"
                className="bg-white rounded-2xl p-0 backdrop:bg-black/50 w-full max-w-md shadow-2xl border border-gray-200"
            >
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-[#111b21] flex items-center gap-2 tracking-wide">
                            <ShieldAlert size={24} className="text-red-500" />
                            LISTA NEGRA
                        </h3>
                        <button
                            type="button"
                            onClick={() => document.getElementById('badWordsModal').close()}
                            className="text-gray-400 hover:text-gray-600 transition-colors bg-gray-100 p-2 rounded-full hover:bg-gray-200"
                        >
                            <X size={20} />
                        </button>
                    </div>
                    <div className="space-y-4">
                        <textarea
                            className="w-full bg-gray-50 border border-gray-200 text-[#111b21] rounded-xl p-4 min-h-[200px] text-sm leading-relaxed focus:outline-none focus:border-red-400"
                            value={formData?.badWords?.join('\n') || ''}
                            onChange={(e) => handleChange('badWords', e.target.value.split('\n'))}
                            placeholder="Una palabra por línea..."
                        />
                        <div className="flex justify-end pt-2">
                            <button
                                type="button"
                                onClick={() => document.getElementById('badWordsModal').close()}
                                className="bg-[#008069] text-white font-bold px-6 py-2 rounded-lg hover:bg-[#006d59] shadow-md transition-all"
                            >
                                Guardar
                            </button>
                        </div>
                    </div>
                </div>
            </dialog>

            {/* Application Alert Modal */}
            <ConfirmationModal
                isOpen={alertModal.isOpen}
                onClose={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
                title={alertModal.title}
                message={alertModal.message}
                confirmText="Aceptar"
                isDangerous={alertModal.isDangerous}
            />
        </div>
    );
};
