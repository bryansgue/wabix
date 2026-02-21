import rateLimit from 'express-rate-limit';
import { rateLimitConfig } from '../services/auth.service.js';

// Limitador general para la API (Estático por ahora, menos crítico)
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        status: 429,
        error: 'Too many requests, please try again later.'
    }
});

// Cache del limitador dinámico
let cachedLimiter = null;
let lastConfigHash = '';

const createAuthLimiter = (attempts, minutes) => {
    return rateLimit({
        windowMs: minutes * 60 * 1000,
        max: attempts,
        standardHeaders: true,
        legacyHeaders: false,
        message: {
            status: 429,
            error: `Too many login attempts. Please try again after ${minutes} minute(s).`
        }
    });
};

// Middleware Wrapper Dinámico 
// NOTA: express-rate-limit v7+ prohíbe crear instancias dentro de un handler.
// Por ahora, usaremos un limitador con valores base y lo recrearemos solo si es estrictamente necesario,
// pero inicializado al menos una vez fuera del flujo si es posible.

cachedLimiter = createAuthLimiter(rateLimitConfig.loginAttempts, rateLimitConfig.windowMinutes);
lastConfigHash = `${rateLimitConfig.loginAttempts}-${rateLimitConfig.windowMinutes}`;

export const authLimiter = (req, res, next) => {
    // 1. Check if disabled globally
    if (!rateLimitConfig.enabled) {
        return next();
    }

    // 2. Delegate to actual limiter
    return cachedLimiter(req, res, next);
};
