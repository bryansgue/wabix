import React, { useState, useEffect } from 'react';
import { X, Calendar, DollarSign, Clock, Repeat, Sparkles, AlertTriangle } from 'lucide-react';
import { createReminder } from '../services/api';

export const PaymentModal = ({ client, onClose }) => {
    const [date, setDate] = useState('');
    const [time, setTime] = useState('09:00');
    const [recurrence, setRecurrence] = useState('none');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    // Auto-calculate date when recurrence changes
    useEffect(() => {
        if (recurrence !== 'none') {
            const days = parseInt(recurrence);
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + days);
            setDate(futureDate.toISOString().split('T')[0]);
        }
    }, [recurrence]);

    // Clear error on change
    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => setError(''), 3000);
            return () => clearTimeout(timer);
        }
    }, [error]);


    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (!date || !time) {
                throw new Error('Por favor completa todos los campos');
            }

            const timestamp = new Date(`${date}T${time}`).toISOString();
            const recurrenceDays = recurrence === 'none' ? null : parseInt(recurrence);

            await createReminder(client.chatId, {
                timestamp,
                recurrenceDays
            });

            setSuccess(true);
        } catch (error) {
            setError('❌ ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Set min date to today
    const minDate = new Date().toISOString().split('T')[0];

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#f0f2f5] border border-gray-200 rounded-xl w-full max-w-sm shadow-2xl p-6 relative animate-in fade-in zoom-in-95 duration-200">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-[#54656f] hover:text-[#111b21] hover:bg-gray-200 rounded-full p-1 transition-colors z-10"
                >
                    <X size={20} />
                </button>

                {/* SUCCESS STATE */}
                {success ? (
                    <div className="text-center py-6 animate-in zoom-in-95 duration-300">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600 animate-bounce">
                            <Sparkles size={32} />
                        </div>
                        <h2 className="text-xl font-bold text-[#111b21] mb-2">¡Agendado!</h2>
                        <p className="text-sm text-[#54656f] mb-6">
                            El recordatorio para <span className="font-semibold">{client.name}</span> se ha guardado correctamente.
                        </p>
                        <button
                            onClick={onClose}
                            className="w-full bg-[#008069] text-white py-3 rounded-lg font-bold hover:bg-[#006c59] hover:shadow-md transition-all uppercase tracking-wider text-sm"
                        >
                            Entendido
                        </button>
                    </div>
                ) : (
                    <>
                        {/* FORM STATE */}
                        <div className="text-center mb-6">
                            <div className="w-14 h-14 bg-[#d9fdd3] rounded-full flex items-center justify-center mx-auto mb-3 text-[#00a884]">
                                <DollarSign size={28} />
                            </div>
                            <h2 className="text-xl font-bold text-[#111b21]">Agendar Cobro</h2>
                            <p className="text-sm text-[#54656f] mt-1">Recordatorio para <span className="font-semibold">{client.name}</span></p>
                        </div>

                        {/* Error Banner */}
                        {error && (
                            <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-xs font-bold flex items-center gap-2 animate-in slide-in-from-top-2">
                                <AlertTriangle size={14} />
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-[#111b21] uppercase tracking-wider mb-2">Recurrencia</label>
                                <div className="relative">
                                    <Repeat className="absolute left-3 top-3 text-[#54656f] w-4 h-4" />
                                    <select
                                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 text-[#111b21] bg-white appearance-none cursor-pointer focus:outline-none focus:border-[#00a884] focus:ring-1 focus:ring-[#00a884] transition-all shadow-sm text-sm"
                                        value={recurrence}
                                        onChange={e => setRecurrence(e.target.value)}
                                    >
                                        <option value="none">Solo una vez</option>
                                        <option value="30">Cada 30 días (Mensual)</option>
                                        <option value="60">Cada 60 días (Bimestral)</option>
                                        <option value="90">Cada 90 días (Trimestral)</option>
                                        <option value="180">Cada 180 días (Semestral)</option>
                                        <option value="365">Cada 365 días (Anual)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-[#111b21] uppercase tracking-wider mb-2">Fecha de Recordatorio</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-3 text-[#54656f] w-4 h-4" />
                                    <input
                                        type="date"
                                        required
                                        min={minDate}
                                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 text-[#111b21] bg-white focus:outline-none focus:border-[#00a884] focus:ring-1 focus:ring-[#00a884] transition-all shadow-sm text-sm"
                                        value={date}
                                        onChange={e => setDate(e.target.value)}
                                    />
                                </div>
                                {recurrence !== 'none' && date && (
                                    <p className="text-[11px] text-[#00a884] mt-1.5 font-medium flex items-center gap-1">
                                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#00a884]"></span>
                                        Fecha calculada automáticamente (+{recurrence} días)
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-[#111b21] uppercase tracking-wider mb-2">Hora</label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-3 text-[#54656f] w-4 h-4" />
                                    <input
                                        type="time"
                                        required
                                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 text-[#111b21] bg-white focus:outline-none focus:border-[#00a884] focus:ring-1 focus:ring-[#00a884] transition-all shadow-sm text-sm"
                                        value={time}
                                        onChange={e => setTime(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="bg-white p-4 rounded-lg text-xs text-[#54656f] border border-gray-200 shadow-sm">
                                <p className="flex items-start gap-2">
                                    <span className="text-xl leading-none">ℹ️</span>
                                    <span className="leading-relaxed">El bot enviará automáticamente el mensaje de cobro configurado en esa fecha y hora.</span>
                                </p>
                                {recurrence !== 'none' && (
                                    <p className="mt-2 text-[#00a884] font-medium pl-6 border-l-2 border-[#00a884] ml-1">
                                        🔄 Este recordatorio se repetirá automáticamente cada {recurrence} días.
                                    </p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-[#008069] text-white py-3 rounded-lg font-bold hover:bg-[#006c59] hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all flex justify-center items-center gap-2 transform active:scale-[0.99] text-sm uppercase tracking-wide"
                            >
                                {loading ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                        Agendando...
                                    </>
                                ) : (
                                    'AGENDAR PAGO'
                                )}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
};
