import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================
// 1. LOAD .ENV
// ============================================
const envPath = process.env.IS_DOCKER === 'true'
    ? path.join(__dirname, '../../.env')
    : path.join(__dirname, '../../.env');

const result = dotenv.config({ path: envPath });

if (result.error) {
    console.error('❌ FATAL: Failed to load .env file');
    console.error('   Path:', envPath);
    console.error('   Error:', result.error.message);
    console.error('\n   Please ensure .env file exists in the server directory');
    process.exit(1);
}

// ============================================
// 2. DEFINE REQUIRED VARIABLES
// ============================================
const REQUIRED_ENV_VARS = [
    'JWT_SECRET',
    'DATABASE_URL',
    'OPENAI_API_KEY',
    'ALLOWED_ORIGINS'
];

// ============================================
// 3. VALIDATE REQUIRED VARIABLES EXIST
// ============================================
const missing = REQUIRED_ENV_VARS.filter(varName => !process.env[varName]);

if (missing.length > 0) {
    console.error('❌ FATAL: Missing required environment variables:');
    missing.forEach(varName => {
        console.error(`   - ${varName}`);
    });
    console.error('\nPlease configure these in your .env file');
    console.error('See the documentation for required environment variables');
    process.exit(1);
}

// ============================================
// 4. VALIDATE JWT_SECRET STRENGTH
// ============================================
if (process.env.JWT_SECRET.length < 32) {
    console.error('❌ FATAL: JWT_SECRET must be at least 32 characters long');
    console.error('   Current length:', process.env.JWT_SECRET.length);
    console.error('\n   Generate a strong secret with:');
    console.error('   node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
    process.exit(1);
}

// Check for known weak secrets
const KNOWN_WEAK_SECRETS = [
    'super_secret_jwt_key_video_demo',
    'secret',
    'jwt_secret',
    'your-secret-key',
    'change-me'
];

if (KNOWN_WEAK_SECRETS.includes(process.env.JWT_SECRET)) {
    console.error('❌ FATAL: JWT_SECRET is using a known weak/demo value');
    console.error('   Current value:', process.env.JWT_SECRET);
    console.error('\n   Please generate a strong secret (see command above)');
    process.exit(1);
}

// ============================================
// 5. VALIDATE DATABASE_URL FORMAT
// ============================================
if (!process.env.DATABASE_URL.startsWith('postgresql://') &&
    !process.env.DATABASE_URL.startsWith('postgres://')) {
    console.error('❌ FATAL: DATABASE_URL must be a valid PostgreSQL connection string');
    console.error('   Expected format: postgresql://user:password@host:port/database');
    process.exit(1);
}

// ============================================
// 6. VALIDATE ALLOWED_ORIGINS FORMAT
// ============================================
const origins = process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim());
const invalidOrigins = origins.filter(origin => {
    return !origin.startsWith('http://') && !origin.startsWith('https://');
});

if (invalidOrigins.length > 0) {
    console.error('❌ FATAL: Invalid ALLOWED_ORIGINS format');
    console.error('   Each origin must start with http:// or https://');
    console.error('   Invalid origins:', invalidOrigins);
    console.error('\n   Example: ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com');
    process.exit(1);
}

// ============================================
// 7. VALIDATE OPENAI_API_KEY FORMAT
// ============================================
if (!process.env.OPENAI_API_KEY.startsWith('sk-')) {
    console.error('❌ FATAL: OPENAI_API_KEY appears to be invalid');
    console.error('   OpenAI API keys should start with "sk-"');
    process.exit(1);
}

// ============================================
// 8. WARN ABOUT DEVELOPMENT MODE
// ============================================
if (process.env.NODE_ENV !== 'production') {
    console.warn('⚠️  WARNING: Running in development mode');
    console.warn('   Set NODE_ENV=production for production deployment');
}

// ============================================
// 9. SUCCESS MESSAGE
// ============================================
console.log('✅ Environment variables validated successfully');
console.log(`   - JWT_SECRET: ${process.env.JWT_SECRET.length} characters`);
console.log(`   - DATABASE_URL: ${process.env.DATABASE_URL.split('@')[1] || 'configured'}`);
console.log(`   - OPENAI_API_KEY: ${process.env.OPENAI_API_KEY.substring(0, 7)}...`);
console.log(`   - ALLOWED_ORIGINS: ${origins.length} origin(s)`);
console.log(`   - NODE_ENV: ${process.env.NODE_ENV || 'development'}`);

// ============================================
// 10. EXPORT VALIDATED VARIABLES
// ============================================
export const JWT_SECRET = process.env.JWT_SECRET;
export const DATABASE_URL = process.env.DATABASE_URL;
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
export const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS;
export const PORT = parseInt(process.env.PORT || '3001', 10);
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const WEBHOOK_URL = process.env.WEBHOOK_URL;
export const SYSTEM_PROMPT = process.env.SYSTEM_PROMPT || 'Eres Neo, un asistente inteligente.';
export const AI_MODEL = process.env.AI_MODEL || 'gpt-3.5-turbo';
export const IS_DOCKER = process.env.IS_DOCKER === 'true';
