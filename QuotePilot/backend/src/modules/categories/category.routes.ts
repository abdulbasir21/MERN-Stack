import { Router } from 'express';
import { CategoryController } from './category.controller';

const router = Router();

// GET /api/v1/categories (public)
router.get('/', CategoryController.getCategories);

export default router;
