import { prisma } from './db.service.js';

// Default Config Constants
const DEFAULT_CONFIG = {
    openaiApiKey: '',
    systemPrompt: 'Eres Neo, un asistente virtual profesional y útil.',
    temperature: 0.7,
    enableVision: false,
    enableAudio: true,
    enableAngerProtection: true,
    maxTokens: 150,
    memoryWindow: 10,
    businessContext: '',
    badWords: ['asqueroso', 'engañar', 'mentiroso'],
    enableRateLimit: true,
    rateLimit: { max: 10, window: 60 },
    businessHours: {
        enabled: false,
        start: '09:00',
        end: '18:00',
        message: '😴 Nuestros asesores duermen. Te escribiremos a las 8 AM.',
    },
    fallbackMessage: '🔧 Estamos ajustando nuestros sistemas de IA. Un asesor humano revisará tu mensaje pronto.',
    paymentMessage: 'Hola, te recordamos que tu pago vence pronto. Por favor realiza tu abono para continuar disfrutando del servicio.',
};

export class StoreService {
    constructor(userId) {
        this.userId = userId;
        this.botCache = null;
        this.configCache = null;
        this.cacheTTL = 5 * 60 * 1000; // 5 minutes
        this.lastFetch = 0;
    }

    // Helper to get or create the Bot record for this user
    async getBot(forceRefresh = false) {
        if (!this.userId) throw new Error('StoreService requires a userId');

        const now = Date.now();
        if (!forceRefresh && this.botCache && (now - this.lastFetch < this.cacheTTL)) {
            return this.botCache;
        }

        // We assume the User already exists (created by Auth Register)
        // Upsert ensures we have a Bot record
        const bot = await prisma.bot.upsert({
            where: { userId: this.userId },
            update: {},
            create: {
                userId: this.userId,
                config: JSON.stringify(DEFAULT_CONFIG),
                silencedChats: '[]',
            },
        });

        this.botCache = bot;
        this.lastFetch = now;
        // Invalidate config cache if bot record refreshed
        this.configCache = null;

        return bot;
    }

    // Configuration Methods
    async getConfig() {
        if (this.configCache) return this.configCache;

        const bot = await this.getBot();
        try {
            const currentConfig = JSON.parse(bot.config);
            // Merge with defaults to ensure new fields are present
            this.configCache = { ...DEFAULT_CONFIG, ...currentConfig };
            return this.configCache;
        } catch (e) {
            return DEFAULT_CONFIG;
        }
    }

    async updateConfig(newConfig) {
        const current = await this.getConfig();
        const updated = { ...current, ...newConfig };

        await prisma.bot.update({
            where: { userId: this.userId },
            data: { config: JSON.stringify(updated) },
        });

        // Invalidate Cache after update
        this.botCache = null;
        this.configCache = updated;
        this.lastFetch = Date.now();

        return updated;
    }

    // History Methods
    async getHistory(chatId, limit = 10) {
        const bot = await this.getBot();

        const messages = await prisma.message.findMany({
            where: {
                botId: bot.id,
                chatId: chatId
            },
            orderBy: { timestamp: 'asc' },
            take: -limit, // Take last N
        });

        // Map back to format expected by OpenAI service (role, content, timestamp)
        return messages.map(m => ({
            role: m.role,
            content: m.content,
            timestamp: m.timestamp.getTime(),
            status: m.status,
            whatsappId: m.whatsappId
        }));
    }

    // CRM: Full History Viewer (Paginated)
    async getMessages(chatId, page = 1, limit = 50) {
        const bot = await this.getBot();
        const skip = (page - 1) * limit;

        const [messages, total] = await Promise.all([
            prisma.message.findMany({
                where: {
                    botId: bot.id,
                    chatId: chatId
                },
                orderBy: { timestamp: 'desc' }, // Latest first for UI
                skip,
                take: limit,
            }),
            prisma.message.count({
                where: {
                    botId: bot.id,
                    chatId: chatId
                }
            })
        ]);

        return {
            data: messages.reverse(), // Send chronological to UI (oldest at top)
            total,
            page,
            limit
        };
    }
    async addMessage(chatId, role, content, isBroadcast = false, isManual = false, whatsappId = null, status = 'SENT', isReminder = false, mediaUrl = null, mediaType = null) {
        const bot = await this.getBot();

        const newMessage = await prisma.message.create({
            data: {
                botId: bot.id,
                chatId: chatId,
                role: role,
                content,
                timestamp: new Date(),
                isBroadcast,
                isManual,
                isReminder,
                status,
                whatsappId,
                hasMedia: !!mediaUrl,
                mediaUrl,
                mediaType
            }
        });
        return newMessage;

        // Pruning old messages could be done here or via a cron job
        // For simplified local SQLite, we'll skip complex pruning for now
        // or implement a simple check if needed.
    }

    async updateMessageStatus(whatsappId, status) {
        const bot = await this.getBot();
        await prisma.message.updateMany({
            where: {
                botId: bot.id,
                whatsappId: whatsappId
            },
            data: { status }
        });
    }

    // Silenced Chats (Handoff)
    async isSilenced(chatId) {
        const bot = await this.getBot();

        // Check Client table first
        const client = await prisma.client.findUnique({
            where: {
                botId_chatId: {
                    botId: bot.id,
                    chatId: chatId
                }
            }
        });

        if (client) {
            // Check for Permanent Pause
            if (client.isBotPaused) return true;

            // Check for Temporary Pause (Timer)
            if (client.botPausedUntil && new Date() < new Date(client.botPausedUntil)) {
                return true;
            }

            return false;
        }

        try {
            const silencedList = JSON.parse(bot.silencedChats || '[]');
            return silencedList.includes(chatId);
        } catch (e) {
            return false;
        }
    }

    async getClientStatus(chatId) {
        const bot = await this.getBot();
        const client = await prisma.client.findUnique({
            where: { botId_chatId: { botId: bot.id, chatId } }
        });
        return {
            isBotPaused: client?.isBotPaused || false,
            botPausedUntil: client?.botPausedUntil || null
        };
    }

    async setSilence(chatId, statusOrType, durationMinutes = null) {
        const bot = await this.getBot();

        // Determine Logic
        let isPaused = false;
        let pausedUntil = null;

        // "true" legacy or "PERMANENT"
        if (statusOrType === true || statusOrType === 'PERMANENT') {
            isPaused = true;
            pausedUntil = null;
        }
        // "TEMPORARY" with duration
        else if (statusOrType === 'TEMPORARY' && durationMinutes) {
            isPaused = false;
            pausedUntil = new Date(Date.now() + durationMinutes * 60 * 1000);
        }
        // "false" legacy or "ON"
        else if (statusOrType === false || statusOrType === 'ON') {
            isPaused = false;
            pausedUntil = null;
        }

        // Update Client Record
        await prisma.client.upsert({
            where: {
                botId_chatId: {
                    botId: bot.id,
                    chatId: chatId
                }
            },
            update: {
                isBotPaused: isPaused,
                botPausedUntil: pausedUntil
            },
            create: {
                botId: bot.id,
                chatId: chatId,
                isBotPaused: isPaused,
                botPausedUntil: pausedUntil,
                name: 'Cliente Nuevo'
            }
        });

        return { isBotPaused: isPaused, botPausedUntil: pausedUntil };
    }




    // Reminders
    async addReminder(chatId, timestamp, recurrenceDays = null) {
        const bot = await this.getBot();

        const reminder = await prisma.reminder.create({
            data: {
                botId: bot.id,
                chatId,
                dueDate: new Date(timestamp),
                recurrenceDays,
            }
        });

        const recurrenceInfo = recurrenceDays ? ` (recurring every ${recurrenceDays} days)` : '';
        console.log(`Reminder scheduled for ${chatId} at ${new Date(timestamp).toLocaleString()}${recurrenceInfo}`);
        return reminder.id;
    }

    async getDueReminders() {
        const bot = await this.getBot();
        const now = new Date();

        const reminders = await prisma.reminder.findMany({
            where: {
                botId: bot.id,
                dueDate: { lte: now }
            }
        });

        // Map to expected format (msg needs ID, chatId, timestamp as number)
        return reminders.map(r => ({
            id: r.id,
            chatId: r.chatId,
            timestamp: r.dueDate.getTime()
        }));
    }

    async removeReminder(id) {
        try {
            await prisma.reminder.delete({ where: { id } });
        } catch (e) {
            // Ignore if already deleted
        }
    }

    async deleteRemindersByChatId(chatId) {
        const bot = await this.getBot();
        const result = await prisma.reminder.deleteMany({
            where: {
                botId: bot.id,
                chatId
            }
        });
        console.log(`Deleted ${result.count} reminder(s) for ${chatId}`);
        return result.count;
    }

    // Obtener el último chat activo del usuario (Bot)
    async getLastActiveChat(excludeChatId = null) {
        if (!this.userId) return null;

        const bot = await this.getBot();

        const whereConditions = {
            botId: bot.id,
            AND: [
                { NOT: { chatId: { contains: '@lid' } } },
                { NOT: { chatId: { contains: 'status' } } },
                { NOT: { chatId: { contains: 'broadcast' } } }
            ]
        };

        if (excludeChatId) {
            whereConditions.AND.push({ chatId: { not: excludeChatId } });
        }

        // Find last message (sent or received)
        // NOT LID, NOT STATUS, NOT BROADCAST
        const lastMsg = await prisma.message.findFirst({
            where: whereConditions,
            orderBy: { timestamp: 'desc' },
            select: { chatId: true, timestamp: true }
        });

        if (!lastMsg) return null;

        // Return only if recent (< 24h)
        const msgTime = new Date(Number(lastMsg.timestamp)).getTime();
        const diff = Date.now() - msgTime;
        if (diff > 24 * 60 * 60 * 1000) return null;

        return lastMsg.chatId;
    }
}

// Export a factory or keep the singleton pattern?
// Usage in session.manager.js: const store = new StoreService(userId);
// Usage in other files (like api.controller): import { storeService } from ...
// We need to support both "singleton" (for default fallback?) and per-user instances.
// However, the singleton `storeService` export was used mainly for the single-tenant version.
// We should check usages of `storeService` export.
export const storeService = new StoreService('default');

