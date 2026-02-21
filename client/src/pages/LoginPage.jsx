import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthProvider';
import { Bot, User, Lock, ArrowRight, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export const LoginPage = () => {
    const { login, register } = useAuth();
    const navigate = useNavigate();
    const [isLogin, setIsLogin] = useState(true);
    const [allowRegister, setAllowRegister] = useState(true);
    const [formData, setFormData] = useState({ username: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Check if registration is allowed
        api
            .get('/auth/settings')
            .then((res) => setAllowRegister(res.data.allowRegistration))
            .catch(() => setAllowRegister(true));
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const action = isLogin ? login : register;
        const res = await action(formData.username, formData.password);

        if (res.success) {
            navigate('/'); // Redirect to Dashboard
        } else {
            setError(res.error);
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-wa-dark flex items-center justify-center p-4 relative overflow-hidden">
            {/* Ambient Background Effects (Rich for dark mode) */}
            <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-[#00a884]/10 rounded-full blur-[100px] animate-pulse-slow"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] animate-pulse-slow delay-700"></div>

            <div className="bg-white w-full max-w-md p-10 rounded-[2.5rem] shadow-2xl relative z-10 animate-fadeIn border border-white/5 flex flex-col">
                {/* Header */}
                <div className="text-center mb-10">
                    <div className="w-20 h-20 bg-gradient-to-tr from-[#00a884] to-[#008069] rounded-3xl mx-auto flex items-center justify-center mb-6 shadow-xl shadow-[#00a884]/20 animate-float">
                        <Bot size={40} className="text-white" />
                    </div>
                    <h1 className="text-4xl font-black text-[#111b21] tracking-tighter mb-2">AutoBOT <span className="text-[#00a884]">AI</span></h1>
                    <p className="text-[#54656f] text-sm font-medium uppercase tracking-[0.2em]">SISTEMA NEURONAL V2.0</p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-bold text-center animate-slideDown flex items-center justify-center gap-2">
                            <span>⚠️</span> {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="relative group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#54656f] group-focus-within:text-[#00a884] transition-colors z-10">
                                <User size={20} />
                            </div>
                            <input
                                type="text"
                                placeholder="Usuario"
                                className="w-full bg-[#f8f9fa] border border-gray-100 pl-12 pr-4 py-4 rounded-2xl outline-none focus:border-[#00a884]/40 focus:bg-white focus:shadow-lg transition-all text-[#111b21] font-bold placeholder-[#54656f]/40"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                required
                            />
                        </div>
                        <div className="relative group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#54656f] group-focus-within:text-[#00a884] transition-colors z-10">
                                <Lock size={20} />
                            </div>
                            <input
                                type="password"
                                placeholder="Contraseña"
                                className="w-full bg-[#f8f9fa] border border-gray-100 pl-12 pr-4 py-4 rounded-2xl outline-none focus:border-[#00a884]/40 focus:bg-white focus:shadow-lg transition-all text-[#111b21] font-bold placeholder-[#54656f]/40"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#00a884] hover:bg-[#008069] text-white font-black tracking-widest py-4 rounded-2xl transition-all transform hover:scale-[1.01] active:scale-[0.98] shadow-xl shadow-[#00a884]/20 flex items-center justify-center gap-3 relative overflow-hidden group mt-4 uppercase text-xs"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <>
                                {isLogin ? 'INICIAR SESIÓN' : 'REGISTRARSE'}
                                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                        <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:animate-shine"></div>
                    </button>
                </form>

                {/* Toggle Mode */}
                {allowRegister && (
                    <div className="mt-10 text-center">
                        <button
                            onClick={() => {
                                setError('');
                                setIsLogin(!isLogin);
                            }}
                            className="text-[#54656f] hover:text-[#111b21] text-xs font-bold transition-colors flex items-center justify-center gap-2 mx-auto uppercase tracking-tighter"
                        >
                            {isLogin ? (
                                <>
                                    ¿No tienes cuenta?{' '}
                                    <span className="text-[#00a884] font-black hover:underline underline-offset-4">Regístrate</span>
                                </>
                            ) : (
                                <>
                                    ¿Ya tienes cuenta?{' '}
                                    <span className="text-[#00a884] font-black hover:underline underline-offset-4">Ingresa</span>
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>

            <div className="absolute bottom-6 text-center w-full text-[10px] uppercase font-black tracking-[0.3em] text-white/20">
                AutoBOT v2.0 • WhatsApp Neuronal Center
            </div>
        </div>
    );
};
