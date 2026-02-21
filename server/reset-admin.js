import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function reset() {
    try {
        console.log('Purging existing users...');
        await prisma.user.deleteMany({});

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash('Yolismarlen20@', salt);

        await prisma.user.create({
            data: {
                username: 'Admin',
                passwordHash: hash,
                role: 'admin'
            }
        });

        console.log('successfully created Admin user');
    } catch (e) {
        console.error('Error resetting users:', e);
    } finally {
        await prisma.$disconnect();
    }
}

reset();
