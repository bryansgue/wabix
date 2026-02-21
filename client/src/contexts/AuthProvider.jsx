import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    // Configure global axios defaults and hydrate user
    useEffect(() => {
        const initAuth = async () => {
            if (token) {
                localStorage.setItem('token', token);

                try {
                    const res = await api.get('/auth/me');
                    setUser(res.data);
                } catch (error) {
                    console.error('Failed to hydrate user', error);
                    logout();
                }
            } else {
                localStorage.removeItem('token');
                setUser(null);
            }
            setLoading(false);
        };

        initAuth();
    }, [token]);

    const login = async (username, password) => {
        try {
            const res = await api.post('/auth/login', { username, password });
            setToken(res.data.token);
            setUser(res.data.user);
            return { success: true };
        } catch (error) {
            console.error('Login error details:', error);
            const msg = error.response?.data?.error || error.message || 'Login failed';
            return { success: false, error: msg };
        }
    };

    const register = async (username, password) => {
        try {
            await api.post('/auth/register', { username, password });
            return await login(username, password);
        } catch (error) {
            return { success: false, error: error.response?.data?.error || 'Registration failed' };
        }
    };

    const logout = () => {
        setToken(null);
        setUser(null);
    };

    const value = {
        user,
        token,
        login,
        register,
        logout,
        isAuthenticated: !!token,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
