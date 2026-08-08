import { Router, Request, Response } from 'express';

const router = Router();

let productsList = [
  { id: 'r1', name: 'Eternal Solitaire Ring', category: 'Rings', price: 89500, old_price: null, badge: 'new', img: '/Eternal_Solitaire_Ring.jpg', weight_grams: 4.250, color: '#e8d4c0', stock_quantity: 5 },
  { id: 'r2', name: 'Rose Gold Eternity Band', category: 'Rings', price: 42000, old_price: 52000, badge: 'sale', img: '/Rose_Gold_Eternity_Band.png', weight_grams: 5.100, color: '#d4b8a0', stock_quantity: 8 },
  { id: 'r3', name: 'Floral Diamond Cluster', category: 'Rings', price: 135000, old_price: null, badge: 'hot', img: '/Floral_Diamond_Cluster.png', weight_grams: 6.800, color: '#c8a88c', stock_quantity: 3 },
  { id: 'r4', name: 'Classic Gold Band', category: 'Rings', price: 28000, old_price: null, badge: null, img: '/classic_gold_band_ring.jpeg', weight_grams: 3.500, color: '#e0c8b0', stock_quantity: 12 },
];

// GET /api/inventory/products
router.get('/products', (req: Request, res: Response) => {
  res.json({
    success: true,
    module: 'inventory-backend',
    products: productsList,
  });
});

// POST /api/inventory/products
router.post('/products', (req: Request, res: Response) => {
  const { name, category = 'General', price, weight_grams, img = '/classic_gold_band_ring.jpeg', badge, color = '#e8d4c0' } = req.body;

  if (!name || !price || !weight_grams) {
    return res.status(400).json({ success: false, message: 'Missing required product fields' });
  }

  const newProduct = {
    id: `prod-${Date.now()}`,
    name,
    category,
    price: Number(price),
    old_price: null,
    badge: badge || null,
    img,
    weight_grams: Number(weight_grams),
    color,
    stock_quantity: 1,
  };

  productsList.unshift(newProduct);
  res.json({ success: true, product: newProduct });
});

// GET /api/inventory/items
router.get('/items', (req: Request, res: Response) => {
  res.json({
    success: true,
    module: 'inventory-backend',
    inventory: productsList,
  });
});

export default router;
