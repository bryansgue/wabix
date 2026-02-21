import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import api from '../services/api';
import { Smartphone, RefreshCw, QrCode } from 'lucide-react';

export const QRDisplay = ({ qr, status }) => {
    const [usePairing, setUsePairing] = useState(false); // Default to QR code first
    const [phoneNumber, setPhoneNumber] = useState('');
    const [pairingCode, setPairingCode] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handlePairing = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setPairingCode(null);

        try {
            const response = await api.post('/pairing', { phoneNumber });
            if (response.data.success) {
                setPairingCode(response.data.code);
            } else {
                setError('Error al obtener código');
            }
        } catch (err) {
            console.error(err);
            setError('Error de conexión o número inválido');
        } finally {
            setLoading(false);
        }
    };

    if (status === 'connected') return null;

    return (
        <div className="flex flex-col items-center bg-white rounded-xl shadow-2xl overflow-hidden w-full max-w-sm mx-auto">
            <div className="w-full p-4 border-b border-gray-100 flex justify-between items-center bg-[#f0f2f5]">
                <h3 className="font-bold text-[#111b21] text-sm">Vincular Dispositivo</h3>
                <button
                    onClick={() => {
                        setUsePairing(!usePairing);
                        setPairingCode(null);
                        setError('');
                    }}
                    className="text-[10px] font-bold text-[#008069] bg-white px-3 py-1.5 rounded-full border border-gray-200 hover:bg-gray-50 transition-all shadow-sm"
                >
                    {usePairing ? 'VER QR' : 'USAR NÚMERO'}
                </button>
            </div>

            <div className="p-8 w-full flex flex-col items-center min-h-[320px] justify-center bg-white">
                {!usePairing ? (
                    /* SCAN QR (Now default) */
                    <div className="flex flex-col items-center animate-fadeIn">
                        {qr ? (
                            <div className="relative p-4 bg-white rounded-2xl border-2 border-gray-100 shadow-inner">
                                <QRCodeSVG
                                    value={qr}
                                    size={220}
                                    level="H"
                                    includeMargin={false}
                                />
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03]">
                                    <QrCode size={100} />
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center p-8 rounded-2xl h-56 w-56 bg-gray-50 border-2 border-dashed border-gray-200 animate-pulse">
                                <RefreshCw className="w-8 h-8 text-gray-300 animate-spin mb-2" />
                                <p className="text-[#54656f] text-xs font-bold uppercase tracking-widest">Generando...</p>
                            </div>
                        )}
                        <div className="mt-6 text-center">
                            <p className="text-sm text-[#111b21] font-bold">Escanea con WhatsApp</p>
                            <p className="text-[10px] text-[#54656f] mt-1 uppercase tracking-tighter">Apunta la cámara de tu teléfono aquí</p>
                        </div>
                    </div>
                ) : (
                    /* PAIR WITH PHONE */
                    <div className="w-full animate-fadeIn">
                        {!pairingCode ? (
                            <form onSubmit={handlePairing} className="flex flex-col gap-4">
                                <div className="text-center mb-2">
                                    <Smartphone className="w-10 h-10 text-[#00a884] mx-auto mb-3 opacity-80" />
                                    <p className="text-sm text-[#111b21] font-bold">
                                        Vinculación con Número
                                    </p>
                                    <p className="text-[10px] text-[#54656f] uppercase tracking-wider mt-1">
                                        Recibe el código en tu teléfono
                                    </p>
                                </div>
                                <div className="relative">
                                    <input
                                        type="tel"
                                        placeholder="5215512345678"
                                        className="w-full p-4 border-2 border-gray-200 rounded-xl text-center text-2xl font-bold tracking-widest text-[#111b21] placeholder:text-gray-200 focus:border-[#00a884] focus:ring-4 focus:ring-[#00a884]/10 outline-none transition-all bg-gray-50/50"
                                        value={phoneNumber}
                                        onChange={(e) => setPhoneNumber(e.target.value)}
                                        required
                                    />
                                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-white px-2 text-[8px] font-black text-gray-400 uppercase tracking-[0.2em]">Cód. País + Número</span>
                                </div>
                                {error && (
                                    <p className="border-l-4 border-red-500 text-red-600 text-[10px] font-bold text-left bg-red-50 p-3 rounded-r shadow-sm">
                                        {error}
                                    </p>
                                )}
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="bg-[#008069] text-white py-4 rounded-xl font-bold text-sm tracking-widest shadow-lg hover:bg-[#006d59] active:scale-95 transition-all disabled:opacity-70 flex justify-center items-center gap-2 uppercase"
                                >
                                    {loading ? <RefreshCw className="animate-spin w-5 h-5" /> : 'Solicitar Código'}
                                </button>
                            </form>
                        ) : (
                            <div className="text-center w-full animate-slideIn">
                                <p className="text-xs text-[#54656f] font-bold uppercase tracking-widest mb-4">
                                    Código de Vinculación:
                                </p>
                                <div className="flex gap-2 justify-center flex-wrap mb-6">
                                    {pairingCode.split('').map((char, i) => (
                                        <div
                                            key={i}
                                            className="w-8 h-12 flex items-center justify-center border-2 border-[#00a884]/30 bg-[#00a884]/5 rounded-lg text-2xl font-mono font-black text-[#006d59] shadow-sm transform hover:scale-110 transition-transform"
                                        >
                                            {char}
                                        </div>
                                    ))}
                                </div>

                                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-5 text-left">
                                    <p className="text-[10px] text-[#111b21] font-black uppercase mb-2 flex items-center gap-2">
                                        <span className="w-1 h-3 bg-[#00a884] rounded-full"></span>
                                        Instrucciones:
                                    </p>
                                    <ul className="text-[10px] text-[#54656f] font-bold space-y-2 uppercase tracking-tight">
                                        <li>1. Abre WhatsApp en tu Móvil</li>
                                        <li>2. Dispositivos vinculados &gt; Vincular</li>
                                        <li className="text-[#008069]">3. "Vincular con el número de teléfono"</li>
                                    </ul>
                                </div>

                                <button
                                    onClick={() => setPairingCode(null)}
                                    className="text-[10px] font-black text-[#00a884] hover:text-[#006d59] transition-colors uppercase tracking-[0.2em]"
                                >
                                    &larr; Cambiar Número
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
