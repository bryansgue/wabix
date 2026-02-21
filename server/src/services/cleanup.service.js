import { prisma } from './db.service.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, '../../uploads');

class CleanupService {
    constructor() {
        this.isRunning = false;
        // Check for cleanup every 24 hours
        this.intervalMs = 24 * 60 * 60 * 1000;
        this.intervalId = null;
    }

    startScheduler() {
        if (this.intervalId) return; // Prevent multiple schedulers

        console.log('[Cleanup] Scheduler started. Next run in 24h.');
        // Initial check after 1min to clear backlog on boot
        setTimeout(() => this.runCleanup(), 60 * 1000);

        this.intervalId = setInterval(() => {
            this.runCleanup();
        }, this.intervalMs);
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            console.log('[Cleanup] Scheduler stopped.');
        }
    }

    async runCleanup() {
        if (this.isRunning) {
            console.log('[Cleanup] Already running, skipping.');
            return;
        }

        this.isRunning = true;
        console.log(`[Cleanup] Started pruning at ${new Date().toISOString()}`);

        try {
            // Fetch VIP clients once for all operations
            const vipClients = await prisma.client.findMany({
                where: { status: { in: ['CUSTOMER', 'ARCHIVED'] } },
                select: { chatId: true }
            });
            const vipChatIds = vipClients.map(c => c.chatId);

            await this.pruneMedia(vipChatIds);
            await this.pruneMessages(vipChatIds);
            await this.optimizeDb();
            console.log('[Cleanup] Cycle completed successfully.');
        } catch (error) {
            console.error('[Cleanup] Error during maintenance:', error);
        } finally {
            this.isRunning = false;
        }
    }

    async pruneMedia(vipChatIds) {
        const VIP_MEDIA_RETENTION_DAYS = 180;
        const LEAD_MEDIA_RETENTION_DAYS = 30;

        // Convert to Set for faster lookups
        const vipChatIdSet = new Set(vipChatIds);

        // Find all messages with media
        const messagesWithMedia = await prisma.message.findMany({
            where: {
                hasMedia: true,
                mediaUrl: { not: null }
            },
            select: { id: true, chatId: true, mediaUrl: true, timestamp: true }
        });

        let filesDeleted = 0;

        for (const msg of messagesWithMedia) {
            const isVip = vipChatIdSet.has(msg.chatId);

            // Calculate cutoff date for this message
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - (isVip ? VIP_MEDIA_RETENTION_DAYS : LEAD_MEDIA_RETENTION_DAYS));

            if (msg.timestamp < cutoffDate) {
                // Determine file path
                // msg.mediaUrl is like '/uploads/filename.jpg'
                const relativePath = msg.mediaUrl.replace('/uploads/', '');
                const fullPath = path.join(UPLOADS_DIR, relativePath);

                try {
                    await fs.unlink(fullPath);
                    filesDeleted++;
                } catch (err) {
                    if (err.code !== 'ENOENT') {
                        console.error(`[Cleanup] Failed to delete ${fullPath}:`, err.message);
                    }
                }

                // Update DB
                await prisma.message.update({
                    where: { id: msg.id },
                    data: {
                        hasMedia: false,
                        mediaUrl: null,
                        content: `[Multimedia borrada por política de retención: >${isVip ? VIP_MEDIA_RETENTION_DAYS : LEAD_MEDIA_RETENTION_DAYS} días]`
                    }
                });
            }
        }

        console.log(`[Cleanup] Pruned ${filesDeleted} media files.`);
    }

    async pruneMessages(vipChatIds) {
        const TEXT_RETENTION_DAYS = 90;
        const limitDate = new Date();
        limitDate.setDate(limitDate.getDate() - TEXT_RETENTION_DAYS);

        // Delete Non-VIP Messages older than 90 days

        const count = await prisma.message.deleteMany({
            where: {
                timestamp: { lt: limitDate },
                chatId: { notIn: vipChatIds }
            }
        });

        console.log(`[Cleanup] Pruned ${count.count} old text messages.`);
    }

    async optimizeDb() {
        // SQLite Vacuum to free space
        try {
            await prisma.$executeRawUnsafe('VACUUM;');
            console.log('[Cleanup] Database optimized (VACUUM).');
        } catch (err) {
            console.error('[Cleanup] VACUUM failed:', err);
        }
    }
}

export const cleanupService = new CleanupService();
