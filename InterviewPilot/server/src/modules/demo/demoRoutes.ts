import { Router } from 'express';
import { handleCreateDemoSession, handleGetDemoSamples } from './demoController.js';

export const demoRouter = Router();

// DEM-1: Public endpoint to create ephemeral demo session
demoRouter.post('/session', handleCreateDemoSession);

// DEM-5: Read-only sample fixtures
demoRouter.get('/samples', handleGetDemoSamples);
