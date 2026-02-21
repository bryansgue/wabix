import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function recreateUser() {
    try {
        // Check if user exists
        const existingUser = await prisma.user.findUnique({
            where: { username: 'Disney' }
        });

        if (existingUser) {
            console.log('✅ User "Disney" already exists');
            return;
        }

        // Create user with hashed password
        const hashedPassword = await bcrypt.hash('Disney2026', 10);

        const user = await prisma.user.create({
            data: {
                username: 'Disney',
                passwordHash: hashedPassword,
                role: 'ADMIN'
            }
        });

        console.log('✅ User created successfully:');
        console.log('   Username: Disney');
        console.log('   Password: Disney2026');
        console.log('   Role: ADMIN');
        console.log('   ID:', user.id);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

recreateUser();
