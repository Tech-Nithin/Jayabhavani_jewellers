import { supabase } from '../config/supabase';
import { getTodayIST, getNowISTISO, toISTTimestamp } from './dateHelper';

export interface InventoryMovementParams {
  itemId: string;
  itemName?: string;
  itemType: 'GOLD' | 'SILVER';
  eventType: 'OPENING' | 'RESTOCK' | 'SALE' | 'CUSTOMER_RETURN' | 'SALE_REVERSAL' | 'KARIGAR_OUT' | 'KARIGAR_IN' | 'ADJUSTMENT';
  weightDeltaGrams: number; // Positive = added to shop, Negative = removed from shop
  referenceId?: string;    // e.g. 'INV-1004', 'ORD-9529', 'WTX-101'
  referenceType?: 'INVOICE' | 'ORDER' | 'WORKER_TXN' | 'MANUAL' | 'SCRAP';
  notes?: string;
  date?: string;           // Format: YYYY-MM-DD
}

/**
 * Records an immutable gram-by-gram movement into inventory_ledger,
 * updates today's snapshot in inventory_daily_snapshots,
 * and synchronizes live stock in inventory_products.
 */
export async function recordInventoryMovement(params: InventoryMovementParams): Promise<{
  success: boolean;
  new_weight?: number;
  error?: string;
}> {
  try {
    const todayStr = params.date || getTodayIST();
    const recordTimestamp = params.date ? toISTTimestamp(params.date) : getNowISTISO();
    const delta = Number(params.weightDeltaGrams) || 0;

    if (delta === 0) {
      return { success: true, new_weight: 0 };
    }

    // 1. Fetch current product information from inventory_products
    const { data: prod, error: prodErr } = await supabase
      .from('inventory_products')
      .select('*')
      .eq('id', params.itemId)
      .single();

    if (prodErr || !prod) {
      console.warn(`⚠️ Product ${params.itemId} not found in inventory_products:`, prodErr?.message);
    }

    const currentStockWeight = Number(prod?.current_stock_weight ?? prod?.weight_from_grams ?? 0);
    const resolvedItemName = params.itemName || prod?.item_name || `${params.itemType} Item`;
    const resolvedItemType = (params.itemType || prod?.item_type || 'GOLD').toUpperCase() === 'SILVER' ? 'SILVER' : 'GOLD';

    // Calculate new running stock balance
    const weightAfterGrams = Math.max(0, Number((currentStockWeight + delta).toFixed(3)));

    // 2. Insert row into inventory_stock_logs
    const { error: logErr } = await supabase
      .from('inventory_stock_logs')
      .insert([{
        item_id: params.itemId,
        item_name: resolvedItemName,
        metal_category: resolvedItemType,
        item_category: prod?.category || 'General',
        previous_stock_weight: currentStockWeight,
        new_stock_weight: weightAfterGrams,
        notes: params.notes || `${params.eventType}: ${delta > 0 ? '+' : ''}${delta}g (${params.referenceType || 'MANUAL'} ${params.referenceId || ''})`,
        created_at: recordTimestamp,
      }]);

    if (logErr) {
      console.warn('⚠️ Error inserting into inventory_stock_logs:', logErr.message);
    }

    // 3. Update live inventory_products table
    if (prod) {
      const currentSoldQty = Number(prod.sold_quantity || 0);
      const currentSellCount = Number(prod.sell_count || 0);

      let updatedSoldQty = currentSoldQty;
      let updatedSellCount = currentSellCount;

      if (params.eventType === 'SALE') {
        updatedSoldQty = Number((currentSoldQty + Math.abs(delta)).toFixed(3));
        updatedSellCount = currentSellCount + 1;
      } else if (
        params.eventType === 'SALE_REVERSAL' ||
        params.eventType === 'CUSTOMER_RETURN' ||
        (params.eventType === 'ADJUSTMENT' && params.referenceType === 'INVOICE')
      ) {
        // Roll back previously recorded sale
        updatedSoldQty = Math.max(0, Number((currentSoldQty - Math.abs(delta)).toFixed(3)));
        updatedSellCount = Math.max(0, currentSellCount - 1);
      }

      await supabase
        .from('inventory_products')
        .update({
          current_stock_weight: weightAfterGrams,
          sold_quantity: updatedSoldQty,
          sell_count: updatedSellCount,
        })
        .eq('id', params.itemId);

      console.log(`📦 Synced item '${resolvedItemName}': Stock ${currentStockWeight}g ➔ ${weightAfterGrams}g | Sold: ${currentSoldQty}g ➔ ${updatedSoldQty}g | Count: ${currentSellCount} ➔ ${updatedSellCount} (${params.eventType})`);
    }

    return {
      success: true,
      new_weight: weightAfterGrams,
    };
  } catch (err: any) {
    console.error('Exception in recordInventoryMovement:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Reconstructs or fetches the exact Point-in-Time Inventory Stock for any past date.
 */
export async function getHistoricalInventoryStock(targetDate: string): Promise<{
  goldStockGrams: number;
  silverStockGrams: number;
  products: any[];
}> {
  try {
    // 1. Fetch all products
    const { data: allProds } = await supabase
      .from('inventory_products')
      .select('*')
      .order('created_at', { ascending: false });

    if (!allProds || allProds.length === 0) {
      return { goldStockGrams: 0, silverStockGrams: 0, products: [] };
    }

    // 2. Fetch snapshots for the target date
    const { data: snapshots } = await supabase
      .from('inventory_daily_snapshots')
      .select('*')
      .eq('snapshot_date', targetDate);

    const snapshotMap = new Map<string, any>();
    (snapshots || []).forEach((s: any) => {
      snapshotMap.set(s.item_id, s);
    });

    let totalGoldGrams = 0;
    let totalSilverGrams = 0;

    const historicalProducts = allProds.map((prod: any) => {
      const snap = snapshotMap.get(prod.id);
      const metal = (prod.item_type || 'GOLD').toUpperCase();
      
      // If a snapshot exists for that date, use its closing_weight_grams
      // Otherwise use current_stock_weight
      const weight = snap ? Number(snap.closing_weight_grams) : Number(prod.current_stock_weight ?? prod.weight_from_grams ?? 0);
      const soldQty = snap ? Number(snap.total_sold_grams) : Number(prod.sold_quantity ?? 0);
      const sellCount = snap ? Number(snap.sell_count) : Number(prod.sell_count ?? 0);

      if (metal.includes('GOLD')) {
        totalGoldGrams += weight;
      } else {
        totalSilverGrams += weight;
      }

      return {
        ...prod,
        weight_grams: weight,
        current_stock_weight: weight,
        sold_quantity: soldQty,
        sell_count: sellCount,
      };
    });

    return {
      goldStockGrams: Number(totalGoldGrams.toFixed(3)),
      silverStockGrams: Number(totalSilverGrams.toFixed(3)),
      products: historicalProducts,
    };
  } catch (err: any) {
    console.error('Error fetching historical inventory stock:', err);
    return { goldStockGrams: 0, silverStockGrams: 0, products: [] };
  }
}
