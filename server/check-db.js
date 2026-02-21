import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkMessages() {
    try {
        const count = await prisma.message.count();
        const messages = await prisma.message.findMany({ take: 5 });

        console.log(`Total Messages in DB: ${count}`);
        console.log('Sample messages:', JSON.stringify(messages, null, 2));

    } catch (error) {
        console.error('Error checking DB:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkMessages();
