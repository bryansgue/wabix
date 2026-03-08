import { prisma } from './src/services/db.service.js';

async function fixMessageStatus() {
    try {
        console.log('Fixing message status...');
        
        // Set any null status to SENT
        const updated = await prisma.message.updateMany({
            where: {
                status: null
            },
            data: {
                status: 'SENT'
            }
        });
        
        console.log(`Updated ${updated.count} messages with null status to SENT`);
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

fixMessageStatus();
