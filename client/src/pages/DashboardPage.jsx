import { useSocket } from '../hooks/useSocket';
import { ConnectionCard } from '../components/ConnectionCard';
import { ConfigForm } from '../components/ConfigForm';
import { useConfig } from '../hooks/useConfig';
import { LayoutDashboard } from 'lucide-react';
import { useAuth } from '../contexts/AuthProvider';

export const DashboardPage = () => {
    const { user, token } = useAuth();
    const { status, qr, userInfo } = useSocket(token);
    const { config } = useConfig();

    return (
        <div className="min-h-screen bg-[#020617] text-slate-100 pb-12 overflow-x-hidden relative">
            {/* Ambient Background Effects */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/5 rounded-full blur-[100px]"></div>
            </div>

            {/* Page Header */}
            <div className="border-b border-white/5 bg-[#020617]/50 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-tr from-emerald-500 to-cyan-500 p-2.5 rounded-xl shadow-lg shadow-emerald-500/20">
                            <LayoutDashboard className="text-white w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="font-bold text-xl tracking-tight text-white">Dashboard</h1>
                            <p className="text-xs text-slate-500">Panel de control de tu bot</p>
                        </div>
                        {/* Status Dot */}
                        <div className="ml-auto flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                            <div
                                className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-green-500' : 'bg-red-500'}`}
                            ></div>
                            <span className="text-xs font-mono text-slate-400 uppercase">
                                {status === 'connected' ? 'ONLINE' : 'OFFLINE'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                    {/* Left Column: Identity & Connection */}
                    <div className="lg:col-span-4 lg:sticky lg:top-8">
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
