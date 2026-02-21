import { prisma } from './db.service.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, '../../uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export class ClientService {
    async getClients(botId, page = 1, limit = 50, filter = {}) {
        const skip = (page - 1) * limit;

        // Build where clause
        const where = { botId };
        if (filter.status && filter.status !== 'ALL') where.status = filter.status;
        if (filter.search) {
            where.OR = [
                { name: { contains: filter.search } },
                { chatId: { contains: filter.search } }
            ];
        }

        const [clients, total] = await Promise.all([
            prisma.client.findMany({
                where,
                skip,
                take: limit,
                orderBy: { updatedAt: 'desc' }
            }),
            prisma.client.count({ where })
        ]);

        // Fetch next reminder for each client
        const clientsWithReminders = await Promise.all(
            clients.map(async (client) => {
                const nextReminder = await prisma.reminder.findFirst({
                    where: {
                        botId,
                        chatId: client.chatId,
                        dueDate: { gte: new Date() }
                    },
                    orderBy: { dueDate: 'asc' }
                });

                return {
                    ...client,
                    nextReminder: nextReminder ? {
                        dueDate: nextReminder.dueDate,
                        recurrenceDays: nextReminder.recurrenceDays
                    } : null
                };
            })
        );

        return { data: clientsWithReminders, total, page, limit };
    }

    async getClientById(id) {
        return await prisma.client.findUnique({
            where: { id }
        });
    }

    async upsertClient(botId, chatId, name, profilePicUrl = null) {
        // Find or create. If exists, update timestamp.
        // We do upsert to handle concurrency
        return await prisma.client.upsert({
            where: {
                botId_chatId: { botId, chatId }
            },
            update: {
                updatedAt: new Date(),
                // Only update name if new name is provided (and not null/undefined from service)
                ...(name ? { name } : {}),
                // Update profile pic if provided
                ...(profilePicUrl ? { profilePicUrl } : {})
            },
            create: {
                botId,
                chatId,
                name: name || chatId, // Fallback to ID only on initial creation
                profilePicUrl,
                status: 'LEAD',
                tags: '[]'
            }
        });
    }

    async updateClient(id, data) {
        return await prisma.client.update({
            where: { id },
            data
        });
    }

    async deleteClient(id) {
        const client = await prisma.client.findUnique({ where: { id } });
        if (!client) throw new Error('Client not found');

        // Delete client (Prisma cascade deletes shouldn't delete Bot, but Client doesn't have messages relation yet... 
        // Wait, schema says Bot->Messages. Client is standalone for now? 
        // Messages have chatId. We can optionally delete messages for this chat but they are linked to Bot.
        // For Mini CRM, "Deleting Client" usually implies removing the CRM record. 
        // The messages stay unless we explicitly purge them. 
        // User asked to "maintain clean DB", so maybe we SHOULD delete messages too?
        // Let's safe delete CLIENT record first. If user wants to nuke messages, that's a bigger action.

        return await prisma.client.delete({ where: { id } });
    }

    async bulkDelete(botId, criteria) {
        // criteria: { status: 'LEAD', olderThanDays: 30, ids: [] }
        const where = { botId };

        if (criteria.ids && criteria.ids.length > 0) {
            where.id = { in: criteria.ids };
        } else {
            if (criteria.status) where.status = criteria.status;
            if (criteria.olderThanDays) {
                const date = new Date();
                date.setDate(date.getDate() - criteria.olderThanDays);
                where.updatedAt = { lte: date };
            }
        }

        const result = await prisma.client.deleteMany({ where });
        return { count: result.count };
    }


    async getStats(botId) {
        // 1. Status Counts
        const statusGroups = await prisma.client.groupBy({
            by: ['status'],
            where: { botId },
            _count: { status: true }
        });

        // Convert to easy dictionary: { LEAD: 10, HOT: 2, ... }
        const statusCounts = statusGroups.reduce((acc, curr) => {
            acc[curr.status] = curr._count.status;
            return acc;
        }, { LEAD: 0, HOT: 0, CUSTOMER: 0, ARCHIVED: 0, BLOCKED: 0 });

        // 2. New Clients Today
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const newToday = await prisma.client.count({
            where: {
                botId,
                createdAt: { gte: startOfToday }
            }
        });

        return {
            statusCounts,
            newToday,
            total: Object.values(statusCounts).reduce((a, b) => a + b, 0)
        };
    }

    async updateChatId(botId, oldChatId, newChatId) {
        // Find by botId and oldChatId (LID)
        const client = await prisma.client.findUnique({
            where: { botId_chatId: { botId, chatId: oldChatId } }
        });

        if (client) {
            console.log(`[ClientService] Updating CID for client ${client.id}: ${oldChatId} -> ${newChatId}`);
            return await prisma.client.update({
                where: { id: client.id },
                data: { chatId: newChatId }
            });
        }
        return null;
    }

    async sendBroadcast(botInstance, botId, criteria, messageTemplate, imageBuffer = null) {
        // 1. Fetch Clients
        // CRITICAL: Use the explicit botId passed from controller, NOT the instance.id
        const where = { botId: botId };

        if (criteria.ids && criteria.ids.length > 0) {
            where.id = { in: criteria.ids };
        } else if (criteria.status && criteria.status !== 'ALL') {
            where.status = criteria.status;
        }

        const clients = await prisma.client.findMany({ where });
        const bot = await botInstance.storeService.getBot();
        console.log(`[Broadcast] Starting for ${clients.length} clients...`);

        // Helper: Wait for connection to be ready
        const waitForConnection = async (maxWaitMs = 30000) => {
            const startTime = Date.now();
            if (imageBuffer) console.log(`[Broadcast Service] Image Buffer Size: ${imageBuffer.length}`);
            while (Date.now() - startTime < maxWaitMs) {
                if (botInstance.status === 'connected' && botInstance.sock) {
                    return true;
                }
                console.log(`[Broadcast] Waiting for connection... (status: ${botInstance.status})`);
                await new Promise(r => setTimeout(r, 2000));
            }
            return false;
        };

        // Helper: Send message with retry
        const sendWithRetry = async (chatId, messageContent, maxRetries = 3) => {
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    // Verify connection before sending
                    if (botInstance.status !== 'connected') {
                        console.log(`[Broadcast] Connection lost, waiting for reconnection...`);
                        const connected = await waitForConnection();
                        if (!connected) {
                            throw new Error('Connection timeout - bot not connected');
                        }
                    }

                    // Send message
                    const sentMsg = await botInstance.sock.sendMessage(chatId, messageContent);
                    return sentMsg;

                } catch (err) {
                    console.error(`[Broadcast] Attempt ${attempt}/${maxRetries} failed for ${chatId}:`, err.message);

                    if (attempt < maxRetries) {
                        // Wait before retry (exponential backoff)
                        const backoffDelay = Math.min(2000 * Math.pow(2, attempt - 1), 10000);
                        console.log(`[Broadcast] Retrying in ${backoffDelay / 1000}s...`);
                        await new Promise(r => setTimeout(r, backoffDelay));
                    } else {
                        throw err; // Final attempt failed
                    }
                }
            }
        };

        // 2. Process each client with robust error handling
        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < clients.length; i++) {
            const client = clients[i];
            const chatId = client.chatId;
            const text = messageTemplate.replace('{name}', client.name || 'Cliente');

            console.log(`[Broadcast] Processing ${i + 1}/${clients.length}: ${chatId}`);

            try {
                // Prepare message content
                const messageContent = imageBuffer
                    ? { image: imageBuffer, caption: text }
                    : { text };

                // Send with retry logic
                const sentMsg = await sendWithRetry(chatId, messageContent);
                const whatsappId = sentMsg?.key?.id;

                // Save Image to Disk if present (once, reuse URL)
                let mediaUrl = null;
                let mediaType = null;

                if (imageBuffer) {
                    const fileName = `${Date.now()}_broadcast_${i}.jpg`;
                    const filePath = path.join(UPLOADS_DIR, fileName);
                    fs.writeFileSync(filePath, imageBuffer);
                    mediaUrl = `/uploads/${fileName}`;
                    mediaType = 'image';
                }

                // Track broadcast message
                const broadcastMsg = await botInstance.storeService.addMessage(
                    chatId, 'assistant', text, true, false, whatsappId, 'SENT', false, mediaUrl, mediaType
                );

                if (botInstance.emitNewMessage) {
                    botInstance.emitNewMessage(broadcastMsg);
                }

                // Update client's last broadcast timestamp
                await prisma.client.update({
                    where: { botId_chatId: { botId: bot.id, chatId } },
                    data: { lastBroadcastAt: new Date() }
                });

                successCount++;
                console.log(`[Broadcast] ✅ Sent to ${chatId} (${successCount}/${clients.length})`);

            } catch (err) {
                failCount++;
                console.error(`[Broadcast] ❌ Failed for ${chatId} after retries:`, err.message);
            }

            // Delay before next message (skip delay after last message)
            if (i < clients.length - 1) {
                // Reduced delay: 15s to 90s (safer for connection stability)
                const min = 15000;
                const max = 90000;
                const delay = Math.floor(Math.random() * (max - min + 1)) + min;
                console.log(`[Broadcast] Waiting ${delay / 1000}s before next...`);
                await new Promise(r => setTimeout(r, delay));
            }
        }

        console.log(`[Broadcast] Completed. Success: ${successCount}, Failed: ${failCount}`);
    }
}

export const clientService = new ClientService();
