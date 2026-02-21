import { useState, useEffect } from 'react';
import { fetchConfig, saveConfig } from '../services/api';

export const useConfig = () => {
    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        try {
            setLoading(true);
            const data = await fetchConfig();
            setConfig(data);
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    const updateConfig = async (newConfig) => {
        try {
            // Optimistic update
            setConfig((prev) => ({ ...prev, ...newConfig }));
            await saveConfig(newConfig);
        } catch (err) {
            setError(err);
            await loadConfig(); // Revert on error
        }
    };

    return { config, updateConfig, loading, error };
};
