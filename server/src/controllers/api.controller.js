import { sessionManager } from '../services/session.manager.js';
import { authService } from '../services/auth.service.js';
import { statsService } from '../services/stats.service.js';

// Helper to get or start a session for the authenticated user
const getBot = async (req) => {
    if (!req.user || !req.user.id) throw new Error('User ID missing');
    const botInstance = await sessionManager.startSession(req.user.id);

    // Crucial: Get the real Bot ID from the database record
    // This ensures isolation between different users' data
    const botRecord = await botInstance.storeService.getBot();
    return {
        instance: botInstance,
        dbId: botRecord.id
    };
};

export const getStatus = async (req, res) => {
    try {
        const { instance } = await getBot(req);
        res.json(instance.getStatus());
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getQR = async (req, res) => {
    try {
        const { instance } = await getBot(req);
        res.json({ qr: instance.getQR() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getConfig = async (req, res) => {
    try {
        const { instance } = await getBot(req);
        const config = await instance.storeService.getConfig();
        res.json(config);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch config' });
    }
};

export const updateConfig = async (req, res) => {
    try {
        const { instance } = await getBot(req);
        const newConfig = req.body;
        const updated = await instance.storeService.updateConfig(newConfig);

        // Notify socket
        if (instance.io) {
            instance.io.to(req.user.id).emit('config', updated);
        }
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update config' });
    }
};

export const requestPairingCode = async (req, res) => {
    res.status(501).json({ message: 'Not implemented for multi-tenant yet' });
};

export const uploadContext = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        const content = req.file.buffer.toString('utf-8');
        res.json({ content });
    } catch (error) {
        console.error('File upload error:', error);
        res.status(500).json({ error: 'Failed to process file' });
    }
};

// --- AUTHENTICATION ---

export const login = async (req, res) => {
    try {
        const { username, password } = req.body;
        const result = await authService.login(username, password);
        res.json(result);
    } catch (error) {
        res.status(401).json({ error: error.message });
    }
};

export const register = async (req, res) => {
    try {
        const { username, password, role } = req.body;
        const result = await authService.register(username, password, role);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

export const getUserInfo = async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });

    try {
        // Fetch fresh user data from DB to ensure role is up-to-date
        const users = await authService.getAllUsers();
        const freshUser = users.find((u) => u.id === req.user.id);

        if (!freshUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(freshUser);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch user info' });
    }
};

export const logout = async (req, res) => {
    try {
        const userId = req.user.id;
        await sessionManager.stopSession(userId);
        res.json({ success: true, message: 'Session stopped' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getUsers = async (req, res) => {
    try {
        // Fresh Admin Check
        const users = await authService.getAllUsers();
        const requester = users.find((u) => u.id === req.user.id);

        if (!requester || requester.role?.toUpperCase() !== 'ADMIN') {
            return res.status(403).json({ error: 'Access denied' });
        }

        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};

export const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        // Safety check to prevent self-deletion
        if (req.user.id === id) {
            return res.status(400).json({ error: 'Cannot delete yourself' });
        }

        // Fresh Admin Check
        const users = await authService.getAllUsers();
        const requester = users.find((u) => u.id === req.user.id);

        if (!requester || requester.role?.toUpperCase() !== 'ADMIN') {
            return res.status(403).json({ error: 'Only admins can delete users' });
        }

        // 1. Stop Session
        await sessionManager.stopSession(id);

        // 2. Delete from DB
        await authService.deleteUser(id);
        res.json({ success: true, message: 'User deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;

        // Fresh Admin Check
        const users = await authService.getAllUsers();
        const requester = users.find((u) => u.id === req.user.id);

        if (!requester || requester.role?.toUpperCase() !== 'ADMIN') {
            return res.status(403).json({ error: 'Only admins can update users' });
        }

        const result = await authService.updateUser(id, data);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const changePassword = async (req, res) => {
    try {
        const { newPassword } = req.body;
        const userId = req.user.id; // User changing their own password

        await authService.changePassword(userId, newPassword);

        res.json({ success: true, message: 'Password updated' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Admin function to force reset a user's password
export const resetUserPassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;

        // Fresh Admin Check
        const users = await authService.getAllUsers();
        const requester = users.find((u) => u.id === req.user.id);

        if (!requester || requester.role?.toUpperCase() !== 'ADMIN') {
            return res.status(403).json({ error: 'Access denied' });
        }

        await authService.changePassword(id, newPassword);

        res.json({ success: true, message: 'Password reset successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getAuthSettings = async (req, res) => {
    try {
        const settings = await authService.getSettings();
        res.json(settings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const updateAuthSettings = async (req, res) => {
    try {
        if (req.user.role?.toUpperCase() !== 'ADMIN') {
            return res.status(403).json({ error: 'Access denied' });
        }
        const updated = await authService.updateSettings(req.body);
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


// --- CRM / CLIENTS ---

import { clientService } from '../services/client.service.js';

export const getClients = async (req, res) => {
    try {
        const { dbId } = await getBot(req);
        const { page, limit, status, search } = req.query;
        const result = await clientService.getClients(
            dbId,
            parseInt(page) || 1,
            parseInt(limit) || 20,
            { status, search }
        );
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getClientStats = async (req, res) => {
    try {
        const { dbId } = await getBot(req);
        const stats = await clientService.getStats(dbId);
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const updateClient = async (req, res) => {
    try {
        const { dbId } = await getBot(req);
        const { id } = req.params;
        const data = req.body;

        // Security: Ensure the client belongs to this user's bot
        const client = await clientService.getClientById(id);
        if (!client || client.botId !== dbId) {
            return res.status(403).json({ error: 'Access denied to this client' });
        }

        const result = await clientService.updateClient(id, data);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteClient = async (req, res) => {
    try {
        const { dbId } = await getBot(req);
        const { id } = req.params;

        // Security: Ensure the client belongs to this user's bot
        const client = await clientService.getClientById(id);
        if (!client || client.botId !== dbId) {
            return res.status(403).json({ error: 'Access denied to this client' });
        }

        const result = await clientService.deleteClient(id);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const bulkDeleteClients = async (req, res) => {
    try {
        const { dbId } = await getBot(req);
        const criteria = req.body; // { status, olderThanDays }
        const result = await clientService.bulkDelete(dbId, criteria);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getClientMessages = async (req, res) => {
    try {
        const { dbId, instance } = await getBot(req);
        const { chatId } = req.params;
        const { page = 1, limit = 50 } = req.query;

        // Note: instance.storeService already uses dbId internally
        const result = await instance.storeService.getMessages(chatId, parseInt(page), parseInt(limit));
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const createReminder = async (req, res) => {
    try {
        const { instance } = await getBot(req);
        const { chatId } = req.params;
        const { timestamp, recurrenceDays } = req.body;

        if (!timestamp) throw new Error('Timestamp is required');

        const reminderId = await instance.storeService.addReminder(
            chatId,
            new Date(timestamp).getTime(),
            recurrenceDays || null
        );
        res.json({ success: true, id: reminderId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteReminders = async (req, res) => {
    try {
        const { instance } = await getBot(req);
        const { chatId } = req.params;

        const deletedCount = await instance.storeService.deleteRemindersByChatId(chatId);
        res.json({ success: true, deletedCount });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const sendBroadcast = async (req, res) => {
    console.log('[API] sendBroadcast initiated');
    try {
        const { instance, dbId } = await getBot(req);
        if (!instance || !dbId) {
            console.error('[API] getBot failed: instance or dbId missing', { instance: !!instance, dbId });
            return res.status(500).json({ error: 'Internal Error: Bot session not found' });
        }

        let { criteria, message } = req.body;
        console.log('[API] Broadcast Payload received:', {
            messageLength: message ? message.length : 0,
            criteriaType: typeof criteria,
            criteriaRaw: criteria,
            hasFile: !!req.file
        });

        // Parse criteria if string (from FormData)
        if (typeof criteria === 'string') {
            try {
                criteria = JSON.parse(criteria);
            } catch (e) {
                console.warn('[API] Failed to parse criteria JSON:', e.message);
                criteria = {};
            }
        } else if (!criteria) {
            criteria = {};
        }

        if (!message && !req.file) {
            throw new Error('Message or image is required');
        }

        // Execute in background
        clientService.sendBroadcast(instance, dbId, criteria, message || '', req.file?.buffer)
            .catch(err => console.error('[API] Background Broadcast error:', err));

        res.json({ success: true, message: 'Broadcast initiated successfully' });
    } catch (error) {
        console.error('[API] CRITICAL sendBroadcast error:', error);
        res.status(500).json({ error: error.message || 'Unknown server error in broadcast' });
    }
};

// Imports for file handling
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Ensure uploads directory exists
const UPLOADS_DIR = path.join(__dirname, '../../uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export const sendManualMessage = async (req, res) => {
    try {
        const { instance } = await getBot(req);
        const { chatId } = req.params;
        const { message } = req.body;
        const file = req.file;

        if ((!message || !message.trim()) && !file) {
            return res.status(400).json({ error: 'Message or file is required' });
        }

        // Auto-Silence Bot (Smart Keep-Alive)
        // Respect Permanent Pause: If bot is permanently OFF, keep it OFF.
        // If it's ON or Temporary OFF, extend the 10-minute timer.
        const currentStatus = await instance.storeService.getClientStatus(chatId);
        if (!currentStatus.isBotPaused) {
            await instance.storeService.setSilence(chatId, 'TEMPORARY', 10);
        }

        let sentMsg;
        let whatsappId;
        let mediaUrl = null;
        let mediaType = null;

        if (file) {
            // 1. Send Media Message
            // Detect type (assume image for now based on multer filter or mimetype)
            const isImage = file.mimetype.startsWith('image/');

            if (isImage) {
                sentMsg = await instance.sock.sendMessage(chatId, {
                    image: file.buffer,
                    caption: message?.trim() || ''
                });
                if (sentMsg?.key?.id) instance.botMessageIds.add(sentMsg.key.id);
                mediaType = 'image';
            } else {
                // Documents (future support)
                sentMsg = await instance.sock.sendMessage(chatId, {
                    document: file.buffer,
                    mimetype: file.mimetype,
                    fileName: file.originalname,
                    caption: message?.trim() || ''
                });
                if (sentMsg?.key?.id) instance.botMessageIds.add(sentMsg.key.id);
                mediaType = 'document';
            }

            // 2. Save File to Disk (for history)
            const fileName = `${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9.]/g, '')}`;
            const filePath = path.join(UPLOADS_DIR, fileName);
            fs.writeFileSync(filePath, file.buffer);
            mediaUrl = `/uploads/${fileName}`;

        } else {
            // Text Only
            sentMsg = await instance.sock.sendMessage(chatId, { text: message.trim() });
            if (sentMsg?.key?.id) instance.botMessageIds.add(sentMsg.key.id);
        }

        whatsappId = sentMsg?.key?.id;

        // Save to database
        const savedMsg = await instance.storeService.addMessage(
            chatId,
            'assistant',
            message?.trim() || '',
            false,  // isBroadcast
            true,   // isManual
            whatsappId,
            'SENT',
            false,  // isReminder
            mediaUrl,
            mediaType
        );

        // Emit via socket for real-time update
        if (instance.emitNewMessage) {
            instance.emitNewMessage(savedMsg);
        }

        // Fetch updated status to return to frontend for immediate UI sync
        const newStatus = await instance.storeService.getClientStatus(chatId);

        res.json({
            success: true,
            message: savedMsg,
            botStatus: newStatus
        });
    } catch (error) {
        console.error('Error sending manual message:', error);
        res.status(500).json({ error: error.message });
    }
};

export const toggleBotPause = async (req, res) => {
    try {
        const { instance } = await getBot(req);
        const { chatId } = req.params;
        const { paused, duration } = req.body; // boolean, number (minutes)

        let result;
        if (paused && duration) {
            result = await instance.storeService.setSilence(chatId, 'TEMPORARY', duration);
        } else if (paused) {
            result = await instance.storeService.setSilence(chatId, 'PERMANENT');
        } else {
            result = await instance.storeService.setSilence(chatId, 'ON');
        }

        res.json({
            success: true,
            isBotPaused: result.isBotPaused,
            botPausedUntil: result.botPausedUntil
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// --- STATISTICS AND EXPORT ---

export const getDashboardStats = async (req, res) => {
    try {
        const { dbId } = await getBot(req);
        const stats = await statsService.getDashboardStats(dbId);
        res.json(stats);
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ error: error.message });
    }
};

export const exportClients = async (req, res) => {
    try {
        const { dbId } = await getBot(req);
        const { format = 'csv', status } = req.query;

        // Import clientService at top if not already imported
        const { clientService } = await import('../services/client.service.js');

        // Get all clients (no pagination for export)
        const result = await clientService.getClients(dbId, 1, 10000, { status });
        const clients = result.data;

        if (format === 'json') {
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="clientes_${new Date().toISOString().split('T')[0]}.json"`);
            res.json(clients);
        } else {
            // CSV format
            const csv = convertClientsToCSV(clients);
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="clientes_${new Date().toISOString().split('T')[0]}.csv"`);
            res.send('\uFEFF' + csv); // BOM for UTF-8 Excel compatibility
        }
    } catch (error) {
        console.error('Error exporting clients:', error);
        res.status(500).json({ error: error.message });
    }
};

function convertClientsToCSV(clients) {
    const headers = 'Nombre,Teléfono,Estado,Tags,Notas,Fecha Registro,Última Difusión\n';

    const rows = clients.map(client => {
        const name = (client.name || 'Sin nombre').replace(/"/g, '""');
        const phone = client.chatId.split('@')[0];
        const status = client.status;
        const tags = JSON.parse(client.tags || '[]').join('; ').replace(/"/g, '""');
        const notes = (client.notes || '').replace(/"/g, '""');
        const createdAt = new Date(client.createdAt).toLocaleDateString('es-ES');
        const lastBroadcast = client.lastBroadcastAt
            ? new Date(client.lastBroadcastAt).toLocaleDateString('es-ES')
            : 'Nunca';

        return `"${name}","${phone}","${status}","${tags}","${notes}","${createdAt}","${lastBroadcast}"`;
    }).join('\n');

    return headers + rows;
}

