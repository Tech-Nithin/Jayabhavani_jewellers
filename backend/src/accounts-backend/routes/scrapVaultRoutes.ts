import { Router, Request, Response } from 'express';
import { supabase } from '../../config/supabase';
import { matchesDateFilterIST, round3Decimals } from './logbookRoutes';

const router = Router();

/**
 * Tab 4: GET /api/accounts/scrap-vault
 * Returns all scrap buy records, gold/silver weights, purities, and customer payout history.
 */
router.get('/scrap-vault', async (req: Request, res: Response) => {
  try {
    const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const targetDate = (req.query.date as string) || todayIST;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    const [{ data: dbInvoices }, { data: dbBillingRecords }] = await Promise.all([
      supabase.from('customer_billing').select('customer_billing_uuid, billing_id, customer_name, customer_phone'),
      supabase.from('billing_sell_buy_records').select('*').order('created_at', { ascending: false }),
    ]);

    const customerMap = new Map<string, any>();
    (dbInvoices || []).forEach((inv: any) => {
      if (inv.customer_billing_uuid) customerMap.set(String(inv.customer_billing_uuid).toLowerCase(), inv);
      if (inv.billing_id) customerMap.set(String(inv.billing_id).toLowerCase(), inv);
    });

    const oldMetalVaultItems: any[] = [];
    let oldGoldBoughtWeight = 0;
    let oldSilverBoughtWeight = 0;
    let totalScrapPayout = 0;

    (dbBillingRecords || []).forEach((r: any) => {
      const type = (r.transaction_type || '').toUpperCase();
      if (type !== 'BUY' && type !== 'EXCHANGE_BUY') return;

      const isDateMatch = matchesDateFilterIST(r.bill_date || (r.created_at ? String(r.created_at).split('T')[0] : null), targetDate, startDate, endDate);
      if (!isDateMatch) return;

      const metal = (r.metal_type || 'GOLD').toUpperCase();
      const wt = Number(r.item_weight || 0);
      const purity = Number(r.item_quality_percentage || r.purity_percentage || 100);
      const pureWt = Number(r.pure_metal_weight || round3Decimals(wt * (purity / 100)));
      const payout = Number(r.total_item_price || 0);

      const isConverted = (r.is_converted || '').toLowerCase() === 'yes' ||
        (r.conversion_status || '').toUpperCase() === 'CONVERTED' ||
        Boolean(r.notes && r.notes.includes('[CONVERTED'));

      if (metal.includes('SILVER')) {
        oldSilverBoughtWeight += wt;
      } else {
        oldGoldBoughtWeight += wt;
      }
      totalScrapPayout += payout;

      const custUuid = String(r.customer_billing_uuid || '').toLowerCase();
      const matchedCust = customerMap.get(custUuid);

      oldMetalVaultItems.push({
        id: `scrap-${r.record_uuid || r.id || Math.random()}`,
        record_uuid: r.record_uuid,
        customer_billing_uuid: r.customer_billing_uuid,
        customer_name: matchedCust?.customer_name || 'Customer',
        customer_phone: matchedCust?.customer_phone || '-',
        bill_date: r.bill_date || (r.created_at ? String(r.created_at).split('T')[0] : targetDate),
        created_at: r.created_at,
        item_name: r.item_name || `${metal.includes('SILVER') ? 'Silver' : 'Gold'} Scrap`,
        metal_type: metal.includes('SILVER') ? 'SILVER' : 'GOLD',
        gross_weight: wt,
        only_metal_weight: Number(r.only_metal_weight || wt),
        purity_percentage: purity,
        pure_weight: pureWt,
        payout_amount: payout,
        is_converted: isConverted ? 'yes' : 'no',
        converted_at: r.converted_at || null,
      });
    });

    res.json({
      success: true,
      date: targetDate,
      scrapSummary: {
        oldGoldBoughtWeight: round3Decimals(oldGoldBoughtWeight),
        oldSilverBoughtWeight: round3Decimals(oldSilverBoughtWeight),
        totalScrapPayout,
      },
      oldMetalVaultItems,
    });
  } catch (err: any) {
    console.error('Error fetching scrap vault:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
});

/**
 * GET /api/accounts/buy-metals-conversion
 * Fetches all bought metal records, conversion statuses, and live inventory pure weights for the selected date.
 */
router.get('/buy-metals-conversion', async (req: Request, res: Response) => {
  try {
    const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const targetDate = (req.query.date as string) || todayIST;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    const [{ data: dbInvoices }, { data: dbBillingRecords }, { data: dbInventory }] = await Promise.all([
      supabase.from('customer_billing').select('customer_billing_uuid, billing_id, customer_name, customer_phone, bill_json, bill_type, bill_date, created_at'),
      supabase.from('billing_sell_buy_records').select('*').order('created_at', { ascending: false }),
      supabase.from('inventory_products').select('*').order('created_at', { ascending: true }),
    ]);

    const customerMap = new Map<string, any>();
    const seenBillUuidsInRecords = new Set<string>();

    (dbInvoices || []).forEach((inv: any) => {
      if (inv.customer_billing_uuid) customerMap.set(String(inv.customer_billing_uuid).toLowerCase(), inv);
      if (inv.billing_id) customerMap.set(String(inv.billing_id).toLowerCase(), inv);
    });

    // 1. Process Bought Metal Items & Conversion Categories
    const allBuyItems: any[] = [];
    let availableScrapGoldGross = 0;
    let availableScrapGoldPure = 0;
    let availableScrapSilverGross = 0;
    let availableScrapSilverPure = 0;

    let convertedGoldGross = 0;
    let convertedGoldPure = 0;
    let convertedSilverGross = 0;
    let convertedSilverPure = 0;

    let totalScrapPayout = 0;

    // A. From itemized billing_sell_buy_records
    (dbBillingRecords || []).forEach((r: any) => {
      const type = (r.transaction_type || '').toUpperCase();
      if (type !== 'BUY' && type !== 'EXCHANGE_BUY') return;

      if (r.customer_billing_uuid) {
        seenBillUuidsInRecords.add(String(r.customer_billing_uuid).toLowerCase());
      }

      const isDateMatch = matchesDateFilterIST(r.bill_date || (r.created_at ? String(r.created_at).split('T')[0] : null), targetDate, startDate, endDate);
      if (!isDateMatch) return;

      const metal = (r.metal_type || 'GOLD').toUpperCase();
      const wt = Number(r.item_weight || 0);
      const purity = Number(r.item_quality_percentage || r.purity_percentage || 100);
      const pureWt = Number(r.pure_metal_weight || round3Decimals(wt * (purity / 100)));
      const payout = Number(r.total_item_price || 0);

      const isConverted = (r.is_converted || '').toLowerCase() === 'yes' ||
        (r.conversion_status || '').toUpperCase() === 'CONVERTED' ||
        Boolean(r.notes && r.notes.includes('[CONVERTED'));

      totalScrapPayout += payout;

      if (metal.includes('SILVER')) {
        if (isConverted) {
          convertedSilverGross += wt;
          convertedSilverPure += pureWt;
        } else {
          availableScrapSilverGross += wt;
          availableScrapSilverPure += pureWt;
        }
      } else {
        if (isConverted) {
          convertedGoldGross += wt;
          convertedGoldPure += pureWt;
        } else {
          availableScrapGoldGross += wt;
          availableScrapGoldPure += pureWt;
        }
      }

      const custUuid = String(r.customer_billing_uuid || '').toLowerCase();
      const matchedCust = customerMap.get(custUuid);

      allBuyItems.push({
        id: `scrap-${r.record_uuid || r.id || Math.random()}`,
        record_uuid: r.record_uuid || String(r.id || ''),
        customer_billing_uuid: r.customer_billing_uuid,
        customer_name: matchedCust?.customer_name || 'Customer',
        customer_phone: matchedCust?.customer_phone || '-',
        bill_date: r.bill_date || (r.created_at ? String(r.created_at).split('T')[0] : targetDate),
        created_at: r.created_at,
        item_name: r.item_name || `${metal.includes('SILVER') ? 'Silver' : 'Gold'} Scrap`,
        metal_type: metal.includes('SILVER') ? 'SILVER' : 'GOLD',
        gross_weight: wt,
        only_metal_weight: Number(r.only_metal_weight || wt),
        purity_percentage: purity,
        pure_weight: pureWt,
        payout_amount: payout,
        is_converted: isConverted ? 'yes' : 'no',
        converted_at: r.converted_at || null,
      });
    });

    // B. Fallback: Check customer_billing for any bills not present in billing_sell_buy_records
    (dbInvoices || []).forEach((inv: any) => {
      const invUuid = String(inv.customer_billing_uuid || '').toLowerCase();
      if (seenBillUuidsInRecords.has(invUuid)) return;

      const isDateMatch = matchesDateFilterIST(inv.bill_date || (inv.created_at ? String(inv.created_at).split('T')[0] : null), targetDate, startDate, endDate);
      if (!isDateMatch) return;

      const receipt = typeof inv.bill_json === 'string' ? JSON.parse(inv.bill_json) : (inv.bill_json || {});
      const items = Array.isArray(receipt.items) ? receipt.items : [];
      const buyItems = items.filter((it: any) => it.item_type === 'BUY' || it.item_type === 'EXCHANGE_BUY');

      buyItems.forEach((it: any, itemIdx: number) => {
        const wt = Number(it.weight_grams || it.item_weight || it.gross_weight_grams || 0);
        const purity = Number(it.purity_percentage || it.purity || it.touch_percentage || it.item_quality_percentage || 100);
        const pureWt = round3Decimals(wt * (purity / 100));
        const metal = (it.metal_type || inv.metal_type || 'GOLD').toUpperCase();
        const payout = Number(it.total_price || it.total_item_price || it.line_total || it.price || 0);

        totalScrapPayout += payout;

        if (metal.includes('SILVER')) {
          availableScrapSilverGross += wt;
          availableScrapSilverPure += pureWt;
        } else {
          availableScrapGoldGross += wt;
          availableScrapGoldPure += pureWt;
        }

        allBuyItems.push({
          id: `scrap-inv-${inv.customer_billing_uuid || inv.id}-${itemIdx}`,
          record_uuid: inv.customer_billing_uuid,
          customer_billing_uuid: inv.customer_billing_uuid,
          customer_name: inv.customer_name || 'Customer',
          customer_phone: inv.customer_phone || '-',
          bill_date: inv.bill_date || (inv.created_at ? String(inv.created_at).split('T')[0] : targetDate),
          created_at: inv.created_at,
          item_name: it.product_name || it.item_name || `${metal.includes('SILVER') ? 'Silver' : 'Gold'} Scrap`,
          metal_type: metal.includes('SILVER') ? 'SILVER' : 'GOLD',
          gross_weight: wt,
          only_metal_weight: wt,
          purity_percentage: purity,
          pure_weight: pureWt,
          payout_amount: payout,
          is_converted: 'no',
          converted_at: null,
        });
      });
    });

    // 2. Compute Live Inventory Showcase Pure Weights for the selected period
    let inventoryGoldGross = 0;
    let inventoryGoldPure = 0;
    let inventorySilverGross = 0;
    let inventorySilverPure = 0;

    (dbInventory || []).forEach((p: any) => {
      const metal = (p.item_type || p.metal_type || 'GOLD').toUpperCase();
      const stockWt = Number(p.current_stock_weight ?? p.weight_from_grams ?? 0);
      if (stockWt <= 0) return;

      if (metal.includes('SILVER')) {
        inventorySilverGross += stockWt;
        // Standard Silver hallmark touch (100% or 92.5%)
        inventorySilverPure += stockWt;
      } else {
        inventoryGoldGross += stockWt;
        // Standard 22k Gold touch (91.60%)
        inventoryGoldPure += stockWt * 0.916;
      }
    });

    res.json({
      success: true,
      date: targetDate,
      metrics: {
        availableScrap: {
          goldGross: round3Decimals(availableScrapGoldGross),
          goldPure: round3Decimals(availableScrapGoldPure),
          silverGross: round3Decimals(availableScrapSilverGross),
          silverPure: round3Decimals(availableScrapSilverPure),
          count: allBuyItems.filter((i) => i.is_converted !== 'yes').length,
        },
        convertedScrap: {
          goldGross: round3Decimals(convertedGoldGross),
          goldPure: round3Decimals(convertedGoldPure),
          silverGross: round3Decimals(convertedSilverGross),
          silverPure: round3Decimals(convertedSilverPure),
          count: allBuyItems.filter((i) => i.is_converted === 'yes').length,
        },
        inventoryPureStock: {
          goldGross: round3Decimals(inventoryGoldGross),
          goldPure: round3Decimals(inventoryGoldPure),
          silverGross: round3Decimals(inventorySilverGross),
          silverPure: round3Decimals(inventorySilverPure),
        },
        totalScrapPayout,
        totalItemsCount: allBuyItems.length,
      },
      items: allBuyItems,
    });
  } catch (err: any) {
    console.error('Error fetching buy metals conversion:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
});

/**
 * POST /api/accounts/buy-metals-conversion/bulk-update
 * Marks selected bought metal items as CONVERTED or NON_CONVERTED (revert).
 */
router.post('/buy-metals-conversion/bulk-update', async (req: Request, res: Response) => {
  try {
    const { record_uuids, is_converted, converted_date, custom_converted_at } = req.body;

    if (!Array.isArray(record_uuids) || record_uuids.length === 0) {
      return res.status(400).json({ success: false, message: 'No record_uuids provided' });
    }

    const convertedVal = is_converted === 'yes' ? 'yes' : 'no';
    let convertedTime: string | null = null;
    if (convertedVal === 'yes') {
      if (custom_converted_at) {
        convertedTime = custom_converted_at;
      } else if (converted_date) {
        convertedTime = converted_date.includes('T') ? converted_date : `${converted_date}T12:00:00+05:30`;
      } else {
        convertedTime = new Date().toISOString();
      }
    }

    let updatedCount = 0;

    for (const uuid of record_uuids) {
      // 1. Fetch current record to preserve notes
      const { data: existingRec } = await supabase
        .from('billing_sell_buy_records')
        .select('record_uuid, notes')
        .eq('record_uuid', uuid)
        .maybeSingle();

      let currentNotes = existingRec?.notes || '';
      if (convertedVal === 'yes') {
        if (!currentNotes.includes('[CONVERTED')) {
          currentNotes = `${currentNotes ? currentNotes + ' | ' : ''}[CONVERTED: ${convertedTime || new Date().toISOString()}]`;
        }
      } else {
        // Remove [CONVERTED...] tag on revert
        currentNotes = currentNotes.replace(/\[CONVERTED:?[^\]]*\]/g, '').trim();
      }

      // Try updating with dedicated columns
      const { error: updateErr } = await supabase
        .from('billing_sell_buy_records')
        .update({
          is_converted: convertedVal,
          converted_at: convertedTime,
          notes: currentNotes,
        })
        .eq('record_uuid', uuid);

      if (!updateErr) {
        updatedCount++;
      } else {
        // Fallback: If columns do not exist yet in DB, update notes
        const { error: fallbackErr } = await supabase
          .from('billing_sell_buy_records')
          .update({
            notes: currentNotes,
          })
          .eq('record_uuid', uuid);

        if (!fallbackErr) updatedCount++;
      }
    }

    console.log(`✅ Updated ${updatedCount} bought metal item(s) to is_converted='${convertedVal}'`);

    res.json({
      success: true,
      updatedCount,
      is_converted: convertedVal,
      message: `Successfully marked ${updatedCount} item(s) as ${convertedVal === 'yes' ? 'CONVERTED' : 'IN STOCK'}.`,
    });
  } catch (err: any) {
    console.error('Error updating buy metal conversion:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
});

export default router;
