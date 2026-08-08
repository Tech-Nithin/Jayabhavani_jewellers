import { Router, Request, Response } from 'express';
import { supabase } from '../../config/supabase';

const router = Router();

// GET /api/inventory/products
router.get('/products', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('inventory_products')
      .select('*')
      .order('created_at', { ascending: false });

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
      weight_grams: Number(item.weight_from_grams || 0),
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

// Reliable Helper function: Upload image to Cloudinary signed folder
async function uploadToCloudinaryHelper(imageStr: string): Promise<string> {
  if (!imageStr || imageStr.startsWith('http://') || imageStr.startsWith('https://')) {
    return imageStr || '/Eternal_Solitaire_Ring.jpg';
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'kkwteo4l';
  const preset = process.env.CLOUDINARY_UPLOAD_PRESET || 'jewellery_preset';

  try {
    const formData = new FormData();
    formData.append('file', imageStr);
    formData.append('upload_preset', preset);
    formData.append('folder', 'signed');

    console.log(`📤 Uploading image to Cloudinary (${cloudName}, folder: signed)...`);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    if (data.secure_url) {
      const optimizedWebpUrl = data.secure_url.replace('/upload/', '/upload/f_auto,q_auto/').replace(/\.(png|jpg|jpeg)$/i, '.webp');
      console.log('✨ Successfully uploaded image to Cloudinary signed folder:', optimizedWebpUrl);
      return optimizedWebpUrl;
    } else {
      console.warn('⚠️ Cloudinary API returned warning/error:', data);
    }
  } catch (err) {
    console.error('❌ Cloudinary upload error:', err);
  }

  // Backup fallback if primary preset fails
  try {
    const formDataDemo = new FormData();
    formDataDemo.append('file', imageStr);
    formDataDemo.append('upload_preset', 'unsigned');
    formDataDemo.append('folder', 'signed');

    const resDemo = await fetch('https://api.cloudinary.com/v1_1/demo/image/upload', {
      method: 'POST',
      body: formDataDemo,
    });
    const dataDemo = await resDemo.json();
    if (dataDemo.secure_url) {
      return dataDemo.secure_url.replace('/upload/', '/upload/f_auto,q_auto/').replace(/\.(png|jpg|jpeg)$/i, '.webp');
    }
  } catch (demoErr) {
    console.error('Demo upload error:', demoErr);
  }

  return 'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/v1/samples/landscapes/beach-boat.webp';
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
    img = '/classic_gold_band_ring.jpeg',
  } = req.body;

  const finalCategory = category || 'General Product';
  const finalWeightFrom = Number(weight_from_grams || weight_grams || 0);
  const finalWeightTo = Number(weight_to_grams || weight_grams || finalWeightFrom);
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
    item_type: item_type || 'GOLD',
    weight_from_grams: finalWeightFrom,
    weight_to_grams: finalWeightTo,
    img: cloudinaryWebpUrl,
    price: Number(price || 0),
  };

  try {
    const { data, error } = await supabase
      .from('inventory_products')
      .insert([newProductObj])
      .select();

    if (error) {
      console.warn('Supabase insert warning:', error.message);
    } else {
      console.log('✨ Successfully inserted Cloudinary WebP record into Supabase inventory_products table:', data);
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
    weight_grams: finalWeightFrom,
    weight_from_grams: finalWeightFrom,
    weight_to_grams: finalWeightTo,
    img: cloudinaryWebpUrl,
  };

  res.json({ success: true, product: responseProduct });
});

// POST /api/inventory/upload-cloudinary
router.post('/upload-cloudinary', async (req: Request, res: Response) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ success: false, message: 'No image data provided' });
    }

    const cloudinaryWebpUrl = await uploadToCloudinaryHelper(image);
    return res.json({ success: true, url: cloudinaryWebpUrl });
  } catch (err) {
    console.error('Backend Cloudinary upload error:', err);
    return res.json({ success: true, url: req.body.image });
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
    img,
  } = req.body;

  const finalCategory = category || 'General';
  const finalWeightFrom = Number(weight_from_grams || weight_grams || 0);
  const finalWeightTo = Number(weight_to_grams || weight_grams || finalWeightFrom);
  const itemName = name || `${item_type === 'GOLD' ? 'Gold' : 'Silver'} ${finalCategory}`;

  // Auto-save category to Supabase inventory_category table
  await autoSaveCategoryToSupabase(finalCategory);

  let finalImgUrl = img;
  if (img && img.startsWith('data:')) {
    finalImgUrl = await uploadToCloudinaryHelper(img);
  }

  const updatedProductObj: any = {
    item_name: itemName,
    category: finalCategory,
    item_type: item_type || 'GOLD',
    weight_from_grams: finalWeightFrom,
    weight_to_grams: finalWeightTo,
    price: Number(price || 0),
  };

  if (finalImgUrl) {
    updatedProductObj.img = finalImgUrl;
  }

  try {
    const { data, error } = await supabase
      .from('inventory_products')
      .update(updatedProductObj)
      .eq('id', id)
      .select();

    if (error) {
      console.warn('Supabase update warning:', error.message);
      return res.status(500).json({ success: false, message: error.message });
    }

    const updatedProduct = {
      id,
      name: itemName,
      category: finalCategory,
      item_type,
      price: Number(price || 0),
      weight_grams: finalWeightFrom,
      weight_from_grams: finalWeightFrom,
      weight_to_grams: finalWeightTo,
      img: finalImgUrl || (data && data[0] ? data[0].img : ''),
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

export default router;
