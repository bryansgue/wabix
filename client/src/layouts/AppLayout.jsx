import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthProvider';
import {
    LayoutDashboard, Users, Shield, LogOut, Bot,
    ChevronLeft, ChevronRight, Menu, X, Zap,
    Settings, CreditCard
} from 'lucide-react';
import clsx from 'clsx';

const NAV_ITEMS = [
    {
        path: '/app',
        label: 'Dashboard',
        icon: LayoutDashboard,
        roles: ['admin', 'user'],
    },
    {
        path: '/app/clients',
        label: 'Clientes',
        icon: Users,
        roles: ['admin', 'user'],
    },
    {
        path: '/app/admin',
        label: 'Administración',
        icon: Shield,
        roles: ['admin'],
    },
];

export const AppLayout = () => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    const userRole = user?.role?.toLowerCase() || 'user';

    const filteredNav = NAV_ITEMS.filter((item) =>
        item.roles.includes(userRole)
    );

    const isActive = (path) => {
        if (path === '/app') return location.pathname === '/app';
        return location.pathname.startsWith(path);
    };

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    // Get plan info
    const getPlanBadge = () => {
        const plan = user?.planType || 'none';
        const badges = {
            prueba: { label: 'Trial', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
            starter: { label: 'Esencial', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
            infinito: { label: 'Infinito', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
            business: { label: 'Business', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
            admin: { label: 'Admin', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
            none: { label: 'Sin Plan', color: 'bg-white/10 text-slate-400 border-white/10' },
        };
        return badges[plan] || badges.none;
    };

    const planBadge = getPlanBadge();

    const SidebarContent = () => (
        <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="p-4 border-b border-white/5">
                <Link to="/" className="flex items-center gap-3">
                    <div className="bg-gradient-to-tr from-emerald-500 to-cyan-500 p-2 rounded-xl shrink-0">
                        <Bot size={20} className="text-white" />
                    </div>
                    {!collapsed && (
                        <span className="text-lg font-black tracking-tight text-white">
                            Huao<span className="text-emerald-400">.cloud</span>
                        </span>
                    )}
                </Link>
            </div>

            {/* User Info */}
            <div className={clsx('p-4 border-b border-white/5', collapsed && 'px-2')}>
                <div className={clsx('flex items-center gap-3', collapsed && 'justify-center')}>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/30 to-cyan-500/30 border border-emerald-500/20 flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-emerald-400">
                            {user?.username?.charAt(0)?.toUpperCase() || 'U'}
                        </span>
                    </div>
                    {!collapsed && (
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-white truncate">{user?.username}</p>
                            <span className={clsx('inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full border', planBadge.color)}>
                                {planBadge.label}
                            </span>
                        </div>
                    )}
                </div>

                {/* Credits */}
                {!collapsed && user?.remainingCredits !== undefined && userRole !== 'admin' && (
                    <div className="mt-3 bg-white/5 rounded-lg p-2.5">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="text-slate-400 flex items-center gap-1">
                                <Zap size={12} className="text-yellow-400" />
                                Créditos
                            </span>
                            <span className="text-white font-bold">
                                {user.remainingCredits} / {user.monthlyLimit || '∞'}
                            </span>
                        </div>
                        {user.monthlyLimit > 0 && (
                            <div className="w-full bg-white/5 rounded-full h-1.5">
                                <div
                                    className="bg-gradient-to-r from-emerald-500 to-cyan-500 h-1.5 rounded-full transition-all"
                                    style={{
                                        width: `${Math.min(100, (user.remainingCredits / user.monthlyLimit) * 100)}%`,
                                    }}
                                ></div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-3 space-y-1">
                {filteredNav.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            onClick={() => setMobileOpen(false)}
                            className={clsx(
                                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                                active
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5',
                                collapsed && 'justify-center px-2'
                            )}
                            title={collapsed ? item.label : undefined}
                        >
                            <Icon size={20} className="shrink-0" />
                            {!collapsed && <span>{item.label}</span>}
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom Section */}
            <div className="p-3 border-t border-white/5 space-y-1">
                <button
                    onClick={handleLogout}
                    className={clsx(
                        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all w-full',
                        collapsed && 'justify-center px-2'
                    )}
                    title={collapsed ? 'Cerrar Sesión' : undefined}
                >
                    <LogOut size={20} className="shrink-0" />
                    {!collapsed && <span>Cerrar Sesión</span>}
                </button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#020617] flex">
            {/* Desktop Sidebar */}
            <aside
                className={clsx(
                    'hidden lg:flex flex-col border-r border-white/5 bg-[#0f172a] transition-all duration-300 sticky top-0 h-screen',
                    collapsed ? 'w-[72px]' : 'w-[260px]'
                )}
            >
                <SidebarContent />

                {/* Collapse Toggle */}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="absolute -right-3 top-20 bg-[#0f172a] border border-white/10 rounded-full p-1 hover:bg-white/10 transition-colors z-10"
                >
                    {collapsed ? (
                        <ChevronRight size={14} className="text-slate-400" />
                    ) : (
                        <ChevronLeft size={14} className="text-slate-400" />
                    )}
                </button>
            </aside>

            {/* Mobile Overlay */}
            {mobileOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
                    onClick={() => setMobileOpen(false)}
                ></div>
            )}

            {/* Mobile Sidebar */}
            <aside
                className={clsx(
                    'lg:hidden fixed top-0 left-0 h-full w-[260px] bg-[#0f172a] border-r border-white/5 z-50 transform transition-transform duration-300',
                    mobileOpen ? 'translate-x-0' : '-translate-x-full'
                )}
            >
                <SidebarContent />
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 min-w-0">
                {/* Mobile Header */}
                <div className="lg:hidden sticky top-0 z-30 bg-[#020617]/80 backdrop-blur-xl border-b border-white/5">
                    <div className="flex items-center justify-between px-4 h-14">
                        <button
                            onClick={() => setMobileOpen(true)}
                            className="text-slate-400 hover:text-white"
                        >
                            <Menu size={24} />
                        </button>
                        <Link to="/" className="flex items-center gap-2">
                            <div className="bg-gradient-to-tr from-emerald-500 to-cyan-500 p-1.5 rounded-lg">
                                <Bot size={16} className="text-white" />
                            </div>
                            <span className="text-sm font-bold text-white">
                                Huao<span className="text-emerald-400">.cloud</span>
                            </span>
                        </Link>
                        <div className="w-6"></div>
                    </div>
                </div>

                {/* Page Content */}
                <Outlet />
            </main>
        </div>
    );
};
