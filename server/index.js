// CRITICAL: Validate environment variables FIRST before any other imports
import './src/config/validate-env.js';

import express from 'express';


// --- LOG SUPPRESSOR ---
// Filter out noisy libsignal errors that don't affect functionality
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleInfo = console.info;

const shouldSuppress = (msg) => {
    if (typeof msg !== 'string') return false;
    return (
        msg.includes('Bad MAC') ||
        msg.includes('Session error') ||
        msg.includes('prekey bundle') ||
        msg.includes('Closing open session') ||
        msg.includes('Failed to decrypt message') ||
        msg.includes('Closing session') ||
        msg.includes('Opening session') ||
        msg.includes('Session already') ||
        msg.includes('Decrypted message with')
    );
};

console.error = function (msg, ...args) {
    if (shouldSuppress(msg)) return;
    originalConsoleError.apply(console, [msg, ...args]);
};

console.warn = function (msg, ...args) {
    if (shouldSuppress(msg)) return;
    originalConsoleWarn.apply(console, [msg, ...args]);
};

console.info = function (msg, ...args) {
    if (shouldSuppress(msg)) return;
    originalConsoleInfo.apply(console, [msg, ...args]);
};

// --- GLOBAL ERROR HANDLERS (Bypass Suppressor) ---
process.on('uncaughtException', (err) => {
    originalConsoleError.apply(console, ['❌ CRITICAL UNCAUGHT EXCEPTION:', err]);
    originalConsoleError.apply(console, ['Stack:', err.stack]);

    // Attempt graceful shutdown before forcing exit
    gracefulShutdown('uncaughtException')
        .catch((shutdownErr) => {
            originalConsoleError.apply(console, ['Error during emergency shutdown:', shutdownErr]);
        })
        .finally(() => {
            process.exit(1);
        });
});

process.on('unhandledRejection', (reason, promise) => {
    originalConsoleError.apply(console, ['❌ CRITICAL UNHANDLED REJECTION at:', promise]);
    originalConsoleError.apply(console, ['Reason:', reason]);

    // Attempt graceful shutdown before forcing exit
    gracefulShutdown('unhandledRejection')
        .catch((shutdownErr) => {
            originalConsoleError.apply(console, ['Error during emergency shutdown:', shutdownErr]);
        })
        .finally(() => {
            process.exit(1);
        });
});
// ----------------------
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './src/config/env.js';
import { whatsappService } from './src/services/whatsapp.service.js';
import { storeService } from './src/services/store.service.js';
import apiRoutes from './src/routes/api.routes.js';
// Initialize Services (Multi-Tenant)
import { sessionManager } from './src/services/session.manager.js';
import { authService } from './src/services/auth.service.js';
import { cleanupService } from './src/services/cleanup.service.js';
import { dbService } from './src/services/db.service.js'; // Added import for DB shutdown
import { ALLOWED_ORIGINS } from './src/config/validate-env.js'; // Import allowed origins
import { apiLimiter } from './src/middleware/rate-limit.middleware.js'; // Rate Limit


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set('trust proxy', 1); // Trust first proxy (Caddy/Cloudflare)
const server = http.createServer(app);

// Parse allowed origins from env validator
const allowedOrigins = ALLOWED_ORIGINS
    ? ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
    : ['http://localhost:3000'];

// CORS Validator
const corsOriginValidator = (origin, callback) => {
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
        callback(null, true);
    } else {
        console.warn(`warning CORS blocked origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
    }
};

const io = new Server(server, {
    cors: {
        origin: corsOriginValidator,
        credentials: true,
        methods: ['GET', 'POST'],
    },
});

// Middleware
app.use(cors({
    origin: corsOriginValidator,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Routes
// Apply global rate limiting to all API routes
app.use('/api', apiLimiter, apiRoutes);

// Serve Uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// Serve Static Frontend (Production)
if (process.env.NODE_ENV === 'production') {
    const publicPath = path.join(__dirname, 'public');
    app.use(express.static(publicPath));

    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api')) return next();
        res.sendFile(path.join(publicPath, 'index.html'));
    });
}

// Ensure Default Admin Exists
authService.ensureDefaultUser().then(() => {
    sessionManager.init(io);
    sessionManager.restoreSessions(); // Auto-start all bots

    // Start Data Retention Scheduler
    cleanupService.startScheduler();
});

console.log('Session Manager Initialized');

// Start Server
server.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
});

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

let isShuttingDown = false;

const gracefulShutdown = async (signal) => {
    if (isShuttingDown) {
        console.log(`Already shutting down, ignoring ${signal}`);
        return;
    }

    isShuttingDown = true;
    console.log(`\n${signal} received. Starting graceful shutdown...`);

    // Set timeout for forced shutdown (30 seconds)
    const forceShutdownTimeout = setTimeout(() => {
        console.error('❌ Graceful shutdown timeout. Forcing exit...');
        process.exit(1);
    }, 30000);

    try {
        // 1. Stop accepting new HTTP connections
        console.log('1/5 Closing HTTP server...');
        await new Promise((resolve) => {
            server.close(() => {
                console.log('✅ HTTP server closed');
                resolve();
            });
        });

        // 2. Close all WhatsApp sessions
        console.log('2/5 Closing WhatsApp sessions...');
        await sessionManager.shutdownAll();
        console.log('✅ WhatsApp sessions closed');

        // 3. Stop cleanup scheduler
        console.log('3/5 Stopping cleanup scheduler...');
        if (cleanupService && typeof cleanupService.stop === 'function') {
            cleanupService.stop();
            console.log('✅ Cleanup scheduler stopped');
        }

        // 4. Close Socket.IO connections
        console.log('4/5 Closing Socket.IO connections...');
        await new Promise((resolve) => {
            io.close(() => {
                console.log('✅ Socket.IO closed');
                resolve();
            });
        });

        // 5. Disconnect from database
        console.log('5/5 Disconnecting from database...');
        await dbService.disconnect();
        console.log('✅ Database disconnected');

        clearTimeout(forceShutdownTimeout);
        console.log('✅ Graceful shutdown complete');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during graceful shutdown:', error);
        clearTimeout(forceShutdownTimeout);
        process.exit(1);
    }
};

// Register signal handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

console.log('✅ Graceful shutdown handlers registered');
