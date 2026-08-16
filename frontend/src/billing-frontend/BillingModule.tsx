import React, { useState, useEffect } from 'react';
import type { GlobalRates, BillItem, CustomerDirectoryRecord } from './types';
import { ReceiptPreview, printReceipt80mm } from './components/ReceiptPreview';
import { CustomerDirectoryView } from './components/CustomerDirectoryView';
import { EditRatesModal } from './components/EditRatesModal';
import { InvoiceDetailsView } from './components/InvoiceDetailsView';
import { FullImagePreviewModal } from '../inventory-frontend/components/FullImagePreviewModal';

import { API_BASE } from '../config/apiConfig';
import { getTeluguTransliteration } from '../utils/transliterate';

import { SellModeForm } from './components/modes/SellModeForm';
import { BuyModeForm } from './components/modes/BuyModeForm';
import { ExchangeModeForm } from './components/modes/ExchangeModeForm';
import { OrderModeForm } from './components/modes/OrderModeForm';
import { toStartCase, formatIndianCurrencyInput, parseIndianCurrencyNumber } from './components/modes/modeUtils';

import { translations } from '../utils/translations';
import type { Language } from '../utils/translations';

interface BillingModuleProps {
  lang?: Language;
}

export const BillingModule: React.FC<BillingModuleProps> = ({ lang = 'EN' }) => {
  const t = translations[lang] || translations.EN;
  // Global Rates
  const [rates, setRates] = useState<GlobalRates | null>(null);
  const [editingRates, setEditingRates] = useState(false);
  const [activeMetalTab, setActiveMetalTab] = useState<'GOLD' | 'SILVER'>('GOLD');

  // Invoices & Form state
  const [creating, setCreating] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [activeBillType, setActiveBillType] = useState<'SALE_DONE' | 'ESTIMATION'>('SALE_DONE');

  // Customer & Mode with Session Persistence
  const getInitialDraft = () => {
    try {
      const saved = sessionStorage.getItem('jbj_billing_draft_v1');
      if (saved) return JSON.parse(saved);
    } catch (e) { }
    return null;
  };

  const initialDraft = getInitialDraft();

  const [customerName, setCustomerName] = useState(initialDraft?.customerName || '');
  const [customerPhone, setCustomerPhone] = useState(initialDraft?.customerPhone || '');
  const [customerAddress, setCustomerAddress] = useState(initialDraft?.customerAddress || '');
  const [teluguCustomerName, setTeluguCustomerName] = useState('');
  const [teluguCustomerAddress, setTeluguCustomerAddress] = useState('');

  // Auto-translate typed Customer Name and Address to Telugu dynamically for screen & receipt display
  useEffect(() => {
    if (!customerName.trim()) {
      setTeluguCustomerName('');
      return;
    }
    getTeluguTransliteration(customerName).then((translated) => {
      setTeluguCustomerName(translated);
    });
  }, [customerName]);

  useEffect(() => {
    if (!customerAddress.trim()) {
      setTeluguCustomerAddress('');
      return;
    }
    getTeluguTransliteration(customerAddress).then((translated) => {
      setTeluguCustomerAddress(translated);
    });
  }, [customerAddress]);

  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [successModal, setSuccessModal] = useState<{ open: boolean; message: string; invId: string } | null>(null);

  // Payment Breakdown State (Full vs Partial Payment)
  const [paymentType, setPaymentType] = useState<'FULL' | 'PARTIAL'>(initialDraft?.paymentType || 'FULL');
  const [advancePaidAmount, setAdvancePaidAmount] = useState<string>(initialDraft?.advancePaidAmount || '');
  const getInitialItemsForMode = (m: 'SELL' | 'BUY' | 'EXCHANGE' | 'ORDER'): BillItem[] => {
    if (m === 'BUY') {
      return [
        {
          id: 'item-1',
          metal_type: 'GOLD',
          product_name: '',
          quantity_unit: 'PIECES',
          quantity_value: '1',
          weight_grams: '',
          purity_percentage: '',
          making_charges_per_gram: '',
          gst_percent: 0,
          item_type: 'BUY',
        },
      ];
    }
    if (m === 'EXCHANGE' || m === 'ORDER') {
      return [
        {
          id: 'item-1',
          metal_type: 'GOLD',
          product_name: '',
          quantity_unit: 'PIECES',
          quantity_value: '1',
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
          quantity_unit: 'PIECES',
          quantity_value: '1',
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
        quantity_unit: 'PIECES',
        quantity_value: '1',
        weight_grams: '',
        purity_percentage: '',
        making_charges_per_gram: '',
        gst_percent: 3,
        item_type: 'SELL',
      },
    ];
  };

  const [mode, setMode] = useState<'SELL' | 'BUY' | 'EXCHANGE' | 'ORDER'>(() => {
    const params = new URLSearchParams(window.location.search);
    const m = (params.get('mode') || '').toUpperCase();
    if (m === 'BUYING' || m === 'BUY') return 'BUY';
    if (m === 'EXCHANGE' || m === 'TRADE-IN' || m === 'TRADEIN') return 'EXCHANGE';
    if (m === 'ORDER' || m === 'ORDERS') return 'ORDER';
    return initialDraft?.mode || 'SELL';
  });

  // Per-mode items storage cache map - single source of truth for tab item persistence
  const [modeItemsMap, setModeItemsMap] = useState<Record<'SELL' | 'BUY' | 'EXCHANGE' | 'ORDER', BillItem[]>>(() => {
    if (initialDraft?.modeItemsMap) {
      return initialDraft.modeItemsMap;
    }
    return {
      SELL: getInitialItemsForMode('SELL'),
      BUY: getInitialItemsForMode('BUY'),
      EXCHANGE: getInitialItemsForMode('EXCHANGE'),
      ORDER: getInitialItemsForMode('ORDER'),
    };
  });

  // Items for currently active mode derived directly from modeItemsMap
  const items = modeItemsMap[mode] || getInitialItemsForMode(mode);

  // Helper to update active mode items in modeItemsMap
  const updateActiveModeItems = (updater: (currentItems: BillItem[]) => BillItem[]) => {
    setModeItemsMap((prev) => ({
      ...prev,
      [mode]: updater(prev[mode] || getInitialItemsForMode(mode)),
    }));
  };

  // Sync state changes to sessionStorage for complete cross-module navigation persistence
  useEffect(() => {
    try {
      const payload = {
        customerName,
        customerPhone,
        customerAddress,
        paymentType,
        advancePaidAmount,
        mode,
        modeItemsMap,
      };
      sessionStorage.setItem('jbj_billing_draft_v1', JSON.stringify(payload));
    } catch (e) { }
  }, [customerName, customerPhone, customerAddress, paymentType, advancePaidAmount, mode, modeItemsMap]);

  // View state: 'POS' | 'CUSTOMERS' | 'DETAILS' - synced with URL params
  const [selectedCustomerDetailsRecord, setSelectedCustomerDetailsRecord] = useState<CustomerDirectoryRecord | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; title?: string } | null>(null);
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
    window.history.pushState({}, '', `?${params.toString()}`);
  };

  const handleSetMode = (newMode: 'SELL' | 'BUY' | 'EXCHANGE' | 'ORDER') => {
    setMode(newMode);
    const params = new URLSearchParams(window.location.search);
    params.set('module', 'billing');
    params.set('mode', newMode === 'BUY' ? 'buying' : newMode.toLowerCase());
    params.delete('history');
    params.delete('search');
    params.delete('from');
    params.delete('to');
    window.history.pushState({}, '', `?${params.toString()}`);
  };

  const handleStartFresh = () => {
    try {
      sessionStorage.removeItem('jbj_billing_draft_v1');
    } catch (e) { }

    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setTeluguCustomerName('');
    setTeluguCustomerAddress('');
    setShowValidationErrors(false);
    setPaymentType('FULL');
    setAdvancePaidAmount('');
    setEditingInvoiceId(null);

    setModeItemsMap((prev) => ({
      ...prev,
      [mode]: getInitialItemsForMode(mode),
    }));
  };

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
      // Forceful instant live update across all open pages & tabs (Groww stock app style)
      window.dispatchEvent(new CustomEvent('jbj_metal_rates_updated', { detail: data.rates }));
      try {
        const channel = new BroadcastChannel('jbj_rates_channel');
        channel.postMessage({ type: 'RATES_UPDATED', rates: data.rates });
        channel.close();
      } catch {}
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
    updateActiveModeItems((curr) => [...curr, newItem]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) return;
    updateActiveModeItems((curr) => curr.filter((i) => i.id !== id));
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
    updateActiveModeItems((prevItems) =>
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
    updateActiveModeItems((prevItems) =>
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

  const [uploadingImageItemId, setUploadingImageItemId] = useState<string | null>(null);

  const handleItemImageUpload = (itemId: string, file: File) => {
    setUploadingImageItemId(itemId);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setUploadingImageItemId(null);
          return;
        }
        ctx.drawImage(img, 0, 0);
        const webpDataUrl = canvas.toDataURL('image/webp', 0.85);
        handleUpdateItem(itemId, 'image_url', webpDataUrl);
        setUploadingImageItemId(null);
      };
      img.onerror = () => setUploadingImageItemId(null);
      img.src = event.target?.result as string;
    };
    reader.onerror = () => setUploadingImageItemId(null);
    reader.readAsDataURL(file);
  };

  const { totalSellValue, totalBuyCredit, netPayable } = calcResults;

  const handlePreSubmitCheck = () => {
    const isNameMissing = !customerName.trim();
    const isPhoneMissing = !customerPhone.trim() || customerPhone.trim().length < 10;
    const isAddressMissing = !customerAddress.trim();

    const invalidItem = items.find((it) => !it.product_name || !it.product_name.trim() || !it.weight_grams || Number(it.weight_grams) <= 0);

    if (isNameMissing || isPhoneMissing || isAddressMissing || invalidItem || items.length === 0) {
      setShowValidationErrors(true);
      const missingList = [];
      if (isNameMissing) missingList.push('• Customer Name (*)');
      if (isPhoneMissing) missingList.push('• Customer Phone (* 10-digit number)');
      if (isAddressMissing) missingList.push('• Customer Address (*)');
      if (invalidItem) {
        if (!invalidItem.product_name || !invalidItem.product_name.trim()) missingList.push('• Item Name (*)');
        if (!invalidItem.weight_grams || Number(invalidItem.weight_grams) <= 0) missingList.push('• Item Weight (* > 0g)');
      }

      alert(`⚠️ Mandatory Details Missing!\n\nPlease fill in all required fields highlighted in red before completing the sale:\n\n${missingList.join('\n')}`);
      return;
    }

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

    setShowConfirmModal(true);
  };

  // Submit invoice
  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    const isNameMissing = !customerName.trim();
    const isPhoneMissing = !customerPhone.trim() || customerPhone.trim().length < 10;
    const isAddressMissing = !customerAddress.trim();

    if (isNameMissing || isPhoneMissing || isAddressMissing || items.length === 0) {
      setShowValidationErrors(true);
      const missingList = [];
      if (isNameMissing) missingList.push('• Customer Name (*)');
      if (isPhoneMissing) missingList.push('• Customer Phone (* 10-digit number)');
      if (isAddressMissing) missingList.push('• Customer Address (*)');

      alert(`⚠️ Mandatory Customer Details Missing!\n\nPlease fill in all required fields before saving the bill:\n\n${missingList.join('\n')}`);
      return;
    }

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
      // Deferred Cloudinary upload: Upload local Base64/Blob WebP images to Cloudinary ONLY when submitting
      const itemsWithCloudinaryImages = await Promise.all(
        items.map(async (it) => {
          if (it.image_url && (it.image_url.startsWith('data:image/') || it.image_url.startsWith('blob:'))) {
            try {
              const formData = new FormData();
              formData.append('file', it.image_url);
              formData.append('image', it.image_url);
              const resUpload = await fetch(`${API_BASE}/inventory/upload-cloudinary`, {
                method: 'POST',
                body: formData,
              });
              if (resUpload.ok) {
                const dataUpload = await resUpload.json();
                if (dataUpload.success && dataUpload.url) {
                  return { ...it, image_url: dataUpload.url };
                }
              }
            } catch (errUpload) {
              console.error('Deferred Cloudinary upload error:', errUpload);
            }
          }
          return it;
        })
      );

      const firstItem = itemsWithCloudinaryImages[0];
      const enrichedItems = itemsWithCloudinaryImages.map((it) => {
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

      // If mode === 'ORDER', save directly to orders table ONLY with submitted: 'no'
      if (mode === 'ORDER') {
        const orderItemsList = items.filter((i) => i.item_type === 'SELL');
        const primaryItem = orderItemsList[0] || firstItem;

        const combinedItemNames = orderItemsList.length > 0
          ? orderItemsList.map((i) => toStartCase(i.product_name || 'Custom Ornament')).join(', ')
          : toStartCase(primaryItem?.product_name || 'Custom Jewelry Order');

        const totalGrossW = orderItemsList.reduce((acc, i) => acc + (Number(i.weight_grams) || 0), 0);
        const totalDedW = orderItemsList.reduce((acc, i) => acc + (Number(i.deduction_weight_grams) || 0), 0);
        const totalNetW = Math.max(0, totalGrossW - totalDedW);

        const grandTotalVal = Math.abs(totalSellValue - totalBuyCredit);
        const effPaid = paymentType === 'FULL' ? grandTotalVal : Math.min(grandTotalVal, parseIndianCurrencyNumber(advancePaidAmount));
        const effDue = Math.max(0, grandTotalVal - effPaid);

        const orderReceiptPayload = {
          ...receiptPayload,
          mode: 'ORDER',
          transaction_type: 'ORDER',
          paymentType,
          advancePaidAmount: effPaid,
          balanceDueAmount: effDue,
        };

        const resOrder = await fetch(`${API_BASE}/work-assignment/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customer_name: customerName.trim(),
            customer_phone: customerPhone.trim(),
            customer_address: customerAddress.trim(),
            metal_type: primaryItem?.metal_type || 'GOLD',
            item_name: combinedItemNames,
            quantity_unit: primaryItem?.quantity_unit || 'PIECES',
            quantity_value: Number(primaryItem?.quantity_value) || 1,
            item_length_inches: primaryItem?.item_length_inches || '',
            gross_weight_grams: totalGrossW,
            net_weight_grams: totalNetW,
            touch_percentage: Number(primaryItem?.purity_percentage) || 91.6,
            making_charges: Number(primaryItem?.making_charges_per_gram) || 0,
            estimated_delivery_date: new Date().toISOString().split('T')[0],
            paid_amount: effPaid,
            due_amount: effDue,
            applied_rate_per_gram: Number(rates?.gold_sell_value) || 0,
            pure_metal_weight: Number((totalNetW * ((Number(primaryItem?.purity_percentage) || 91.6) / 100)).toFixed(3)),
            metal_value: totalSellValue,
            gst_amount: 0,
            final_amount: grandTotalVal,
            receipt_json_data: orderReceiptPayload,
            submitted: 'no',
            image_url: primaryItem?.image_url || '',
            hmw_percentage: Number(primaryItem?.wastage_percent) || 0,
            hmw_weight: Number((totalNetW + (totalNetW * ((Number(primaryItem?.wastage_percent) || 0) / 100))).toFixed(3)),
            additional_charge_name: primaryItem?.additional_charges_name || '',
            additional_charge_value: Number(primaryItem?.additional_charges_amount) || 0,
            return_purity_percentage: Number(primaryItem?.return_purity_percentage) || 0,
            return_pure_gold: Number(primaryItem?.return_pure_gold) || (primaryItem?.return_purity_percentage ? Number((totalNetW * (Number(primaryItem.return_purity_percentage) / 100)).toFixed(3)) : 0),
            notes: primaryItem?.item_notes || (primaryItem as any)?.notes || `JBJ-Order Item: Gross ₹${totalSellValue.toLocaleString('en-IN')}, Trade-in Old Metal -₹${totalBuyCredit.toLocaleString('en-IN')}, Net ₹${netPayable.toLocaleString('en-IN')}`,
          }),
        });

        const dataOrder = await resOrder.json();
        if (resOrder.ok && dataOrder.success) {
          fetchCustomerDirectory();
          printReceipt80mm('pos-realtime-receipt-card');
          setSuccessModal({
            open: true,
            message: 'Custom Order Registered & Saved to Orders Database!',
            invId: dataOrder.order?.id || 'ORD-SAVED',
          });
        } else {
          const errorMsg = dataOrder?.message || dataOrder?.error || 'Unknown server error creating order.';
          const detailMsg = dataOrder?.details ? `\nDetails: ${dataOrder.details}` : '';
          const hintMsg = dataOrder?.hint ? `\nHint: ${dataOrder.hint}` : '';
          alert(`⚠️ Database / Server Error:\n\n${errorMsg}${detailMsg}${hintMsg}`);
        }
        return;
      }

      // Direct sales (SELL, BUY, EXCHANGE) save directly to billing_invoices
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

        // Trigger automatic 80mm thermal receipt printing
        printReceipt80mm('pos-realtime-receipt-card');

        // Show Success Confirmation Modal without erasing data on screen!
        setSuccessModal({
          open: true,
          message: editingInvoiceId ? 'Invoice Record Updated & Stored Successfully!' : 'Sale Completed & Stored Successfully!',
          invId: data.invoice?.id || editingInvoiceId || 'ORD-SUCCESS',
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
    try {
      sessionStorage.removeItem('jbj_billing_draft_v1');
    } catch (e) { }
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setAdvancePaidAmount('');
    setPaymentType('FULL');
    setEditingInvoiceId(null);
    setModeItemsMap({
      SELL: getInitialItemsForMode('SELL'),
      BUY: getInitialItemsForMode('BUY'),
      EXCHANGE: getInitialItemsForMode('EXCHANGE'),
      ORDER: getInitialItemsForMode('ORDER'),
    });
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

    const invMode = ((inv?.receipt_json_data?.transaction_type || inv?.transaction_type || 'SELL').toUpperCase()) as 'SELL' | 'BUY' | 'EXCHANGE' | 'ORDER';
    setMode(invMode);

    if (inv?.receipt_json_data?.items && Array.isArray(inv.receipt_json_data.items) && inv.receipt_json_data.items.length > 0) {
      updateActiveModeItems(() => inv.receipt_json_data.items);
    } else if (inv) {
      updateActiveModeItems(() => [
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
          lang={lang}
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
          lang={lang}
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
                {t.billingScreenTitle}
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
                  <i className="fa-solid fa-address-book" style={{ fontSize: '0.74rem' }}></i> {t.purchaseHistoryBtn}
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
                  <i className="fa-solid fa-sliders" style={{ fontSize: '0.74rem' }}></i> {t.editMarketRatesBtn}
                </button>
              </div>
            </div>

            <p style={{ margin: '2px 0 0 0', color: '#786a5e', fontSize: '0.76rem' }}>
              {t.billingScreenSub}
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
            <div style={{ background: '#ffffff', borderRadius: '16px', padding: '1.25rem', border: '1px solid #eaecf0', boxShadow: '0 6px 20px rgba(0,0,0,0.02)' }}>
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
                  onClick={() => handleSetMode('ORDER')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: mode === 'ORDER' ? '#059669' : 'transparent',
                    color: mode === 'ORDER' ? '#fff' : '#64748b',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                    boxShadow: mode === 'ORDER' ? '0 3px 10px rgba(5, 150, 105, 0.25)' : 'none',
                  }}
                >
                  <i className="fa-solid fa-cart-flatbed"></i> {lang === 'TE' ? 'ఆర్డర్లు' : 'Orders'}
                </button>

                <button
                  type="button"
                  onClick={() => handleSetMode('SELL')}
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
                  <i className="fa-solid fa-tag"></i> {t.sellingTab}
                </button>

                <button
                  type="button"
                  onClick={() => handleSetMode('BUY')}
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
                  <i className="fa-solid fa-money-bill-transfer"></i> {t.buyingTab}
                </button>

                <button
                  type="button"
                  onClick={() => handleSetMode('EXCHANGE')}
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
                  <i className="fa-solid fa-rotate"></i> {t.tradeInTab}
                </button>


              </div>

              <form onSubmit={handleCreateInvoice}>
                {/* Customer info (Shared by ALL modes: SELL, BUY, EXCHANGE, ORDER) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: showValidationErrors && !customerName.trim() ? '#dc2626' : '#475569' }}>
                        {t.custNameLabel} <span style={{ color: '#dc2626', fontWeight: 800 }}>*</span>
                      </label>
                      {showValidationErrors && !customerName.trim() && (
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#dc2626' }}>* Required</span>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder={t.custNamePlaceholder}
                      value={customerName}
                      onChange={(e) => {
                        setCustomerName(toStartCase(e.target.value));
                        if (showValidationErrors) setShowValidationErrors(false);
                      }}
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.75rem',
                        borderRadius: '6px',
                        border: showValidationErrors && !customerName.trim() ? '2px solid #dc2626' : '1px solid #cbd5e1',
                        background: showValidationErrors && !customerName.trim() ? '#fef2f2' : '#ffffff',
                        marginTop: '0.2rem',
                        boxShadow: showValidationErrors && !customerName.trim() ? '0 0 0 4px rgba(220, 38, 38, 0.25)' : 'none',
                      }}
                      required
                    />
                    {showValidationErrors && !customerName.trim() && (
                      <div style={{ color: '#dc2626', fontSize: '0.68rem', fontWeight: 700, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <i className="fa-solid fa-triangle-exclamation"></i> Please enter Customer Name
                      </div>
                    )}
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: showValidationErrors && (!customerPhone.trim() || customerPhone.trim().length < 10) ? '#dc2626' : '#475569' }}>
                        {t.custPhoneLabel} <span style={{ color: '#dc2626', fontWeight: 800 }}>*</span>
                      </label>
                      {showValidationErrors && (!customerPhone.trim() || customerPhone.trim().length < 10) && (
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#dc2626' }}>* 10 Digits Req</span>
                      )}
                    </div>
                    <input
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={10}
                      placeholder={t.custPhonePlaceholder}
                      value={customerPhone}
                      onChange={(e) => {
                        setCustomerPhone(e.target.value.replace(/\D/g, ''));
                        if (showValidationErrors) setShowValidationErrors(false);
                      }}
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.75rem',
                        borderRadius: '6px',
                        border: showValidationErrors && (!customerPhone.trim() || customerPhone.trim().length < 10) ? '2px solid #dc2626' : '1px solid #cbd5e1',
                        background: showValidationErrors && (!customerPhone.trim() || customerPhone.trim().length < 10) ? '#fef2f2' : '#ffffff',
                        marginTop: '0.2rem',
                        boxShadow: showValidationErrors && (!customerPhone.trim() || customerPhone.trim().length < 10) ? '0 0 0 4px rgba(220, 38, 38, 0.25)' : 'none',
                      }}
                    />
                    {showValidationErrors && (!customerPhone.trim() || customerPhone.trim().length < 10) && (
                      <div style={{ color: '#dc2626', fontSize: '0.68rem', fontWeight: 700, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <i className="fa-solid fa-triangle-exclamation"></i> Please enter 10-digit Phone Number
                      </div>
                    )}
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: showValidationErrors && !customerAddress.trim() ? '#dc2626' : '#475569' }}>
                        {t.custAddrLabel} <span style={{ color: '#dc2626', fontWeight: 800 }}>*</span>
                      </label>
                      {showValidationErrors && !customerAddress.trim() && (
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#dc2626' }}>* Required</span>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder={t.custAddrPlaceholder}
                      value={customerAddress}
                      onChange={(e) => {
                        setCustomerAddress(toStartCase(e.target.value));
                        if (showValidationErrors) setShowValidationErrors(false);
                      }}
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.75rem',
                        borderRadius: '6px',
                        border: showValidationErrors && !customerAddress.trim() ? '2px solid #dc2626' : '1px solid #cbd5e1',
                        background: showValidationErrors && !customerAddress.trim() ? '#fef2f2' : '#ffffff',
                        marginTop: '0.2rem',
                        boxShadow: showValidationErrors && !customerAddress.trim() ? '0 0 0 4px rgba(220, 38, 38, 0.25)' : 'none',
                      }}
                      required
                    />
                    {showValidationErrors && !customerAddress.trim() && (
                      <div style={{ color: '#dc2626', fontSize: '0.68rem', fontWeight: 700, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <i className="fa-solid fa-triangle-exclamation"></i> Please enter Customer Address
                      </div>
                    )}
                  </div>
                </div>

                {/* Items List Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.4rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h4 style={{ margin: 0, fontSize: '0.88rem', color: '#0f172a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <i className="fa-solid fa-list-check" style={{ color: '#6366f1' }}></i> {t.billProductsTitle} ({items.length})
                    </h4>

                    <button
                      type="button"
                      onClick={handleStartFresh}
                      style={{
                        background: '#fff1f2',
                        color: '#e11d48',
                        border: '1px solid #fecdd3',
                        padding: '3px 9px',
                        borderRadius: '6px',
                        fontSize: '0.70rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                        transition: 'all 0.15s ease',
                      }}
                      title={lang === 'TE' ? 'ప్రస్తుత మోడ్ ఫారమ్‌ను రీసెట్ చేయండి' : 'Reset current mode and clear all entered form data'}
                    >
                      <i className="fa-solid fa-rotate-left"></i> {lang === 'TE' ? 'కొత్తగా ప్రారంభించు' : 'Start Fresh'}
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    {(mode === 'SELL' || mode === 'EXCHANGE' || mode === 'ORDER') && (
                      <button
                        type="button"
                        onClick={() => handleAddItem('SELL')}
                        style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', padding: '5px 10px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <i className="fa-solid fa-plus"></i> {mode === 'ORDER' ? (lang === 'TE' ? 'ఆర్డర్ ఐటెమ్ జత చేయి' : 'Add Order Item') : t.addSellItemBtn}
                      </button>
                    )}

                    {(mode === 'BUY' || mode === 'EXCHANGE' || mode === 'ORDER') && (
                      <button
                        type="button"
                        onClick={() => handleAddItem('BUY')}
                        style={{ background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', padding: '5px 10px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <i className="fa-solid fa-plus"></i> {t.addBuyItemBtn}
                      </button>
                    )}
                  </div>
                </div>

                {/* Render Mode-Specific Item Form Components */}
                {mode === 'SELL' && (
                  <SellModeForm
                    items={items}
                    handleUpdateItem={handleUpdateItem}
                    handleUpdateItemMultiple={handleUpdateItemMultiple}
                    handleAddItem={handleAddItem}
                    handleRemoveItem={handleRemoveItem}
                    calcResults={calcResults}
                    presets={presets}
                    handleAddNewPreset={handleAddNewPreset}
                    rates={rates || { gold_sell_value: 0, gold_sell_value_updated_at: '', gold_buy_value: 0, gold_buy_value_updated_at: '', silver_sell_value: 0, silver_sell_value_updated_at: '', silver_buy_value: 0, silver_buy_value_updated_at: '' }}
                    lang={lang}
                    t={t}
                    showValidationErrors={showValidationErrors}
                    setShowValidationErrors={setShowValidationErrors}
                  />
                )}
                {mode === 'BUY' && (
                  <BuyModeForm
                    items={items}
                    handleUpdateItem={handleUpdateItem}
                    handleUpdateItemMultiple={handleUpdateItemMultiple}
                    handleAddItem={handleAddItem}
                    handleRemoveItem={handleRemoveItem}
                    calcResults={calcResults}
                    presets={presets}
                    handleAddNewPreset={handleAddNewPreset}
                    rates={rates || { gold_sell_value: 0, gold_sell_value_updated_at: '', gold_buy_value: 0, gold_buy_value_updated_at: '', silver_sell_value: 0, silver_sell_value_updated_at: '', silver_buy_value: 0, silver_buy_value_updated_at: '' }}
                    lang={lang}
                    t={t}
                    showValidationErrors={showValidationErrors}
                    setShowValidationErrors={setShowValidationErrors}
                  />
                )}
                {mode === 'EXCHANGE' && (
                  <ExchangeModeForm
                    items={items}
                    handleUpdateItem={handleUpdateItem}
                    handleUpdateItemMultiple={handleUpdateItemMultiple}
                    handleAddItem={handleAddItem}
                    handleRemoveItem={handleRemoveItem}
                    calcResults={calcResults}
                    presets={presets}
                    handleAddNewPreset={handleAddNewPreset}
                    rates={rates || { gold_sell_value: 0, gold_sell_value_updated_at: '', gold_buy_value: 0, gold_buy_value_updated_at: '', silver_sell_value: 0, silver_sell_value_updated_at: '', silver_buy_value: 0, silver_buy_value_updated_at: '' }}
                    lang={lang}
                    t={t}
                    showValidationErrors={showValidationErrors}
                    setShowValidationErrors={setShowValidationErrors}
                  />
                )}
                {mode === 'ORDER' && (
                  <OrderModeForm
                    items={items}
                    handleUpdateItem={handleUpdateItem}
                    handleUpdateItemMultiple={handleUpdateItemMultiple}
                    handleAddItem={handleAddItem}
                    handleRemoveItem={handleRemoveItem}
                    calcResults={calcResults}
                    presets={presets}
                    handleAddNewPreset={handleAddNewPreset}
                    rates={rates || { gold_sell_value: 0, gold_sell_value_updated_at: '', gold_buy_value: 0, gold_buy_value_updated_at: '', silver_sell_value: 0, silver_sell_value_updated_at: '', silver_buy_value: 0, silver_buy_value_updated_at: '' }}
                    lang={lang}
                    t={t}
                    showValidationErrors={showValidationErrors}
                    setShowValidationErrors={setShowValidationErrors}
                    uploadingImageItemId={uploadingImageItemId}
                    handleItemImageUpload={handleItemImageUpload}
                    setPreviewImage={setPreviewImage}
                  />
                )}

                {/* Payment Breakdown Box: Full Payment vs Partial Payment (Only shown when customer owes money or in ORDER mode) */}
                {(() => {
                  const isCustomerPaying = mode === 'ORDER' || ((mode as string) !== 'BUY' && totalSellValue >= totalBuyCredit);
                  if (!isCustomerPaying) return null;

                  const grandTotalAmount = mode === 'SELL' ? totalSellValue : Math.abs(totalSellValue - totalBuyCredit);
                  const rawAdvanceNum = parseIndianCurrencyNumber(advancePaidAmount);
                  const isExceeded = paymentType === 'PARTIAL' && rawAdvanceNum > grandTotalAmount && grandTotalAmount > 0;
                  const calculatedPaidAmount = paymentType === 'FULL' ? grandTotalAmount : Math.min(grandTotalAmount, rawAdvanceNum);
                  const calculatedDueAmount = Math.max(0, grandTotalAmount - calculatedPaidAmount);

                  return (
                    <div style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '0.85rem 1.1rem', marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: paymentType === 'PARTIAL' ? '0.75rem' : '0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <i className="fa-solid fa-credit-card" style={{ color: '#d97706', fontSize: '0.9rem' }}></i>
                          <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>
                            {lang === 'TE' ? 'కస్టమర్ చెల్లింపు రకం' : 'Customer Payment Type'}:
                          </span>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            type="button"
                            onClick={() => setPaymentType('FULL')}
                            style={{
                              padding: '6px 14px',
                              borderRadius: '8px',
                              border: paymentType === 'FULL' ? '2px solid #16a34a' : '1px solid #cbd5e1',
                              background: paymentType === 'FULL' ? '#dcfce7' : '#ffffff',
                              color: paymentType === 'FULL' ? '#15803d' : '#475569',
                              fontWeight: 800,
                              fontSize: '0.78rem',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                            }}
                          >
                            <i className="fa-solid fa-circle-check"></i>
                            {lang === 'TE' ? 'పూర్తి చెల్లింపు (Full Payment Done)' : 'Full Payment Done'}
                          </button>

                          <button
                            type="button"
                            onClick={() => setPaymentType('PARTIAL')}
                            style={{
                              padding: '6px 14px',
                              borderRadius: '8px',
                              border: paymentType === 'PARTIAL' ? '2px solid #d97706' : '1px solid #cbd5e1',
                              background: paymentType === 'PARTIAL' ? '#fef3c7' : '#ffffff',
                              color: paymentType === 'PARTIAL' ? '#b45309' : '#475569',
                              fontWeight: 800,
                              fontSize: '0.78rem',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                            }}
                          >
                            <i className="fa-solid fa-clock-rotate-left"></i>
                            {lang === 'TE' ? 'పాక్షిక చెల్లింపు (Advance / Partial)' : 'Partial Payment'}
                          </button>
                        </div>
                      </div>

                      {paymentType === 'PARTIAL' && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem', paddingTop: '0.65rem', borderTop: '1px dashed #cbd5e1' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
                              {lang === 'TE' ? 'ఇప్పుడు ఎంత చెల్లిస్తున్నారు? (ఆడ్వాన్స్ ₹)' : 'How much are they paying? (Advance ₹)'}
                            </label>
                            <input
                              type="text"
                              inputMode="decimal"
                              placeholder="e.g. 1,00,000"
                              onFocus={(e) => e.target.select()}
                              value={advancePaidAmount}
                              onChange={(e) => setAdvancePaidAmount(formatIndianCurrencyInput(e.target.value))}
                              style={{
                                width: '100%',
                                padding: '0.5rem 0.75rem',
                                borderRadius: '6px',
                                border: isExceeded ? '1.5px solid #ef4444' : '1.5px solid #d97706',
                                fontSize: '0.88rem',
                                fontWeight: 800,
                                color: isExceeded ? '#dc2626' : '#b45309',
                                background: isExceeded ? '#fef2f2' : '#fffbeb',
                              }}
                            />
                            {isExceeded && (
                              <div style={{ fontSize: '0.7rem', color: '#dc2626', fontWeight: 700, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <i className="fa-solid fa-circle-exclamation"></i>
                                {lang === 'TE' ? 'మోతాదు మించింది (Value Exceeded)' : 'Value Exceeded'}
                              </div>
                            )}
                          </div>

                          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '0.5rem 0.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#991b1b', textTransform: 'uppercase' }}>
                              {lang === 'TE' ? 'ఇంకా బాకీ బకాయి (Balance Due)' : 'Balance Still Due'}
                            </span>
                            <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#dc2626', marginTop: '1px' }}>
                              ₹{calculatedDueAmount.toLocaleString('en-IN')}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Sleek Bottom Horizontal Net Calculation & Submit Bar */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem 1.25rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                    {mode === 'BUY' ? (
                      <div>
                        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{t.grossBuyingAmount}</span>
                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0369a1' }}>₹{totalBuyCredit.toLocaleString('en-IN')}</div>
                      </div>
                    ) : mode === 'SELL' ? (
                      <div>
                        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{t.grossSellingTotal}</span>
                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#b45309' }}>₹{totalSellValue.toLocaleString('en-IN')}</div>
                      </div>
                    ) : (
                      <>
                        <div>
                          <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{t.grossSellingTotal}</span>
                          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#b45309' }}>₹{totalSellValue.toLocaleString('en-IN')}</div>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{t.lessItemExchange}</span>
                          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0369a1' }}>- ₹{totalBuyCredit.toLocaleString('en-IN')}</div>
                        </div>
                      </>
                    )}

                    <div style={{ paddingLeft: '1rem', borderLeft: '2px solid #e2e8f0' }}>
                      <span style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 800, textTransform: 'uppercase', display: 'block' }}>{t.grandTotal}</span>
                      <span style={{ fontSize: '0.68rem', color: mode === 'BUY' || totalBuyCredit > totalSellValue ? '#0369a1' : '#64748b', fontWeight: 600, display: 'block', marginTop: '-2px' }}>
                        {mode === 'BUY' || totalBuyCredit > totalSellValue ? t.needToPayCustomerTag : t.customerPaidTag}
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
                      <i className="fa-solid fa-calculator"></i> {t.estimationBtn}
                    </button>

                    <button
                      type="button"
                      disabled={creating}
                      onClick={handlePreSubmitCheck}
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
                      <i className="fa-solid fa-circle-check"></i> {creating ? t.savingSaleBtn : t.saleDoneBtn}
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* RIGHT GRID (30%): Real-Time Retail Thermal Receipt Preview */}
            {(() => {
              const grandTot = mode === 'BUY' ? totalBuyCredit : mode === 'SELL' ? totalSellValue : Math.abs(totalSellValue - totalBuyCredit);
              const paidVal = paymentType === 'FULL' ? grandTot : Math.min(grandTot, parseIndianCurrencyNumber(advancePaidAmount));
              const dueVal = Math.max(0, grandTot - paidVal);

              return (
                <ReceiptPreview
                  receiptId="pos-realtime-receipt-card"
                  mode={mode}
                  customerName={customerName}
                  customerPhone={customerPhone}
                  customerAddress={customerAddress}
                  teluguCustomerName={teluguCustomerName}
                  teluguCustomerAddress={teluguCustomerAddress}
                  rates={rates}
                  items={items}
                  totalSellValue={totalSellValue}
                  totalBuyCredit={totalBuyCredit}
                  netPayable={netPayable}
                  billType={activeBillType}
                  paymentType={paymentType}
                  advancePaidAmount={paidVal}
                  balanceDueAmount={dueVal}
                  lang={lang}
                />
              );
            })()}
          </div>

          {/* Sale Done Confirmation Modal */}
          {showConfirmModal && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
              <div style={{ background: '#ffffff', borderRadius: '20px', maxWidth: '420px', width: '100%', padding: '1.75rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', textAlign: 'center', border: '1px solid #cbd5e1' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#dcfce7', color: '#16a34a', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem', margin: '0 auto 1rem auto' }}>
                  <i className="fa-solid fa-file-invoice-dollar"></i>
                </div>

                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                  {t.confirmSaleTitle}
                </h3>

                <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.88rem', color: '#475569', lineHeight: '1.4' }}>
                  {t.confirmSaleDesc}
                </p>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setShowConfirmModal(false)}
                    style={{ padding: '0.65rem 1.25rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}
                  >
                    {t.cancelBtn}
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
                    {t.yesCompleteSale}
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
          {/* FULL IMAGE PREVIEW MODAL */}
          {previewImage && (
            <FullImagePreviewModal
              imageUrl={previewImage.url}
              title={previewImage.title}
              onClose={() => setPreviewImage(null)}
            />
          )}
        </>
      )}
    </div>
  );
};

export default BillingModule;
