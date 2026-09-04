import { supabase } from '../config/supabase';
import { recordCashTransaction } from './cashLedgerHelper';
import { getNowISTISO, getTodayIST, toISTTimestamp, toISTDateOnly } from './dateHelper';

export interface BillingStorageInput {
  billing_id: string;
  bill_type: 'SELL' | 'BUY' | 'ORDER' | 'EXCHANGE' | 'TRADE_IN' | string;
  bill_date?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_address?: string;
  total_amount?: number;
  paid_amount?: number;
  due_amount?: number;
  payment_status?: string;
  payment_mode?: 'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER';
  receipt_json_data?: any;
  created_at?: string;
  metal_type?: string;
  metal_rate?: number;
  weight_grams?: number;
  final_amount?: number;
  product_name?: string;
  deduction_name?: string;
  deduction_weight?: number;
  hallmark_percentage?: number;
  item_quality_percentage?: number;
  making_charges?: number;
  additional_charges?: string;
  additional_cost?: number;
  quantity_unit?: string;
  item_length_inches?: string;
  image_url?: string;
  notes?: string;
}

/**
 * Stores/syncs complete invoice or order data across the 3 billing tables:
 * 1. customer_billing (Master Invoice Header)
 * 2. billing_sell_buy_records (Line-Item Physical Ornaments Breakdown)
 * 3. billing_payment_history (Installment / Advance Payment Ledger)
 */
export async function storeBillingTransaction(input: BillingStorageInput): Promise<{
  success: boolean;
  customer_billing_uuid?: string;
  error?: string;
}> {
  try {
    const billingId = String(input.billing_id || '').trim();
    if (!billingId) {
      return { success: false, error: 'billing_id is required' };
    }

    let rawBillType = (input.bill_type || 'SELL').toUpperCase();
    if (rawBillType === 'TRADE_IN' || rawBillType === 'TRADE-IN') {
      rawBillType = 'EXCHANGE';
    }
    const cleanBillType = ['SELL', 'BUY', 'ORDER', 'EXCHANGE'].includes(rawBillType)
      ? rawBillType
      : 'SELL';

    const customerName = String(input.customer_name || 'Walk-in Customer').trim();
    const customerPhone = String(input.customer_phone || '').trim();
    const customerAddress = String(input.customer_address || '').trim();
    const receiptData = typeof input.receipt_json_data === 'string'
      ? JSON.parse(input.receipt_json_data)
      : (input.receipt_json_data || {});

    // Compute Totals
    const totalAmount = Number(
      input.total_amount ??
      input.final_amount ??
      receiptData.final_amount ??
      receiptData.grand_total ??
      receiptData.total_amount ??
      0
    );

    const paidAmount = Number(
      input.paid_amount ??
      receiptData.paid_amount ??
      (cleanBillType === 'BUY' ? 0 : totalAmount)
    );

    const dueAmount = input.due_amount !== undefined
      ? Number(input.due_amount)
      : Math.max(0, Number((totalAmount - paidAmount).toFixed(2)));

    const paymentStatus = input.payment_status || (
      dueAmount <= 0
        ? 'PAID'
        : (paidAmount > 0 ? 'PARTIAL' : 'DUE')
    );

    const billDate = String(input.bill_date || receiptData.bill_date || receiptData.billDate || input.created_at?.split('T')[0] || getTodayIST()).trim();
    const createdAt = input.created_at ? toISTTimestamp(input.created_at) : (billDate ? getNowISTISO(`${billDate}T${getNowISTISO().split('T')[1]}`) : getNowISTISO());
    const updatedAt = getNowISTISO();

    // 1. MASTER TABLE: customer_billing (Upsert by billing_id)
    const masterPayload = {
      billing_id: billingId,
      bill_type: cleanBillType,
      bill_date: billDate,
      customer_name: customerName,
      customer_phone: customerPhone || null,
      customer_address: customerAddress || null,
      total_amount: totalAmount,
      paid_amount: paidAmount,
      due_amount: dueAmount,
      payment_status: paymentStatus,
      bill_json: receiptData,
      created_at: createdAt,
      updated_at: updatedAt,
    };

    let customerBillingUuid: string | null = null;

    // Check if master row already exists
    const { data: existingMaster } = await supabase
      .from('customer_billing')
      .select('customer_billing_uuid, paid_amount')
      .eq('billing_id', billingId)
      .maybeSingle();

    if (existingMaster) {
      customerBillingUuid = existingMaster.customer_billing_uuid;
      const { created_at: _omitCreatedAt, ...updatePayload } = masterPayload;
      await supabase
        .from('customer_billing')
        .update(updatePayload)
        .eq('customer_billing_uuid', customerBillingUuid);
    } else {
      const { data: newMaster, error: masterErr } = await supabase
        .from('customer_billing')
        .insert([masterPayload])
        .select('customer_billing_uuid')
        .single();

      if (masterErr || !newMaster) {
        console.error('❌ Error inserting into customer_billing:', masterErr);
        return { success: false, error: masterErr?.message || 'Failed to insert customer_billing' };
      }
      customerBillingUuid = newMaster.customer_billing_uuid;
    }

    if (!customerBillingUuid) {
      return { success: false, error: 'Could not resolve customer_billing_uuid' };
    }

    // 2. LINE-ITEMS BREAKDOWN TABLE: billing_sell_buy_records
    // Delete existing line items for this invoice (if updating) to avoid duplicates
    await supabase
      .from('billing_sell_buy_records')
      .delete()
      .eq('customer_billing_uuid', customerBillingUuid);

    const items: any[] = Array.isArray(receiptData?.items) ? receiptData.items : [];
    const lineRecordsToInsert: any[] = [];

    if (items.length > 0) {
      for (const it of items) {
        const itemType = (it.item_type || cleanBillType).toUpperCase() === 'BUY' ? 'BUY' : 'SELL';
        const metalType = (it.metal_type || input.metal_type || 'GOLD').toUpperCase() === 'SILVER' ? 'SILVER' : 'GOLD';
        const grossWeight = Number(it.gross_weight_grams || it.weight_grams || it.weight || 0);
        const deductionName = it.deduction_name || it.stone_name || it.waste_type || null;
        const deductionWeight = Number(it.deduction_weight || it.deduction_weight_grams || it.stone_weight || it.stone_weight_grams || it.waste_weight || 0);
        const netMetalWeight = Number(it.net_weight_grams || it.net_weight || Math.max(0, grossWeight - deductionWeight));
        const metalRate = Number(it.applied_rate_per_gram || it.rate_per_gram || it.rate || receiptData.applied_rate_per_gram || input.metal_rate || 0);
        
        // HMW percentage is the hallmark / wastage percentage
        const hallmarkPct = Number(it.hmw_percentage || it.wastage_percent || it.hallmark_percentage || 0);
        const touchPct = Number(it.touch_percentage || it.item_quality_percentage || it.purity_percentage || it.return_purity_percentage || 0);
        const pureMetalWeight = Number(it.pure_metal_weight || it.pure_weight_grams || it.pureWeight || it.fine_weight_grams || (itemType === 'SELL' ? (netMetalWeight + (netMetalWeight * hallmarkPct) / 100) : (netMetalWeight * (touchPct / 100))));
        
        const addChargeName = it.additional_charges || it.additional_charges_name || it.additional_charge_name || null;
        const addChargeCost = Number(it.additional_cost ?? it.additional_charges_amount ?? it.additional_charge_value ?? 0);
        const makingCharges = Number(it.making_charges ?? it.making_charges_per_gram ?? it.makingVal ?? it.mc_amount ?? it.making_cost ?? 0);
        const totalItemPrice = Number(it.lineTotal ?? it.line_total ?? it.metalVal ?? it.total_item_price ?? it.final_amount ?? 0);

        const quantityUnit = it.quantity_unit || 'PIECES';
        const itemLengthInches = it.item_length_inches ? String(it.item_length_inches) : null;
        const imageUrl = it.image_url || input.image_url || receiptData.image_url || null;
        const itemNotes = it.notes || it.item_notes || input.notes || receiptData.notes || null;

        const resolvedBillingMode = cleanBillType === 'EXCHANGE' ? 'TRADE_IN' : cleanBillType;
        const isOrderSell = resolvedBillingMode === 'ORDER' && itemType === 'SELL';
        const isSubmittedVal = !isOrderSell;
        const submittedTimeVal = isSubmittedVal ? createdAt : null;

        lineRecordsToInsert.push({
          customer_billing_uuid: customerBillingUuid,
          billing_mode: resolvedBillingMode,
          transaction_type: itemType,
          bill_date: billDate,
          is_item_submitted: isSubmittedVal ? 'yes' : 'no',
          item_submitted_at: submittedTimeVal,
          metal_type: metalType,
          metal_rate: metalRate,
          item_name: it.product_name || it.item_name || it.name || `${metalType} ${itemType} Item`,
          item_weight: grossWeight,
          deduction_name: deductionName,
          deduction_weight: deductionWeight,
          only_metal_weight: netMetalWeight,
          hallmark_percentage: itemType === 'SELL' ? hallmarkPct : 0,
          item_quality_percentage: itemType === 'BUY' ? touchPct : 0,
          pure_metal_weight: pureMetalWeight,
          additional_charges: addChargeName,
          additional_cost: addChargeCost,
          making_charges: makingCharges,
          total_item_price: totalItemPrice,
          quantity_unit: quantityUnit,
          item_length_inches: itemLengthInches,
          image_url: imageUrl,
          notes: itemNotes,
          created_at: createdAt,
        });
      }
    } else {
      // Fallback single line item if items array was not present
      const singleGross = Number(input.weight_grams || receiptData.gross_weight_grams || receiptData.weight_grams || 0);
      const singleDedName = input.deduction_name || receiptData.deduction_name || null;
      const singleDedWeight = Number(input.deduction_weight || receiptData.deduction_weight || receiptData.deduction_weight_grams || 0);
      const singleNetWeight = Math.max(0, singleGross - singleDedWeight);
      const singleMetal = (input.metal_type || receiptData.metal_type || 'GOLD').toUpperCase() === 'SILVER' ? 'SILVER' : 'GOLD';
      const singleType = cleanBillType === 'BUY' ? 'BUY' : 'SELL';
      const fallbackHmw = Number(input.hallmark_percentage || receiptData.hmw_percentage || receiptData.wastage_percent || receiptData.hallmark_percentage || 0);
      const fallbackTouch = Number(input.item_quality_percentage || receiptData.touch_percentage || receiptData.item_quality_percentage || receiptData.purity_percentage || 0);
      const fallbackMaking = Number(input.making_charges ?? receiptData.making_charges ?? receiptData.making_charges_per_gram ?? 0);
      const fallbackAddCharges = input.additional_charges || receiptData.additional_charges || receiptData.additional_charges_name || receiptData.additional_charge_name || null;
      const fallbackAddCost = Number(input.additional_cost ?? receiptData.additional_cost ?? receiptData.additional_charges_amount ?? receiptData.additional_charge_value ?? 0);
      const resolvedBillingMode = cleanBillType === 'EXCHANGE' ? 'TRADE_IN' : cleanBillType;
      const isOrderSellSingle = resolvedBillingMode === 'ORDER' && singleType === 'SELL';
      const isSubmittedSingle = !isOrderSellSingle;
      const submittedTimeSingle = isSubmittedSingle ? createdAt : null;

      lineRecordsToInsert.push({
        customer_billing_uuid: customerBillingUuid,
        billing_mode: resolvedBillingMode,
        transaction_type: singleType,
        bill_date: billDate,
        is_item_submitted: isSubmittedSingle ? 'yes' : 'no',
        item_submitted_at: submittedTimeSingle,
        metal_type: singleMetal,
        metal_rate: Number(input.metal_rate || receiptData.applied_rate_per_gram || 0),
        item_name: input.product_name || receiptData.product_name || receiptData.item_name || `${singleMetal} ${singleType} Item`,
        item_weight: singleGross,
        deduction_name: singleDedName,
        deduction_weight: singleDedWeight,
        only_metal_weight: singleNetWeight,
        hallmark_percentage: singleType === 'SELL' ? fallbackHmw : 0,
        item_quality_percentage: singleType === 'BUY' ? fallbackTouch : 0,
        pure_metal_weight: singleType === 'SELL' ? (singleNetWeight + (singleNetWeight * fallbackHmw) / 100) : (singleNetWeight * (fallbackTouch / 100)),
        additional_charges: fallbackAddCharges,
        additional_cost: fallbackAddCost,
        making_charges: fallbackMaking,
        total_item_price: totalAmount,
        quantity_unit: input.quantity_unit || receiptData.quantity_unit || 'PIECES',
        item_length_inches: input.item_length_inches || (receiptData.item_length_inches ? String(receiptData.item_length_inches) : null),
        image_url: input.image_url || receiptData.image_url || null,
        notes: input.notes || receiptData.notes || null,
        created_at: createdAt,
      });
    }

    if (lineRecordsToInsert.length > 0) {
      const { error: lineErr } = await supabase
        .from('billing_sell_buy_records')
        .insert(lineRecordsToInsert);

      if (lineErr) {
        console.warn('⚠️ Error inserting billing_sell_buy_records:', lineErr.message);
      } else {
        console.log(`✅ Stored ${lineRecordsToInsert.length} line records in billing_sell_buy_records for ${billingId}`);
      }

      // 4. INVENTORY PRODUCT STOCK DEDUCTION: Update inventory_ledger & daily snapshots for SELL transactions
      for (const r of lineRecordsToInsert) {
        if (r.transaction_type === 'SELL' && r.item_weight > 0) {
          try {
            const itemName = (r.item_name || '').trim();
            const cleanMetal = (r.metal_type || 'GOLD').toUpperCase() === 'SILVER' ? 'SILVER' : 'GOLD';

            const { data: invMatches } = await supabase
              .from('inventory_products')
              .select('*')
              .eq('item_type', cleanMetal);

            if (invMatches && invMatches.length > 0) {
              const matched = invMatches.find((p: any) => {
                const pName = (p.item_name || '').toLowerCase();
                const pCat = (p.category || '').toLowerCase();
                const target = itemName.toLowerCase();
                return pName === target || pCat === target || target.includes(pName) || pName.includes(target);
              });

              if (matched) {
                const { recordInventoryMovement } = await import('./inventoryLedgerHelper');
                await recordInventoryMovement({
                  itemId: matched.id,
                  itemName: matched.item_name,
                  itemType: cleanMetal,
                  eventType: 'SALE',
                  weightDeltaGrams: -Number(r.item_weight),
                  referenceId: billingId,
                  referenceType: 'INVOICE',
                  notes: `Sold in bill ${billingId} to ${input.customer_name || 'Customer'}`,
                });
              }
            }
          } catch (invErr) {
            console.warn('⚠️ Inventory ledger deduction warning:', invErr);
          }
        }
      }
    }

    // 3. PAYMENT / INSTALLMENT TABLE: billing_payment_history (Record Initial Payment / Update Installment #1)
    const paymentMode = input.payment_mode || receiptData.payment_mode || 'CASH';
    const { data: existingPayments } = await supabase
      .from('billing_payment_history')
      .select('payment_uuid')
      .eq('customer_billing_uuid', customerBillingUuid)
      .eq('installment_number', 1);

    if (existingPayments && existingPayments.length > 0) {
      const { error: payUpdErr } = await supabase
        .from('billing_payment_history')
        .update({
          amount_paid: paidAmount,
          payment_mode: paymentMode,
          payment_status: paymentStatus,
          remaining_due: dueAmount,
          bill_date: billDate,
          notes: cleanBillType === 'ORDER' ? 'Initial Advance during Order Placement' : 'Initial Invoice Payment',
        })
        .eq('payment_uuid', existingPayments[0].payment_uuid);

      if (payUpdErr) {
        console.error('❌ Error updating billing_payment_history:', payUpdErr.message);
      } else {
        console.log(`✅ Updated billing_payment_history installment #1 for ${billingId} (Paid: ₹${paidAmount}, Due: ₹${dueAmount})`);
      }
    } else if (paidAmount > 0) {
      const { error: payInsErr } = await supabase.from('billing_payment_history').insert([{
        customer_billing_uuid: customerBillingUuid,
        installment_number: 1,
        amount_paid: paidAmount,
        payment_mode: paymentMode,
        payment_status: paymentStatus,
        remaining_due: dueAmount,
        bill_date: billDate,
        notes: cleanBillType === 'ORDER' ? 'Initial Advance during Order Placement' : 'Initial Invoice Payment',
        created_at: createdAt,
      }]);
      if (payInsErr) {
        console.error('❌ Error inserting billing_payment_history:', payInsErr.message);
      } else {
        console.log(`✅ Inserted billing_payment_history installment #1 for ${billingId} (Paid: ₹${paidAmount})`);
      }
    }

    return {
      success: true,
      customer_billing_uuid: customerBillingUuid,
    };
  } catch (err: any) {
    console.error('Exception in storeBillingTransaction:', err);
    return { success: false, error: err.message || String(err) };
  }
}

/**
 * Records an additional installment payment on an existing invoice / order
 */
export async function recordAdditionalPayment(params: {
  billing_id: string;
  amount_paid: number;
  remaining_due?: number;
  total_amount?: number;
  payment_mode?: 'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER';
  notes?: string;
  bill_date?: string;
  payment_date?: string;
  custom_paid_at?: string;
}): Promise<{
  success: boolean;
  message?: string;
  updated_billing?: any;
  paid_amount?: number;
  due_amount?: number;
  payment_history?: any[];
  error?: string;
}> {
  try {
    const { billing_id, amount_paid, remaining_due, total_amount, payment_mode = 'CASH', notes, bill_date, payment_date, custom_paid_at } = params;
    const amount = Number(amount_paid);
    if (amount <= 0) {
      return { success: false, error: 'Payment amount must be greater than 0' };
    }

    const rawDate = custom_paid_at ? String(custom_paid_at).split('T')[0] : (bill_date || payment_date);
    const pDate = String(rawDate || getTodayIST()).trim();
    const paidTimestamp = custom_paid_at
      ? toISTTimestamp(custom_paid_at)
      : (pDate ? toISTTimestamp(pDate) : getNowISTISO());

    // 1. Fetch customer_billing row
    const { data: billingRow, error: fetchErr } = await supabase
      .from('customer_billing')
      .select('*')
      .eq('billing_id', billing_id)
      .single();

    if (fetchErr || !billingRow) {
      return { success: false, error: `Billing record not found for ID ${billing_id}` };
    }

    // 2. Count existing installments
    const { data: payments } = await supabase
      .from('billing_payment_history')
      .select('installment_number')
      .eq('customer_billing_uuid', billingRow.customer_billing_uuid)
      .order('installment_number', { ascending: false })
      .limit(1);

    const nextInstallmentNum = payments && payments.length > 0 ? (payments[0].installment_number + 1) : 1;

    // Calculate new amounts accurately
    const billJson = billingRow.bill_json || {};
    const effectiveTotal = Number(
      total_amount ||
      billJson.grandTotal ||
      billJson.netPayable ||
      billJson.totalSellValue ||
      billJson.total_amount ||
      billingRow.total_amount ||
      (Number(billingRow.paid_amount || 0) + Number(billingRow.due_amount || 0)) ||
      0
    );

    const newPaidAmount = Number((Number(billingRow.paid_amount || 0) + amount).toFixed(2));
    const newDueAmount = remaining_due !== undefined
      ? Math.max(0, Number(Number(remaining_due).toFixed(2)))
      : Math.max(0, Number((effectiveTotal - newPaidAmount).toFixed(2)));
    const newStatus = newDueAmount <= 0.01 ? 'PAID' : 'PARTIAL';

    // 3. Insert into billing_payment_history with bill_date, payment_status, and remaining_due
    const { error: payErr } = await supabase
      .from('billing_payment_history')
      .insert([{
        customer_billing_uuid: billingRow.customer_billing_uuid,
        installment_number: nextInstallmentNum,
        amount_paid: amount,
        payment_mode: payment_mode,
        payment_status: newDueAmount <= 0.01 ? 'FULL' : 'PARTIAL',
        remaining_due: newDueAmount,
        bill_date: pDate,
        notes: notes || `Installment #${nextInstallmentNum} for ${billing_id}`,
        created_at: paidTimestamp,
      }]);

    if (payErr) {
      return { success: false, error: payErr.message };
    }

    // 4. Update customer_billing paid_amount, due_amount, payment_status & bill_json
    const existingBillJson = billingRow.bill_json || {};
    const existingHist = Array.isArray(existingBillJson.payment_history) ? [...existingBillJson.payment_history] : [];
    existingHist.push({
      installment: nextInstallmentNum,
      amount: amount,
      paid_at: paidTimestamp,
      note: notes || `Installment #${nextInstallmentNum}`,
    });

    const updatedBillJson = {
      ...existingBillJson,
      grandTotal: effectiveTotal || existingBillJson.grandTotal,
      advancePaidAmount: newPaidAmount,
      paid_amount: newPaidAmount,
      balanceDueAmount: newDueAmount,
      due_amount: newDueAmount,
      paymentType: newDueAmount <= 0.01 ? 'FULL' : 'PARTIAL',
      payment_history: existingHist,
    };

    const updatePayload: any = {
      paid_amount: newPaidAmount,
      due_amount: newDueAmount,
      payment_status: newStatus,
      bill_json: updatedBillJson,
      updated_at: getNowISTISO(),
    };
    if (effectiveTotal > 0 && Number(billingRow.total_amount || 0) < effectiveTotal) {
      updatePayload.total_amount = effectiveTotal;
    }

    const { data: updatedBilling, error: updateErr } = await supabase
      .from('customer_billing')
      .update(updatePayload)
      .eq('customer_billing_uuid', billingRow.customer_billing_uuid)
      .select('*')
      .single();

    if (updateErr) {
      console.warn('⚠️ Error updating customer_billing amounts:', updateErr.message);
    }

    // 5. If paid in CASH, record cash inflow in cash drawer on the selected payment date
    if (payment_mode.toUpperCase() === 'CASH') {
      try {
        await recordCashTransaction({
          transaction_id: billing_id,
          transaction_type: (billingRow.bill_type || 'SELL') as any,
          flow_type: 'IN',
          amount: amount,
          metal_type: 'GOLD',
          item_type: `Installment #${nextInstallmentNum}`,
          notes: `Installment #${nextInstallmentNum} (${billing_id}) from ${billingRow.customer_name}`,
          date: pDate,
        });
      } catch (cashErr) {
        console.warn('⚠️ Error syncing cash drawer on installment:', cashErr);
      }
    }

    // 6. Fetch full payment history for this billing record
    const { data: allPayments } = await supabase
      .from('billing_payment_history')
      .select('*')
      .eq('customer_billing_uuid', billingRow.customer_billing_uuid)
      .order('installment_number', { ascending: true });

    return {
      success: true,
      message: `Installment #${nextInstallmentNum} of ₹${amount.toLocaleString('en-IN')} recorded successfully!`,
      updated_billing: updatedBilling,
      paid_amount: newPaidAmount,
      due_amount: newDueAmount,
      payment_history: (allPayments || []).map((p) => ({
        installment: p.installment_number,
        amount: Number(p.amount_paid),
        paid_at: p.created_at,
        note: p.notes,
        payment_mode: p.payment_mode,
      })),
    };
  } catch (err: any) {
    console.error('Exception in recordAdditionalPayment:', err);
    return { success: false, error: err.message || String(err) };
  }
}
