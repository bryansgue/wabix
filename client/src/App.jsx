import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthProvider';
import { RequireAuth } from './components/RequireAuth';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { AdminPage } from './pages/AdminPage';
import { ClientsPage } from './pages/ClientsPage';
import { LandingPage } from './pages/LandingPage';
import { AppLayout } from './layouts/AppLayout';

import ErrorBoundary from './components/ErrorBoundary';

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <ErrorBoundary>
                    <Routes>
                        {/* Public Routes */}
                        <Route path="/" element={<LandingPage />} />
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/register" element={<RegisterPage />} />

                        {/* Protected App Routes (SaaS Workspace) */}
                        <Route
                            path="/app"
                            element={
                                <RequireAuth>
                                    <AppLayout />
                                </RequireAuth>
                            }
                        >
                            <Route index element={<DashboardPage />} />
                            <Route path="clients" element={<ClientsPage />} />
                            <Route path="admin" element={<AdminPage />} />
                        </Route>

                        {/* Legacy redirects */}
                        <Route path="/clients" element={<Navigate to="/app/clients" replace />} />
                        <Route path="/admin" element={<Navigate to="/app/admin" replace />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </ErrorBoundary>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
