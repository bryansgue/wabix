import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const defaultEnvPath = path.resolve(__dirname, '../../../.env');
const envPath = process.env.ENV_FILE_PATH
    ? path.resolve(process.env.ENV_FILE_PATH)
    : defaultEnvPath;

if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
} else {
    dotenv.config();
}

export const config = {
    port: process.env.PORT || 3001,
    openaiApiKey: process.env.OPENAI_API_KEY,
    webhookUrl: process.env.WEBHOOK_URL,
    meta: {
        systemPrompt: process.env.SYSTEM_PROMPT || 'Eres Neo, un asistente inteligente.',
        model: process.env.AI_MODEL || 'gpt-3.5-turbo',
    },
};
