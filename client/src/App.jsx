import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthProvider';
import { RequireAuth } from './components/RequireAuth';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { AdminPage } from './pages/AdminPage';
import { ClientsPage } from './pages/ClientsPage';

import ErrorBoundary from './components/ErrorBoundary';

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <ErrorBoundary>
                    <Routes>
                        <Route path="/login" element={<LoginPage />} />
                        <Route
                            path="/"
                            element={
                                <RequireAuth>
                                    <DashboardPage />
                                </RequireAuth>
                            }
                        />
                        <Route
                            path="/admin"
                            element={
                                <RequireAuth>
                                    <AdminPage />
                                </RequireAuth>
                            }
                        />
                        <Route
                            path="/clients"
                            element={
                                <RequireAuth>
                                    <ClientsPage />
                                </RequireAuth>
                            }
                        />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </ErrorBoundary>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
