import { Router, Request, Response } from 'express';
import multer from 'multer';
import { supabase } from '../../config/supabase';
import { uploadToCloudinaryAsWebP, uploadToCloudinaryFile } from '../../utils/cloudinaryHelper';
import { memoryCache } from '../../config/memoryCache';
import { getNowISTISO, getTodayIST } from '../../utils/dateHelper';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// GET /api/inventory/products
router.get('/products', async (req: Request, res: Response) => {
  try {
    const { category } = req.query;

    let queryBuilder = supabase
      .from('inventory_products')
      .select('*');

    if (category && typeof category === 'string' && category.toLowerCase() !== 'all') {
      let searchVal = category.trim();
      if (searchVal.toLowerCase().endsWith('s') && searchVal.length > 3) {
        searchVal = searchVal.slice(0, -1);
      }
      queryBuilder = queryBuilder.ilike('category', `%${searchVal}%`);
    }

    const { data, error } = await queryBuilder.order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase fetch error:', error.message);
      return res.json({
        success: true,
        module: 'inventory-backend',
        products: [],
      });
    }

    const formattedProducts = (data || []).map((item) => ({
      id: item.id,
      name: item.item_name || `${item.item_type || 'GOLD'} ${item.category}`,
      category: item.category,
      item_type: item.item_type || 'GOLD',
      price: Number(item.price || 0),
      weight_grams: Number(item.current_stock_weight ?? item.weight_from_grams ?? 0),
      current_stock_weight: Number(item.current_stock_weight ?? item.weight_from_grams ?? 0),
      sold_quantity: Number(item.sold_quantity ?? 0),
      sell_count: Number(item.sell_count ?? 0),
      weight_from_grams: Number(item.weight_from_grams || 0),
      weight_to_grams: Number(item.weight_to_grams || item.weight_from_grams || 0),
      img: item.img,
    }));

    return res.json({
      success: true,
      module: 'inventory-backend',
      products: formattedProducts,
    });
  } catch (err) {
    console.error('Database query error:', err);
    return res.json({
      success: true,
      module: 'inventory-backend',
      products: [],
    });
  }
});

// Reliable Helper function: Upload image to Cloudinary as WebP
async function uploadToCloudinaryHelper(imageStr: string): Promise<string> {
  if (!imageStr || imageStr.startsWith('http://') || imageStr.startsWith('https://')) {
    return imageStr || '/Eternal_Solitaire_Ring.jpg';
  }

  try {
    const webpUrl = await uploadToCloudinaryAsWebP(imageStr, 'inventory_products');
    if (webpUrl && (webpUrl.startsWith('http://') || webpUrl.startsWith('https://'))) {
      return webpUrl;
    }
  } catch (err) {
    console.warn('⚠️ Primary uploadToCloudinaryAsWebP warning:', err);
  }

  // Backup fallback upload preset if SDK env vars are missing
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'kkwteo4l';
  const preset = process.env.CLOUDINARY_UPLOAD_PRESET || 'jewellery_preset';

  try {
    const formData = new FormData();
    formData.append('file', imageStr);
    formData.append('upload_preset', preset);
    formData.append('folder', 'inventory_products');
    formData.append('format', 'webp');

    console.log(`📤 Uploading image to Cloudinary (${cloudName}, folder: inventory_products, format: webp)...`);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: formData,
    });

    const data: any = await res.json();
    if (data.secure_url) {
      const optimizedWebpUrl = data.secure_url.replace('/upload/', '/upload/f_auto,q_auto/').replace(/\.(png|jpg|jpeg)$/i, '.webp');
      console.log('✨ Successfully uploaded WebP image to Cloudinary:', optimizedWebpUrl);
      return optimizedWebpUrl;
    }
  } catch (err) {
    console.error('❌ Cloudinary fallback upload error:', err);
  }

  return imageStr;
}

// Helper function: Generate Sequential Category ID (cat-01, cat-02, cat-03...)
async function generateSequentialCategoryId(): Promise<string> {
  try {
    const { data } = await supabase
      .from('inventory_category')
      .select('id');

    let maxNum = 0;
    if (data && data.length > 0) {
      for (const row of data) {
        if (row.id && typeof row.id === 'string' && row.id.startsWith('cat-')) {
          const numPart = parseInt(row.id.replace('cat-', ''), 10);
          if (!isNaN(numPart) && numPart > maxNum) {
            maxNum = numPart;
          }
        }
      }
    }
    const nextNum = maxNum + 1;
    const formattedNum = nextNum < 10 ? `0${nextNum}` : `${nextNum}`;
    return `cat-${formattedNum}`;
  } catch (err) {
    return `cat-01`;
  }
}

// Helper function: Auto Save Category to Supabase inventory_category table
async function autoSaveCategoryToSupabase(catName: string) {
  if (!catName || !catName.trim()) return;
  const trimmed = catName.trim();
  try {
    const { data: existing } = await supabase
      .from('inventory_category')
      .select('*')
      .ilike('name', trimmed);

    if (!existing || existing.length === 0) {
      const id = await generateSequentialCategoryId();
      const { data, error } = await supabase
        .from('inventory_category')
        .insert([{ id, name: trimmed }])
        .select();

      if (error) {
        console.warn('Auto category save warning:', error.message);
      } else {
        console.log(`✨ Auto-saved category (${id}: ${trimmed}) to Supabase inventory_category table:`, data);
      }
    }
  } catch (err) {
    console.error('Auto save category error:', err);
  }
}

// POST /api/inventory/products
router.post('/products', async (req: Request, res: Response) => {
  const {
    name,
    category = 'General',
    item_type = 'GOLD',
    price = 0,
    weight_grams,
    weight_from_grams,
    weight_to_grams,
    stock_quantity,
    img = '/classic_gold_band_ring.jpeg',
  } = req.body;

  const finalCategory = category || 'General Product';
  const finalWeightFrom = Number(weight_from_grams || 0);
  const finalWeightTo = Number(weight_to_grams || finalWeightFrom);
  const finalTotalWeight = Number(weight_grams || finalWeightFrom || 0);
  const finalStockQty = Number(stock_quantity || 0);

  const id = `prod-${Date.now()}`;
  const itemName = name || `${item_type === 'GOLD' ? 'Gold' : 'Silver'} ${finalCategory}`;

  // Auto-save category to Supabase inventory_category table
  await autoSaveCategoryToSupabase(finalCategory);

  // Automatically upload image to Cloudinary in WebP format if base64 data URL
  const cloudinaryWebpUrl = await uploadToCloudinaryHelper(img);

    const newProductObj = {
      id,
      item_name: itemName,
      category: finalCategory,
      item_type: (item_type || 'GOLD').toUpperCase() === 'SILVER' ? 'SILVER' : 'GOLD',
      weight_from_grams: finalWeightFrom,
      weight_to_grams: finalWeightTo,
      current_stock_weight: finalTotalWeight,
      sold_quantity: 0.000,
      sell_count: 0,
      img: cloudinaryWebpUrl,
      price: Number(price || 0),
      bill_date: getTodayIST(),
      created_at: getNowISTISO(),
    };

    try {
      const { data, error } = await supabase
        .from('inventory_products')
        .insert([newProductObj])
        .select();

      if (error) {
        console.warn('Supabase insert warning:', error.message);
      } else {
        console.log('✨ Successfully inserted into inventory_products table:', data);
        
        // Insert opening log into inventory_stock_logs (item_id is Foreign Key to inventory_products.id)
        if (finalTotalWeight > 0) {
          const { error: logErr } = await supabase
            .from('inventory_stock_logs')
            .insert([{
              item_id: id,
              item_name: itemName,
              metal_category: (item_type || 'GOLD').toUpperCase() === 'SILVER' ? 'SILVER' : 'GOLD',
              item_category: finalCategory,
              previous_stock_weight: 0.000,
              new_stock_weight: finalTotalWeight,
              notes: `Initial stock loaded (${finalTotalWeight}g)`,
              created_at: getNowISTISO(),
            }]);

          if (logErr) {
            console.warn('⚠️ Stock log insert warning:', logErr.message);
          } else {
            console.log(`✨ Successfully created initial stock log for item_id: ${id}`);
          }
        }
      }
    } catch (dbErr) {
      console.error('Database connection error:', dbErr);
    }

    const responseProduct = {
      id,
      name: itemName,
      category: finalCategory,
      item_type,
      price: Number(price || 0),
      weight_grams: finalTotalWeight,
      current_stock_weight: finalTotalWeight,
      sold_quantity: 0.000,
      sell_count: 0,
      weight_from_grams: finalWeightFrom,
      weight_to_grams: finalWeightTo,
      img: cloudinaryWebpUrl,
    };

    memoryCache.clear();

    res.json({ success: true, product: responseProduct });
  });

// POST /api/inventory/products/:id/restock - Restock existing inventory quantity
router.post('/products/:id/restock', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { restock_weight, notes } = req.body;
    const weightToAdd = Math.max(0, Number(restock_weight || 0));

    const { data: existing, error: findErr } = await supabase
      .from('inventory_products')
      .select('*')
      .eq('id', id)
      .single();

    if (findErr || !existing) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const currentStockWeight = Number(existing.current_stock_weight ?? existing.weight_from_grams ?? 0);
    const newStockWeight = Number((currentStockWeight + weightToAdd).toFixed(3));

    const { recordInventoryMovement } = await import('../../utils/inventoryLedgerHelper');
    await recordInventoryMovement({
      itemId: id,
      itemName: existing.item_name || existing.name || existing.category,
      itemType: (existing.item_type || 'GOLD').toUpperCase() === 'SILVER' ? 'SILVER' : 'GOLD',
      eventType: 'RESTOCK',
      weightDeltaGrams: weightToAdd,
      referenceType: 'MANUAL',
      notes: notes || `Restocked +${weightToAdd}g by shop owner`,
    });

    await supabase.from('inventory_stock_logs').insert([{
      item_id: id,
      item_name: existing.item_name || existing.name || existing.category,
      metal_category: existing.item_type || 'GOLD',
      item_category: existing.category || 'General',
      previous_stock_weight: currentStockWeight,
      new_stock_weight: newStockWeight,
      notes: notes || `Restocked +${weightToAdd}g by shop owner`,
    }]);

    memoryCache.clear();

    res.json({
      success: true,
      message: `Successfully restocked +${weightToAdd}g!`,
      current_stock_weight: newStockWeight,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to restock product' });
  }
});

// GET /api/inventory/products/:id/logs - Fetch chronological stock history logs
router.get('/products/:id/logs', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('inventory_stock_logs')
      .select('*')
      .eq('item_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      return res.json({ success: true, logs: [] });
    }

    res.json({ success: true, logs: data || [] });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/inventory/upload-cloudinary (Supports direct binary WebP file via multipart/form-data or legacy payload)
router.post('/upload-cloudinary', upload.any(), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (files && files.length > 0) {
      const file = files[0];
      console.log(`📤 Uploading direct binary WebP file (${file.size} bytes) to Cloudinary...`);
      const url = await uploadToCloudinaryFile(
        file.buffer,
        file.originalname || `inv_${Date.now()}.webp`,
        'inventory_products'
      );
      return res.json({ success: true, url });
    }

    const { image } = req.body || {};
    if (!image) {
      return res.status(400).json({ success: false, message: 'No image file or data provided' });
    }

    const cloudinaryWebpUrl = await uploadToCloudinaryHelper(image);
    return res.json({ success: true, url: cloudinaryWebpUrl });
  } catch (err: any) {
    console.error('Backend Cloudinary upload error:', err.message || err);
    return res.status(500).json({ success: false, message: 'Upload failed', url: '' });
  }
});

// GET /api/inventory/items
router.get('/items', async (req: Request, res: Response) => {
  try {
    const { data } = await supabase
      .from('inventory_products')
      .select('*')
      .order('created_at', { ascending: false });

    res.json({
      success: true,
      module: 'inventory-backend',
      inventory: data || [],
    });
  } catch (err) {
    res.json({
      success: true,
      module: 'inventory-backend',
      inventory: [],
    });
  }
});

// PUT /api/inventory/products/:id
router.put('/products/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    name,
    category,
    item_type,
    price = 0,
    weight_grams,
    weight_from_grams,
    weight_to_grams,
    current_stock_weight,
    img,
  } = req.body;

  try {
    // 1. Fetch existing item to check previous stock weight
    const { data: existingData } = await supabase
      .from('inventory_products')
      .select('*')
      .eq('id', id)
      .single();

    const finalCategory = category || existingData?.category || 'General';
    const finalWeightFrom = Number(weight_from_grams ?? existingData?.weight_from_grams ?? 0);
    const finalWeightTo = Number(weight_to_grams ?? existingData?.weight_to_grams ?? finalWeightFrom);
    const itemName = name || existingData?.item_name || `${item_type === 'GOLD' ? 'Gold' : 'Silver'} ${finalCategory}`;
    const previousStockWeight = Number(existingData?.current_stock_weight ?? existingData?.weight_from_grams ?? 0);

    const newStockWeight = Number(
      current_stock_weight !== undefined
        ? current_stock_weight
        : weight_grams !== undefined
        ? weight_grams
        : previousStockWeight
    );

    // Auto-save category to Supabase inventory_category table
    await autoSaveCategoryToSupabase(finalCategory);

    let finalImgUrl = img;
    if (img && img.startsWith('data:')) {
      finalImgUrl = await uploadToCloudinaryHelper(img);
    }

    const updatedProductObj: any = {
      item_name: itemName,
      category: finalCategory,
      item_type: item_type || existingData?.item_type || 'GOLD',
      weight_from_grams: finalWeightFrom,
      weight_to_grams: finalWeightTo,
      current_stock_weight: newStockWeight,
      price: Number(price || 0),
    };

    if (finalImgUrl) {
      updatedProductObj.img = finalImgUrl;
    }

    const { data, error } = await supabase
      .from('inventory_products')
      .update(updatedProductObj)
      .eq('id', id)
      .select();

    if (error) {
      console.warn('Supabase update warning:', error.message);
      return res.status(500).json({ success: false, message: error.message });
    }

    // 2. Insert update/adjustment log into inventory_stock_logs
    const { error: logErr } = await supabase
      .from('inventory_stock_logs')
      .insert([{
        item_id: id,
        item_name: itemName,
        metal_category: item_type || existingData?.item_type || 'GOLD',
        item_category: finalCategory,
        previous_stock_weight: previousStockWeight,
        new_stock_weight: newStockWeight,
        notes: `Updated item details (Stock: ${previousStockWeight}g ➔ ${newStockWeight}g)`,
      }]);

    if (logErr) {
      console.warn('⚠️ Stock log edit insert warning:', logErr.message);
    }

    memoryCache.clear();

    const updatedProduct = {
      id,
      name: itemName,
      category: finalCategory,
      item_type: item_type || existingData?.item_type || 'GOLD',
      price: Number(price || 0),
      weight_grams: newStockWeight,
      current_stock_weight: newStockWeight,
      sold_quantity: Number(existingData?.sold_quantity || 0),
      sell_count: Number(existingData?.sell_count || 0),
      weight_from_grams: finalWeightFrom,
      weight_to_grams: finalWeightTo,
      img: finalImgUrl || (data && data[0] ? data[0].img : existingData?.img || ''),
    };

    return res.json({ success: true, product: updatedProduct });
  } catch (err: any) {
    console.error('Database update error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/inventory/products/:id
router.delete('/products/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const { error } = await supabase
      .from('inventory_products')
      .delete()
      .eq('id', id);

    if (error) {
      console.warn('Supabase delete warning:', error.message);
      return res.status(500).json({ success: false, message: error.message });
    }

    console.log(`✨ Successfully deleted record ${id} from Supabase inventory_products table.`);
    return res.json({ success: true, message: 'Product deleted successfully', id });
  } catch (err: any) {
    console.error('Database delete error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/inventory/categories
router.get('/categories', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('inventory_category')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('Supabase fetch categories warning:', error.message);
      return res.json({ success: true, categories: [] });
    }

    return res.json({ success: true, categories: data || [] });
  } catch (err) {
    console.error('Categories fetch error:', err);
    return res.json({ success: true, categories: [] });
  }
});

// POST /api/inventory/categories
router.post('/categories', async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }

    const trimmedName = name.trim();
    const id = await generateSequentialCategoryId();

    // Check if category already exists
    const { data: existing } = await supabase
      .from('inventory_category')
      .select('*')
      .ilike('name', trimmedName);

    if (existing && existing.length > 0) {
      return res.json({ success: true, category: existing[0] });
    }

    const { data, error } = await supabase
      .from('inventory_category')
      .insert([{ id, name: trimmedName }])
      .select();

    if (error) {
      console.warn('Supabase category insert warning:', error.message);
      return res.json({ success: true, category: { id, name: trimmedName } });
    }

    console.log('✨ Successfully inserted new category into Supabase inventory_category table:', data);
    return res.json({ success: true, category: data && data[0] ? data[0] : { id, name: trimmedName } });
  } catch (err: any) {
    console.error('Category insert error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ==============================================================================
// CASH MANAGEMENT ENDPOINTS (Daily cash_history & cash_transaction_ledger)
// ==============================================================================

// GET /api/inventory/cash/status - Get today's live cash status
router.get('/cash/status', async (_req: Request, res: Response) => {
  try {
    const { getTodayCashStatus } = await import('../../utils/cashLedgerHelper');
    const status = await getTodayCashStatus();
    res.json({ success: true, ...status });
  } catch (err: any) {
    console.error('Error fetching cash status:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/inventory/cash/load - Load cash into shop drawer
router.post('/cash/load', async (req: Request, res: Response) => {
  try {
    const { amount, notes, date } = req.body;
    const loadAmount = Number(amount);
    if (isNaN(loadAmount) || loadAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Please enter a valid cash amount greater than 0' });
    }

    const { recordCashTransaction, getTodayCashStatus } = await import('../../utils/cashLedgerHelper');
    const result = await recordCashTransaction({
      transaction_type: 'LOADING',
      flow_type: 'IN',
      amount: loadAmount,
      metal_type: 'N/A',
      item_type: 'Cash Loaded',
      notes: notes || 'Cash loaded into drawer by shop owner',
      date: date || undefined,
    });

    if (!result.success) {
      return res.status(500).json({ success: false, message: result.error || 'Failed to record cash loading' });
    }

    const status = await getTodayCashStatus();

    res.json({
      success: true,
      message: `Successfully loaded ₹${loadAmount.toLocaleString('en-IN')} cash into shop drawer!`,
      ...status,
      current_cash: result.new_balance ?? status.current_cash,
    });
  } catch (err: any) {
    console.error('Error loading cash:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/inventory/cash/history - Fetch daily cash history records
router.get('/cash/history', async (_req: Request, res: Response) => {
  try {
    const { getDailyCashHistoryList } = await import('../../utils/cashLedgerHelper');
    const history = await getDailyCashHistoryList();
    res.json({ success: true, history });
  } catch (err: any) {
    console.error('Error fetching cash history:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/inventory/cash/transactions/:cash_history_uuid - Fetch individual transactions for a day
router.get('/cash/transactions/:cash_history_uuid', async (req: Request, res: Response) => {
  try {
    const { cash_history_uuid } = req.params;
    const { data: transactions, error } = await supabase
      .from('cash_transaction_ledger')
      .select('*')
      .eq('cash_history_uuid', cash_history_uuid)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    res.json({ success: true, transactions: transactions || [] });
  } catch (err: any) {
    console.error('Error fetching transactions for cash history row:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/inventory/historical-stock - Fetch point-in-time inventory stock for any past date
router.get('/historical-stock', async (req: Request, res: Response) => {
  try {
    const { date } = req.query;
    const targetDate = typeof date === 'string' && date ? date : getTodayIST();
    const { getHistoricalInventoryStock } = await import('../../utils/inventoryLedgerHelper');
    const result = await getHistoricalInventoryStock(targetDate);
    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error('Error fetching historical inventory stock:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==============================================================================
// CLOSING RECORD ENDPOINTS (daily_closing_records - EOD Snapshot)
// ==============================================================================

// POST /api/inventory/closing-record - Generate & save today's EOD snapshot
router.post('/closing-record', async (req: Request, res: Response) => {
  try {
    const { date } = req.body;
    const { generateClosingRecord, saveClosingRecord } = await import('../../utils/closingRecordHelper');
    const data = await generateClosingRecord(date || undefined);
    const saved = await saveClosingRecord(data.record_date, data);
    if (!saved.success) {
      return res.status(500).json({ success: false, message: saved.error || 'Failed to save closing record' });
    }
    res.json({ success: true, message: 'Closing record saved successfully!', closing_record: data });
  } catch (err: any) {
    console.error('Error generating closing record:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/inventory/closing-records - List all saved closing records
router.get('/closing-records', async (_req: Request, res: Response) => {
  try {
    const { listClosingRecords } = await import('../../utils/closingRecordHelper');
    const records = await listClosingRecords();
    res.json({ success: true, records });
  } catch (err: any) {
    console.error('Error listing closing records:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/inventory/closing-record/:date - Get closing record for a specific date
router.get('/closing-record/:date', async (req: Request, res: Response) => {
  try {
    const { date } = req.params;
    const { getClosingRecord } = await import('../../utils/closingRecordHelper');
    const record = await getClosingRecord(date);
    if (!record) {
      return res.status(404).json({ success: false, message: `No closing record found for ${date}` });
    }
    res.json({ success: true, record });
  } catch (err: any) {
    console.error('Error fetching closing record:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;

