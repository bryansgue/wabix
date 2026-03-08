import { prisma } from './db.service.js';

class StateService {
    async ensureDefaultState(botId) {
        let defaultState = await prisma.state.findFirst({
            where: { botId, isDefault: true }
        });

        if (!defaultState) {
            const existingStates = await prisma.state.count({ where: { botId } });
            defaultState = await prisma.state.create({
                data: {
                    botId,
                    name: 'Sin clasificar',
                    isDefault: true,
                    orderIndex: existingStates
                }
            });
        }

        return defaultState;
    }

    async getStates(botId) {
        await this.ensureDefaultState(botId);
        return prisma.state.findMany({
            where: { botId },
            orderBy: { orderIndex: 'asc' },
            include: {
                _count: { select: { clients: true } }
            }
        });
    }

    async createState(botId, name) {
        const trimmedName = name?.trim();
        if (!trimmedName) throw new Error('State name is required');

        await this.ensureDefaultState(botId);
        const maxOrder = await prisma.state.aggregate({
            where: { botId },
            _max: { orderIndex: true }
        });

        return prisma.state.create({
            data: {
                botId,
                name: trimmedName,
                orderIndex: (maxOrder._max.orderIndex ?? 0) + 1
            }
        });
    }

    async updateState(botId, stateId, data) {
        const state = await prisma.state.findFirst({ where: { id: stateId, botId } });
        if (!state) throw new Error('State not found');

        const updateData = {};
        if (data.name) updateData.name = data.name.trim();
        if (typeof data.orderIndex === 'number') updateData.orderIndex = data.orderIndex;

        if (typeof data.isDefault === 'boolean') {
            if (data.isDefault) {
                await prisma.state.updateMany({ where: { botId }, data: { isDefault: false } });
                updateData.isDefault = true;
            } else if (state.isDefault) {
                throw new Error('El estado por defecto no puede desactivarse sin un reemplazo');
            }
        }

        return prisma.state.update({ where: { id: stateId }, data: updateData });
    }

    async reorderStates(botId, orderedIds = []) {
        const updates = orderedIds.map((stateId, index) =>
            prisma.state.updateMany({
                where: { id: stateId, botId },
                data: { orderIndex: index }
            })
        );

        if (updates.length) {
            await prisma.$transaction(updates);
        }

        return this.getStates(botId);
    }

    async deleteState(botId, stateId) {
        const state = await prisma.state.findFirst({ where: { id: stateId, botId } });
        if (!state) throw new Error('State not found');
        if (state.isDefault) {
            throw new Error('El estado por defecto no se puede eliminar');
        }

        const defaultState = await this.ensureDefaultState(botId);

        await prisma.client.updateMany({
            where: { botId, stateId: state.id },
            data: { stateId: defaultState.id }
        });

        await prisma.state.delete({ where: { id: state.id } });
        return { success: true };
    }
}

export const stateService = new StateService();
