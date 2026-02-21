import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root or server root
const envPath =
    process.env.IS_DOCKER === 'true'
        ? path.join(__dirname, '../../.env')
        : path.join(__dirname, '../../.env'); // Always look in server/ .env for now

dotenv.config({ path: envPath });

export const config = {
    port: process.env.PORT || 3001,
    openaiApiKey: process.env.OPENAI_API_KEY,
    webhookUrl: process.env.WEBHOOK_URL,
    meta: {
        systemPrompt: process.env.SYSTEM_PROMPT || 'Eres Neo, un asistente inteligente.',
        model: process.env.AI_MODEL || 'gpt-3.5-turbo',
    },
};
