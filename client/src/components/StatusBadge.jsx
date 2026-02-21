import React from 'react';
import clsx from 'clsx';

export const StatusBadge = ({ status }) => {
    const styles = {
        connected: 'bg-accent-wa-teal text-white',
        disconnected: 'bg-wa-danger text-white',
        scantocan: 'bg-yellow-500 text-black',
    };

    const labels = {
        connected: 'ONLINE',
        disconnected: 'OFFLINE',
        scantocan: 'ESPERANDO QR',
    };

    return (
        <span
            className={clsx(
                'px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase shadow-sm transition-all',
                styles[status] || styles.disconnected,
            )}
        >
            {labels[status] || status}
        </span>
    );
};
