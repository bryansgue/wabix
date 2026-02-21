import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { PrismaClient } = require('@prisma/client');

class DBService {
    constructor() {
        // console.log('DATABASE_URL:', process.env.DATABASE_URL); // CRITICAL: Never log credentials in production
        // Optimización de Base de Datos para Producción
        this.prisma = new PrismaClient({
            log: process.env.NODE_ENV === 'production' ? ['error'] : ['error', 'warn'], // Reduced verbosity
            datasources: {
                db: {
                    url: process.env.DATABASE_URL
                },
            },
            // Prisma Connection Pool Configuration
            // Note: Prisma manages pool internally, but we can tune it via connection string arguments usually.
            // However, ensuring explicit configuration here helps documentation.
            // Ideally, the connection limit is set in the DATABASE_URL query param ?connection_limit=20
        });
    }

    get client() {
        return this.prisma;
    }

    async disconnect() {
        await this.prisma.$disconnect();
    }
}

export const dbService = new DBService();
export const prisma = dbService.client;
