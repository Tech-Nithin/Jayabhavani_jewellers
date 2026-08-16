import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';

const router = Router();

// GET /api/product-card/rates - Fetch active metal values specifically for product card calculations
router.get('/rates', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('updated_metal_values')
      .select('*')
      .eq('id', 1)
      .single();

    if (error) {
      console.warn('Supabase fetch rates warning:', error.message);
      return res.json({
        success: true,
        rates: {
          gold_sell_value: 14700,
          silver_sell_value: 270,
        }
      });
    }

    const rates = {
      gold_sell_value: data ? Number(data.gold_sell_value) || 0 : 0,
      silver_sell_value: data ? Number(data.silver_sell_value) || 0 : 0,
    };

    return res.json({
      success: true,
      rates,
    });
  } catch (err) {
    console.error('Product card rates fetch error:', err);
    return res.json({
      success: true,
      rates: {
        gold_sell_value: 14700,
        silver_sell_value: 270,
      }
    });
  }
});

export default router;
