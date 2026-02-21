import React, { useState, useEffect } from 'react';
import { X, Megaphone, Users, AlertTriangle, Send, Image as ImageIcon, Trash2, Sparkles } from 'lucide-react';
import { sendBroadcast } from '../services/api';

export const BroadcastModal = ({ onClose, selectedIds }) => {
    const [step, setStep] = useState('COMPOSE'); // COMPOSE, CONFIRM, SUCCESS
    const [error, setError] = useState('');
    const [estimatedTime, setEstimatedTime] = useState(0);
    const [stats, setStats] = useState({ count: 0 });
    const [status, setStatus] = useState('');
    const [message, setMessage] = useState('');
    const [image, setImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [loading, setLoading] = useState(false);



    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => setError(''), 3000);
            return () => clearTimeout(timer);
        }
    }, [error]);

    // Pre-select "MANUAL" if specific clients are passed
    useEffect(() => {
        if (selectedIds && selectedIds.length > 0) {
            setStatus('MANUAL');
        }
    }, [selectedIds]);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 1024 * 1024) {
                setError('⚠️ La imagen no puede superar 1MB de peso.');
                e.target.value = null;
                return;
            }
            setImage(file);

            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const removeImage = () => {
        setImage(null);
        setImagePreview(null);
    };

    const insertVariable = (variable) => {
        setMessage(prev => prev + variable);
    };

    const handleReview = (e) => {
        e.preventDefault();
        setError('');

        if (!status) return setError('⚠️ Selecciona una audiencia para continuar.');
        if (!message && !image) return setError('⚠️ Escribe un mensaje o adjunta una imagen.');

        // Calculate Stats (Mock calculation, ideally this comes from backend count)
        // For MANUAL we know the count. For others we estimate or show generic.
        let count = 0;
        if (status === 'MANUAL') count = selectedIds.length;
        else if (status === 'LEAD') count = 50; // TODO: Fetch real count
        else if (status === 'HOT') count = 10;
        else count = 20; // Default fallback

        setStats({ count });
        // Avg 52.5s per msg (15-90s range)
        setEstimatedTime(Math.ceil((count * 52.5) / 60));

        setStep('CONFIRM');
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const criteria = status === 'MANUAL'
                ? { ids: selectedIds }
                : { status };

            const formData = new FormData();
            formData.append('criteria', JSON.stringify(criteria));
            if (message) formData.append('message', message);
            if (image) formData.append('image', image);

            await sendBroadcast(formData);
            setStep('SUCCESS');
        } catch (err) {
            setError('❌ Error: ' + err.message);
            setStep('COMPOSE'); // Go back to fix
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#f0f2f5] rounded-xl w-full max-w-2xl shadow-2xl p-5 relative max-h-[90vh] overflow-y-auto border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-[#54656f] hover:text-[#111b21] hover:bg-gray-200 rounded-full p-1 transition-colors z-10"
                >
                    <X size={20} />
                </button>

                {/* Header */}
                <div className="flex items-center gap-4 mb-5 pb-4 border-b border-gray-200/50">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${step === 'SUCCESS' ? 'bg-green-100 text-green-600' : 'bg-[#d9fdd3] text-[#00a884]'}`}>
                        {step === 'SUCCESS' ? <Sparkles size={20} /> : <Megaphone size={20} />}
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-[#111b21]">
                            {step === 'COMPOSE' && 'Nueva Difusión'}
                            {step === 'CONFIRM' && 'Revisar Campaña'}
                            {step === 'SUCCESS' && '¡Campaña Iniciada!'}
                        </h2>
                        <p className="text-xs text-[#54656f]">
                            {step === 'SUCCESS' ? 'El bot está trabajando en segundo plano.' : 'Envío masivo con protección Anti-Ban 🛡️'}
                        </p>
                    </div>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2 animate-in slide-in-from-top-2">
                        <AlertTriangle size={16} />
                        {error}
                    </div>
                )}

                {/* STEP 1: COMPOSE */}
                {step === 'COMPOSE' && (
                    <form onSubmit={handleReview} className="space-y-4">
                        {/* Audience Selector */}
                        <div>
                            <div className="relative">
                                <Users className="absolute left-3 top-3 text-[#54656f] w-4 h-4" />
                                <select
                                    className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-300 text-[#111b21] bg-white cursor-pointer focus:outline-none focus:border-[#00a884] focus:ring-1 focus:ring-[#00a884] transition-all text-sm font-medium"
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                    disabled={selectedIds && selectedIds.length > 0}
                                >
                                    <option value="">Selecciona audiencia...</option>
                                    {selectedIds && selectedIds.length > 0 && (
                                        <option value="MANUAL">SELECCIÓN MANUAL ({selectedIds.length})</option>
                                    )}
                                    <option value="LEAD">LEADS (Nuevos)</option>
                                    <option value="HOT">HOT LEADS 🔥</option>
                                    <option value="CUSTOMER">CLIENTES ⭐</option>
                                    <option value="ALL">TODOS (Usar con precaución)</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Message */}
                            <div className="md:col-span-2 relative">
                                <textarea
                                    className="w-full p-3 rounded-lg border border-gray-300 text-[#111b21] bg-white min-h-[120px] text-sm resize-none focus:outline-none focus:border-[#00a884] focus:ring-1 focus:ring-[#00a884] placeholder-[#54656f]/60 transition-all leading-relaxed"
                                    placeholder="Hola {name}, te comparto esta oferta especial..."
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                />
                                <div className="absolute bottom-2 right-2 text-[10px] text-[#54656f] bg-white/80 px-1 rounded">
                                    {message.length} chars
                                </div>
                            </div>

                            {/* Variables */}
                            <div className="space-y-2 flex flex-col">
                                <div className="bg-white rounded-xl p-3 border border-gray-300 flex-1 shadow-sm flex flex-col justify-center">
                                    <p className="text-[10px] text-[#54656f] mb-2 leading-tight font-medium">
                                        Variables:
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => insertVariable('{name}')}
                                        className="w-full text-left px-3 py-2 rounded-lg bg-[#f0f2f5] hover:bg-gray-200 transition-all text-xs text-[#111b21] border border-gray-200 flex items-center gap-2 group"
                                    >
                                        <code className="text-[#00a884] font-bold bg-white border border-gray-200 px-1.5 py-0.5 rounded shadow-sm text-[10px]">{'{name}'}</code>
                                        <span className="text-[10px] text-[#54656f] group-hover:text-[#111b21]">Cliente</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Image Upload */}
                        <div>
                            {!image ? (
                                <label className="flex items-center justify-center w-full h-16 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 hover:border-[#00a884]/50 transition-all bg-white gap-3 group">
                                    <div className="p-1.5 bg-[#f0f2f5] rounded-full group-hover:bg-white transition-colors">
                                        <ImageIcon className="w-4 h-4 text-[#54656f]" />
                                    </div>
                                    <span className="text-xs text-[#54656f] font-medium group-hover:text-[#00a884]">Adjuntar imagen (Opcional, Máx 1MB)</span>
                                    <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                                </label>
                            ) : (
                                <div className="flex items-center gap-3 p-2 bg-white rounded-lg border border-gray-200 shadow-sm">
                                    <div className="w-12 h-12 rounded overflow-hidden bg-[#efeae2] shrink-0 border border-gray-100">
                                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-[#111b21] truncate">{image.name}</p>
                                        <p className="text-[10px] text-[#00a884] font-medium flex items-center gap-1">
                                            <Sparkles size={8} /> {(image.size / 1024).toFixed(0)} KB • Listo
                                        </p>
                                    </div>
                                    <button type="button" onClick={removeImage} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            )}
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-[#008069] text-white py-3 rounded-xl font-bold hover:bg-[#006c59] hover:shadow-md transition-all flex justify-center items-center gap-2 text-sm uppercase tracking-wide"
                        >
                            Continuar
                        </button>
                    </form>
                )}

                {/* STEP 2: CONFIRM */}
                {step === 'CONFIRM' && (
                    <div className="space-y-5 animate-in slide-in-from-right-4 fade-in duration-300">
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                            <h3 className="text-sm font-bold text-amber-900 mb-3 flex items-center gap-2">
                                <AlertTriangle size={16} /> Resumen de Campaña
                            </h3>
                            <div className="space-y-2 text-xs text-amber-900/80">
                                <div className="flex justify-between">
                                    <span>Audiencia:</span>
                                    <span className="font-bold">{status}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Destinatarios estimados:</span>
                                    <span className="font-bold">~{stats.count} usuarios</span>
                                </div>
                                <div className="flex justify-between border-t border-amber-200/50 pt-2 mt-2">
                                    <span>Tiempo total estimado:</span>
                                    <span className="font-bold">{estimatedTime} minutos</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                            <p className="text-[10px] text-[#54656f] uppercase tracking-wider font-bold mb-2">Vista Previa del Mensaje</p>
                            <div className="bg-[#e7fce3] p-3 rounded-lg shadow-sm border border-[#d9fdd3]">
                                <p className="text-sm text-[#111b21] whitespace-pre-wrap">{message || '(Solo imagen)'}</p>
                                {image && (
                                    <div className="mt-2 text-[10px] text-[#00a884] flex items-center gap-1">
                                        <ImageIcon size={10} /> Imagen adjunta
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setStep('COMPOSE')}
                                className="flex-1 px-4 py-3 rounded-xl border border-gray-300 text-[#54656f] font-bold hover:bg-gray-50 transition-all text-sm"
                            >
                                Editar
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="flex-[2] bg-[#008069] text-white py-3 rounded-xl font-bold hover:bg-[#006c59] hover:shadow-md disabled:opacity-50 transition-all flex justify-center items-center gap-2 text-sm shadow-lg shadow-[#008069]/20"
                            >
                                {loading ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                        Enviando...
                                    </>
                                ) : (
                                    <>
                                        <Send size={16} />
                                        Confirmar y Enviar
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 3: SUCCESS */}
                {step === 'SUCCESS' && (
                    <div className="text-center py-8 animate-in zoom-in-95 duration-300">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600 animate-bounce">
                            <Sparkles size={40} />
                        </div>
                        <h3 className="text-2xl font-bold text-[#111b21] mb-2">¡Campaña en Marcha!</h3>
                        <p className="text-sm text-[#54656f] max-w-xs mx-auto mb-8">
                            El bot ha comenzado a enviar los mensajes. Puedes cerrar esta ventana, el proceso continuará en segundo plano.
                        </p>
                        <button
                            onClick={onClose}
                            className="w-full bg-[#008069] text-white py-3 rounded-xl font-bold hover:bg-[#006c59] hover:shadow-md transition-all text-sm"
                        >
                            Entendido, cerrar
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
