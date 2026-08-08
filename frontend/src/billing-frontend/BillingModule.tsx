import React, { useState, useEffect } from 'react';
import type { GlobalRates, BillItem, CustomerDirectoryRecord } from './types';
import { ReceiptPreview, downloadReceiptAsPNG } from './components/ReceiptPreview';
import { CustomerDirectoryView } from './components/CustomerDirectoryView';
import { EditRatesModal } from './components/EditRatesModal';

const API_BASE = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api');

/** Converts any string to Start Case (Title Case) — frontend-only display formatting */
const toStartCase = (str: string): string =>
  str.replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());

export const BillingModule: React.FC = () => {
  // Global Rates
  const [rates, setRates] = useState<GlobalRates | null>(null);
  const [editingRates, setEditingRates] = useState(false);
  const [activeMetalTab, setActiveMetalTab] = useState<'GOLD' | 'SILVER'>('GOLD');

  // Invoices & Form state
  const [creating, setCreating] = useState(false);

  // Customer & Mode
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [mode, setMode] = useState<'SELL' | 'BUY' | 'EXCHANGE'>(() => {
    const params = new URLSearchParams(window.location.search);
    const m = (params.get('mode') || '').toUpperCase();
    if (m === 'BUYING' || m === 'BUY') return 'BUY';
    if (m === 'EXCHANGE') return 'EXCHANGE';
    return 'SELL';
  });

  // View state: 'POS' vs 'CUSTOMERS' - synced with URL params
  const [activeView, setActiveView] = useState<'POS' | 'CUSTOMERS'>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('history')) return 'CUSTOMERS';
    const viewParam = params.get('view')?.toUpperCase();
    return viewParam === 'CUSTOMERS' || viewParam === 'CUSTOMER' || viewParam === 'TRANSACTIONS' ? 'CUSTOMERS' : 'POS';
  });

  const handleSwitchView = (targetView: 'POS' | 'CUSTOMERS') => {
    setActiveView(targetView);
    const params = new URLSearchParams(window.location.search);
    params.set('module', 'billing');
    if (targetView === 'CUSTOMERS') {
      params.delete('mode');
      if (!params.has('history')) params.set('history', 'all');
    } else {
      params.delete('history');
      params.delete('search');
      params.delete('from');
      params.delete('to');
      params.set('mode', mode === 'BUY' ? 'buying' : mode.toLowerCase());
    }
    window.history.replaceState({}, '', `?${params.toString()}`);
  };

  const handleSetMode = (newMode: 'SELL' | 'BUY' | 'EXCHANGE') => {
    setMode(newMode);
    const params = new URLSearchParams(window.location.search);
    params.set('module', 'billing');
    params.set('mode', newMode === 'BUY' ? 'buying' : newMode.toLowerCase());
    params.delete('history');
    params.delete('search');
    params.delete('from');
    params.delete('to');
    window.history.replaceState({}, '', `?${params.toString()}`);
  };

  const [successModal, setSuccessModal] = useState<{ open: boolean; message: string; invId: string } | null>(null);

  // Multi-item list (starts blank)
  const [items, setItems] = useState<BillItem[]>([
    {
      id: 'item-1',
      metal_type: 'GOLD',
      product_name: '',
      weight_grams: 0,
      purity_percentage: 91.6,
      making_charges_per_gram: 0,
      gst_percent: 3,
      item_type: 'SELL',
    },
  ]);

  const [customerDirectory, setCustomerDirectory] = useState<CustomerDirectoryRecord[]>([]);
  const [calcResults, setCalcResults] = useState<{
    itemDetails: Record<string, { metalVal: number; makingVal: number; gstVal: number; lineTotal: number; pureWeight?: number; rate?: number }>;
    totalSellValue: number;
    totalBuyCredit: number;
    netPayable: number;
  }>({
    itemDetails: {},
    totalSellValue: 0,
    totalBuyCredit: 0,
    netPayable: 0,
  });

  // Fetch initial rates & customer directory
  useEffect(() => {
    fetchRates();
    fetchCustomerDirectory();
  }, []);

  // Fetch 100% server-calculated subtotals & net payables from backend API
  useEffect(() => {
    if (!rates) return;
    const fetchCalculation = async () => {
      try {
        const res = await fetch(`${API_BASE}/billing/calculate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items, rates }),
        });
        const data = await res.json();
        if (data.success) {
          setCalcResults({
            itemDetails: data.itemDetails || {},
            totalSellValue: data.totalSellValue || 0,
            totalBuyCredit: data.totalBuyCredit || 0,
            netPayable: data.netPayable || 0,
          });
        }
      } catch (err) {
        console.error('Server calculation error:', err);
      }
    };
    fetchCalculation();
  }, [items, rates]);

  const fetchRates = async () => {
    try {
      const res = await fetch(`${API_BASE}/billing/rates`);
      const data = await res.json();
      if (data.success) {
        setRates(data.rates);
      }
    } catch (err) {
      console.error('Failed to fetch metal rates:', err);
    }
  };



  const fetchCustomerDirectory = async () => {
    try {
      const res = await fetch(`${API_BASE}/billing/customer-directory`);
      const data = await res.json();
      if (data.success) {
        setCustomerDirectory(data.customers || []);
      }
    } catch (err) {
      console.error('Failed to fetch customer directory:', err);
    }
  };

  const openRatesModal = (tab: 'GOLD' | 'SILVER') => {
    setActiveMetalTab(tab);
    setEditingRates(true);
    const params = new URLSearchParams(window.location.search);
    params.set('rates', tab.toLowerCase());
    window.history.replaceState({}, '', `?${params.toString()}`);
  };

  const closeRatesModal = () => {
    setEditingRates(false);
    const params = new URLSearchParams(window.location.search);
    params.delete('rates');
    window.history.replaceState({}, '', `?${params.toString()}`);
  };

  const handleUpdateRates = async (
    tab: 'GOLD' | 'SILVER',
    goldBuy: number,
    goldSell: number,
    silverBuy: number,
    silverSell: number
  ) => {
    const payload =
      tab === 'GOLD'
        ? { gold_buy_value: goldBuy, gold_sell_value: goldSell }
        : { silver_buy_value: silverBuy, silver_sell_value: silverSell };

    const res = await fetch(`${API_BASE}/billing/rates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (data.success) {
      setRates(data.rates);
    }
  };

  // Dynamic Item Helpers
  const handleAddItem = (itemType: 'SELL' | 'BUY') => {
    const newItem: BillItem = {
      id: `item-${Date.now()}`,
      metal_type: 'GOLD',
      product_name: '',
      weight_grams: 0,
      purity_percentage: 91.6,
      making_charges_per_gram: 0,
      gst_percent: itemType === 'SELL' ? 3 : 0,
      item_type: itemType,
    };
    setItems([...items, newItem]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) return;
    setItems(items.filter((i) => i.id !== id));
  };

  const handleUpdateItem = (id: string, field: keyof BillItem, value: any) => {
    setItems(
      items.map((it) => {
        if (it.id === id) {
          return { ...it, [field]: value };
        }
        return it;
      })
    );
  };

  const { totalSellValue, totalBuyCredit, netPayable } = calcResults;

  // Submit invoice
  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || items.length === 0) return;

    setCreating(true);
    try {
      const firstItem = items[0];
      const enrichedItems = items.map((it) => {
        const det = calcResults.itemDetails[it.id];
        const purityNum = Number(it.purity_percentage) || 100;
        const weightNum = Number(it.weight_grams) || 0;
        const pureW = det?.pureWeight ?? Number((weightNum * (purityNum / 100)).toFixed(3));
        return {
          ...it,
          lineTotal: det?.lineTotal ?? 0,
          line_total: det?.lineTotal ?? 0,
          pureWeight: pureW,
          pure_weight_grams: pureW,
          metalVal: det?.metalVal ?? 0,
          makingVal: det?.makingVal ?? 0,
          gstVal: det?.gstVal ?? 0,
        };
      });

      const receiptPayload = {
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_address: customerAddress,
        transaction_type: mode,
        rates,
        items: enrichedItems,
        totalSellValue,
        totalBuyCredit,
        netPayable,
      };

      const url = editingInvoiceId ? `${API_BASE}/billing/update/${editingInvoiceId}` : `${API_BASE}/billing/create`;
      const method = editingInvoiceId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_address: customerAddress,
          transaction_type: mode,
          metal_type: items.every((i) => i.metal_type === 'GOLD') ? 'GOLD' : items.every((i) => i.metal_type === 'SILVER') ? 'SILVER' : 'MIXED',
          product_name: items.map((i) => `${i.product_name} (${i.weight_grams}g)`).join(', '),
          weight_grams: items.reduce((acc, curr) => acc + Number(curr.weight_grams), 0),
          purity_percentage: firstItem?.purity_percentage,
          making_charges_per_gram: firstItem?.making_charges_per_gram,
          gst_percent: firstItem?.gst_percent,
          receipt_json_data: receiptPayload,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        fetchCustomerDirectory();

        // Trigger automatic PNG receipt download
        downloadReceiptAsPNG('pos-realtime-receipt-card', customerName);

        // Show Success Confirmation Modal without erasing data on screen!
        setSuccessModal({
          open: true,
          message: editingInvoiceId ? 'Invoice Record Updated & Stored Successfully!' : 'Sale Completed & Stored Successfully!',
          invId: data.invoice?.id || editingInvoiceId || 'INV-SUCCESS',
        });
        setEditingInvoiceId(null);
      } else {
        alert(`⚠️ Database / Server Error:\n\n${data.message || 'Failed to generate billing invoice.'}`);
      }
    } catch (err: any) {
      console.error('Failed to create bill:', err);
      alert(`⚠️ Request Error:\n\n${err.message || 'Network error occurred while creating invoice.'}`);
    } finally {
      setCreating(false);
    }
  };

  const handleResetForm = () => {
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setEditingInvoiceId(null);
    setItems([
      {
        id: 'item-1',
        metal_type: 'GOLD',
        product_name: '',
        weight_grams: 0,
        purity_percentage: 91.6,
        making_charges_per_gram: 0,
        gst_percent: mode === 'SELL' || mode === 'EXCHANGE' ? 3 : 0,
        item_type: mode === 'BUY' ? 'BUY' : 'SELL',
      },
    ]);
    setSuccessModal(null);
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '-';
    return new Date(isoString).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' });
  };

  return (
    <div className="admin-dashboard-root" style={{ color: '#181310', fontFamily: "'Inter', 'Source Sans 3', 'DM Sans', sans-serif" }}>
      {/* ── If activeView === 'CUSTOMERS', render dedicated standalone Purchase History Page Component ── */}
      {activeView === 'CUSTOMERS' ? (
        <CustomerDirectoryView
          customers={customerDirectory}
          rates={rates}
          formatDate={formatDate}
          onBackToPOS={() => handleSwitchView('POS')}
          onSelectCustomerForBill={(name, phone) => {
            setCustomerName(name);
            setCustomerPhone(phone === '-' ? '' : phone);
            handleSwitchView('POS');
          }}
          onEditCustomerRecord={(cust) => {
            const inv = cust.latestInvoice;
            if (inv?.id) {
              setEditingInvoiceId(String(inv.id));
            } else {
              setEditingInvoiceId(null);
            }
            setCustomerName(cust.name);
            setCustomerPhone(cust.phone === '-' ? '' : cust.phone);
            setCustomerAddress(cust.address || inv?.customer_address || inv?.receipt_json_data?.customer_address || '');

            const invMode = ((inv?.receipt_json_data?.transaction_type || inv?.transaction_type || 'SELL').toUpperCase()) as 'SELL' | 'BUY' | 'EXCHANGE';
            setMode(invMode);

            if (inv?.receipt_json_data?.items && Array.isArray(inv.receipt_json_data.items) && inv.receipt_json_data.items.length > 0) {
              setItems(inv.receipt_json_data.items);
            } else if (inv) {
              setItems([
                {
                  id: 'item-1',
                  metal_type: (inv.metal_type === 'SILVER' ? 'SILVER' : 'GOLD') as any,
                  product_name: inv.product_name || '',
                  weight_grams: inv.weight_grams || 0,
                  purity_percentage: inv.purity_percentage || 91.6,
                  making_charges_per_gram: inv.making_charges_per_gram || 0,
                  gst_percent: inv.gst_percent || 3,
                  item_type: inv.transaction_type === 'BUY' ? 'BUY' : 'SELL',
                },
              ]);
            }

            // Directly switch active view without resetting items via handleSetMode
            setActiveView('POS');
            const params = new URLSearchParams(window.location.search);
            params.set('module', 'billing');
            params.set('mode', invMode === 'BUY' ? 'buying' : invMode.toLowerCase());
            params.delete('history');
            params.delete('search');
            params.delete('from');
            params.delete('to');
            window.history.replaceState({}, '', `?${params.toString()}`);
          }}
        />
      ) : (
        <>
          {/* Title & Top Action Bar */}
          <div style={{ marginBottom: '1.15rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h2 className="admin-page-title" style={{ fontFamily: "'Inter', 'Source Sans 3', 'DM Sans', sans-serif", fontSize: '1.5rem', color: '#181310', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>
                <i className="fa-solid fa-cash-register" style={{ color: '#d97706', marginRight: '6px' }}></i> Billing Screen
              </h2>
              <p style={{ margin: '2px 0 0 0', color: '#786a5e', fontSize: '0.8rem' }}>
                Gold &amp; Silver Selling, Buying, and Trade-in Exchange Billing
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => handleSwitchView('CUSTOMERS')}
                style={{
                  padding: '8px 16px',
                  background: '#181310',
                  color: '#ffffff',
                  border: '1px solid #3d2f25',
                  borderRadius: '0px',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(24, 19, 16, 0.2)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <i className="fa-solid fa-address-book"></i> Purchase History
              </button>

              <button
                type="button"
                onClick={() => openRatesModal('GOLD')}
                style={{
                  padding: '8px 16px',
                  background: 'linear-gradient(135deg, #d99b26 0%, #b45309 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '0px',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(180, 83, 9, 0.3)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <i className="fa-solid fa-sliders"></i> Edit Market Rates
              </button>
            </div>
          </div>

          {/* Premium Market Rates Modal Overlay */}
          {editingRates && (
            <EditRatesModal
              rates={rates}
              activeMetalTab={activeMetalTab}
              onClose={closeRatesModal}
              onUpdateRates={handleUpdateRates}
              formatDate={formatDate}
            />
          )}

          <div className="pos-grid-container">

            {/* LEFT GRID (70%): Multi-Item POS Terminal Form */}
            <form onSubmit={handleCreateInvoice} style={{ background: '#ffffff', borderRadius: '16px', padding: '1.25rem', border: '1px solid #eaecf0', boxShadow: '0 6px 20px rgba(0,0,0,0.02)' }}>
              {editingInvoiceId && (
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '8px 12px', borderRadius: '8px', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1d4ed8' }}>
                    <i className="fa-solid fa-pen-to-square"></i> Editing Invoice Record: #{editingInvoiceId}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingInvoiceId(null);
                      setCustomerName('');
                      setCustomerPhone('');
                      setCustomerAddress('');
                    }}
                    style={{ background: '#ffffff', border: '1px solid #93c5fd', color: '#1e40af', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Cancel Edit
                  </button>
                </div>
              )}
              {/* Mode Pill Selector */}
              <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.15rem', background: '#f8fafc', padding: '4px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  onClick={() => {
                    handleSetMode('SELL');
                    if (!editingInvoiceId) {
                      setItems([
                        {
                          id: 'item-1',
                          metal_type: 'GOLD',
                          product_name: '',
                          weight_grams: 0,
                          purity_percentage: 91.6,
                          making_charges_per_gram: 0,
                          gst_percent: 3,
                          item_type: 'SELL',
                        },
                      ]);
                    } else {
                      setItems(items.map((i) => ({ ...i, item_type: 'SELL' })));
                    }
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
                    handleSetMode('BUY');
                    if (!editingInvoiceId) {
                      setItems([
                        {
                          id: 'item-1',
                          metal_type: 'GOLD',
                          product_name: '',
                          weight_grams: 0,
                          purity_percentage: 91.6,
                          making_charges_per_gram: 0,
                          gst_percent: 0,
                          item_type: 'BUY',
                        },
                      ]);
                    } else {
                      setItems(items.map((i) => ({ ...i, item_type: 'BUY' })));
                    }
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
                    handleSetMode('EXCHANGE');
                    if (!editingInvoiceId) {
                      setItems([
                        {
                          id: 'item-1',
                          metal_type: 'GOLD',
                          product_name: '',
                          weight_grams: 0,
                          purity_percentage: 91.6,
                          making_charges_per_gram: 0,
                          gst_percent: 3,
                          item_type: 'SELL',
                        },
                        {
                          id: 'item-2',
                          metal_type: 'GOLD',
                          product_name: '',
                          weight_grams: 0,
                          purity_percentage: 91.6,
                          making_charges_per_gram: 0,
                          gst_percent: 0,
                          item_type: 'BUY',
                        },
                      ]);
                    }
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Customer Name</label>
                  <input
                    type="text"
                    placeholder="Customer Name"
                    value={customerName}
                    onChange={(e) => setCustomerName(toStartCase(e.target.value))}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '0.2rem' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Customer Phone</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={10}
                    placeholder="Phone Number"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ''))}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '0.2rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Customer Address</label>
                  <input
                    type="text"
                    placeholder="e.g. Siddipet, TS"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(toStartCase(e.target.value))}
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
                        JBJ - {it.item_type}ING ITEM
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

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '3px' }}>Item Name</label>
                        <input
                          type="text"
                          placeholder="e.g. 22K Gold Chain"
                          value={it.product_name}
                          onChange={(e) => handleUpdateItem(it.id, 'product_name', toStartCase(e.target.value))}
                          style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                          required
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '3px' }}>Metal Category</label>
                        <select
                          value={it.metal_type}
                          onChange={(e) => handleUpdateItem(it.id, 'metal_type', e.target.value as any)}
                          style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#ffffff' }}
                        >
                          <option value="GOLD">🥇 Gold</option>
                          <option value="SILVER">🥈 Silver</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '3px' }}>Gross Weight (Grams)</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="e.g. 10.500"
                          value={it.weight_grams ?? ''}
                          onChange={(e) => handleUpdateItem(it.id, 'weight_grams', e.target.value)}
                          style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                          required
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '3px' }}>Purity (%)</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="91.6"
                          value={it.purity_percentage ?? ''}
                          onChange={(e) => handleUpdateItem(it.id, 'purity_percentage', e.target.value)}
                          style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                          required
                        />
                      </div>

                      {it.item_type === 'SELL' && (
                        <>
                          <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '3px' }}>Making Charges (₹ Total)</label>
                            <input
                              type="text"
                              inputMode="decimal"
                              placeholder="e.g. 4000"
                              value={it.making_charges_per_gram ?? ''}
                              onChange={(e) => handleUpdateItem(it.id, 'making_charges_per_gram', e.target.value)}
                              style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                            />
                          </div>

                          <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '3px' }}>GST Tax (%)</label>
                            <input
                              type="text"
                              inputMode="decimal"
                              placeholder="3"
                              value={it.gst_percent ?? ''}
                              onChange={(e) => handleUpdateItem(it.id, 'gst_percent', e.target.value)}
                              style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                            />
                          </div>
                        </>
                      )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.4rem', borderTop: '1px dashed #e2e8f0' }}>
                      <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        Calculated Subtotal: <strong style={{ color: '#0f172a' }}>₹{(calcResults.itemDetails[it.id]?.lineTotal || 0).toLocaleString('en-IN')}</strong>
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Sleek Bottom Horizontal Net Calculation & Submit Bar */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem 1.25rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                  {mode === 'BUY' ? (
                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Gross Buying Amount:</span>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0369a1' }}>₹{totalBuyCredit.toLocaleString('en-IN')}</div>
                    </div>
                  ) : mode === 'SELL' ? (
                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Gross Selling Total:</span>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#b45309' }}>₹{totalSellValue.toLocaleString('en-IN')}</div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Gross Selling Total:</span>
                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#b45309' }}>₹{totalSellValue.toLocaleString('en-IN')}</div>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Less Item Exchange:</span>
                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0369a1' }}>- ₹{totalBuyCredit.toLocaleString('en-IN')}</div>
                      </div>
                    </>
                  )}

                  <div style={{ paddingLeft: '1rem', borderLeft: '2px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 800, textTransform: 'uppercase', display: 'block' }}>GRAND TOTAL:</span>
                    <span style={{ fontSize: '0.68rem', color: mode === 'BUY' || (mode === 'EXCHANGE' && totalBuyCredit > totalSellValue) ? '#0369a1' : '#64748b', fontWeight: 600, display: 'block', marginTop: '-2px' }}>
                      {mode === 'BUY' || (mode === 'EXCHANGE' && totalBuyCredit > totalSellValue) ? '(Need to pay to customer)' : '(Customer should pay)'}
                    </span>
                    <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                      ₹{mode === 'BUY' ? totalBuyCredit.toLocaleString('en-IN') : mode === 'SELL' ? totalSellValue.toLocaleString('en-IN') : Math.abs(totalSellValue - totalBuyCredit).toLocaleString('en-IN')}
                    </div>
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

            {/* RIGHT GRID (30%): Real-Time Retail Thermal Receipt Preview */}
            <ReceiptPreview
              receiptId="pos-realtime-receipt-card"
              mode={mode}
              customerName={customerName}
              customerPhone={customerPhone}
              customerAddress={customerAddress}
              rates={rates}
              items={items}
              totalSellValue={totalSellValue}
              totalBuyCredit={totalBuyCredit}
              netPayable={netPayable}
            />
          </div>

          {/* Success Confirmation Popup Modal */}
          {successModal?.open && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
              <div style={{ background: '#ffffff', borderRadius: '20px', maxWidth: '440px', width: '100%', padding: '1.75rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#dcfce7', color: '#16a34a', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', marginBottom: '1rem' }}>
                  <i className="fa-solid fa-circle-check"></i>
                </div>

                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                  {successModal.message}
                </h3>

                <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.85rem', color: '#475569', lineHeight: '1.4' }}>
                  Invoice <strong style={{ color: '#0f172a' }}>#{successModal.invId}</strong> has been saved to database and thermal receipt image downloaded cleanly.
                </p>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setSuccessModal(null)}
                    style={{ padding: '0.65rem 1.15rem', background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '10px', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}
                  >
                    Keep Viewing Bill
                  </button>

                  <button
                    type="button"
                    onClick={handleResetForm}
                    style={{ padding: '0.65rem 1.15rem', background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)' }}
                  >
                    Start New Bill
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default BillingModule;
