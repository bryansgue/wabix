import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function fixAdminRole() {
    try {
        // Update the admin user role to uppercase ADMIN
        const updated = await prisma.user.update({
            where: { username: 'admin' },
            data: { role: 'ADMIN' }
        });

        console.log('✅ Rol actualizado correctamente:');
        console.log('   Usuario:', updated.username);
        console.log('   Rol:', updated.role);

        // Also update Disney user password to be sure
        const hashedPassword = await bcrypt.hash('Disney2026', 10);
        const disney = await prisma.user.update({
            where: { username: 'Disney' },
            data: {
                passwordHash: hashedPassword,
                role: 'ADMIN'
            }
        });

        console.log('\n✅ Usuario Disney actualizado:');
        console.log('   Usuario: Disney');
        console.log('   Contraseña: Disney2026');
        console.log('   Rol:', disney.role);

        // List all users
        console.log('\n📋 Todos los usuarios:');
        const users = await prisma.user.findMany();
        users.forEach(u => {
            console.log(`   - ${u.username} (${u.role})`);
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

fixAdminRole();
