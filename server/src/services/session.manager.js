import { authService } from './auth.service.js';
import { WhatsAppService } from './whatsapp.service.js';
import { StoreService } from './store.service.js';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/validate-env.js';


class SessionManager {
    constructor() {
        this.sessions = new Map(); // userId -> WhatsAppService instance
        this.initializingSessions = new Map(); // userId -> Promise
        this.io = null;
    }

    async restoreSessions() {
        console.log('[SessionManager] Restoring sessions for all users...');
        try {
            const users = await authService.getAllUsers();
            console.log(`[SessionManager] Found ${users.length} users. Starting staggered restore...`);

            // --- THUNDERING HERD PROTECTION ---
            // Process in chunks of 5 users
            const CHUNK_SIZE = 5;
            const DELAY_MS = 2000;

            for (let i = 0; i < users.length; i += CHUNK_SIZE) {
                const chunk = users.slice(i, i + CHUNK_SIZE);
                console.log(`[SessionManager] Processing chunk ${Math.floor(i / CHUNK_SIZE) + 1}/${Math.ceil(users.length / CHUNK_SIZE)} (${chunk.length} users)...`);

                // Start chunk in parallel
                await Promise.all(chunk.map(user => {
                    console.log(`[SessionManager] Auto-starting session for user: ${user.username} (${user.id})`);
                    return this.startSession(user.id).catch(err => {
                        console.error(`[SessionManager] Failed to restore session for ${user.username}:`, err);
                    });
                }));

                // Wait before next chunk (unless it's the last one)
                if (i + CHUNK_SIZE < users.length) {
                    console.log(`[SessionManager] Waiting ${DELAY_MS}ms before next chunk...`);
                    await new Promise(resolve => setTimeout(resolve, DELAY_MS));
                }
            }

            console.log('[SessionManager] All restore batches initiated.');
        } catch (error) {
            console.error('[SessionManager] Failed to restore sessions:', error);
        }
    }

    async shutdownAll() {
        console.log('[SessionManager] Shutting down all sessions...');
        const promises = [];

        for (const [userId, service] of this.sessions.entries()) {
            console.log(`[SessionManager] Closing session for user: ${userId}`);
            promises.push(
                service.logout().catch(err => {
                    console.error(`[SessionManager] Error closing session for ${userId}:`, err.message);
                })
            );
        }

        await Promise.all(promises);
        this.sessions.clear();
        console.log('[SessionManager] All sessions closed.');
    }

    // ... (rest of methods)

    init(io) {
        this.io = io;

        // Middleware for Socket Authentication
        this.io.use((socket, next) => {
            const token = socket.handshake.auth?.token;
            console.log(`[Socket] Handshake attempt. Token present: ${!!token}`);

            if (!token) {
                console.warn('[Socket] Connection rejected: No token provided');
                return next(new Error('Authentication error'));
            }

            try {
                // Verify Token
                const decoded = jwt.verify(token, JWT_SECRET);
                socket.user = decoded;
                console.log(`[Socket] Auth success for user: ${decoded.username}`);
                next();
            } catch (err) {
                console.error('[Socket] Auth failure:', err.message);
                next(new Error('Authentication error'));
            }
        });

        this.io.on('connection', (socket) => {
            console.log(`[Socket] Connection established: ${socket.user.username} (${socket.user.id})`);

            // Join User Room
            socket.join(socket.user.id);

            // Check if session exists
            let bot = this.sessions.get(socket.user.id);

            if (!bot) {
                console.log(`[Socket] Auto-starting session for ${socket.user.id}...`);
                // Auto-start session for the connected user
                // We use 'then' because we are inside a sync callback
                this.startSession(socket.user.id)
                    .then((newBot) => {
                        // Session started successfully
                    })
                    .catch((err) => {
                        console.error(`[Socket] Failed to auto-start session:`, err);
                    });
            } else {
                // Session exists, send current state immediately
                const status = bot.getStatus();
                socket.emit('status', status.status);
                socket.emit('qr', status.qr);
                if (bot.userInfo) socket.emit('connection_info', bot.userInfo);

                // Ensure it's connecting if it was paused for inactivity
                bot.ensureConnection();
            }

            socket.on('disconnect', () => {
                // console.log(`[Socket] Client disconnected: ${socket.user.username}`);
            });
        });
    }

    async startSession(userId) {
        // 1. Check if active session exists
        const existingSession = this.sessions.get(userId);
        if (existingSession) {
            // console.log(`[SessionManager] Session for ${userId} already active.`);
            return existingSession;
        }

        // 2. Check if initialization is already in progress
        const existingInit = this.initializingSessions.get(userId);
        if (existingInit) {
            console.log(`[SessionManager] Session for ${userId} is initializing... waiting.`);
            return existingInit;
        }

        console.log(`[SessionManager] Starting session for ${userId}...`);

        // 3. ATOMIC OPERATION: Create and store promise IMMEDIATELY
        // This reduces race condition window from ~35 lines to ~1ms
        const initPromise = this._initializeSession(userId);
        this.initializingSessions.set(userId, initPromise);

        return initPromise;
    }

    async _initializeSession(userId) {
        try {
            // Instantiate dedicated Store
            const userStore = new StoreService(userId);
            // await userStore.init(); // Not needed with Prisma

            // Instantiate dedicated WhatsApp Service
            const userBot = new WhatsAppService(userId, userStore);

            // Initialize Bot (Connects to WA)
            if (this.io) {
                await userBot.init(this.io);
            }

            // Store active session BEFORE cleanup
            this.sessions.set(userId, userBot);
            return userBot;
        } catch (error) {
            console.error(`[SessionManager] Error starting session for ${userId}:`, error);
            throw error;
        } finally {
            // Cleanup initialization lock
            this.initializingSessions.delete(userId);
        }
    }

    getSession(userId) {
        return this.sessions.get(userId);
    }

    async stopSession(userId) {
        const bot = this.sessions.get(userId);
        if (bot) {
            console.log(`[SessionManager] Stopping session for ${userId}...`);
            await bot.logout(); // Reuse logout logic to clean up connection
            this.sessions.delete(userId);
        }
    }

    getAllActiveSessions() {
        return Array.from(this.sessions.keys());
    }
}

export const sessionManager = new SessionManager();
