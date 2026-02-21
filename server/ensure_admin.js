import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function ensureAdmin() {
    const username = 'Admin';
    const password = 'Yolismarlen20@';
    const role = 'ADMIN';

    try {
        console.log(`Checking for user: ${username}...`);

        // Check if user exists
        const existingUser = await prisma.user.findUnique({
            where: { username }
        });

        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        if (existingUser) {
            console.log(`User ${username} found. Updating password and ensuring role...`);
            await prisma.user.update({
                where: { username },
                data: {
                    passwordHash,
                    role
                }
            });
            console.log(`✅ User ${username} updated successfully.`);
        } else {
            console.log(`User ${username} not found. Creating...`);
            await prisma.user.create({
                data: {
                    username,
                    passwordHash,
                    role
                }
            });
            console.log(`✅ User ${username} created successfully.`);
        }

    } catch (error) {
        console.error('❌ Error ensuring admin user:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

ensureAdmin();
