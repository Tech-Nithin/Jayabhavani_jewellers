import { Router, Request, Response } from 'express';

const router = Router();

// GET /api/dashboard/stats
router.get('/stats', (req: Request, res: Response) => {
  res.json({
    success: true,
    module: 'dashboard-backend',
    stats: {
      totalItems: 42,
      activeCollections: 5,
      monthlyRevenue: 1845000,
      activeUsers: 128,
    },
  });
});

export default router;
