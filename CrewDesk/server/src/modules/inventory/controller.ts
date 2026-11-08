import { Request, Response, NextFunction } from 'express';
import { inventoryService } from './service.js';
import {
  createInventoryItemSchema,
  assignAssetSchema,
  returnAssetSchema,
  stockMovementSchema,
} from './schemas.js';
import { InventoryKind, AssetStatus } from '@prisma/client';

export class InventoryController {
  createItem = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = createInventoryItemSchema.parse(req.body);
      const item = await inventoryService.createItem(req.user!, input);
      res.status(201).json({ success: true, data: item });
    } catch (err) {
      next(err);
    }
  };

  listItems = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const kind = req.query.kind as InventoryKind | undefined;
      const category = req.query.category as string | undefined;
      const status = req.query.status as AssetStatus | undefined;
      const items = await inventoryService.listItems(kind, category, status);
      res.json({ success: true, data: items });
    } catch (err) {
      next(err);
    }
  };

  listOwnAssets = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const assets = await inventoryService.listOwnAssignedAssets(req.user!.userId);
      res.json({ success: true, data: assets });
    } catch (err) {
      next(err);
    }
  };

  assignAsset = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = assignAssetSchema.parse(req.body);
      const item = await inventoryService.assignAsset(req.user!, req.params.id, input);
      res.json({ success: true, data: item });
    } catch (err) {
      next(err);
    }
  };

  returnAsset = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = returnAssetSchema.parse(req.body);
      const item = await inventoryService.returnAsset(req.user!, req.params.id, input);
      res.json({ success: true, data: item });
    } catch (err) {
      next(err);
    }
  };

  recordStockMovement = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = stockMovementSchema.parse(req.body);
      const item = await inventoryService.recordStockMovement(req.user!, req.params.id, input);
      res.json({ success: true, data: item });
    } catch (err) {
      next(err);
    }
  };

  getSummary = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const summary = await inventoryService.getInventorySummary();
      res.json({ success: true, data: summary });
    } catch (err) {
      next(err);
    }
  };
}

export const inventoryController = new InventoryController();
