import { Router } from 'express';

const router = Router();

router.get('/health', (req, res) => {
  res.status(200).json({
    data: {
      status: 'ok',
      service: 'scopesentry-api',
      timestamp: new Date().toISOString()
    }
  });
});

export default router;
