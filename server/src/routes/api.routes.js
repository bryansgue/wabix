import express from 'express';
import * as controller from '../controllers/api.controller.js';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.middleware.js';
import { authLimiter } from '../middleware/rate-limit.middleware.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Public Auth Routes
router.post('/auth/login', authLimiter, controller.login);
router.post('/auth/register', authLimiter, controller.register);
router.get('/auth/settings', controller.getAuthSettings);

// Protected Routes
router.use(requireAuth);

router.get('/status', controller.getStatus);
router.get('/qr', controller.getQR);
router.get('/config', controller.getConfig);
router.post('/config', controller.updateConfig);
router.post('/pairing', controller.requestPairingCode);
router.post('/upload-context', upload.single('file'), controller.uploadContext);

// CRM Routes
router.get('/clients/stats', controller.getClientStats);
router.get('/clients', controller.getClients);
router.put('/clients/:id', controller.updateClient);
router.delete('/clients/:id', controller.deleteClient);
router.post('/clients/bulk-delete', controller.bulkDeleteClients);
router.get('/clients/:chatId/messages', controller.getClientMessages);
router.post('/clients/:chatId/reminders', controller.createReminder);
router.delete('/clients/:chatId/reminders', controller.deleteReminders);
// Configure upload with 1MB limit for broadcasts
const broadcastUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 1024 * 1024 } // 1MB Strict Limit
});

// Configure upload with 5MB limit for manual chat media
const chatUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }
});

router.post('/clients/broadcast', broadcastUpload.single('image'), controller.sendBroadcast);
router.post('/clients/:chatId/send', chatUpload.single('file'), controller.sendManualMessage);

router.post('/clients/:chatId/toggle-bot', controller.toggleBotPause);

// Statistics and Export Routes
router.get('/stats/dashboard', controller.getDashboardStats);
router.get('/clients/export', controller.exportClients);

// Auth Routes
router.get('/auth/users', controller.getUsers);
router.delete('/auth/users/:id', controller.deleteUser);
router.post('/auth/users/:id/reset', controller.resetUserPassword);
router.post('/auth/change-password', controller.changePassword);
router.get('/auth/me', controller.getUserInfo);
router.put('/auth/users/:id', controller.updateUser);
router.put('/auth/settings', controller.updateAuthSettings);

export default router;
