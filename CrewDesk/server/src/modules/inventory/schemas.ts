import { z } from 'zod';
import { InventoryKind, AssetStatus, StockMovementType } from '@prisma/client';

export const createInventoryItemSchema = z
  .object({
    kind: z.nativeEnum(InventoryKind),
    name: z.string().min(2, 'Name must be at least 2 characters'),
    category: z.string().min(2, 'Category is required'),
    serialNumber: z.string().optional().nullable(),
    currentQuantity: z.number().int().nonnegative().optional().default(1),
    minQuantity: z.number().int().nonnegative().optional().default(0),
    location: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.kind === 'ASSET' && (!data.serialNumber || data.serialNumber.trim() === '')) {
        return false;
      }
      return true;
    },
    { message: 'Serial number / Asset tag is required for hardware assets.', path: ['serialNumber'] }
  );

export const assignAssetSchema = z.object({
  userId: z.string().uuid(),
  notes: z.string().optional().nullable(),
});

export const returnAssetSchema = z.object({
  condition: z.string().optional().nullable(),
  nextStatus: z.nativeEnum(AssetStatus).optional().default('AVAILABLE'),
  notes: z.string().optional().nullable(),
});

export const stockMovementSchema = z.object({
  type: z.nativeEnum(StockMovementType),
  quantity: z.number().int().positive('Quantity must be greater than zero'),
  reason: z.string().min(3, 'Reason must be at least 3 characters'),
});
