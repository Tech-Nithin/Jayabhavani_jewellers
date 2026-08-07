import React, { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api');

interface GlobalRates {
  gold_buy_value: number;
  gold_buy_value_updated_at: string;
  gold_sell_value: number;
  gold_sell_value_updated_at: string;
  silver_buy_value: number;
  silver_buy_value_updated_at: string;
  silver_sell_value: number;
  silver_sell_value_updated_at: string;
}

interface BillItem {
  id: string;
  metal_type: 'GOLD' | 'SILVER';
  product_name: string;
  weight_grams: number;
  purity_percentage: number;
  making_charges_per_gram: number;
  gst_percent: number;
  item_type: 'SELL' | 'BUY';
}

interface InvoiceRecord {
  id: string;
  customer_name: string;
  customer_phone?: string;
  transaction_type: 'SELL' | 'BUY' | 'EXCHANGE';
  metal_type: string;
  product_name: string;
  weight_grams: number;
  purity_percentage: number;
  applied_rate_per_gram: number;
  pure_metal_weight: number;
  metal_value: number;
  making_charges: number;
  gst_amount: number;
  final_amount: number;
  created_at: string;
}

export const BillingModule: React.FC = () => {

  // Rates state
  const [rates, setRates] = useState<GlobalRates | null>(null);
  const [editingRates, setEditingRates] = useState(false);
  const [rateForm, setRateForm] = useState({
    gold_buy_value: '',
    gold_sell_value: '',
    silver_buy_value: '',
    silver_sell_value: '',
  });

  // Invoices & Form state
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [creating, setCreating] = useState(false);

  // Customer & Mode
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [mode, setMode] = useState<'SELL' | 'BUY' | 'EXCHANGE'>('SELL');

  // Multi-item list
  const [items, setItems] = useState<BillItem[]>([
    {
      id: 'item-1',
      metal_type: 'GOLD',
      product_name: '22K Gold Bangle Set',
      weight_grams: 10,
      purity_percentage: 91.6,
      making_charges_per_gram: 400,
      gst_percent: 3,
      item_type: 'SELL',
    },
  ]);

  useEffect(() => {
    fetchRates();
    fetchInvoices();
  }, []);

  const fetchRates = async () => {
    try {
      const res = await fetch(`${API_BASE}/billing/rates`);
      const data = await res.json();
      if (data.success) {
        setRates(data.rates);
        setRateForm({
          gold_buy_value: String(data.rates.gold_buy_value),
          gold_sell_value: String(data.rates.gold_sell_value),
          silver_buy_value: String(data.rates.silver_buy_value),
          silver_sell_value: String(data.rates.silver_sell_value),
        });
      }
    } catch (err) {
      console.error('Failed to fetch rates:', err);
    }
  };

  const fetchInvoices = async () => {
    try {
      const res = await fetch(`${API_BASE}/billing/invoices`);
      const data = await res.json();
      if (data.success) {
        setInvoices(data.invoices);
      }
    } catch (err) {
      console.error('Failed to fetch invoices:', err);
    }
  };

  const handleUpdateRates = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/billing/rates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gold_buy_value: Number(rateForm.gold_buy_value),
          gold_sell_value: Number(rateForm.gold_sell_value),
          silver_buy_value: Number(rateForm.silver_buy_value),
          silver_sell_value: Number(rateForm.silver_sell_value),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setRates(data.rates);
        setEditingRates(false);
      }
    } catch (err) {
      console.error('Failed to update rates:', err);
    }
  };

  // Add Item to Bill
  const handleAddItem = (type: 'SELL' | 'BUY') => {
    setItems([
      ...items,
      {
        id: `item-${Date.now()}`,
        metal_type: 'GOLD',
        product_name: type === 'SELL' ? '22K Gold Ornament' : 'Old Gold Scrap',
        weight_grams: 5,
        purity_percentage: 91.6,
        making_charges_per_gram: type === 'SELL' ? 400 : 0,
        gst_percent: type === 'SELL' ? 3 : 0,
        item_type: type,
      },
    ]);
  };

  // Remove Item
  const handleRemoveItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((i) => i.id !== id));
    }
  };

  // Update Item field
  const handleUpdateItem = (id: string, field: keyof BillItem, value: any) => {
    setItems(
      items.map((it) => (it.id === id ? { ...it, [field]: value } : it))
    );
  };

  // Live item calculation helper based on rates
  const calculateItemTotal = (item: BillItem) => {
    if (!rates) return 0;
    const isGold = item.metal_type === 'GOLD';
    const isSell = item.item_type === 'SELL';

    let rate = 0;
    if (isGold) {
      rate = isSell ? rates.gold_sell_value : rates.gold_buy_value;
    } else {
      rate = isSell ? rates.silver_sell_value : rates.silver_buy_value;
    }

    const pureWeight = item.weight_grams * (item.purity_percentage / 100);
    const metalVal = pureWeight * rate;
    const makingVal = isSell ? item.weight_grams * item.making_charges_per_gram : 0;
    const subtotal = metalVal + makingVal;
    const gstVal = isSell ? subtotal * (item.gst_percent / 100) : 0;

    return Number((subtotal + gstVal).toFixed(2));
  };

  const sellItems = items.filter((i) => i.item_type === 'SELL');
  const buyItems = items.filter((i) => i.item_type === 'BUY');

  const totalSellValue = sellItems.reduce((acc, curr) => acc + calculateItemTotal(curr), 0);
  const totalBuyCredit = buyItems.reduce((acc, curr) => acc + calculateItemTotal(curr), 0);
  const netPayable = Math.max(0, totalSellValue - totalBuyCredit);

  // Submit invoice
  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || items.length === 0) return;

    setCreating(true);
    try {
      const firstItem = items[0];
      const res = await fetch(`${API_BASE}/billing/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: customerName,
          customer_phone: customerPhone,
          transaction_type: mode,
          metal_type: items.every((i) => i.metal_type === 'GOLD') ? 'GOLD' : items.every((i) => i.metal_type === 'SILVER') ? 'SILVER' : 'MIXED',
          product_name: items.map((i) => `${i.product_name} (${i.weight_grams}g)`).join(', '),
          weight_grams: items.reduce((acc, curr) => acc + Number(curr.weight_grams), 0),
          purity_percentage: firstItem.purity_percentage,
          making_charges_per_gram: firstItem.making_charges_per_gram,
          gst_percent: firstItem.gst_percent,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setInvoices([data.invoice, ...invoices]);
        setCustomerName('');
        setCustomerPhone('');
      }
    } catch (err) {
      console.error('Failed to create bill:', err);
    } finally {
      setCreating(false);
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '-';
    return new Date(isoString).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' });
  };

  return (
    <div className="admin-dashboard-root" style={{ color: '#1e293b', fontFamily: "'Inter', 'Source Sans 3', 'DM Sans', sans-serif" }}>
      {/* Title & Edit Rates Button */}
      <div style={{ marginBottom: '1.15rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 className="admin-page-title" style={{ fontFamily: "'Inter', 'Source Sans 3', 'DM Sans', sans-serif", fontSize: '1.5rem', color: '#0f172a', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>
            <i className="fa-solid fa-cash-register" style={{ color: '#6366f1', marginRight: '6px' }}></i> Multi-Item POS Billing Terminal
          </h2>
          <p style={{ margin: '2px 0 0 0', color: '#64748b', fontSize: '0.8rem' }}>
            Gold &amp; Silver Selling, Buying, and Trade-in Exchange Billing
          </p>
        </div>

        <button
          onClick={() => setEditingRates(!editingRates)}
          style={{
            padding: '8px 16px',
            background: editingRates ? '#f1f5f9' : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            color: editingRates ? '#0f172a' : '#ffffff',
            border: 'none',
            borderRadius: '10px',
            fontWeight: 600,
            fontSize: '0.82rem',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <i className={editingRates ? 'fa-solid fa-xmark' : 'fa-solid fa-sliders'}></i>
          {editingRates ? 'Close Rates' : 'Edit Market Rates'}
        </button>
      </div>

      {/* Rate Editing Drawer */}
      {editingRates && (
        <form onSubmit={handleUpdateRates} style={{ background: '#ffffff', border: '1px solid #6366f1', borderRadius: '14px', padding: '1.15rem', marginBottom: '1.25rem', boxShadow: '0 8px 24px rgba(99, 102, 241, 0.08)' }}>
          <h3 style={{ margin: '0 0 0.85rem 0', fontSize: '1rem', color: '#4f46e5', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="fa-solid fa-sliders"></i> Update Global Market Rates (Per Gram)
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Gold Buy Rate (₹/g)</label>
              <input
                type="number"
                value={rateForm.gold_buy_value}
                onChange={(e) => setRateForm({ ...rateForm, gold_buy_value: e.target.value })}
                style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '0.2rem' }}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Gold Sell Rate (₹/g)</label>
              <input
                type="number"
                value={rateForm.gold_sell_value}
                onChange={(e) => setRateForm({ ...rateForm, gold_sell_value: e.target.value })}
                style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '0.2rem' }}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Silver Buy Rate (₹/g)</label>
              <input
                type="number"
                value={rateForm.silver_buy_value}
                onChange={(e) => setRateForm({ ...rateForm, silver_buy_value: e.target.value })}
                style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '0.2rem' }}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Silver Sell Rate (₹/g)</label>
              <input
                type="number"
                value={rateForm.silver_sell_value}
                onChange={(e) => setRateForm({ ...rateForm, silver_sell_value: e.target.value })}
                style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '0.2rem' }}
                required
              />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)', color: '#fff', border: 'none', padding: '0.6rem 1.25rem', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
            >
              Save &amp; Broadcast Rates
            </button>
          </div>
        </form>
      )}

      {/* Market Rates Board Cards (Compact Gaps) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem', marginBottom: '1.25rem' }}>
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '1rem 1.15rem', border: '1px solid #eaecf0', boxShadow: '0 6px 20px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>GOLD SELL RATE</span>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: '2px 0' }}>
            ₹{rates?.gold_sell_value.toLocaleString('en-IN')}<small style={{ fontSize: '0.75rem', color: '#64748b' }}>/g</small>
          </div>
          <small style={{ color: '#b45309', fontSize: '0.68rem' }}>Updated {formatDate(rates?.gold_sell_value_updated_at)}</small>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '1rem 1.15rem', border: '1px solid #eaecf0', boxShadow: '0 6px 20px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>GOLD BUY RATE</span>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: '2px 0' }}>
            ₹{rates?.gold_buy_value.toLocaleString('en-IN')}<small style={{ fontSize: '0.75rem', color: '#64748b' }}>/g</small>
          </div>
          <small style={{ color: '#b45309', fontSize: '0.68rem' }}>Updated {formatDate(rates?.gold_buy_value_updated_at)}</small>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '1rem 1.15rem', border: '1px solid #eaecf0', boxShadow: '0 6px 20px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>SILVER SELL RATE</span>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: '2px 0' }}>
            ₹{rates?.silver_sell_value.toLocaleString('en-IN')}<small style={{ fontSize: '0.75rem', color: '#64748b' }}>/g</small>
          </div>
          <small style={{ color: '#64748b', fontSize: '0.68rem' }}>Updated {formatDate(rates?.silver_sell_value_updated_at)}</small>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '1rem 1.15rem', border: '1px solid #eaecf0', boxShadow: '0 6px 20px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>SILVER BUY RATE</span>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: '2px 0' }}>
            ₹{rates?.silver_buy_value.toLocaleString('en-IN')}<small style={{ fontSize: '0.75rem', color: '#64748b' }}>/g</small>
          </div>
          <small style={{ color: '#64748b', fontSize: '0.68rem' }}>Updated {formatDate(rates?.silver_buy_value_updated_at)}</small>
        </div>
      </div>

      {/* Full Width Multi-Item POS Terminal */}
      <div style={{ marginBottom: '1.25rem' }}>
        <form onSubmit={handleCreateInvoice} style={{ background: '#ffffff', borderRadius: '16px', padding: '1.25rem', border: '1px solid #eaecf0', boxShadow: '0 6px 20px rgba(0,0,0,0.02)' }}>
          {/* Mode Pill Selector */}
          <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.15rem', background: '#f8fafc', padding: '4px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <button
              type="button"
              onClick={() => {
                setMode('SELL');
                setItems([
                  {
                    id: 'item-1',
                    metal_type: 'GOLD',
                    product_name: '22K Gold Bangle Set',
                    weight_grams: 10,
                    purity_percentage: 91.6,
                    making_charges_per_gram: 400,
                    gst_percent: 3,
                    item_type: 'SELL',
                  },
                ]);
              }}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '8px',
                border: 'none',
                background: mode === 'SELL' ? '#d97706' : 'transparent',
                color: mode === 'SELL' ? '#fff' : '#64748b',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
              }}
            >
              <i className="fa-solid fa-tag"></i> SELLING
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('BUY');
                setItems([
                  {
                    id: 'item-1',
                    metal_type: 'GOLD',
                    product_name: 'Old Gold Scrap',
                    weight_grams: 10,
                    purity_percentage: 91.6,
                    making_charges_per_gram: 0,
                    gst_percent: 0,
                    item_type: 'BUY',
                  },
                ]);
              }}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '8px',
                border: 'none',
                background: mode === 'BUY' ? '#1e293b' : 'transparent',
                color: mode === 'BUY' ? '#fff' : '#64748b',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
              }}
            >
              <i className="fa-solid fa-money-bill-transfer"></i> BUYING
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('EXCHANGE');
                setItems([
                  {
                    id: 'item-1',
                    metal_type: 'GOLD',
                    product_name: 'New 22K Gold Chain',
                    weight_grams: 15,
                    purity_percentage: 91.6,
                    making_charges_per_gram: 400,
                    gst_percent: 3,
                    item_type: 'SELL',
                  },
                  {
                    id: 'item-2',
                    metal_type: 'GOLD',
                    product_name: 'Old Gold Ring Trade-In',
                    weight_grams: 8,
                    purity_percentage: 91.6,
                    making_charges_per_gram: 0,
                    gst_percent: 0,
                    item_type: 'BUY',
                  },
                ]);
              }}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '8px',
                border: 'none',
                background: mode === 'EXCHANGE' ? '#4f46e5' : 'transparent',
                color: mode === 'EXCHANGE' ? '#fff' : '#64748b',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
              }}
            >
              <i className="fa-solid fa-rotate"></i> TRADE-IN
            </button>
          </div>

          {/* Customer info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Customer Name</label>
              <input
                type="text"
                placeholder="Customer Name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '0.2rem' }}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Customer Phone</label>
              <input
                type="tel"
                placeholder="Phone Number"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '0.2rem' }}
              />
            </div>
          </div>

          {/* Items List Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.4rem' }}>
            <h4 style={{ margin: 0, fontSize: '0.88rem', color: '#0f172a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
              <i className="fa-solid fa-list-check" style={{ color: '#6366f1' }}></i> Bill Products ({items.length})
            </h4>

            <div style={{ display: 'flex', gap: '0.4rem' }}>
              {(mode === 'SELL' || mode === 'EXCHANGE') && (
                <button
                  type="button"
                  onClick={() => handleAddItem('SELL')}
                  style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', padding: '5px 10px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <i className="fa-solid fa-plus"></i> Add Sell Item
                </button>
              )}

              {(mode === 'BUY' || mode === 'EXCHANGE') && (
                <button
                  type="button"
                  onClick={() => handleAddItem('BUY')}
                  style={{ background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', padding: '5px 10px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <i className="fa-solid fa-plus"></i> Add Buy Item
                </button>
              )}
            </div>
          </div>

          {/* Item Rows */}
          <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1.15rem' }}>
            {items.map((it) => (
              <div key={it.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.85rem', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: it.item_type === 'SELL' ? '#fef3c7' : '#e0f2fe',
                    color: it.item_type === 'SELL' ? '#b45309' : '#0369a1',
                  }}>
                    {it.item_type} ITEM
                  </span>

                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(it.id)}
                      style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 700 }}
                    >
                      <i className="fa-solid fa-trash-can"></i> Remove
                    </button>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', gap: '0.6rem', marginBottom: '0.5rem' }}>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: '#64748b' }}>Description</label>
                    <input
                      type="text"
                      value={it.product_name}
                      onChange={(e) => handleUpdateItem(it.id, 'product_name', e.target.value)}
                      style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '0.15rem' }}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.7rem', color: '#64748b' }}>Category</label>
                    <select
                      value={it.metal_type}
                      onChange={(e) => handleUpdateItem(it.id, 'metal_type', e.target.value as any)}
                      style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '0.15rem' }}
                    >
                      <option value="GOLD">Gold</option>
                      <option value="SILVER">Silver</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.7rem', color: '#64748b' }}>Weight (g)</label>
                    <input
                      type="number"
                      step="0.001"
                      value={it.weight_grams}
                      onChange={(e) => handleUpdateItem(it.id, 'weight_grams', Number(e.target.value))}
                      style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '0.15rem' }}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.7rem', color: '#64748b' }}>Purity (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={it.purity_percentage}
                      onChange={(e) => handleUpdateItem(it.id, 'purity_percentage', Number(e.target.value))}
                      style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '0.15rem' }}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.4rem', borderTop: '1px dashed #e2e8f0' }}>
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    Calculated Subtotal: <strong style={{ color: '#0f172a' }}>₹{calculateItemTotal(it).toLocaleString('en-IN')}</strong>
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Sleek Bottom Horizontal Net Calculation & Submit Bar */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem 1.25rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Selling Items Total:</span>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#b45309' }}>₹{totalSellValue.toLocaleString('en-IN')}</div>
              </div>

              <div>
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Old Metal Credit:</span>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0369a1' }}>- ₹{totalBuyCredit.toLocaleString('en-IN')}</div>
              </div>

              <div style={{ paddingLeft: '1rem', borderLeft: '2px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 700, textTransform: 'uppercase' }}>Net Payable Amount:</span>
                <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a' }}>₹{netPayable.toLocaleString('en-IN')}</div>
              </div>
            </div>

            <button
              type="submit"
              disabled={creating}
              style={{
                padding: '0.8rem 1.75rem',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
                color: '#ffffff',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '0.88rem',
                boxShadow: '0 4px 14px rgba(99, 102, 241, 0.3)',
              }}
            >
              {creating ? 'Saving Bill...' : 'Complete & Generate Official Bill'}
            </button>
          </div>
        </form>
      </div>

      {/* Invoices History Table */}
      <div style={{ background: '#ffffff', borderRadius: '16px', padding: '1.25rem', border: '1px solid #eaecf0', boxShadow: '0 6px 20px rgba(0,0,0,0.02)' }}>
        <h3 style={{ margin: '0 0 0.85rem 0', fontSize: '1.05rem', color: '#0f172a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <i className="fa-solid fa-receipt" style={{ color: '#6366f1' }}></i> Recent Billing Invoices
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569' }}>
                <th style={{ padding: '10px 12px' }}>Invoice ID</th>
                <th style={{ padding: '10px 12px' }}>Customer</th>
                <th style={{ padding: '10px 12px' }}>Mode</th>
                <th style={{ padding: '10px 12px' }}>Product(s)</th>
                <th style={{ padding: '10px 12px' }}>Weight</th>
                <th style={{ padding: '10px 12px' }}>Total Amount</th>
                <th style={{ padding: '10px 12px' }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 700 }}>{inv.id}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ fontWeight: 600 }}>{inv.customer_name}</div>
                    <small style={{ color: '#64748b' }}>{inv.customer_phone}</small>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      background: inv.transaction_type === 'SELL' ? '#fef3c7' : inv.transaction_type === 'BUY' ? '#e0f2fe' : '#ede9fe',
                      color: inv.transaction_type === 'SELL' ? '#b45309' : inv.transaction_type === 'BUY' ? '#0369a1' : '#4f46e5',
                    }}>
                      {inv.transaction_type}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>{inv.product_name}</td>
                  <td style={{ padding: '10px 12px' }}>{inv.weight_grams}g</td>
                  <td style={{ padding: '10px 12px', fontWeight: 700 }}>₹{inv.final_amount.toLocaleString('en-IN')}</td>
                  <td style={{ padding: '10px 12px', color: '#64748b' }}>{formatDate(inv.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BillingModule;
