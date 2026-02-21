import React from 'react';
import { useAuth } from '../contexts/AuthProvider';
import { Navigate, useLocation } from 'react-router-dom';

export const RequireAuth = ({ children }) => {
    const { isAuthenticated, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="min-h-screen bg-wa-dark flex flex-col items-center justify-center space-y-4">
                <div className="w-12 h-12 border-4 border-accent-wa-teal/30 border-t-accent-wa-teal rounded-full animate-spin neon-glow"></div>
                <p className="text-accent-wa-teal font-bold tracking-widest animate-pulse">INICIANDO SISTEMA...</p>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return children;
};
