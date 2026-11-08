import { prisma } from '../../lib/prisma.js';
import { logAudit } from '../../lib/audit.js';
import { notify } from '../../lib/notify.js';
import { AuthenticatedUser } from '../../middleware/auth.js';
import {
  createInventoryItemSchema,
  assignAssetSchema,
  returnAssetSchema,
  stockMovementSchema,
} from './schemas.js';
import { z } from 'zod';
import { InventoryKind, AssetStatus, Prisma } from '@prisma/client';

export class InventoryService {
  async createItem(actor: AuthenticatedUser, input: z.infer<typeof createInventoryItemSchema>) {
    if (input.kind === 'ASSET') {
      const existing = await prisma.inventoryItem.findFirst({
        where: { serialNumber: input.serialNumber },
      });
      if (existing) {
        throw { status: 409, code: 'SERIAL_EXISTS', message: 'Asset with this serial number or tag already exists.' };
      }
    }

    const item = await prisma.inventoryItem.create({
      data: {
        kind: input.kind,
        name: input.name,
        category: input.category,
        serialNumber: input.kind === 'ASSET' ? input.serialNumber : null,
        assetStatus: input.kind === 'ASSET' ? 'AVAILABLE' : null,
        currentQuantity: input.kind === 'STOCK' ? input.currentQuantity : 1,
        minQuantity: input.kind === 'STOCK' ? input.minQuantity : 0,
        location: input.location || null,
        notes: input.notes || null,
      },
    });

    await logAudit(actor.userId, 'inventory:create-item', 'InventoryItem', item.id, null, {
      kind: item.kind,
      name: item.name,
      serialNumber: item.serialNumber,
    });

    return item;
  }

  async assignAsset(actor: AuthenticatedUser, itemId: string, input: z.infer<typeof assignAssetSchema>) {
    const item = await prisma.inventoryItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Inventory item not found.' };
    }

    if (item.kind !== 'ASSET') {
      throw { status: 400, code: 'NOT_AN_ASSET', message: 'Only hardware assets can be assigned to employees.' };
    }

    // Business rule: ASSET statuses: AVAILABLE, ASSIGNED, UNDER_MAINTENANCE, DAMAGED, RETIRED.
    if (item.assetStatus !== 'AVAILABLE') {
      throw {
        status: 400,
        code: 'ASSET_NOT_AVAILABLE',
        message: `Asset cannot be assigned because its current status is ${item.assetStatus}.`,
      };
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: input.userId },
    });

    if (!targetUser || !targetUser.isActive) {
      throw { status: 400, code: 'INVALID_USER', message: 'Target employee is either inactive or does not exist.' };
    }

    // Business rule: Assign/return runs in ONE transaction: history row, status, audit log.
    const result = await prisma.$transaction(async (tx) => {
      const updatedItem = await tx.inventoryItem.update({
        where: { id: itemId },
        data: {
          assetStatus: 'ASSIGNED',
          assignedUserId: targetUser.id,
        },
      });

      const assignment = await tx.assetAssignment.create({
        data: {
          itemId,
          userId: targetUser.id,
          assignedById: actor.userId,
          notes: input.notes || null,
        },
      });

      const audit = await tx.auditLog.create({
        data: {
          actorId: actor.userId,
          action: 'asset:assign',
          entityType: 'AssetAssignment',
          entityId: assignment.id,
          oldValues: { assetStatus: item.assetStatus, assignedUserId: null },
          newValues: { assetStatus: 'ASSIGNED', assignedUserId: targetUser.id, userName: targetUser.name },
        },
      });

      return { item: updatedItem, assignment, audit };
    });

    await notify(
      targetUser.id,
      'INVENTORY',
      `You have been assigned asset "${item.name}" (Serial: ${item.serialNumber || 'N/A'}).`,
      '/inventory'
    );

    return result.item;
  }

  async returnAsset(actor: AuthenticatedUser, itemId: string, input: z.infer<typeof returnAssetSchema>) {
    const item = await prisma.inventoryItem.findUnique({
      where: { id: itemId },
      include: { assignedUser: true },
    });

    if (!item) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Asset not found.' };
    }

    if (item.kind !== 'ASSET') {
      throw { status: 400, code: 'NOT_AN_ASSET', message: 'Item is not an asset.' };
    }

    if (item.assetStatus !== 'ASSIGNED') {
      throw {
        status: 400,
        code: 'ASSET_NOT_ASSIGNED',
        message: `Asset is not currently assigned (status is ${item.assetStatus}).`,
      };
    }

    const previousUserId = item.assignedUserId;

    // Business rule: Assign/return runs in ONE transaction: history row, status, audit log.
    const result = await prisma.$transaction(async (tx) => {
      // Find open assignment
      const activeAssignment = await tx.assetAssignment.findFirst({
        where: { itemId, returnedAt: null },
        orderBy: { assignedAt: 'desc' },
      });

      if (activeAssignment) {
        await tx.assetAssignment.update({
          where: { id: activeAssignment.id },
          data: {
            returnedAt: new Date(),
            returnedById: actor.userId,
            condition: input.condition || null,
            notes: input.notes ? `${activeAssignment.notes || ''} | ${input.notes}`.trim() : activeAssignment.notes,
          },
        });
      }

      const updatedItem = await tx.inventoryItem.update({
        where: { id: itemId },
        data: {
          assetStatus: input.nextStatus || 'AVAILABLE',
          assignedUserId: null,
        },
      });

      const audit = await tx.auditLog.create({
        data: {
          actorId: actor.userId,
          action: 'asset:return',
          entityType: 'InventoryItem',
          entityId: itemId,
          oldValues: { assetStatus: 'ASSIGNED', assignedUserId: previousUserId },
          newValues: { assetStatus: input.nextStatus || 'AVAILABLE', assignedUserId: null },
        },
      });

      return { item: updatedItem, audit };
    });

    if (previousUserId) {
      await notify(
        previousUserId,
        'INVENTORY',
        `Asset "${item.name}" (${item.serialNumber || 'N/A'}) has been officially checked in and returned.`,
        '/inventory'
      );
    }

    return result.item;
  }

  async recordStockMovement(actor: AuthenticatedUser, itemId: string, input: z.infer<typeof stockMovementSchema>) {
    const item = await prisma.inventoryItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Stock item not found.' };
    }

    if (item.kind !== 'STOCK') {
      throw { status: 400, code: 'NOT_STOCK', message: 'Item is not a consumable stock item.' };
    }

    const prev = item.currentQuantity;
    let nextQty = prev;

    if (input.type === 'IN') {
      nextQty = prev + input.quantity;
    } else if (input.type === 'OUT') {
      nextQty = prev - input.quantity;
      // Business rule: STOCK quantity can NEVER go negative
      if (nextQty < 0) {
        throw {
          status: 422,
          code: 'STOCK_CANNOT_BE_NEGATIVE',
          message: `Stock quantity cannot go negative. Current stock is ${prev}, cannot deduct ${input.quantity}.`,
        };
      }
    } else if (input.type === 'ADJUSTMENT') {
      nextQty = input.quantity;
      if (nextQty < 0) {
        throw { status: 422, code: 'STOCK_CANNOT_BE_NEGATIVE', message: 'Stock quantity cannot be set to negative.' };
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.inventoryItem.update({
        where: { id: itemId },
        data: { currentQuantity: nextQty },
      });

      const movement = await tx.stockMovement.create({
        data: {
          itemId,
          type: input.type,
          quantity: input.quantity,
          previousQuantity: prev,
          newQuantity: nextQty,
          reason: input.reason,
          recordedById: actor.userId,
        },
      });

      const audit = await tx.auditLog.create({
        data: {
          actorId: actor.userId,
          action: 'stock:move',
          entityType: 'StockMovement',
          entityId: movement.id,
          oldValues: { currentQuantity: prev },
          newValues: { currentQuantity: nextQty, movementType: input.type, quantity: input.quantity },
        },
      });

      return { item: updated, movement, audit };
    });

    return result.item;
  }

  async listItems(kind?: InventoryKind, category?: string, status?: AssetStatus) {
    const where: Prisma.InventoryItemWhereInput = {};
    if (kind) where.kind = kind;
    if (category) where.category = category;
    if (status) where.assetStatus = status;

    return prisma.inventoryItem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        assignedUser: { select: { id: true, name: true, email: true, department: { select: { name: true } } } },
        assignments: {
          take: 5,
          orderBy: { assignedAt: 'desc' },
          include: { user: { select: { name: true } } },
        },
        movements: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: { recordedBy: { select: { name: true } } },
        },
      },
    });
  }

  async listOwnAssignedAssets(userId: string) {
    return prisma.inventoryItem.findMany({
      where: {
        kind: 'ASSET',
        assignedUserId: userId,
      },
      include: {
        assignments: {
          where: { userId },
          orderBy: { assignedAt: 'desc' },
          take: 1,
        },
      },
    });
  }

  async getInventorySummary() {
    const [totalAssets, availableAssets, assignedAssets, maintenanceAssets, stockItems] = await Promise.all([
      prisma.inventoryItem.count({ where: { kind: 'ASSET' } }),
      prisma.inventoryItem.count({ where: { kind: 'ASSET', assetStatus: 'AVAILABLE' } }),
      prisma.inventoryItem.count({ where: { kind: 'ASSET', assetStatus: 'ASSIGNED' } }),
      prisma.inventoryItem.count({ where: { kind: 'ASSET', assetStatus: 'UNDER_MAINTENANCE' } }),
      prisma.inventoryItem.findMany({ where: { kind: 'STOCK' } }),
    ]);

    const lowStockAlerts = stockItems.filter((s) => s.currentQuantity <= s.minQuantity);

    return {
      totalAssets,
      availableAssets,
      assignedAssets,
      maintenanceAssets,
      totalStockSkus: stockItems.length,
      lowStockCount: lowStockAlerts.length,
      lowStockItems: lowStockAlerts.map((s) => ({
        id: s.id,
        name: s.name,
        currentQuantity: s.currentQuantity,
        minQuantity: s.minQuantity,
      })),
    };
  }
}

export const inventoryService = new InventoryService();
