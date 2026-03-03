import OpenAI from 'openai';
import fs from 'fs';
import { config as envConfig } from '../config/env.js';
import { prisma } from './db.service.js';
import { getPlanPolicy, PlanLimitError } from './plan.service.js';

class OpenAIService {
    constructor() { }

    async _getUserContext(userId) {
        if (!userId) return null;
        return prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, username: true, role: true, planType: true, remainingCredits: true },
        });
    }

    async _prepareClient({ userId, botConfig = {}, chargeCredit = false }) {
        const user = await this._getUserContext(userId);
        if (!user) {
            throw new PlanLimitError('USER_NOT_FOUND', 'No pudimos validar tu cuenta. Inicia sesión nuevamente.');
        }

        const policy = getPlanPolicy(user.planType || 'none', user.role || 'user');
        const customKey = botConfig?.openaiApiKey?.trim();
        const platformKey = policy.allowsPlatformKey !== false ? envConfig.openaiApiKey : null;

        if (policy.quotaType === 'custom-key' && !customKey) {
            throw new PlanLimitError('CUSTOM_KEY_REQUIRED', 'Tu plan requiere agregar tu propia OpenAI API Key en el Dashboard.');
        }

        const apiKey = customKey || platformKey;
        if (!apiKey) {
            throw new PlanLimitError('MISSING_OPENAI_KEY', 'No hay una API Key configurada. Agrega una en Configuración.');
        }

        let reservedCredit = false;
        if (chargeCredit && policy.quotaType === 'credits') {
            const updateResult = await prisma.user.updateMany({
                where: { id: user.id, remainingCredits: { gt: 0 } },
                data: { remainingCredits: { decrement: 1 } },
            });

            if (!updateResult.count) {
                throw new PlanLimitError('NO_CREDITS', 'Te quedaste sin mensajes incluidos en tu plan. Actualiza o agrega una API Key propia.');
            }
            reservedCredit = true;
        }

        return { apiKey, policy, user, reservedCredit };
    }

    async _refundCredit(userId) {
        if (!userId) return;
        try {
            await prisma.user.update({
                where: { id: userId },
                data: { remainingCredits: { increment: 1 } },
            });
        } catch (err) {
            console.error('Failed to refund credit:', err.message);
        }
    }

    /**
     * Validates OpenAI completion response and safely extracts content
     * @private
     */
    _validateAndExtractContent(completion) {
        // Validate completion object exists
        if (!completion) {
            throw new Error('OpenAI returned null/undefined completion');
        }

        // Validate choices array exists and is an array
        if (!completion.choices || !Array.isArray(completion.choices)) {
            console.error('Invalid completion structure:', JSON.stringify(completion));
            throw new Error('OpenAI response missing choices array');
        }

        // Validate choices array is not empty
        if (completion.choices.length === 0) {
            console.error('OpenAI returned empty choices array');
            throw new Error('OpenAI returned no response choices');
        }

        // Validate first choice has message
        const firstChoice = completion.choices[0];
        if (!firstChoice || !firstChoice.message) {
            console.error('Invalid choice structure:', JSON.stringify(firstChoice));
            throw new Error('OpenAI choice missing message object');
        }

        // Validate content exists and is a string
        const content = firstChoice.message.content;
        if (content === null || content === undefined) {
            console.error('Message content is null/undefined');
            throw new Error('OpenAI returned null/undefined content');
        }

        if (typeof content !== 'string') {
            console.error('Invalid message content type:', typeof content);
            throw new Error('OpenAI returned invalid content type');
        }

        // Validate content is not empty
        if (content.trim() === '') {
            console.warn('OpenAI returned empty content string');
            throw new Error('OpenAI returned empty response');
        }

        return content;
    }

    async generateResponse({ userId, userMessage, history = [], imageBase64 = null, config = null, mimeType = 'image/jpeg' }) {
        const currentConfig = config || {};
        let context = null;

        try {
            context = await this._prepareClient({
                userId,
                botConfig: currentConfig,
                chargeCredit: true,
            });

            const { apiKey } = context;

            const openai = new OpenAI({ apiKey });

            let systemMessageContent = currentConfig.systemPrompt || envConfig.meta?.systemPrompt || 'Eres Neo, un asistente virtual profesional y útil.';

            // Inject Business Context if available
            if (currentConfig.businessContext) {
                systemMessageContent += `\n\n[BASE DE CONOCIMIENTO / INFORMACIÓN DE NEGOCIO]:\n${currentConfig.businessContext}\n\nUsa esta información para responder preguntas sobre productos, precios o servicios.`;
            }

            // Sanitize History: OpenAI rejects empty content strings
            const sanitizedHistory = history.map(msg => ({
                role: msg.role,
                content: (msg.content && msg.content.trim() !== '') ? msg.content : '[Multimedia/Sin Texto]'
            }));

            const messages = [{ role: 'system', content: systemMessageContent }, ...sanitizedHistory];

            // Handle Vision Payload
            if (imageBase64 && currentConfig.enableVision) {
                // Force GPT-4o for vision tasks
                const visionModel = 'gpt-4o';

                messages.push({
                    role: 'user',
                    content: [
                        { type: 'text', text: userMessage || '¿Qué hay en esta imagen?' },
                        {
                            type: 'image_url',
                            image_url: {
                                url: `data:${mimeType};base64,${imageBase64}`,
                            },
                        },
                    ],
                });

                const completion = await openai.chat.completions.create({
                    messages: messages,
                    model: visionModel,
                    temperature: parseFloat(currentConfig.temperature) || 0.7,
                    max_tokens: parseInt(currentConfig.maxTokens) || 300,
                });

                // Validate and extract content safely
                return this._validateAndExtractContent(completion);
            } else {
                // Standard Text Flow
                messages.push({ role: 'user', content: userMessage });

                const completion = await openai.chat.completions.create({
                    messages: messages,
                    model: currentConfig.model || envConfig.meta?.model || 'gpt-3.5-turbo',
                    temperature: parseFloat(currentConfig.temperature) || 0.7,
                    max_tokens: parseInt(currentConfig.maxTokens) || 150,
                });

                // Validate and extract content safely
                return this._validateAndExtractContent(completion);
            }
        } catch (error) {
            if (error instanceof PlanLimitError) {
                throw error;
            }

            if (context?.reservedCredit && context?.user?.id) {
                await this._refundCredit(context.user.id);
            }

            console.error('OpenAI Error Details:', error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
            throw error; // Let the caller (WhatsAppService) handle the fallback message
        }
    }

    async transcribeAudio({ userId, audioPath, config = null }) {
        try {
            const currentConfig = config || {};
            const { apiKey } = await this._prepareClient({
                userId,
                botConfig: currentConfig,
                chargeCredit: false,
            });

            const openai = new OpenAI({ apiKey });

            const transcription = await openai.audio.transcriptions.create({
                file: fs.createReadStream(audioPath),
                model: 'whisper-1',
            });

            return transcription.text;
        } catch (error) {
            if (error instanceof PlanLimitError) {
                throw error;
            }
            console.error('Whisper Error:', error);
            return null;
        }
    }
}

export const openaiService = new OpenAIService();
