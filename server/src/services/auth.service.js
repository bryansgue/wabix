import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from './db.service.js';
import { JWT_SECRET } from '../config/validate-env.js';
import { getDefaultExpirationDate, getInitialCredits, getPlanPolicy } from './plan.service.js';


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
                        priceMonthly: '19', // Adjusted for Starter/LATAM market
                        priceQuarterly: '49',
                        priceAnnual: '159',
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

        // Check if registration is allowed (only allows non-admin registration)
        if (!settings.allowRegistration) {
            throw new Error('Public registration is currently disabled.');
        }

        // Check if user exists
        const existingUser = await prisma.user.findUnique({ where: { username } });
        if (existingUser) {
            throw new Error('User already exists');
        }

        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Only 'user' role allowed via registration
        // Admin must exist by default or be created manually
        const finalRole = 'user';

        // Determine plan metadata for regular users
        let planType = 'prueba'; // All new users start as trial
        const planPolicy = getPlanPolicy(planType, finalRole);
        const initialCredits = getInitialCredits(planType, finalRole);

    const expiresAt = getDefaultExpirationDate(planType, finalRole);

        const newUser = await prisma.user.create({
            data: {
                username,
                passwordHash,
                role: finalRole,
                expiresAt,
                planType,
                remainingCredits: initialCredits,
                monthlyLimit: planPolicy.monthlyLimit ?? 0
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
        const users = await prisma.user.findMany({
            select: {
                id: true,
                username: true,
                role: true,
                createdAt: true,
                expiresAt: true,
                planType: true,
                monthlyLimit: true,
                remainingCredits: true
            },
        });

        return users.map((user) => {
            const policy = getPlanPolicy(user.planType || 'none', user.role || 'user');
            return {
                ...user,
                planLabel: policy.label,
                planDescription: policy.description,
                planUpgradeHint: policy.upgradeHint,
                planPriceUsd: policy.priceUsd,
                planBillingCycle: policy.billingCycle,
                planCurrency: policy.currency,
                planMonthlyLimit: policy.monthlyLimit,
                planQuotaType: policy.quotaType,
                planTrialDays: policy.trialDays ?? 0
            };
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
            const currentUser = await prisma.user.findUnique({
                where: { id: userId },
                select: { role: true, planType: true, monthlyLimit: true },
            });

            if (!currentUser) {
                throw Object.assign(new Error('User not found'), { code: 'P2025' });
            }

            const nextRole = data.role || currentUser.role;
            const updateData = {};
            if (data.username) updateData.username = data.username;
            if (data.role) updateData.role = data.role;
            if (data.expiresAt) updateData.expiresAt = new Date(data.expiresAt);
            if (data.planType) updateData.planType = data.planType;

            const planChanged = data.planType && data.planType !== currentUser.planType;

            if (data.planType) {
                const policy = getPlanPolicy(data.planType, nextRole);
                updateData.monthlyLimit = policy.monthlyLimit ?? 0;

                if (policy.quotaType === 'credits') {
                    updateData.remainingCredits = typeof data.remainingCredits === 'number'
                        ? data.remainingCredits
                        : policy.monthlyLimit ?? currentUser.monthlyLimit ?? 0;
                } else if (typeof data.remainingCredits === 'number') {
                    updateData.remainingCredits = data.remainingCredits;
                }

                if (planChanged && !data.expiresAt) {
                    updateData.expiresAt = getDefaultExpirationDate(data.planType, nextRole) ?? null;
                }
            }
            if (typeof data.remainingCredits === 'number' && !data.planType) {
                updateData.remainingCredits = data.remainingCredits;
            }

            const updatedUser = await prisma.user.update({
                where: { id: userId },
                data: updateData,
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
