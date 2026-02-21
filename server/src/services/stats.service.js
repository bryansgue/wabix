import { prisma } from './db.service.js';

export class StatsService {
    /**
     * Get comprehensive dashboard statistics for a bot
     */
    async getDashboardStats(botId) {
        const [
            messageStats,
            dailyActivity,
            topKeywords,
            broadcastStats
        ] = await Promise.all([
            this.getMessageStats(botId),
            this.getDailyActivity(botId, 7),
            this.getTopKeywords(botId, 5),
            this.getBroadcastStats(botId)
        ]);

        return {
            messages: messageStats,
            dailyActivity,
            topKeywords,
            broadcasts: broadcastStats,
            generatedAt: new Date().toISOString()
        };
    }

    /**
     * Get message statistics (total, by role, by type)
     */
    async getMessageStats(botId) {
        const messages = await prisma.message.findMany({
            where: { botId },
            select: {
                role: true,
                isBroadcast: true,
                isManual: true,
                isReminder: true,
                timestamp: true
            }
        });

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return {
            total: messages.length,
            userMessages: messages.filter(m => m.role === 'user').length,
            botMessages: messages.filter(m => m.role === 'assistant').length,
            broadcasts: messages.filter(m => m.isBroadcast).length,
            manual: messages.filter(m => m.isManual).length,
            reminders: messages.filter(m => m.isReminder).length,
            today: messages.filter(m => new Date(m.timestamp) >= today).length
        };
    }

    /**
     * Get daily message activity for the last N days
     */
    async getDailyActivity(botId, days = 7) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        startDate.setHours(0, 0, 0, 0);

        const messages = await prisma.message.findMany({
            where: {
                botId,
                timestamp: { gte: startDate }
            },
            select: {
                timestamp: true,
                role: true
            },
            orderBy: { timestamp: 'asc' }
        });

        // Group by date
        const activityMap = new Map();

        // Initialize all days with 0
        for (let i = 0; i < days; i++) {
            const date = new Date();
            date.setDate(date.getDate() - (days - 1 - i));
            const dateKey = date.toISOString().split('T')[0];
            activityMap.set(dateKey, { date: dateKey, total: 0, user: 0, bot: 0 });
        }

        // Count messages per day
        messages.forEach(msg => {
            const dateKey = msg.timestamp.toISOString().split('T')[0];
            const day = activityMap.get(dateKey);
            if (day) {
                day.total++;
                if (msg.role === 'user') day.user++;
                else day.bot++;
            }
        });

        return Array.from(activityMap.values());
    }

    /**
     * Get top N keywords from user messages
     */
    async getTopKeywords(botId, limit = 5) {
        // Get recent user messages
        const messages = await prisma.message.findMany({
            where: {
                botId,
                role: 'user'
            },
            select: { content: true },
            orderBy: { timestamp: 'desc' },
            take: 1000 // Analyze last 1000 user messages
        });

        // Simple keyword extraction
        const wordFrequency = new Map();
        const stopWords = new Set([
            'el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'ser', 'se', 'no', 'haber',
            'por', 'con', 'su', 'para', 'como', 'estar', 'tener', 'le', 'lo', 'todo',
            'pero', 'más', 'hacer', 'o', 'poder', 'decir', 'este', 'ir', 'otro', 'ese',
            'si', 'me', 'ya', 'ver', 'porque', 'dar', 'cuando', 'él', 'muy', 'sin',
            'vez', 'mucho', 'saber', 'qué', 'sobre', 'mi', 'alguno', 'mismo', 'yo',
            'también', 'hasta', 'año', 'dos', 'querer', 'entre', 'así', 'primero',
            'the', 'is', 'at', 'which', 'on', 'are', 'was', 'for', 'that', 'said'
        ]);

        messages.forEach(msg => {
            const words = msg.content
                .toLowerCase()
                .replace(/[^\w\sáéíóúñü]/g, '') // Remove punctuation
                .split(/\s+/)
                .filter(word =>
                    word.length > 3 &&
                    !stopWords.has(word) &&
                    !/^\d+$/.test(word) // Exclude pure numbers
                );

            words.forEach(word => {
                wordFrequency.set(word, (wordFrequency.get(word) || 0) + 1);
            });
        });

        // Sort by frequency and return top N
        return Array.from(wordFrequency.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([word, count]) => ({ word, count }));
    }

    /**
     * Get broadcast statistics (sent, read rate)
     */
    async getBroadcastStats(botId) {
        const broadcasts = await prisma.message.findMany({
            where: {
                botId,
                isBroadcast: true
            },
            select: { status: true }
        });

        const total = broadcasts.length;
        const read = broadcasts.filter(b => b.status === 'READ').length;
        const delivered = broadcasts.filter(b => b.status === 'DELIVERED').length;

        return {
            total,
            read,
            delivered,
            readRate: total > 0 ? Math.round((read / total) * 100) : 0,
            deliveryRate: total > 0 ? Math.round((delivered / total) * 100) : 0
        };
    }
}

export const statsService = new StatsService();
