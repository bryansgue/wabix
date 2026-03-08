import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
});

// Add interceptor to inject token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Auth
export const login = (credentials) => api.post('/auth/login', credentials);
export const register = (data) => api.post('/auth/register', data);
export const getSettings = () => api.get('/auth/settings');

// Clients (CRM)
export const getClients = (params) => api.get('/clients', { params });
export const updateClient = (id, data) => api.put(`/clients/${id}`, data);
export const deleteClient = (id) => api.delete(`/clients/${id}`);
export const bulkDeleteClients = (criteria) => api.post('/clients/bulk-delete', criteria);
export const getClientMessages = (chatId, params) => api.get(`/clients/${chatId}/messages`, { params });
export const createReminder = (chatId, data) => api.post(`/clients/${chatId}/reminders`, data);
export const deleteReminders = (chatId) => api.delete(`/clients/${chatId}/reminders`);
export const sendBroadcast = (formData) => api.post('/clients/broadcast', formData);
export const sendManualMessage = (chatId, data) => {
    if (typeof data === 'string') {
        return api.post(`/clients/${chatId}/send`, { message: data });
    }
    return api.post(`/clients/${chatId}/send`, data);
};

export const toggleBotPause = (chatId, paused, duration) =>
    api.post(`/clients/${chatId}/toggle-bot`, { paused, duration });

// States
export const fetchStates = () => api.get('/states');
export const createState = (payload) => api.post('/states', payload);
export const updateStateRequest = (id, payload) => api.put(`/states/${id}`, payload);
export const reorderStates = (order) => api.post('/states/reorder', { order });
export const deleteStateRequest = (id) => api.delete(`/states/${id}`);

// Tags
export const fetchTags = () => api.get('/tags');
export const createTagRequest = (payload) => api.post('/tags', payload);
export const updateTagRequest = (id, payload) => api.put(`/tags/${id}`, payload);
export const deleteTagRequest = (id) => api.delete(`/tags/${id}`);
export const updateClientTags = (clientId, tagIds) => api.put(`/clients/${clientId}/tags`, { tagIds });

// Config
export const fetchConfig = async () => {
    const { data } = await api.get('/config');
    return data;
};

export const saveConfig = async (config) => {
    const { data } = await api.post('/config', config);
    return data;
};

export default api;
