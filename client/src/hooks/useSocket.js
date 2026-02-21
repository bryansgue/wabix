import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.DEV ? '/' : '/';

export const useSocket = (token) => {
    const [status, setStatus] = useState('disconnected');
    const [qr, setQr] = useState('');
    const [userInfo, setUserInfo] = useState(null);
    const [socketInstance, setSocketInstance] = useState(null);

    useEffect(() => {
        if (!token) return;

        const socket = io(SOCKET_URL, {
            auth: { token },
        });

        setSocketInstance(socket);

        socket.on('connect', () => {
            console.log('Connected to WS server');
        });

        socket.on('status', (s) => setStatus(s));
        socket.on('qr', (q) => setQr(q));
        socket.on('connection_info', (info) => setUserInfo(info));

        socket.on('connect_error', (err) => {
            console.error('Socket Connection Error:', err.message);
        });

        return () => socket.disconnect();
    }, [token]);

    return { status, qr, userInfo, socket: socketInstance };
};
