import { supabase } from '../config/supabase';
import { getTodayIST, getNowISTISO, toISTTimestamp } from './dateHelper';

export interface InventoryMovementParams {
  itemId: string;
  itemName?: string;
  itemType: 'GOLD' | 'SILVER';
  eventType: 'OPENING' | 'RESTOCK' | 'SALE' | 'CUSTOMER_RETURN' | 'KARIGAR_OUT' | 'KARIGAR_IN' | 'ADJUSTMENT';
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

    // 2. Insert row into inventory_ledger
    const { error: ledgerErr } = await supabase
      .from('inventory_ledger')
      .insert([{
        item_id: params.itemId,
        item_name: resolvedItemName,
        item_type: resolvedItemType,
        event_type: params.eventType,
        weight_delta_grams: delta,
        weight_after_grams: weightAfterGrams,
        reference_id: params.referenceId || null,
        reference_type: params.referenceType || null,
        notes: params.notes || null,
        recorded_date: todayStr,
        created_at: recordTimestamp,
      }]);

    if (ledgerErr) {
      console.warn('⚠️ Error inserting into inventory_ledger:', ledgerErr.message);
    }

    // 3. Upsert into inventory_daily_snapshots
    try {
      const { data: existingSnapshot } = await supabase
        .from('inventory_daily_snapshots')
        .select('*')
        .eq('snapshot_date', todayStr)
        .eq('item_id', params.itemId)
        .single();

      const isSale = params.eventType === 'SALE';
      const isAdd = delta > 0;

      if (!existingSnapshot) {
        // Create new daily snapshot for this item
        await supabase
          .from('inventory_daily_snapshots')
          .insert([{
            snapshot_date: todayStr,
            item_id: params.itemId,
            item_name: resolvedItemName,
            item_type: resolvedItemType,
            opening_weight_grams: currentStockWeight,
            closing_weight_grams: weightAfterGrams,
            total_sold_grams: isSale ? Math.abs(delta) : 0,
            total_added_grams: isAdd ? delta : 0,
            sell_count: isSale ? 1 : 0,
            created_at: recordTimestamp,
          }]);
      } else {
        // Update existing daily snapshot
        const updatedSoldGrams = Number((Number(existingSnapshot.total_sold_grams || 0) + (isSale ? Math.abs(delta) : 0)).toFixed(3));
        const updatedAddedGrams = Number((Number(existingSnapshot.total_added_grams || 0) + (isAdd ? delta : 0)).toFixed(3));
        const updatedSellCount = Number(existingSnapshot.sell_count || 0) + (isSale ? 1 : 0);

        await supabase
          .from('inventory_daily_snapshots')
          .update({
            closing_weight_grams: weightAfterGrams,
            total_sold_grams: updatedSoldGrams,
            total_added_grams: updatedAddedGrams,
            sell_count: updatedSellCount,
          })
          .eq('snapshot_date', todayStr)
          .eq('item_id', params.itemId);
      }
    } catch (snapErr: any) {
      console.warn('⚠️ Daily snapshot warning:', snapErr.message);
    }

    // 4. Update live inventory_products table
    if (prod) {
      const currentSoldQty = Number(prod.sold_quantity || 0);
      const currentSellCount = Number(prod.sell_count || 0);

      const updatedSoldQty = params.eventType === 'SALE' ? Number((currentSoldQty + Math.abs(delta)).toFixed(3)) : currentSoldQty;
      const updatedSellCount = params.eventType === 'SALE' ? currentSellCount + 1 : currentSellCount;

      await supabase
        .from('inventory_products')
        .update({
          current_stock_weight: weightAfterGrams,
          sold_quantity: updatedSoldQty,
          sell_count: updatedSellCount,
        })
        .eq('id', params.itemId);

      console.log(`📦 Synced item '${resolvedItemName}': Stock ${currentStockWeight}g ➔ ${weightAfterGrams}g (${delta > 0 ? '+' : ''}${delta}g ${params.eventType})`);
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
