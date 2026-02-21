import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from './db.service.js';
import { JWT_SECRET } from '../config/validate-env.js';


class AuthService {
    async getSettings() {
        try {
            let settings = await prisma.systemSettings.findUnique({
                where: { id: 'singleton' }
            });

            if (!settings) {
                // Initialize default settings if not exists
                settings = await prisma.systemSettings.create({
                    data: {
                        id: 'singleton',
                        allowRegistration: true,
                        businessContact: '',
                        priceMonthly: '0',
                        priceQuarterly: '0',
                        priceAnnual: '0',
                        openaiLink: 'https://openai.com',
                        facebookLink: 'https://facebook.com/autobot',
                        credits: 'AutoBOT AI © 2026',
                        rateLimitEnabled: true,
                        maxLoginAttempts: 5,
                        loginWindowMinutes: 60
                    }
                });
            }
            return settings;
        } catch (error) {
            console.error('[AuthService] Error fetching settings:', error);
            return { allowRegistration: true };
        }
    }

    async updateSettings(data) {
        try {
            const settings = await prisma.systemSettings.upsert({
                where: { id: 'singleton' },
                update: {
                    allowRegistration: data.allowRegistration !== undefined ? data.allowRegistration : undefined,
                    businessContact: data.businessContact !== undefined ? data.businessContact : undefined,
                    priceMonthly: data.priceMonthly !== undefined ? data.priceMonthly : undefined,
                    priceQuarterly: data.priceQuarterly !== undefined ? data.priceQuarterly : undefined,
                    priceAnnual: data.priceAnnual !== undefined ? data.priceAnnual : undefined,
                    openaiLink: data.openaiLink !== undefined ? data.openaiLink : undefined,
                    facebookLink: data.facebookLink !== undefined ? data.facebookLink : undefined,
                    credits: data.credits !== undefined ? data.credits : undefined,
                    // Security
                    rateLimitEnabled: data.rateLimitEnabled !== undefined ? data.rateLimitEnabled : undefined,
                    maxLoginAttempts: typeof data.maxLoginAttempts === 'number' ? data.maxLoginAttempts : undefined,
                    loginWindowMinutes: typeof data.loginWindowMinutes === 'number' ? data.loginWindowMinutes : undefined
                },
                create: {
                    id: 'singleton',
                    ...data
                }
            });

            // Update in-memory config for middleware
            rateLimitConfig.enabled = settings.rateLimitEnabled;
            rateLimitConfig.loginAttempts = settings.maxLoginAttempts;
            rateLimitConfig.windowMinutes = settings.loginWindowMinutes;

            console.log('[Auth] System Settings Updated:', settings);
            return settings;
        } catch (error) {
            console.error('[AuthService] Error updating settings:', error);
            throw error;
        }
    }

    async register(username, password, role = 'user') {
        const settings = await this.getSettings();

        // Count users to determine if this is the first one (admin)
        const userCount = await prisma.user.count();
        if (userCount > 0 && !settings.allowRegistration) {
            throw new Error('Public registration is currently disabled.');
        }

        // Check if user exists
        const existingUser = await prisma.user.findUnique({ where: { username } });
        if (existingUser) {
            throw new Error('User already exists');
        }

        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Auto-assign admin role to the first user
        const isFirstUser = userCount === 0;
        const finalRole = isFirstUser ? 'admin' : (role === 'admin' ? 'admin' : 'prueba');

        // Set default 3-day expiration for non-admin users
        let expiresAt = null;
        let planType = 'none';

        if (!isFirstUser && finalRole !== 'admin') {
            expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 3);
            planType = 'prueba';
        }

        const newUser = await prisma.user.create({
            data: {
                username,
                passwordHash,
                role: finalRole,
                expiresAt,
                planType
            },
        });

        return { id: newUser.id, username: newUser.username, role: newUser.role };
    }

    async login(username, password) {
        const user = await prisma.user.findUnique({ where: { username } });
        if (!user) {
            throw new Error('Invalid credentials');
        }

        const match = await bcrypt.compare(password, user.passwordHash);
        if (!match) {
            throw new Error('Invalid credentials');
        }

        // Generate Token
        const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, {
            expiresIn: '7d',
        });

        return { token, user: { id: user.id, username: user.username, role: user.role } };
    }

    async verifyToken(token) {
        try {
            return jwt.verify(token, JWT_SECRET);
        } catch (err) {
            return null;
        }
    }

    async getAllUsers() {
        return await prisma.user.findMany({
            select: {
                id: true,
                username: true,
                role: true,
                createdAt: true,
                expiresAt: true,
                planType: true
            },
        });
    }

    async deleteUser(userId) {
        try {
            await prisma.user.delete({ where: { id: userId } });
            // Prisma Cascade delete handles Bot, Messages, etc.
            return { success: true };
        } catch (err) {
            if (err.code === 'P2025') {
                throw new Error('User not found');
            }
            throw err;
        }
    }

    async updateUser(userId, data) {
        try {
            const updatedUser = await prisma.user.update({
                where: { id: userId },
                data: {
                    username: data.username,
                    role: data.role,
                    expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
                    planType: data.planType,
                },
            });
            return {
                id: updatedUser.id,
                username: updatedUser.username,
                role: updatedUser.role,
                expiresAt: updatedUser.expiresAt,
                planType: updatedUser.planType
            };
        } catch (err) {
            if (err.code === 'P2025') {
                throw new Error('User not found');
            }
            throw err;
        }
    }

    async changePassword(userId, newPassword) {
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(newPassword, saltRounds);

        try {
            await prisma.user.update({
                where: { id: userId },
                data: { passwordHash },
            });
            return { success: true };
        } catch (err) {
            if (err.code === 'P2025') {
                throw new Error('User not found');
            }
            throw err;
        }
    }

    async ensureDefaultUser() {
        const userCount = await prisma.user.count();
        if (userCount === 0) {
            console.log('[Auth] No users found. Creating default admin...');
            const saltRounds = 10;
            const passwordHash = await bcrypt.hash('Yolismarlen20@', saltRounds);

            await prisma.user.create({
                data: {
                    username: 'Admin',
                    passwordHash,
                    role: 'admin'
                }
            });
            console.log('[Auth] Default user created: Admin / Yolismarlen20@');
        }

        // Initialize shared config
        await this.loadRateLimitConfig();
    }

    async loadRateLimitConfig() {
        try {
            const settings = await prisma.systemSettings.upsert({
                where: { id: 'singleton' },
                update: {},
                create: { id: 'singleton' }
            });

            // Update in-memory config for middleware
            rateLimitConfig.enabled = settings.rateLimitEnabled;
            rateLimitConfig.loginAttempts = settings.maxLoginAttempts;
            rateLimitConfig.windowMinutes = settings.loginWindowMinutes;

            console.log('[Auth] Rate Limit Config Loaded:', rateLimitConfig);
        } catch (error) {
            console.error('[Auth] Failed to load rate limit settings:', error);
        }
    }
}

// Shared In-Memory Configuration for Middleware
export const rateLimitConfig = {
    enabled: true,
    loginAttempts: 5,
    windowMinutes: 60
};

export const authService = new AuthService();
