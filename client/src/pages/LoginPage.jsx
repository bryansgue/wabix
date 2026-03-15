import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthProvider';
import { Bot, User, Lock, ArrowRight, ArrowLeft } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';

export const LoginPage = () => {
    const { login, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ username: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isAuthenticated) {
            navigate('/app');
        }
    }, [isAuthenticated, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const res = await login(formData.username, formData.password);
        if (res.success) {
            navigate('/app');
        } else {
            setError(res.error);
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[100px]"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[100px]"></div>

            <div className="w-full max-w-md relative z-10">
                {/* Back to home */}
                <Link
                    to="/"
                    className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-white transition-colors mb-8"
                >
                    <ArrowLeft size={16} />
                    Volver al inicio
                </Link>

                <div className="bg-[#0f172a] border border-white/10 p-10 rounded-3xl shadow-2xl">
                    {/* Header */}
                    <div className="text-center mb-10">
                        <div className="w-16 h-16 bg-gradient-to-tr from-emerald-500 to-cyan-500 rounded-2xl mx-auto flex items-center justify-center mb-6 shadow-xl shadow-emerald-500/20">
                            <Bot size={32} className="text-white" />
                        </div>
                        <h1 className="text-3xl font-black text-white tracking-tight mb-2">
                            Iniciar Sesión
                        </h1>
                        <p className="text-slate-500 text-sm">
                            Accede a tu panel de control
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-bold text-center animate-slideDown">
                                ⚠️ {error}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                                    <User size={18} />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Usuario"
                                    className="w-full bg-white/5 border border-white/10 pl-12 pr-4 py-4 rounded-xl outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all text-white font-medium placeholder-slate-600"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                                    <Lock size={18} />
                                </div>
                                <input
                                    type="password"
                                    placeholder="Contraseña"
                                    className="w-full bg-white/5 border border-white/10 pl-12 pr-4 py-4 rounded-xl outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all text-white font-medium placeholder-slate-600"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold py-4 rounded-xl transition-all hover:shadow-lg hover:shadow-emerald-500/25 hover:scale-[1.01] active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    Iniciar Sesión
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Switch to Register */}
                    <div className="mt-8 text-center">
                        <span className="text-slate-500 text-sm">¿No tienes cuenta? </span>
                        <Link
                            to="/register"
                            className="text-emerald-400 hover:text-emerald-300 text-sm font-semibold transition-colors"
                        >
                            Regístrate Gratis
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};
