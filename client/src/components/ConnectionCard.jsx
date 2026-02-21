import React from 'react';
import { QRDisplay } from './QRDisplay';
import { Wifi, WifiOff, Smartphone, User, ShieldCheck, Clock as LucideClock } from 'lucide-react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import api from '../services/api';

export const ConnectionCard = ({ status, qr, userInfo, user, model }) => {
    const isConnected = status === 'connected';

    const getModelLabel = (m) => {
        const models = {
            'gpt-3.5-turbo': 'GPT-3.5 Turbo',
            'gpt-4': 'GPT-4',
            'gpt-4-turbo': 'GPT-4 Turbo',
            'gpt-4o': 'GPT-4o',
            'gpt-4o-mini': 'GPT-4o Mini',
        };
        return models[m] || m || 'Cargando...';
    };

    return (
        <div className="bg-white rounded-2xl h-full flex flex-col relative overflow-hidden group border border-gray-200 shadow-xl transition-all duration-500">
            {/* Ambient Background Glow (Subtle) */}
            <div
                className={`absolute inset-0 bg-gradient-to-b ${isConnected ? 'from-[#00a884]/5' : 'from-red-500/5'} to-transparent transition-opacity duration-500`}
            ></div>

            {/* --- TOP SECTION: CONNECTION STATUS --- */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 min-h-[400px]">
                {/* Header Badge */}
                <div
                    className={`mb-8 px-4 py-1.5 rounded-full text-xs font-bold tracking-wider flex items-center gap-2 border relative z-10 ${isConnected
                        ? 'bg-green-100 text-[#006d59] border-green-200'
                        : 'bg-red-100 text-red-700 border-red-200'
                        }`}
                >
                    {isConnected ? <Wifi size={14} className="animate-pulse" /> : <WifiOff size={14} />}
                    {isConnected ? 'EN LÍNEA' : 'OFFLINE'}
                </div>

                {/* Content Switcher */}
                {isConnected ? (
                    <div className="flex flex-col items-center w-full animate-fadeIn z-10">
                        <div className="relative mb-6 group-hover:scale-105 transition-transform duration-500 ease-out">
                            {/* Avatar Ring Animation (Restored & Adapted) */}
                            <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-[#00a884] to-[#00e676] opacity-0 group-hover:opacity-20 animate-spin-slow transition-opacity duration-500"></div>
                            <div className="absolute -inset-1 rounded-full bg-[#00a884] opacity-0 group-hover:opacity-40 blur-md transition-all duration-500 scale-90 group-hover:scale-110"></div>

                            {userInfo?.profilePicUrl ? (
                                <img
                                    src={userInfo.profilePicUrl}
                                    alt="Profile"
                                    className="relative w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg z-10"
                                />
                            ) : (
                                <div className="relative w-32 h-32 rounded-full bg-gray-100 flex items-center justify-center border-4 border-white shadow-lg z-10">
                                    <User size={48} className="text-gray-400" />
                                </div>
                            )}

                            {/* Status Indicator Dot */}
                            <div className="absolute bottom-2 right-2 w-6 h-6 bg-[#00a884] border-4 border-white rounded-full shadow-md z-20"></div>
                        </div>

                        <h2 className="text-2xl font-bold text-[#111b21] mb-1 text-center tracking-tight">
                            {userInfo?.name || 'WhatsApp User'}
                        </h2>
                        <div className="flex items-center gap-2 bg-white px-4 py-1.5 rounded-full border border-gray-200 mb-8 shadow-sm">
                            <Smartphone size={14} className="text-[#00a884]" />
                            <span className="text-[#111b21] font-bold text-sm tracking-wide">
                                {userInfo?.id ? userInfo.id.split('@')[0] : '...'}
                            </span>
                        </div>

                        {/* Stats or Info */}
                        <div className="w-full grid grid-cols-2 gap-3 max-w-[280px]">
                            <div className="bg-[#f0f2f5] p-3 rounded-xl border border-gray-100 text-center">
                                <span className="text-[10px] font-bold text-[#54656f] uppercase block mb-1">Modelo</span>
                                <span className="text-[#008069] font-bold text-sm">{getModelLabel(model)}</span>
                            </div>
                            <div className="bg-[#f0f2f5] p-3 rounded-xl border border-gray-100 text-center">
                                <span className="text-[10px] font-bold text-[#54656f] uppercase block mb-1">Estado</span>
                                <span className="text-[#00a884] font-bold text-sm">ACTIVO</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center w-full z-10">
                        <div className="relative">
                            <QRDisplay qr={qr} status={status} />
                        </div>
                        <div className="mt-8 text-center max-w-[220px]">
                            <h3 className="text-[#111b21] font-bold mb-2 tracking-wide">VINCULAR DISPOSITIVO</h3>
                            <p className="text-xs text-[#54656f] leading-relaxed">
                                Abre WhatsApp en tu móvil <br />
                                <span className="text-[#008069] font-semibold">Menú &gt; Dispositivos vinculados</span>
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* --- BOTTOM SECTION: USER ACCOUNT (INTEGRATED) --- */}
            <div className="bg-[#f8f9fa] border-t border-gray-100 p-6 z-10">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <p className="text-[10px] uppercase font-bold text-[#54656f] tracking-widest">Cuenta Activa</p>
                        <p className="font-bold text-[#111b21] text-lg flex items-center gap-2">
                            {user?.username}
                            {user?.role === 'admin' && <ShieldCheck size={16} className="text-purple-500" />}
                        </p>
                    </div>
                    <div className="bg-[#00a884]/10 text-[#008069] text-[10px] font-black px-2.5 py-1 rounded-full border border-[#00a884]/20 uppercase tracking-tighter">
                        {user?.role}
                    </div>
                </div>

                {/* Subscription Info */}
                <div className="bg-white rounded-xl p-3 border border-gray-100 flex items-center justify-between mb-6 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-50 p-2 rounded-lg">
                            <LucideClock size={18} className="text-blue-600" />
                        </div>
                        <div>
                            <p className="text-[9px] uppercase font-bold text-[#54656f]">Suscripción</p>
                            <p className="text-xs font-bold text-[#111b21] capitalize">
                                {user?.planType && user.planType !== 'none' ? user.planType : 'Sin Plan'}
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-[9px] uppercase font-bold text-[#54656f]">Vence el</p>
                        <p className={clsx(
                            "text-xs font-bold",
                            user?.expiresAt && new Date() > new Date(user.expiresAt) ? "text-red-500" : "text-[#111b21]"
                        )}>
                            {user?.expiresAt ? new Date(user.expiresAt).toLocaleDateString() : '∞'}
                        </p>
                    </div>
                </div>

                <div className="space-y-3">
                    {/* Admin Link if Admin */}
                    {user?.role?.toLowerCase() === 'admin' && (
                        <a
                            href="/admin"
                            className="block w-full text-center bg-purple-50 hover:bg-purple-100 text-purple-700 text-[11px] font-bold py-3 rounded-xl transition-all border border-purple-200 shadow-sm"
                        >
                            IR AL PANEL ADMINISTRATIVO
                        </a>
                    )}

                    {/* CRM Main Action */}
                    <Link
                        to="/clients"
                        className="block w-full text-center bg-[#00a884] hover:bg-[#008069] text-white text-[11px] font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-[#00a884]/20 active:scale-95"
                    >
                        GESTIONAR CLIENTES (CRM)
                    </Link>

                    {/* Change Password Inline Section */}
                    <div className="pt-2">
                        <details className="group">
                            <summary className="text-[10px] text-[#54656f] font-bold cursor-pointer hover:text-[#00a884] transition-colors list-none flex items-center justify-between uppercase tracking-widest opacity-70 hover:opacity-100">
                                <span>Seguridad de Cuenta</span>
                                <span className="group-open:rotate-180 transition-transform text-[#00a884]">▼</span>
                            </summary>
                            <form
                                onSubmit={async (e) => {
                                    e.preventDefault();
                                    const newPwd = e.target.pwd.value;
                                    if (!newPwd) return;
                                    try {
                                        await api.post('/auth/change-password', { newPassword: newPwd });
                                        alert('Contraseña actualizada con éxito');
                                        e.target.reset();
                                    } catch (err) {
                                        alert('Error al actualizar la contraseña');
                                    }
                                }}
                                className="mt-4 space-y-3 p-1"
                            >
                                <input
                                    name="pwd"
                                    type="password"
                                    placeholder="Nueva contraseña"
                                    className="w-full bg-white border border-gray-200 p-3 rounded-xl text-sm text-[#111b21] focus:outline-none focus:border-[#00a884] shadow-inner"
                                />
                                <button
                                    type="submit"
                                    className="w-full bg-white hover:bg-gray-50 text-[#54656f] text-[10px] font-bold py-2.5 rounded-xl transition-all border border-gray-200 shadow-sm uppercase"
                                >
                                    Actualizar Credenciales
                                </button>
                            </form>
                        </details>
                    </div>
                </div>
            </div>

            {/* Background Decoration */}
            <Smartphone
                className={`absolute -bottom-12 -right-12 w-64 h-64 opacity-[0.03] rotate-[-20deg] pointer-events-none transition-colors duration-500 ${isConnected ? 'text-[#00a884]' : 'text-gray-400'}`}
            />
        </div>
    );
};
