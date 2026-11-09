import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { demoGuard } from '../../middleware/demoGuard.js';
import { inventoryController } from './controller.js';

const router = Router();

// Own assigned hardware (Employee self-service)
router.get('/my-assets', authenticate, requirePermission('asset:read-own'), inventoryController.listOwnAssets);

// Inventory items management
router.post(
  '/items',
  authenticate,
  requirePermission('inventory:manage'),
  demoGuard('BLOCK', { actionName: 'inventory:create-item' }),
  inventoryController.createItem
);
router.get('/items', authenticate, requirePermission('inventory:manage'), inventoryController.listItems);

// Asset assign / return
router.post(
  '/items/:id/assign',
  authenticate,
  requirePermission('asset:assign'),
  demoGuard('BLOCK', { actionName: 'asset:assign' }),
  inventoryController.assignAsset
);
router.post(
  '/items/:id/return',
  authenticate,
  requirePermission('asset:assign'),
  demoGuard('BLOCK', { actionName: 'asset:return' }),
  inventoryController.returnAsset
);

// Stock movements
router.post(
  '/items/:id/movement',
  authenticate,
  requirePermission('stock:move'),
  demoGuard('BLOCK', { actionName: 'stock:move' }),
  inventoryController.recordStockMovement
);

// Inventory Summary / Reports
router.get('/summary', authenticate, requirePermission('inventory:report'), inventoryController.getSummary);

export default router;
