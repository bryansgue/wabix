import React from 'react';
import { useSocket } from '../hooks/useSocket';
import { ConnectionCard } from '../components/ConnectionCard';
import { ConfigForm } from '../components/ConfigForm';
import { useConfig } from '../hooks/useConfig';
import { LayoutDashboard, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthProvider';
import { Link } from 'react-router-dom';

export const DashboardPage = () => {
    const { logout, user, token } = useAuth();
    const { status, qr, userInfo } = useSocket(token);
    const { config } = useConfig();

    return (
        <div className="min-h-screen bg-wa-dark text-wa-primary font-sans selection:bg-accent-wa-teal selection:text-black pb-12 overflow-x-hidden relative">
            {/* Ambient Background Effects */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent-wa-teal/10 rounded-full blur-[100px] animate-pulse-slow"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[100px] animate-float"></div>
            </div>

            {/* Header */}
            <header className="sticky top-0 z-50 backdrop-blur-xl bg-wa-dark/70 border-b border-white/5">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="bg-gradient-to-tr from-accent-wa-teal to-blue-500 p-2.5 rounded-xl shadow-lg shadow-accent-wa-teal/20 animate-float">
                            <LayoutDashboard className="text-white w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="font-bold text-2xl tracking-tight text-white">
                                AutoBOT <span className="text-accent-wa-teal">AI</span>
                            </h1>
                            <p className="text-[10px] uppercase font-bold tracking-widest text-wa-secondary">
                                SISTEMA NEURONAL V2.0
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Status Dot */}
                        <div className="hidden md:flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/10 backdrop-blur-md">
                            <div
                                className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-green-500 neon-glow' : 'bg-red-500'}`}
                            ></div>
                            <span className="text-xs font-mono text-wa-secondary uppercase">
                                {status === 'connected' ? 'ONLINE' : 'OFFLINE'}
                            </span>
                        </div>

                        {/* Logout Button */}
                        <button
                            onClick={logout}
                            className="flex items-center gap-2 text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-2 rounded-lg transition-colors"
                        >
                            <LogOut size={16} />
                            <span className="hidden sm:inline">SALIR</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content Grid */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                    {/* Left Column: Identity & Connection */}
                    <div className="lg:col-span-4 lg:sticky lg:top-28">
                        <ConnectionCard status={status} qr={qr} userInfo={userInfo} user={user} model={config?.model} />
                    </div>

                    {/* Right Column: Control Center */}
                    <div className="lg:col-span-8 h-full">
                        <div className="flex justify-center items-stretch h-full">
                            <ConfigForm />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};
