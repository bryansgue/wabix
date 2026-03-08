import { prisma } from './db.service.js';

class TagService {
    async getTags(botId) {
        return prisma.tag.findMany({
            where: { botId },
            orderBy: { createdAt: 'asc' }
        });
    }

    async createTag(botId, { name, color = '#00a884' }) {
        const trimmedName = name?.trim();
        if (!trimmedName) throw new Error('Tag name is required');
        return prisma.tag.create({
            data: {
                botId,
                name: trimmedName,
                color
            }
        });
    }

    async updateTag(botId, tagId, { name, color }) {
        const tag = await prisma.tag.findFirst({ where: { id: tagId, botId } });
        if (!tag) throw new Error('Tag not found');

        const data = {};
        if (name) data.name = name.trim();
        if (color) data.color = color;

        return prisma.tag.update({ where: { id: tagId }, data });
    }

    async deleteTag(botId, tagId) {
        const tag = await prisma.tag.findFirst({ where: { id: tagId, botId } });
        if (!tag) throw new Error('Tag not found');

        await prisma.contactTag.deleteMany({ where: { tagId } });
        await prisma.tag.delete({ where: { id: tagId } });
        return { success: true };
    }

    async updateClientTags(botId, clientId, tagIds = []) {
        const client = await prisma.client.findFirst({ where: { id: clientId, botId } });
        if (!client) throw new Error('Client not found');

        if (tagIds.length > 0) {
            const tags = await prisma.tag.findMany({ where: { botId, id: { in: tagIds } } });
            if (tags.length !== tagIds.length) {
                throw new Error('Una o más etiquetas no pertenecen a este negocio');
            }
        }

        await prisma.contactTag.deleteMany({ where: { clientId } });

        if (tagIds.length > 0) {
            await prisma.contactTag.createMany({
                data: tagIds.map(tagId => ({ clientId, tagId }))
            });
        }

        const updated = await prisma.client.findUnique({
            where: { id: clientId },
            include: {
                state: true,
                tagLinks: { include: { tag: true } }
            }
        });

        if (!updated) return null;

        const normalized = {
            ...updated,
            tags: updated.tagLinks?.map(link => link.tag) || []
        };
        delete normalized.tagLinks;
        return normalized;
    }
}

export const tagService = new TagService();
