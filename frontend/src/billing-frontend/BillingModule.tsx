import React, { useState, useEffect } from 'react';
import type { GlobalRates, BillItem, CustomerDirectoryRecord } from './types';
import { ReceiptPreview, downloadReceiptAsPNG, printReceipt80mm } from './components/ReceiptPreview';
import { CustomerDirectoryView } from './components/CustomerDirectoryView';
import { EditRatesModal } from './components/EditRatesModal';
import { InvoiceDetailsView } from './components/InvoiceDetailsView';

import { API_BASE } from '../config/apiConfig';

/** Converts any string to Start Case (Title Case) — frontend-only display formatting */
const toStartCase = (str: string): string =>
  str.replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());

const formatMax2Decimals = (val: number | string | undefined | null): string => {
  if (val === undefined || val === null || val === '') return '0';
  const num = Number(val);
  if (isNaN(num)) return '0';
  const rounded = Math.round((num + Number.EPSILON) * 100) / 100;
  return String(rounded);
};

interface CreatablePresetSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder: string;
  categoryName: string;
  onAddNewPreset: (name: string, category: string) => void;
  style?: React.CSSProperties;
}

const CreatablePresetSelect: React.FC<CreatablePresetSelectProps> = ({
  value,
  onChange,
  options = [],
  placeholder,
  categoryName,
  onAddNewPreset,
  style,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapperRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setQuery(value || '');
    }
  }, [value, isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter((opt) =>
    opt.toLowerCase().includes(query.trim().toLowerCase())
  );

  const exactMatchExists = options.some(
    (opt) => opt.toLowerCase() === query.trim().toLowerCase()
  );

  const handleSelectOption = (optName: string) => {
    onChange(optName);
    setQuery(optName);
    setIsOpen(false);
  };

  const handleCreateNew = (newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    onChange(trimmed);
    setQuery(trimmed);
    setIsOpen(false);
    onAddNewPreset(trimmed, categoryName);
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      <input
        type="text"
        placeholder={placeholder}
        value={isOpen ? query : (value || '')}
        onFocus={() => {
          setIsOpen(true);
          setQuery(value || '');
        }}
        onChange={(e) => {
          const val = e.target.value;
          setQuery(val);
          onChange(val);
          if (!isOpen) setIsOpen(true);
        }}
        style={{
          width: '100%',
          padding: '0.55rem 0.75rem',
          borderRadius: '6px',
          border: '1px solid #cbd5e1',
          fontSize: '0.85rem',
          color: '#0f172a',
          background: '#ffffff',
          ...style,
        }}
      />
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '4px',
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            boxShadow: '0 8px 20px rgba(0, 0, 0, 0.12)',
            maxHeight: '140px',
            overflowY: 'auto',
            zIndex: 30,
          }}
        >
          {query.trim() !== '' && !exactMatchExists && (
            <div
              onClick={() => handleCreateNew(query)}
              style={{
                padding: '0.5rem 0.75rem',
                fontSize: '0.82rem',
                fontWeight: 700,
                color: '#2563eb',
                background: '#eff6ff',
                cursor: 'pointer',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <i className="fa-solid fa-plus-circle"></i> + Add "{query.trim()}"
            </div>
          )}

          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt) => (
              <div
                key={opt}
                onClick={() => handleSelectOption(opt)}
                style={{
                  padding: '0.45rem 0.75rem',
                  fontSize: '0.82rem',
                  color: opt === value ? '#2563eb' : '#334155',
                  fontWeight: opt === value ? 700 : 500,
                  background: opt === value ? '#f0f9ff' : 'transparent',
                  cursor: 'pointer',
                  borderBottom: '1px solid #f1f5f9',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                onMouseLeave={(e) => (e.currentTarget.style.background = opt === value ? '#f0f9ff' : 'transparent')}
              >
                {opt}
              </div>
            ))
          ) : query.trim() === '' ? (
            <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.78rem', color: '#94a3b8', textAlign: 'center' }}>
              Start typing to search or add new...
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export const BillingModule: React.FC = () => {
  // Global Rates
  const [rates, setRates] = useState<GlobalRates | null>(null);
  const [editingRates, setEditingRates] = useState(false);
  const [activeMetalTab, setActiveMetalTab] = useState<'GOLD' | 'SILVER'>('GOLD');

  // Invoices & Form state
  const [creating, setCreating] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [activeBillType, setActiveBillType] = useState<'SALE_DONE' | 'ESTIMATION'>('SALE_DONE');

  // Customer & Mode
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const getInitialItemsForMode = (m: 'SELL' | 'BUY' | 'EXCHANGE'): BillItem[] => {
    if (m === 'BUY') {
      return [
        {
          id: 'item-1',
          metal_type: 'GOLD',
          product_name: '',
          weight_grams: '',
          purity_percentage: '',
          making_charges_per_gram: '',
          gst_percent: 0,
          item_type: 'BUY',
        },
      ];
    }
    if (m === 'EXCHANGE') {
      return [
        {
          id: 'item-1',
          metal_type: 'GOLD',
          product_name: '',
          weight_grams: '',
          purity_percentage: '',
          making_charges_per_gram: '',
          gst_percent: 3,
          item_type: 'SELL',
        },
        {
          id: 'item-2',
          metal_type: 'GOLD',
          product_name: '',
          weight_grams: '',
          purity_percentage: '',
          making_charges_per_gram: '',
          gst_percent: 0,
          item_type: 'BUY',
        },
      ];
    }
    return [
      {
        id: 'item-1',
        metal_type: 'GOLD',
        product_name: '',
        weight_grams: '',
        purity_percentage: '',
        making_charges_per_gram: '',
        gst_percent: 3,
        item_type: 'SELL',
      },
    ];
  };

  const [mode, setMode] = useState<'SELL' | 'BUY' | 'EXCHANGE'>(() => {
    const params = new URLSearchParams(window.location.search);
    const m = (params.get('mode') || '').toUpperCase();
    if (m === 'BUYING' || m === 'BUY') return 'BUY';
    if (m === 'EXCHANGE' || m === 'TRADE-IN' || m === 'TRADEIN') return 'EXCHANGE';
    return 'SELL';
  });

  // View state: 'POS' | 'CUSTOMERS' | 'DETAILS' - synced with URL params
  const [selectedCustomerDetailsRecord, setSelectedCustomerDetailsRecord] = useState<CustomerDirectoryRecord | null>(null);
  const [activeView, setActiveView] = useState<'POS' | 'CUSTOMERS' | 'DETAILS'>(() => {
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
    setItems(getInitialItemsForMode(newMode));
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

  // Multi-item list initialized per mode
  const [items, setItems] = useState<BillItem[]>(() => getInitialItemsForMode(mode));

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

  const [presets, setPresets] = useState<Record<string, string[]>>({});

  const fetchPresets = async () => {
    try {
      const res = await fetch(`${API_BASE}/billing/presets`);
      const data = await res.json();
      if (data.success && data.presets) {
        setPresets(data.presets);
      }
    } catch {
      // Fallback
    }
  };

  const handleAddNewPreset = async (presetName: string, categoryName: string) => {
    if (!presetName.trim()) return;
    const cleanName = presetName.trim();
    const cleanCat = categoryName.trim().toLowerCase();

    setPresets((prev) => {
      const currentList = prev[cleanCat] || [];
      if (!currentList.includes(cleanName)) {
        return { ...prev, [cleanCat]: [...currentList, cleanName] };
      }
      return prev;
    });

    try {
      await fetch(`${API_BASE}/billing/presets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preset_name: cleanName, category_name: cleanCat }),
      });
    } catch (err) {
      console.warn('Save preset error:', err);
    }
  };

  // Fetch initial rates, presets & customer directory
  useEffect(() => {
    fetchRates();
    fetchCustomerDirectory();
    fetchPresets();
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
      weight_grams: '',
      deduction_name: '',
      deduction_weight_grams: '',
      wastage_percent: '',
      making_charges_per_gram: '',
      additional_charges_name: '',
      additional_charges_amount: '',
      item_type: itemType,
    };
    setItems([...items, newItem]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) return;
    setItems(items.filter((i) => i.id !== id));
  };

  const NUMERIC_FIELDS = new Set<keyof BillItem>([
    'weight_grams',
    'deduction_weight_grams',
    'purity_percentage',
    'wastage_percent',
    'making_charges_per_gram',
    'additional_charges_amount',
    'custom_rate_per_gram',
  ]);

  const sanitizeNumericInput = (val: string): string => {
    let cleaned = val.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      cleaned = parts[0] + '.' + parts.slice(1).join('');
    }
    if (/^0+[1-9]/.test(cleaned)) {
      cleaned = cleaned.replace(/^0+/, '');
    } else if (/^0{2,}$/.test(cleaned)) {
      cleaned = '0';
    }
    return cleaned;
  };

  const handleUpdateItem = (id: string, field: keyof BillItem, value: any) => {
    let finalVal = value;
    if (NUMERIC_FIELDS.has(field) && typeof value === 'string') {
      finalVal = sanitizeNumericInput(value);
    }
    setItems((prevItems) =>
      prevItems.map((it) => {
        if (it.id === id) {
          const updated = { ...it, [field]: finalVal };
          delete (updated as any).lineTotal;
          delete (updated as any).line_total;
          delete (updated as any).metalVal;
          delete (updated as any).metal_value;
          return updated;
        }
        return it;
      })
    );
  };

  const handleUpdateItemMultiple = (id: string, updates: Partial<BillItem>) => {
    setItems((prevItems) =>
      prevItems.map((it) => {
        if (it.id === id) {
          const updated = { ...it, ...updates };
          delete (updated as any).lineTotal;
          delete (updated as any).line_total;
          delete (updated as any).metalVal;
          delete (updated as any).metal_value;
          return updated;
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

    // Validate deduction weights vs gross weights
    const invalidDeductionItem = items.find((it) => {
      const gW = Number(it.weight_grams) || 0;
      const dW = Number(it.deduction_weight_grams) || 0;
      return dW > gW;
    });

    if (invalidDeductionItem) {
      alert(`⚠️ Cannot generate invoice: Deduction weight (${invalidDeductionItem.deduction_weight_grams} g) cannot be greater than Item Weight (${invalidDeductionItem.weight_grams} g) for item "${invalidDeductionItem.product_name || 'Item'}".`);
      return;
    }

    // Auto-save any new item presets to billing_presets table in PostgreSQL
    items.forEach((it) => {
      if (it.product_name) handleAddNewPreset(it.product_name, 'item_name');
      if (it.deduction_name) handleAddNewPreset(it.deduction_name, 'deduction_name');
      if (it.additional_charges_name) handleAddNewPreset(it.additional_charges_name, 'additional_charge');
    });

    setCreating(true);
    try {
      const firstItem = items[0];
      const enrichedItems = items.map((it) => {
        const det = calcResults.itemDetails[it.id];
        const purityNum = Number(it.purity_percentage) || 100;
        const weightNum = Number(it.weight_grams) || 0;
        const pureW = det?.pureWeight ?? Number((weightNum * (purityNum / 100)).toFixed(3));
        const isGold = it.metal_type === 'GOLD';
        const isSell = it.item_type === 'SELL';
        const rate = isGold
          ? (isSell ? rates?.gold_sell_value || 0 : rates?.gold_buy_value || 0)
          : (isSell ? rates?.silver_sell_value || 0 : rates?.silver_buy_value || 0);

        return {
          ...it,
          appliedRate: rate,
          applied_rate_per_gram: rate,
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

        // Trigger automatic 80mm thermal receipt printing & PNG download
        printReceipt80mm('pos-realtime-receipt-card');
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

  const triggerEditInvoice = (inv: any, custName?: string, custPhone?: string, custAddress?: string) => {
    if (inv?.id) {
      setEditingInvoiceId(String(inv.id));
    } else {
      setEditingInvoiceId(null);
    }
    setCustomerName(custName || inv?.customer_name || '');
    setCustomerPhone(custPhone || inv?.customer_phone || '');
    setCustomerAddress(custAddress || inv?.customer_address || inv?.receipt_json_data?.customer_address || '');

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

    setActiveView('POS');
    const params = new URLSearchParams(window.location.search);
    params.set('module', 'billing');
    params.set('mode', invMode === 'BUY' ? 'buying' : invMode.toLowerCase());
    params.delete('history');
    params.delete('search');
    params.delete('from');
    params.delete('to');
    window.history.replaceState({}, '', `?${params.toString()}`);
  };

  return (
    <div className="admin-dashboard-root" style={{ color: '#181310', fontFamily: "'Inter', 'Source Sans 3', 'DM Sans', sans-serif" }}>
      {/* ── Dedicated Invoice & Audit History View Page ── */}
      {activeView === 'DETAILS' && selectedCustomerDetailsRecord ? (
        <InvoiceDetailsView
          customerRecord={selectedCustomerDetailsRecord}
          rates={rates}
          onBack={() => {
            setSelectedCustomerDetailsRecord(null);
            handleSwitchView('CUSTOMERS');
          }}
          onEdit={(inv) => {
            const cust = selectedCustomerDetailsRecord;
            setSelectedCustomerDetailsRecord(null);
            if (cust) {
              triggerEditInvoice(inv, cust.name, cust.phone, cust.address);
            } else {
              triggerEditInvoice(inv);
            }
          }}
        />
      ) : activeView === 'CUSTOMERS' ? (
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
          onViewInvoiceDetails={(cust) => {
            setSelectedCustomerDetailsRecord(cust);
            setActiveView('DETAILS');
          }}
          onEditCustomerRecord={(cust) => {
            triggerEditInvoice(cust.latestInvoice, cust.name, cust.phone, cust.address);
          }}
        />
      ) : (
        <>
          {/* Title & Top Action Bar */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'nowrap', gap: '0.5rem' }}>
              <h2 className="admin-page-title" style={{ fontFamily: "'Inter', 'Source Sans 3', 'DM Sans', sans-serif", fontSize: '1.35rem', color: '#181310', fontWeight: 800, margin: 0, letterSpacing: '-0.5px', whiteSpace: 'nowrap' }}>
                Billing Screen
              </h2>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginLeft: 'auto', flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => handleSwitchView('CUSTOMERS')}
                  style={{
                    padding: '7px 14px',
                    background: '#181310',
                    color: '#ffffff',
                    border: '1px solid #3d2f25',
                    borderRadius: '6px',
                    fontWeight: 700,
                    fontSize: '0.80rem',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(24, 19, 16, 0.15)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <i className="fa-solid fa-address-book" style={{ fontSize: '0.74rem' }}></i> Purchase History
                </button>

                <button
                  type="button"
                  onClick={() => openRatesModal('GOLD')}
                  style={{
                    padding: '7px 14px',
                    background: 'linear-gradient(135deg, #d99b26 0%, #b45309 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 700,
                    fontSize: '0.80rem',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(180, 83, 9, 0.25)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <i className="fa-solid fa-sliders" style={{ fontSize: '0.74rem' }}></i> Edit Market Rates
                </button>
              </div>
            </div>

            <p style={{ margin: '2px 0 0 0', color: '#786a5e', fontSize: '0.76rem' }}>
              Gold &amp; Silver Selling, Buying, and Trade-in Exchange Billing
            </p>
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
                    style={{ background: '#ffffff', border: '1px solid #93c5fd', color: '#1e40af', padding: '2px 8px', borderRadius: '10px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Cancel Edit
                  </button>
                </div>
              )}
              {/* Mode Pill Selector */}
              <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.15rem', background: '#f8fafc', padding: '6px', borderRadius: '14px', border: '1px solid #cbd5e1' }}>
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
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: mode === 'SELL' ? '#d97706' : 'transparent',
                    color: mode === 'SELL' ? '#fff' : '#64748b',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                    boxShadow: mode === 'SELL' ? '0 3px 10px rgba(217, 119, 6, 0.25)' : 'none',
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
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: mode === 'BUY' ? '#1e293b' : 'transparent',
                    color: mode === 'BUY' ? '#fff' : '#64748b',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                    boxShadow: mode === 'BUY' ? '0 3px 10px rgba(30, 41, 59, 0.25)' : 'none',
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
                          weight_grams: '',
                          purity_percentage: '',
                          making_charges_per_gram: '',
                          gst_percent: 3,
                          item_type: 'SELL',
                        },
                        {
                          id: 'item-2',
                          metal_type: 'GOLD',
                          product_name: '',
                          weight_grams: '',
                          purity_percentage: '',
                          making_charges_per_gram: '',
                          gst_percent: 0,
                          item_type: 'BUY',
                        },
                      ]);
                    } else {
                      setItems(items.map((i) => ({ ...i, item_type: 'SELL' })));
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: mode === 'EXCHANGE' ? '#4f46e5' : 'transparent',
                    color: mode === 'EXCHANGE' ? '#fff' : '#64748b',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                    boxShadow: mode === 'EXCHANGE' ? '0 3px 10px rgba(79, 70, 229, 0.25)' : 'none',
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
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '0.2rem' }}
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
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '0.2rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Customer Address</label>
                  <input
                    type="text"
                    placeholder="e.g. Siddipet, TS"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(toStartCase(e.target.value))}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '0.2rem' }}
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

                    {/* Helper calculations for live row rendering */}
                    {(() => {
                      const grossW = Number(it.weight_grams) || 0;
                      const dedW = Number(it.deduction_weight_grams) || 0;
                      const netW = Math.max(0, grossW - dedW);

                      const isGold = it.metal_type === 'GOLD';
                      const netWeightLabel = isGold ? 'Only Gold Weight' : 'Only Silver Weight';

                      const wastagePct = Number(it.wastage_percent) || 0;
                      const totalWWithHmw = Number((netW + (netW * (wastagePct / 100))).toFixed(3));

                      const itemLineTotal = calcResults.itemDetails[it.id]?.lineTotal || 0;

                      return (
                        <>
                          {/* Row 1 (2 fields): Metal Category & Rate */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                            <div>
                              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '3px' }}>Metal Category</label>
                              <select
                                value={it.metal_type}
                                onChange={(e) => {
                                  const newMetal = e.target.value as 'GOLD' | 'SILVER';
                                  const defaultR = newMetal === 'GOLD'
                                    ? (it.item_type === 'SELL' ? rates?.gold_sell_value : rates?.gold_buy_value)
                                    : (it.item_type === 'SELL' ? rates?.silver_sell_value : rates?.silver_buy_value);
                                  handleUpdateItemMultiple(it.id, {
                                    metal_type: newMetal,
                                    custom_rate_per_gram: defaultR || 0,
                                  });
                                }}
                                style={{ width: '100%', padding: '0.55rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#ffffff' }}
                              >
                                <option value="GOLD">🥇 Gold</option>
                                <option value="SILVER">🥈 Silver</option>
                              </select>
                            </div>

                            <div>
                              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '3px', whiteSpace: 'nowrap' }}>
                                Rate (₹/g)
                              </label>
                              <input
                                type="text"
                                inputMode="decimal"
                                placeholder="Rate"
                                onFocus={(e) => e.target.select()}
                                value={it.custom_rate_per_gram !== undefined && it.custom_rate_per_gram !== '' ? it.custom_rate_per_gram : (
                                  it.metal_type === 'GOLD'
                                    ? (it.item_type === 'SELL' ? rates?.gold_sell_value : rates?.gold_buy_value)
                                    : (it.item_type === 'SELL' ? rates?.silver_sell_value : rates?.silver_buy_value)
                                ) || ''}
                                onChange={(e) => handleUpdateItem(it.id, 'custom_rate_per_gram', e.target.value)}
                                style={{ width: '100%', padding: '0.55rem 0.6rem', borderRadius: '6px', border: '1px solid #6366f1', background: '#eef2ff', fontWeight: 700, color: '#4338ca', fontSize: '0.85rem' }}
                                required
                              />
                            </div>
                          </div>

                          {/* Row 2 (2 fields): Item Name & Item Weight */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                            <div>
                              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '3px' }}>Item Name</label>
                              <CreatablePresetSelect
                                value={it.product_name}
                                onChange={(val) => handleUpdateItem(it.id, 'product_name', toStartCase(val))}
                                options={presets.item_name || []}
                                placeholder="e.g. Ring / Chain"
                                categoryName="item_name"
                                onAddNewPreset={handleAddNewPreset}
                              />
                            </div>

                            <div>
                              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '3px' }}>Item Weight</label>
                              <div style={{ position: 'relative' }}>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  placeholder="e.g. 10.000"
                                  onFocus={(e) => e.target.select()}
                                  value={it.weight_grams ?? ''}
                                  onChange={(e) => handleUpdateItem(it.id, 'weight_grams', e.target.value)}
                                  style={{ width: '100%', padding: '0.55rem 2.2rem 0.55rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 600 }}
                                  required
                                />
                                <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.78rem', fontWeight: 700, color: '#64748b', pointerEvents: 'none' }}>
                                  g
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Row 3: Deduction Name on left, Deduction Weight & Net Metal Weight on right */}
                          {(() => {
                            const isDeductionTooHigh = dedW > grossW && grossW > 0;
                            return (
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                                {/* Left Side: Deduction Name */}
                                <div>
                                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '3px' }}>Deduction Name</label>
                                  <CreatablePresetSelect
                                    value={it.deduction_name ?? ''}
                                    onChange={(val) => handleUpdateItem(it.id, 'deduction_name', toStartCase(val))}
                                    options={presets.deduction_name || []}
                                    placeholder="e.g. Stones / Wax"
                                    categoryName="deduction_name"
                                    onAddNewPreset={handleAddNewPreset}
                                  />
                                </div>

                                {/* Right Side Sub-Grid: Deduction Weight & Net Metal Weight */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                  <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: isDeductionTooHigh ? '#dc2626' : '#475569', display: 'block', marginBottom: '3px' }}>
                                      Deduction Weight
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                      <input
                                        type="text"
                                        inputMode="decimal"
                                        placeholder="e.g. 2.000"
                                        onFocus={(e) => e.target.select()}
                                        value={it.deduction_weight_grams ? it.deduction_weight_grams : ''}
                                        onChange={(e) => handleUpdateItem(it.id, 'deduction_weight_grams', e.target.value)}
                                        style={{
                                          width: '100%',
                                          padding: '0.55rem 2rem 0.55rem 0.65rem',
                                          borderRadius: '6px',
                                          border: isDeductionTooHigh ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                                          background: isDeductionTooHigh ? '#fef2f2' : '#ffffff',
                                          color: isDeductionTooHigh ? '#dc2626' : '#1e293b',
                                          fontSize: '0.85rem',
                                          fontWeight: 600
                                        }}
                                      />
                                      <span style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.78rem', fontWeight: 700, color: isDeductionTooHigh ? '#dc2626' : '#64748b', pointerEvents: 'none' }}>
                                        g
                                      </span>
                                    </div>
                                    {isDeductionTooHigh && (
                                      <div style={{ fontSize: '0.68rem', color: '#dc2626', fontWeight: 600, marginTop: '3px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                        <i className="fa-solid fa-circle-exclamation"></i>
                                        Exceeds Gross Weight ({grossW} g)
                                      </div>
                                    )}
                                  </div>

                                  <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#15803d', display: 'block', marginBottom: '3px' }}>
                                      {netWeightLabel}
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                      <input
                                        type="text"
                                        readOnly
                                        placeholder="0.000"
                                        value={grossW > 0 ? formatMax2Decimals(netW) : ''}
                                        style={{ width: '100%', padding: '0.55rem 2rem 0.55rem 0.65rem', borderRadius: '6px', border: '1px solid #bbf7d0', background: '#f0fdf4', fontWeight: 700, color: '#15803d', fontSize: '0.85rem' }}
                                      />
                                      <span style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.78rem', fontWeight: 700, color: '#15803d', pointerEvents: 'none' }}>
                                        g
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}

                          {/* Row 4 (2 fields for SELL): HMW (%) & Total Weight after HMW */}
                          {it.item_type === 'SELL' && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                              <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '3px' }}>HMW (%)</label>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  placeholder="e.g. 3"
                                  onFocus={(e) => e.target.select()}
                                  value={it.wastage_percent ? it.wastage_percent : ''}
                                  onChange={(e) => handleUpdateItem(it.id, 'wastage_percent', e.target.value)}
                                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                                />
                              </div>

                              <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#b45309', display: 'block', marginBottom: '3px' }}>Total Weight after HMW</label>
                                <div style={{ position: 'relative' }}>
                                  <input
                                    type="text"
                                    readOnly
                                    placeholder="0.000"
                                    value={grossW > 0 ? formatMax2Decimals(totalWWithHmw) : ''}
                                    style={{ width: '100%', padding: '0.55rem 2.2rem 0.55rem 0.75rem', borderRadius: '6px', border: '1px solid #fde68a', background: '#fef3c7', fontWeight: 700, color: '#b45309', fontSize: '0.85rem' }}
                                  />
                                  <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.78rem', fontWeight: 700, color: '#b45309', pointerEvents: 'none' }}>
                                    g
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Row 4 (2 fields for BUY): Item Quality (%) & Pure Metal Weight */}
                          {it.item_type === 'BUY' && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                              <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '3px' }}>
                                  Item Quality (%)
                                </label>
                                <div style={{ position: 'relative' }}>
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    placeholder="e.g. 90"
                                    onFocus={(e) => e.target.select()}
                                    value={it.purity_percentage ? it.purity_percentage : ''}
                                    onChange={(e) => handleUpdateItem(it.id, 'purity_percentage', e.target.value)}
                                    style={{ width: '100%', padding: '0.55rem 2rem 0.55rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 600 }}
                                  />
                                  <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.78rem', fontWeight: 700, color: '#64748b', pointerEvents: 'none' }}>
                                    %
                                  </span>
                                </div>
                              </div>

                              <div>
                                {(() => {
                                  const purityPct = Number(it.purity_percentage) || 0;
                                  const pureW = purityPct > 0 ? Number((netW * (purityPct / 100)).toFixed(3)) : 0;
                                  const pureLabel = isGold ? 'Pure Gold Weight' : 'Pure Silver Weight';
                                  return (
                                    <>
                                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#d97706', display: 'block', marginBottom: '3px' }}>
                                        {pureLabel}
                                      </label>
                                      <div style={{ position: 'relative' }}>
                                        <input
                                          type="text"
                                          readOnly
                                          placeholder="0.000"
                                          value={grossW > 0 && purityPct > 0 ? formatMax2Decimals(pureW) : ''}
                                          style={{ width: '100%', padding: '0.55rem 2.2rem 0.55rem 0.75rem', borderRadius: '6px', border: '1px solid #fde68a', background: '#fffbeb', fontWeight: 700, color: '#d97706', fontSize: '0.85rem' }}
                                        />
                                        <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.78rem', fontWeight: 700, color: '#d97706', pointerEvents: 'none' }}>
                                          g
                                        </span>
                                      </div>
                                    </>
                                  );
                                })()}
                              </div>
                            </div>
                          )}

                          {/* Row 5 (2 fields for SELL): Additional Charge Name & Additional Charges Value */}
                          {it.item_type === 'SELL' && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                              <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '3px' }}>Additional Charges Name</label>
                                <CreatablePresetSelect
                                  value={it.additional_charges_name ?? ''}
                                  onChange={(val) => handleUpdateItem(it.id, 'additional_charges_name', toStartCase(val))}
                                  options={presets.additional_charge || []}
                                  placeholder="e.g. Stones / Stone Cost"
                                  categoryName="additional_charge"
                                  onAddNewPreset={handleAddNewPreset}
                                />
                              </div>

                              <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '3px' }}>Additional Charges Value (₹)</label>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  placeholder="e.g. 400"
                                  onFocus={(e) => e.target.select()}
                                  value={it.additional_charges_amount ? it.additional_charges_amount : ''}
                                  onChange={(e) => handleUpdateItem(it.id, 'additional_charges_amount', e.target.value)}
                                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Row 6 (2 fields for SELL): Making Charges & Total Item Value */}
                          {it.item_type === 'SELL' && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                              <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '3px' }}>Making Charges (₹)</label>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  placeholder="e.g. 200"
                                  onFocus={(e) => e.target.select()}
                                  value={it.making_charges_per_gram ? it.making_charges_per_gram : ''}
                                  onChange={(e) => handleUpdateItem(it.id, 'making_charges_per_gram', e.target.value)}
                                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                                />
                              </div>

                              <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#16a34a', display: 'block', marginBottom: '3px' }}>Total Item Value (₹)</label>
                                <input
                                  type="text"
                                  readOnly
                                  placeholder="₹0"
                                  value={grossW > 0 && itemLineTotal > 0 ? `₹${itemLineTotal.toLocaleString('en-IN')}` : ''}
                                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid #86efac', background: '#f0fdf4', fontWeight: 800, color: '#15803d', fontSize: '0.88rem' }}
                                />
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', paddingTop: '0.4rem', borderTop: '1px dashed #e2e8f0' }}>
                      <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
                        Calculated Subtotal: <strong style={{ color: '#0f172a', fontSize: '0.88rem' }}>₹{(calcResults.itemDetails[it.id]?.lineTotal || 0).toLocaleString('en-IN')}</strong>
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

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveBillType('ESTIMATION');
                      setTimeout(() => {
                        printReceipt80mm('pos-realtime-receipt-card');
                        downloadReceiptAsPNG('pos-realtime-receipt-card', customerName || 'Estimation_Bill');
                      }, 100);
                    }}
                    style={{
                      padding: '0.8rem 1.4rem',
                      borderRadius: '8px',
                      border: '1px solid #d97706',
                      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                      color: '#ffffff',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: '0.88rem',
                      boxShadow: '0 4px 14px rgba(217, 119, 6, 0.3)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <i className="fa-solid fa-calculator"></i> Estimation
                  </button>

                  <button
                    type="button"
                    disabled={creating}
                    onClick={() => {
                      if (!customerName || items.length === 0) return;
                      setShowConfirmModal(true);
                    }}
                    style={{
                      padding: '0.8rem 1.75rem',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #228B22 0%, #33B249 100%)',
                      color: '#ffffff',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: '0.88rem',
                      boxShadow: '0 4px 14px rgba(51, 178, 73, 0.3)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <i className="fa-solid fa-circle-check"></i> {creating ? 'Saving Sale...' : 'Sale done'}
                  </button>
                </div>
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
              billType={activeBillType}
            />
          </div>

          {/* Sale Done Confirmation Modal */}
          {showConfirmModal && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
              <div style={{ background: '#ffffff', borderRadius: '20px', maxWidth: '420px', width: '100%', padding: '1.75rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', textAlign: 'center', border: '1px solid #cbd5e1' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#dcfce7', color: '#16a34a', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem', margin: '0 auto 1rem auto' }}>
                  <i className="fa-solid fa-file-invoice-dollar"></i>
                </div>

                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                  Are you sure?
                </h3>

                <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.88rem', color: '#475569', lineHeight: '1.4' }}>
                  Do you want to complete this sale and save the official invoice?
                </p>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setShowConfirmModal(false)}
                    style={{ padding: '0.65rem 1.25rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      setShowConfirmModal(false);
                      setActiveBillType('SALE_DONE');
                      handleCreateInvoice(e);
                    }}
                    style={{ padding: '0.65rem 1.4rem', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #228B22 0%, #33B249 100%)', color: '#ffffff', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem', boxShadow: '0 4px 12px rgba(34, 139, 34, 0.3)' }}
                  >
                    Yes, Complete Sale
                  </button>
                </div>
              </div>
            </div>
          )}

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
