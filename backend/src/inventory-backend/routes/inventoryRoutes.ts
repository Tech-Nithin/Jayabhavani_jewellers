import { Router, Request, Response } from 'express';

const router = Router();

// GET /api/inventory/items
router.get('/items', (req: Request, res: Response) => {
  res.json({
    success: true,
    module: 'inventory-backend',
    inventory: [
      { id: 'RNG-01', name: 'Solitaire Diamond Ring', category: 'Rings', price: 125000, stock: 12 },
      { id: 'NCK-01', name: 'Royal Gold Choker', category: 'Necklaces', price: 245000, stock: 5 },
      { id: 'EAR-01', name: 'Chandelier Gold Drops', category: 'Earrings', price: 85000, stock: 8 },
    ],
  });
});

export default router;
