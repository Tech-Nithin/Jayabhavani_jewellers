import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';

const router = Router();

const sampleProducts = [
  { id: 'r1', name: 'Eternal Solitaire Ring', category: 'Diamond Ring', price: 89500, oldPrice: null, badge: 'new', img: '/Eternal_Solitaire_Ring.jpg', color: '#e8d4c0' },
  { id: 'r2', name: 'Rose Gold Eternity Band', category: 'Gold Ring', price: 42000, oldPrice: 52000, badge: 'sale', img: '/Rose_Gold_Eternity_Band.png', color: '#d4b8a0' },
  { id: 'r3', name: 'Floral Diamond Cluster', category: 'Diamond Ring', price: 135000, oldPrice: null, badge: 'hot', img: '/Floral_Diamond_Cluster.png', color: '#c8a88c' },
  { id: 'r4', name: 'Classic Gold Band', category: 'Gold Ring', price: 28000, oldPrice: null, badge: null, img: '/classic_gold_band_ring.jpeg', color: '#e0c8b0' },
  { id: 'n1', name: 'Diamond Pendant Set', category: 'Diamond Necklace', price: 120000, oldPrice: null, badge: 'new', img: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=500&h=500&fit=crop&q=85', color: '#dcc8b0' },
  { id: 'n2', name: 'Gold Chain Layered Set', category: 'Gold Necklace', price: 68000, oldPrice: 82000, badge: 'sale', img: 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=500&h=500&fit=crop&q=85', color: '#cdb49a' },
  { id: 'e1', name: 'Diamond Stud Earrings', category: 'Diamond Earrings', price: 45000, oldPrice: null, badge: 'new', img: '/Diamond_Stud_Earrings.png', color: '#dcccc0' },
  { id: 'np1', name: 'Diamond Nose Pin', category: 'Diamond Nose Pin', price: 18500, oldPrice: null, badge: 'new', img: '/Diamond_Nose_Pin.jpeg', color: '#e8d8d0' },
];

const sampleCollections = [
  { id: 'col-rings', name: 'Rings', tag: 'New Arrivals', count: '48 Designs', href: '#rings', img: '/images/collection-rings.jpg', color: '#d4b8a0', large: true },
  { id: 'col-necklaces', name: 'Necklaces', tag: 'Bestseller', count: '62 Designs', href: '#necklaces', img: '/images/collection-necklaces.jpg', color: '#cdb49a' },
  { id: 'col-earrings', name: 'Earrings', tag: 'Trending', count: '55 Designs', href: '#earrings', img: '/images/collection-earrings.jpg', color: '#dcccc0' },
  { id: 'col-bangles', name: 'Bangles', tag: 'Classic', count: '34 Designs', href: '#bangles', img: '/images/collection-bangles.jpg', color: '#e0c8b0' },
  { id: 'col-nosepins', name: 'Nose Pins', tag: 'Exclusive', count: '28 Designs', href: '#nosepins', img: '/nose_pins.jpg', color: '#e8d8d0' },
];

// GET /api/products
router.get('/products', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase.from('products').select('*');
    if (error || !data || data.length === 0) {
      return res.json({ success: true, data: sampleProducts, source: 'fallback' });
    }
    return res.json({ success: true, data, source: 'supabase' });
  } catch (err) {
    return res.json({ success: true, data: sampleProducts, source: 'fallback' });
  }
});

// GET /api/collections
router.get('/collections', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase.from('collections').select('*');
    if (error || !data || data.length === 0) {
      return res.json({ success: true, data: sampleCollections, source: 'fallback' });
    }
    return res.json({ success: true, data, source: 'supabase' });
  } catch (err) {
    return res.json({ success: true, data: sampleCollections, source: 'fallback' });
  }
});

export default router;
