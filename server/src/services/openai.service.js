import OpenAI from 'openai';
import { config } from '../config/env.js';
import { storeService } from './store.service.js';
import fs from 'fs';

class OpenAIService {
    constructor() { }

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

    async generateResponse(userMessage, history = [], imageBase64 = null, config = null, mimeType = 'image/jpeg') {
        try {
            const currentConfig = config || (await storeService.getConfig()); // Fallback to default if not provided

            if (!currentConfig.openaiApiKey) {
                console.error('OpenAI API Key is missing in configuration');
                return '⚠️ Error: No se ha configurado la API Key de OpenAI. Por favor agrégala en el Dashboard.';
            }

            const openai = new OpenAI({
                apiKey: currentConfig.openaiApiKey,
            });

            let systemMessageContent = currentConfig.systemPrompt;

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
                    model: currentConfig.model || 'gpt-3.5-turbo',
                    temperature: parseFloat(currentConfig.temperature) || 0.7,
                    max_tokens: parseInt(currentConfig.maxTokens) || 150,
                });

                // Validate and extract content safely
                return this._validateAndExtractContent(completion);
            }
        } catch (error) {
            console.error('OpenAI Error Details:', error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
            throw error; // Let the caller (WhatsAppService) handle the fallback message
        }
    }

    async transcribeAudio(audioPath, config = null) {
        try {
            const currentConfig = config || (await storeService.getConfig());

            if (!currentConfig.openaiApiKey) {
                console.error('OpenAI API Key is missing for transcription');
                return null;
            }

            const openai = new OpenAI({
                apiKey: currentConfig.openaiApiKey,
            });

            const transcription = await openai.audio.transcriptions.create({
                file: fs.createReadStream(audioPath),
                model: 'whisper-1',
            });

            return transcription.text;
        } catch (error) {
            console.error('Whisper Error:', error);
            return null;
        }
    }
}

export const openaiService = new OpenAIService();
