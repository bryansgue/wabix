import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateClient() {
    try {
        const chatId = '593960745670@s.whatsapp.net'; // Un número de tus logs
        // Buscar el cliente primero para obtener botId
        const client = await prisma.client.findFirst({
            where: { chatId }
        });

        if (!client) {
            console.log('Cliente no encontrado');
            return;
        }

        console.log(`Actualizando cliente ${client.name} (${client.chatId})...`);

        await prisma.client.update({
            where: { id: client.id }, // Usar ID directo si es posible
            data: { lastBroadcastAt: new Date() }
        });

        console.log('Cliente actualizado con fecha de hoy. Revisa el frontend.');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

updateClient();
