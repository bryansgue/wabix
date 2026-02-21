import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createAdmin() {
    try {
        // List existing users
        const users = await prisma.user.findMany();
        console.log('\n📋 Usuarios existentes:');
        users.forEach(u => {
            console.log(`   - ${u.username} (${u.role}) - ID: ${u.id}`);
        });

        // Create new admin
        const username = 'admin';
        const password = 'Admin2026!';

        const existingUser = await prisma.user.findUnique({
            where: { username }
        });

        if (existingUser) {
            console.log(`\n⚠️  Usuario "${username}" ya existe`);
            return;
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                username,
                passwordHash: hashedPassword,
                role: 'ADMIN'
            }
        });

        console.log('\n✅ Nueva cuenta de administrador creada:');
        console.log('   👤 Usuario:', username);
        console.log('   🔑 Contraseña:', password);
        console.log('   🛡️  Rol: ADMIN');
        console.log('   🆔 ID:', user.id);
        console.log('\n💡 Usa estas credenciales para iniciar sesión');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

createAdmin();
