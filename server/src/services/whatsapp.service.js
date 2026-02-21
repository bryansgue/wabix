import {
    makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    downloadMediaMessage,
    jidNormalizedUser,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import path from 'path';
import fs from 'fs';
import fsPromises from 'fs/promises';
import { fileURLToPath } from 'url';
import { openaiService } from './openai.service.js';
import { storeService } from './store.service.js';
import { clientService } from './client.service.js';
import { prisma } from './db.service.js';
import pino from 'pino';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, '../../uploads');

// Ensure uploads dir exists (Sync is fine here on startup)
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// FFmpeg conversion timeout (30 seconds)
// Protects against hung conversions from corrupted or very long audio files
const FFMPEG_TIMEOUT_MS = 30000;

export class WhatsAppService {
    constructor(userId = 'default', storeInstance = storeService) {
        this.userId = userId;
        this.storeService = storeInstance; // Dependency Injection
        this.sock = null;
        this.io = null;
        this.qr = '';
        this.status = 'disconnected';

        // Dynamic Auth Directory
        if (this.userId === 'default') {
            this.authDir = path.join(__dirname, '../../auth_info');
        } else {
            this.authDir = path.join(__dirname, '../../sessions', this.userId, 'auth_info');
        }

        this.rateLimitMap = new Map(); // Track user activity for rate limiting
        this.lidCache = new Map(); // Cache for LID -> Phone mappings
        this.processedMessages = new Map(); // Track processed message IDs with timestamps (TTL-based cleanup)
        this.botMessageIds = new Set(); // Track IDs of messages sent by the bot to avoid duplication
        this.lastOutboundChatId = null; // Heuristic fix for LID issue
        this.lastOutboundTimestamp = 0;
        this.isConnecting = false;
        this.deduplicationCleanupInterval = null; // Will hold the cleanup interval
    }


    async init(ioInstance) {
        this.io = ioInstance;
        await this.connectToWhatsApp();

        // Start automatic cleanup of old message IDs (TTL: 1 hour, cleanup every 5 minutes)
        this.startDeduplicationCleanup();
    }

    async connectToWhatsApp() {
        if (this.isConnecting) {
            // console.log(`[${this.userId}] Already attempting to connect, skipping.`);
            return;
        }

        this.isConnecting = true;

        if (this.userId !== 'default') {
            await fsPromises.mkdir(this.authDir, { recursive: true });
        }

        // Check for FFmpeg dependency
        try {
            await import('fluent-ffmpeg');
        } catch (e) {
            console.error('CRITICAL: fluent-ffmpeg dependency is missing! Audio features will fail.');
        }

        const { state, saveCreds } = await useMultiFileAuthState(this.authDir);
        const { version, isLatest } = await fetchLatestBaileysVersion();

        if (process.env.NODE_ENV !== 'production') {
            console.log(`[${this.userId}] Using WA v${version.join('.')}, isLatest: true`);
        }

        this.sock = makeWASocket({
            version,
            auth: state,
            logger: pino({ level: 'silent' }), // SILENCE BAILEYS LOGS COMPLETELY
            browser: ['WhatsApp AI Bot', 'Chrome', '1.0.0'],
            usePairingCode: false,
            syncFullHistory: false,
            markOnlineOnConnect: true,
        });

        this.sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            // QR code update
            if (qr) {
                this.isConnecting = false; // QR counts as connection attempt finishing
                this.qr = qr;
                this.status = 'scantocan';
                this.emitStatus();
            }

            // Connection closed
            if (connection === 'close') {
                this.isConnecting = false;
                if (this.isLoggingOut) return;

                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut && statusCode !== 401;

                const prevStatus = this.status;
                this.status = 'disconnected';
                this.qr = '';
                this.emitStatus();
                this.stopReminderScheduler();

                if (shouldReconnect) {
                    const hasListeners = this.io && this.io.sockets.adapter.rooms.get(this.userId)?.size > 0;
                    if (!hasListeners && prevStatus === 'scantocan') {
                        console.log(`[${this.userId}] Stopping auto-reconnect: No active listeners for QR.`);
                        return;
                    }

                    console.log(`[${this.userId}] Reconnecting in 2s...`);
                    setTimeout(() => this.connectToWhatsApp(), 2000);
                } else if (statusCode === 401) {
                    console.log(`[${this.userId}] Session invalid (401). Triggering cleanup...`);
                    await this.logout();
                }
            }
            // Connection opened
            else if (connection === 'open') {
                this.isConnecting = false;
                this.status = 'connected';
                this.qr = '';
                console.log(`[${this.userId}] Bot Connected`);
                this.startReminderScheduler();

                try {
                    const userJid = this.sock.user.id.split(':')[0] + '@s.whatsapp.net';
                    const ppUrl = await this.sock.profilePictureUrl(userJid, 'image').catch(() => null);

                    this.userInfo = {
                        name: this.sock.user.name || this.sock.user.notify || 'WhatsApp User',
                        id: userJid,
                        number: userJid.split('@')[0],
                        profilePicUrl: ppUrl,
                    };
                    console.log(`[${this.userId}] User Info loaded:`, this.userInfo.name);
                } catch (error) {
                    console.error(`[${this.userId}] Error fetching user info:`, error);
                }
                this.emitStatus();
            }
        });

        this.sock.ev.on('creds.update', saveCreds);

        // Listen for Contact Updates to fix LID -> Phone JID mappings
        this.sock.ev.on('contacts.upsert', async (contacts) => {
            try {
                const bot = await this.storeService.getBot();
                for (const contact of contacts) {
                    if (contact.lid && contact.id) {
                        this.lidCache.set(contact.lid, contact.id);
                        await clientService.updateChatId(bot.id, contact.lid, contact.id);
                    }
                }
            } catch (err) {
                console.error('Error handling contacts upsert:', err);
            }
        });

        this.sock.ev.on('contacts.update', async (updates) => {
            // Similar logic if updates provide linking info
            try {
                const bot = await this.storeService.getBot();
                for (const update of updates) {
                    if (update.lid && update.id) {
                        this.lidCache.set(update.lid, update.id);
                        await clientService.updateChatId(bot.id, update.lid, update.id);
                    }
                }
            } catch (err) { console.error('Error handling contacts update:', err); }
        });

        // Listen for Message Updates (Read Receipts / Delivery)
        this.sock.ev.on('messages.update', async (updates) => {
            for (const update of updates) {
                const s = update.update.status;
                if (!s) continue;

                let newStatus = null;
                if (s == 2 || s === 'SERVER_ACK') newStatus = 'SENT';
                else if (s == 3 || s === 'DELIVERY_ACK') newStatus = 'DELIVERED';
                else if (s == 4 || s == 5 || s === 'READ' || s === 'PLAYED') newStatus = 'READ';

                if (newStatus) {
                    const msgId = update.key.id;
                    try {
                        await this.storeService.updateMessageStatus(msgId, newStatus);
                    } catch (e) {
                        console.warn(`[${this.userId}] DB Update warning for ${msgId}: ${e.message}`);
                    }
                    this.emitMessageStatus(msgId, newStatus);
                }
            }
        });

        this.sock.ev.on('messages.upsert', async ({ messages }) => {
            const m = messages[0];
            if (!m.message) return;

            // --- PLAN EXPIRATION CHECK ---
            try {
                const userRecord = await prisma.user.findUnique({
                    where: { id: this.userId },
                    select: { expiresAt: true, role: true }
                });

                if (userRecord && userRecord.role !== 'admin' && userRecord.expiresAt) {
                    if (new Date() > new Date(userRecord.expiresAt)) {
                        console.log(`[${this.userId}] SUBSCRIPTION EXPIRED. Access blocked.`);
                        return; // Stop processing any logic for this bot
                    }
                }
            } catch (err) {
                console.error(`[${this.userId}] Error checking expiration:`, err);
                // In case of DB error, let it continue? usually yes to avoid service disruption
            }

            // FILTER: Ignore WhatsApp Status updates and broadcast messages
            if (m.key.remoteJid === 'status@broadcast' || m.key.remoteJid?.includes('broadcast')) {
                console.log(`[${this.userId}] Ignoring status/broadcast message`);
                return;
            }

            // DEDUPLICATION: Check if message was already processed
            const messageId = m.key.id;
            if (this.processedMessages.has(messageId)) {
                console.log(`[${this.userId}] Ignoring duplicate message: ${messageId}`);
                return;
            }

            // --- CRITICAL FIX: Aggressive LID -> Phone Mapping ---
            // If the message contains the phone number (senderPn) for a LID, update our cache IMMEDIATELY
            if (m.key.remoteJid?.includes('@lid') && m.key.senderPn) {
                const lid = jidNormalizedUser(m.key.remoteJid);
                const phoneJid = jidNormalizedUser(m.key.senderPn);
                this.lidCache.set(lid, phoneJid);
                // Also update DB asynchronously to heal future lookups
                this.storeService.getBot().then(bot => {
                    clientService.updateChatId(bot.id, lid, phoneJid).catch(() => { });
                });
            }

            // Mark message as processed with current timestamp (TTL-based cleanup happens via interval)
            this.processedMessages.set(messageId, Date.now());

            // Extract content
            let msgContent = m.message;

            // Unwrap Ephemeral/ViewOnce to find the real content
            if (msgContent.ephemeralMessage?.message) msgContent = msgContent.ephemeralMessage.message;
            if (msgContent.viewOnceMessage?.message) msgContent = msgContent.viewOnceMessage.message;
            if (msgContent.viewOnceMessageV2?.message) msgContent = msgContent.viewOnceMessageV2.message;

            let text = msgContent.conversation || msgContent.extendedTextMessage?.text;
            let mediaUrl = null;
            let mediaType = null;
            let imageBase64 = null;
            let mimeType;

            // Handle Image Messages
            if (msgContent.imageMessage) {
                try {
                    // 1. Download buffer
                    const buffer = await downloadMediaMessage(
                        m,
                        'buffer',
                        {},
                        {
                            logger: console,
                            reuploadRequest: this.sock.updateMediaMessage
                        }
                    );

                    // 2. Save to disk
                    const fileName = `${Date.now()}_${m.key.id}.jpg`;
                    const filePath = path.join(UPLOADS_DIR, fileName);
                    await fsPromises.writeFile(filePath, buffer);

                    mediaUrl = `/uploads/${fileName}`;
                    mediaType = 'image';
                    mimeType = (msgContent.imageMessage.mimetype || 'image/jpeg').split(';')[0].trim();

                    // 3. Prepare for AI Vision
                    imageBase64 = buffer.toString('base64');

                    // 4. Capture caption as text or default
                    text = msgContent.imageMessage.caption || text; // Use caption or existing text
                    if (!text) text = 'Describe esta imagen';

                    // console.log(`[${this.userId}] Image saved: ${fileName} (${mimeType})`);
                } catch (err) {
                    console.error('Error downloading media:', err);
                    text = text || '⚠️ Error al descargar imagen';
                }
            }

            // RESOLVE JID: Use senderPn if available (for LID contacts), otherwise use remoteJid
            let chatId = jidNormalizedUser(m.key.remoteJid);
            if (chatId.includes('@lid') && m.key.senderPn) {
                chatId = jidNormalizedUser(m.key.senderPn);
            } else if (chatId.includes('@lid')) {
                const resolved = this.lidCache.get(chatId);
                if (resolved) {
                    chatId = jidNormalizedUser(resolved);
                }
            }

            // HEURISTIC FIX: Capture real chat ID from protocol messages (fromMe)
            // Exclude LID, status, AND valid bot number (self) to avoid capturing self-chats
            const botIdNormalized = this.sock.user?.id ? jidNormalizedUser(this.sock.user.id) : null;

            if (m.key.fromMe && !chatId.includes('@lid') && !chatId.includes('status') && chatId !== botIdNormalized) {
                this.lastOutboundChatId = chatId;
                this.lastOutboundTimestamp = Date.now();
            }

            // --- PROTOCOLO DE HANDOFF (HUMANO) ---

            // 1. Auto-CRM: Register/Update Client
            try {
                const bot = await this.storeService.getBot();

                // Get bot's own number to filter it out
                const botNumber = this.sock.user?.id ? jidNormalizedUser(this.sock.user.id) : null;

                // Skip CRM registration if this is the bot's own number OR a message from me (manual reply)
                // Also skip internal system IDs (LID, status, broadcast) to prevent ghost clients
                if ((botNumber && chatId === botNumber) || m.key.fromMe || chatId.includes('@lid') || chatId.includes('status') || chatId.includes('broadcast')) {
                    // Skip
                } else {
                    const contactName = m.pushName; // Don't fallback to ID to prevent overwriting saved names

                    // Fetch profile picture
                    let profilePicUrl = null;
                    try {
                        profilePicUrl = await this.sock.profilePictureUrl(chatId, 'image');
                    } catch (ppError) {
                        // No profile picture available (privacy settings or new contact)
                    }

                    await clientService.upsertClient(bot.id, chatId, contactName, profilePicUrl);
                }
            } catch (crmError) {
                console.error(`[${this.userId}] CRM Error:`, crmError);
            }

            // 1. Check for Commands (Allow 'fromMe' so owner can control bot)
            if (text) {
                const lowerText = text.toLowerCase().trim();
                if (lowerText.startsWith('!off')) {
                    const args = lowerText.split(' ');
                    const duration = args[1] ? parseInt(args[1]) : null;

                    if (duration && !isNaN(duration)) {
                        // Temporal Pause
                        await this.storeService.setSilence(chatId, 'TEMPORARY', duration);
                        if (!m.key.fromMe) {
                            const sm = await this.sock.sendMessage(chatId, { text: `⏸️ Bot pausado por ${duration} minutos.` });
                            if (sm?.key?.id) this.botMessageIds.add(sm.key.id);
                        }
                        else console.log(`[${this.userId}] Bot paused for ${duration} mins by owner.`);
                    } else {
                        // Permanent Pause
                        await this.storeService.setSilence(chatId, 'PERMANENT');
                        if (!m.key.fromMe) {
                            const sm = await this.sock.sendMessage(chatId, { text: '🔇 Bot desactivado indefinidamente.' });
                            if (sm?.key?.id) this.botMessageIds.add(sm.key.id);
                        }
                        else console.log(`[${this.userId}] Bot deactivated permanently by owner.`);
                    }
                    return;
                }
                if (lowerText === '!on') {
                    await this.storeService.setSilence(chatId, 'ON');
                    if (!m.key.fromMe) {
                        const sm = await this.sock.sendMessage(chatId, { text: '🔊 Bot reactivado.' });
                        if (sm?.key?.id) this.botMessageIds.add(sm.key.id);
                    }
                    else console.log(`[${this.userId}] Bot reactivated by owner.`);
                    return;
                }
                // !pay <days>
                if (lowerText.startsWith('!pay')) {
                    const args = lowerText.split(' ');
                    const days = parseInt(args[1]);
                    if (!isNaN(days)) {
                        const dueDate = Date.now() + days * 24 * 60 * 60 * 1000;
                        await this.storeService.addReminder(chatId, dueDate);
                        const sm = await this.sock.sendMessage(chatId, {
                            text: `✅ Recordatorio de pago configurado para dentro de ${days} días.`,
                        });
                        if (sm?.key?.id) this.botMessageIds.add(sm.key.id);
                    } else {
                        const sm = await this.sock.sendMessage(chatId, {
                            text: '❌ Formato incorrecto. Usa: !pay <dias> (ej: !pay 30)',
                        });
                        if (sm?.key?.id) this.botMessageIds.add(sm.key.id);
                    }
                    return;
                }
            }

            // ⛔ SELF MESSAGES: Save as manual history, but DO NOT trigger AI
            if (m.key.fromMe) {
                // Check if this is a message WE (the bot) just sent
                if (this.botMessageIds.has(m.key.id)) {
                    this.botMessageIds.delete(m.key.id);
                    return;
                }

                if (!text && !mediaUrl && !imageBase64) {
                    return;
                }

                // HEURISTIC FIX APPLY: If chatId is our own LID, try to use the last seen real ID
                if (chatId.includes('@lid')) {
                    // Wait a bit in case the protocol message with real ID arrives slightly later (Race condition fix)
                    await new Promise(r => setTimeout(r, 1500));

                    const timeDiff = Date.now() - this.lastOutboundTimestamp;
                    if (this.lastOutboundChatId && timeDiff < 5000) {
                        console.log(`[${this.userId}] Fixing LID Chat ID (Async). ${chatId} -> ${this.lastOutboundChatId} (Diff: ${timeDiff}ms)`);
                        chatId = this.lastOutboundChatId;
                    } else {
                        // FALLBACK: Try to get last active chat from DB if heuristic failed
                        // This handles cases where server restarted or protocol message was missed
                        const selfJid = this.sock.user?.id ? jidNormalizedUser(this.sock.user.id) : null;
                        const lastActive = await this.storeService.getLastActiveChat(selfJid);
                        if (lastActive) {
                            console.log(`[${this.userId}] Fallback to DB Last Active Chat: ${chatId} -> ${lastActive}`);
                            chatId = lastActive;
                        }
                    }
                }

                // Auto-Silence Bot (Smart Keep-Alive for Manual Mobile Replies)
                // If it's ON or Temporary OFF, extend/set the 10-minute timer.
                const currentStatus = await this.storeService.getClientStatus(chatId);
                if (!currentStatus.isBotPaused) {
                    const newStatus = await this.storeService.setSilence(chatId, 'TEMPORARY', 10);
                    // Emit status update to frontend so UI reflects "Paused 10m"
                    this.emitClientUpdate({ chatId, ...newStatus });
                }

                try {
                    // Save manual message to DB so it appears in chat history
                    const sentMsg = await this.storeService.addMessage(
                        chatId,
                        'assistant', // Role assistant because it's you/the business responding
                        text || '',
                        false, // isBroadcast
                        true, // isManual: TRUE indicating human reply
                        messageId,
                        'SENT', // Status
                        false, // isReminder
                        mediaUrl,
                        mediaType
                    );
                    this.emitNewMessage(sentMsg); // Live update frontend
                } catch (err) {
                    console.error(`[${this.userId}] Error saving manual message:`, err);
                }
                return; // STOP here so AI doesn't reply to itself
            }

            // 2. Check Silence State -> MOVED DOWN to allow seeing user messages
            const isSilenced = await this.storeService.isSilenced(chatId);


            // Get Config once
            const config = await this.storeService.getConfig();

            // --- SECURITY: RATE LIMITING ---
            if (config.enableRateLimit) {
                const { max, window } = config.rateLimit || { max: 10, window: 60 };
                const now = Date.now();
                const userActivity = this.rateLimitMap.get(chatId) || { count: 0, startTime: now };

                if (now - userActivity.startTime > window * 1000) {
                    userActivity.count = 1;
                    userActivity.startTime = now;
                } else {
                    userActivity.count++;
                }

                this.rateLimitMap.set(chatId, userActivity);

                if (userActivity.count > max) {
                    console.log(`[${this.userId}] Rate limit exceeded for ${chatId}.`);
                    return;
                }
            }

            // --- SECURITY: BUSINESS HOURS ---
            if (config.businessHours?.enabled) {
                const now = new Date();
                const currentTime = now.toLocaleTimeString('en-US', {
                    hour12: false,
                    hour: '2-digit',
                    minute: '2-digit',
                });
                const { start, end, message } = config.businessHours;

                const isWorkingHours =
                    start <= end
                        ? currentTime >= start && currentTime <= end
                        : currentTime >= start || currentTime <= end;

                if (!isWorkingHours) {
                    // console.log(`[${this.userId}] Outside business hours (${currentTime}).`);
                    const lastAutoReply = this.rateLimitMap.get(chatId)?.lastAutoReply || 0;
                    if (Date.now() - lastAutoReply > 60 * 60 * 1000) {
                        const sm = await this.sock.sendMessage(chatId, { text: message || 'Closed.' });
                        if (sm?.key?.id) this.botMessageIds.add(sm.key.id);
                        const rateLimitData = this.rateLimitMap.get(chatId) || {};
                        rateLimitData.lastAutoReply = Date.now();
                        this.rateLimitMap.set(chatId, rateLimitData);
                    }
                    return;
                }
            }

            // 3. Anger Detection (Auto-Silence)
            if (text && config.enableAngerProtection !== false) {
                const badWords = config.badWords || [];
                const detectedBadWord = badWords.find((word) => text.toLowerCase().includes(word.toLowerCase()));
                const isYelling = text.length > 10 && text.replace(/[^A-Z]/g, '').length / text.length > 0.7;

                if (detectedBadWord || isYelling) {
                    console.log(`[${this.userId}] Anger detected in ${chatId}. Silencing.`);
                    await this.storeService.setSilence(chatId, true);
                    return;
                }
            }

            // Audio Processing
            const audioMessage = m.message.audioMessage || m.message.ephemeralMessage?.message?.audioMessage;


            // Audio Processing
            if (audioMessage && config.enableAudio !== false) {
                try {
                    const buffer = await downloadMediaMessage(
                        m,
                        'buffer',
                        {},
                        { logger: console, reuploadRequest: this.sock.updateMediaMessage },
                    );

                    const tempId = Date.now();
                    const inputPath = path.join(__dirname, `audio_${tempId}_${this.userId}.ogg`);
                    const outputPath = path.join(__dirname, `audio_${tempId}_${this.userId}.mp3`);

                    await fsPromises.writeFile(inputPath, buffer);

                    // Convert OGG to MP3 using ffmpeg with timeout protection
                    const conversionPromise = new Promise((resolve, reject) => {
                        import('fluent-ffmpeg').then(({ default: ffmpeg }) => {
                            ffmpeg(inputPath)
                                .toFormat('mp3')
                                .on('end', resolve)
                                .on('error', (err) => reject(new Error(`FFmpeg error: ${err.message}`)))
                                .save(outputPath);
                        });
                    });

                    const timeoutPromise = new Promise((_, reject) => {
                        setTimeout(() => {
                            reject(new Error(`FFmpeg conversion timeout after ${FFMPEG_TIMEOUT_MS}ms. Audio may be too long or corrupted.`));
                        }, FFMPEG_TIMEOUT_MS);
                    });

                    // Race: first to complete (conversion or timeout) wins
                    await Promise.race([conversionPromise, timeoutPromise]);

                    // Transcribe the converted MP3
                    text = await openaiService.transcribeAudio(outputPath, config);

                    // Cleanup
                    await fsPromises.unlink(inputPath).catch(() => { });
                    await fsPromises.unlink(outputPath).catch(() => { });
                } catch (error) {
                    console.error(`[${this.userId}] Error processing audio:`, error);
                }
            }

            if (text || mediaUrl || imageBase64) {
                // MARK AS READ (Blue Ticks)
                try {
                    await this.sock.readMessages([m.key]);
                } catch (e) {
                    // Ignore read receipt errors (e.g. connection closed) to prevent crash
                    // console.warn(`[${this.userId}] Failed to send read receipt:`, e.message);
                }

                // Save user message immediately (before bot starts thinking)
                // Now supports Media Saving
                const userMsg = await this.storeService.addMessage(
                    chatId,
                    'user',
                    text || '',
                    false, // isBroadcast
                    false, // isManual
                    messageId,
                    'READ',
                    false, // isReminder
                    mediaUrl,
                    mediaType
                );
                this.emitNewMessage(userMsg);

                if (isSilenced) {
                    console.log(`[${this.userId}] Chat ${chatId} is silenced. Skipping AI response.`);
                    return;
                }


                try {
                    await this.sock.sendPresenceUpdate('composing', chatId);
                } catch (e) { }

                const limit = parseInt(config.memoryWindow) || 10;
                let history = await this.storeService.getHistory(chatId, limit);

                // Remove the message we just saved from history to avoid duplication
                // because openaiService will append the current message/image manually
                if (history.length > 0 && history[history.length - 1].role === 'user') {
                    history.pop();
                }
                const delay = imageBase64 || audioMessage ? 1000 : Math.min(Math.max(text.length * 50, 1000), 3000);

                setTimeout(async () => {
                    let response = '';
                    let sentMsgId = null;

                    try {
                        response = await openaiService.generateResponse(text, history, imageBase64, config, mimeType);
                        if (!response) throw new Error('Empty response from OpenAI');

                        // ✅ VERIFY CONNECTION BEFORE SENDING
                        if (this.status !== 'connected') {
                            throw new Error(`Bot disconnected while generating response (status: ${this.status})`);
                        }

                        await this.sock.sendPresenceUpdate('composing', chatId);
                        await new Promise((resolve) => setTimeout(resolve, 1500));

                        await new Promise((resolve) => setTimeout(resolve, 1500));

                        const sentMsg = await this.sock.sendMessage(chatId, { text: response });
                        sentMsgId = sentMsg?.key?.id;
                        if (sentMsgId) this.botMessageIds.add(sentMsgId);

                    } catch (aiError) {
                        console.error(`[${this.userId}] CRITICAL AI FAILURE:`, aiError);

                        // Only attempt fallback if we're connected
                        if (config.fallbackMessage && this.status === 'connected') {
                            try {
                                response = config.fallbackMessage;
                                const sentMsg = await this.sock.sendMessage(chatId, { text: response });
                                sentMsgId = sentMsg?.key?.id;
                                if (sentMsgId) this.botMessageIds.add(sentMsgId);
                            } catch (fallbackError) {
                                console.error(`[${this.userId}] Failed to send fallback message:`, fallbackError.message);
                            }
                        } else if (this.status !== 'connected') {
                            console.warn(`[${this.userId}] Message lost due to disconnection. Response: "${response?.substring(0, 50)}..."`);
                        }
                    } finally {
                        try {
                            if (this.status === 'connected') {
                                await this.sock.sendPresenceUpdate('paused', chatId);
                            }
                        } catch (e) { }

                        if (response) {
                            const assistantMsg = await this.storeService.addMessage(chatId, 'assistant', response, false, false, sentMsgId, 'SENT');
                            this.emitNewMessage(assistantMsg);
                        }
                    }
                }, delay);
            }
        });
    }

    getStatus() {
        return { status: this.status, qr: this.qr };
    }

    getQR() {
        return this.qr;
    }

    async logout() {
        this.stopReminderScheduler();
        this.stopDeduplicationCleanup();
        console.log(`[${this.userId}] Logging out...`);
        try {
            this.isLoggingOut = true;
            if (this.sock) {
                try {
                    this.sock.end(undefined);
                } catch (e) { }
                this.sock = null;
            }

            await new Promise((resolve) => setTimeout(resolve, 3000));

            try {
                await fsPromises.rm(this.authDir, { recursive: true, force: true });
                console.log(`[${this.userId}] Session cleared.`);
            } catch (err) {
                console.error('Error deleting session files:', err);
            }

            this.status = 'disconnected';
            this.qr = '';
            this.userInfo = null;
            this.emitStatus();

            this.isLoggingOut = false;
            this.connectToWhatsApp();
        } catch (error) {
            console.error('Error during logout:', error);
            this.isLoggingOut = false;
        }
    }

    emitStatus() {
        if (this.io) {
            const eventPayload = {
                userId: this.userId,
                status: this.status,
                qr: this.qr,
                userInfo: this.userInfo,
            };

            // Emit to the specific user room
            // Note: If userId is 'default' (legacy), we might want to emit to all or a 'default' room.
            // But relying on socket.join(userId) covers it if 'default' user also joins 'default' room.

            if (this.userId === 'default') {
                this.io.emit('status', this.status);
                this.io.emit('qr', this.qr);
                if (this.userInfo) this.io.emit('connection_info', this.userInfo);
            } else {
                // Emit standard events to the room
                this.io.to(this.userId).emit('status', this.status);
                this.io.to(this.userId).emit('qr', this.qr);
                if (this.userInfo) this.io.to(this.userId).emit('connection_info', this.userInfo);
            }
        }
    }

    emitMessageStatus(messageId, status) {
        if (this.io) {
            const payload = { messageId, status };
            if (this.userId === 'default') {
                this.io.emit('message_status', payload);
            } else {
                this.io.to(this.userId).emit('message_status', payload);
            }
        }
    }

    emitNewMessage(message) {
        if (this.io) {
            if (this.userId === 'default') {
                this.io.emit('new_message', message);
            } else {
                this.io.to(this.userId).emit('new_message', message);
            }
        }
    }

    emitClientUpdate(clientData) {
        if (this.io) {
            if (this.userId === 'default') {
                this.io.emit('client_updated', clientData);
            } else {
                this.io.to(this.userId).emit('client_updated', clientData);
            }
        }
    }

    async updateConfig(newConfig) {
        this.config = await this.storeService.updateConfig(newConfig);
        // this.io.emit('config', this.config); // handled by controller/store mostly
    }

    startReminderScheduler() {
        if (this.reminderInterval) clearInterval(this.reminderInterval);

        console.log(`[${this.userId}] Reminder scheduler started (checking every minute)`);

        this.reminderInterval = setInterval(
            async () => {
                try {
                    const reminders = await this.storeService.getDueReminders();

                    if (reminders.length > 0) {
                        console.log(`[${this.userId}] Found ${reminders.length} due reminder(s)`);
                        const config = await this.storeService.getConfig();
                        const message = config.paymentMessage || 'Recordatorio de pago pendiente.';

                        for (const r of reminders) {
                            console.log(`[${this.userId}] Sending reminder to ${r.chatId}`);

                            // Send reminder message
                            const sentMsg = await this.sock.sendMessage(r.chatId, { text: message });
                            if (sentMsg?.key?.id) this.botMessageIds.add(sentMsg.key.id);
                            console.log(`[${this.userId}] ✅ Reminder sent to ${r.chatId}`);

                            // Log to history as Reminder
                            await this.storeService.addMessage(r.chatId, 'assistant', message, false, false, sentMsg?.key?.id, 'SENT', true);

                            // If recurring, create next reminder
                            if (r.recurrenceDays) {
                                const nextDate = new Date(r.dueDate);
                                nextDate.setDate(nextDate.getDate() + r.recurrenceDays);
                                await this.storeService.addReminder(
                                    r.chatId,
                                    nextDate.getTime(),
                                    r.recurrenceDays
                                );
                                console.log(`[${this.userId}] 🔄 Next reminder scheduled for ${nextDate.toLocaleString()}`);
                            }

                            // Remove current reminder
                            await this.storeService.removeReminder(r.id);
                        }
                    }
                } catch (error) {
                    console.error(`[${this.userId}] Error in reminder scheduler:`, error);
                }
            },
            60 * 1000, // Check every minute
        );
    }

    stopReminderScheduler() {
        if (this.reminderInterval) {
            clearInterval(this.reminderInterval);
            this.reminderInterval = null;
            console.log(`[${this.userId}] Reminder scheduler stopped.`);
        }
    }

    startDeduplicationCleanup() {
        if (this.deduplicationCleanupInterval) {
            clearInterval(this.deduplicationCleanupInterval);
        }

        console.log(`[${this.userId}] Deduplication cleanup started (TTL: 1 hour, runs every 5 minutes)`);

        this.deduplicationCleanupInterval = setInterval(() => {
            const oneHourAgo = Date.now() - (60 * 60 * 1000); // 1 hour in milliseconds
            let removedCount = 0;

            for (const [messageId, timestamp] of this.processedMessages.entries()) {
                if (timestamp < oneHourAgo) {
                    this.processedMessages.delete(messageId);
                    removedCount++;
                }
            }

            if (removedCount > 0) {
                console.log(`[${this.userId}] Cleaned up ${removedCount} old message IDs. Current size: ${this.processedMessages.size}`);
            }
        }, 5 * 60 * 1000); // Run every 5 minutes
    }

    stopDeduplicationCleanup() {
        if (this.deduplicationCleanupInterval) {
            clearInterval(this.deduplicationCleanupInterval);
            this.deduplicationCleanupInterval = null;
            console.log(`[${this.userId}] Deduplication cleanup stopped.`);
        }
    }

    async ensureConnection() {
        if (this.status === 'disconnected' && !this.isLoggingOut) {
            console.log(`[${this.userId}] Manual triggers connection...`);
            this.connectToWhatsApp();
        }
    }
}

export const whatsappService = new WhatsAppService(); // Default Singleton
