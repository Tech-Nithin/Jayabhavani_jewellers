import React, { useState, useEffect, useRef } from 'react';
import { API_BASE } from '../config/apiConfig';
import { translations } from '../utils/translations';
import type { Language } from '../utils/translations';
import { getTeluguTransliterationSync } from '../utils/transliterate';
import { HeaderRefreshButton } from '../components/HeaderRefreshButton';

// Modular Child Components
import { MetalCategorySelector } from './components/MetalCategorySelector';
import { OrnamentCategoryGrid } from './components/OrnamentCategoryGrid';
import type { OrnamentCategoryItem } from './components/OrnamentCategoryGrid';
import { ProductGridList } from './components/ProductGridList';
import type { InventoryProduct } from './components/ProductGridList';
import { ProductTableView } from './components/ProductTableView';
import { CashHistoryTableView } from './components/CashHistoryTableView';
import { AddEditProductModal } from './components/AddEditProductModal';
import { LoadStockView } from './components/LoadStockView';
import { LoadCashView } from './components/LoadCashView';
import { CameraCaptureModal } from './components/CameraCaptureModal';
import { FullImagePreviewModal } from './components/FullImagePreviewModal';

export const InventoryModule: React.FC<{ globalSearch?: string; lang?: Language }> = ({
  globalSearch = '',
  lang = 'EN',
}) => {
  const t = translations[lang] || translations.EN;
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(globalSearch);

  // View: 'list' = main inventory, 'add' = full-screen add form, 'edit' = full-screen edit form, 'load' = load stock, 'load-cash' = load cash
  const [view, setView] = useState<'list' | 'add' | 'edit' | 'load' | 'load-cash'>('list');
  const [preSelectedLoadItemId, setPreSelectedLoadItemId] = useState<string>('');
  // Layout Mode: 'grid' = visual cards, 'table' = category accordion list
  const [layoutMode, setLayoutMode] = useState<'grid' | 'table'>('grid');
  // Active Hierarchical Filter States: 'GOLD' | 'SILVER' | 'CASH'
  const [activeMetal, setActiveMetal] = useState<'GOLD' | 'SILVER' | 'CASH'>('GOLD');
  const [selectedOrnament, setSelectedOrnament] = useState<string>('ALL');
  const [cashBalance, setCashBalance] = useState<number>(0);

  // Modal Dialog States
  const [editingProduct, setEditingProduct] = useState<InventoryProduct | null>(null);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [selectedWebpBlob, setSelectedWebpBlob] = useState<Blob | null>(null);
  const [previewZoomImage, setPreviewZoomImage] = useState<string>('');

  // Category Options
  const [categoryOptions, setCategoryOptions] = useState<Array<{ value: string; label: string; icon: string }>>([
    { value: 'Ring', label: 'Ring', icon: 'fa-ring' },
    { value: 'Chain', label: 'Chain', icon: 'fa-link' },
    { value: 'Necklace', label: 'Necklace', icon: 'fa-link' },
    { value: 'Earrings', label: 'Earrings', icon: 'fa-gem' },
    { value: 'Bangles', label: 'Bangles', icon: 'fa-circle-notch' },
    { value: 'Anklet', label: 'Anklet', icon: 'fa-shoe-prints' },
    { value: 'Coins', label: 'Coins', icon: 'fa-coins' },
  ]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchCashStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/inventory/cash/status`);
      const data = await res.json();
      if (data.success) {
        setCashBalance(Number(data.current_cash || 0));
      }
    } catch (err) {
      console.error('Error fetching cash balance:', err);
    }
  };

  // 1. Initial URL Params Sync & PopState Gesture Navigation Handler
  useEffect(() => {
    const syncFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const urlMetal = (params.get('metal') || 'GOLD').toUpperCase();
      if (urlMetal === 'GOLD' || urlMetal === 'SILVER' || urlMetal === 'CASH') {
        setActiveMetal(urlMetal as 'GOLD' | 'SILVER' | 'CASH');
      }

      const urlCategory = params.get('category') || 'ALL';
      setSelectedOrnament(urlCategory);

      const urlSearch = params.get('search') || '';
      if (urlSearch) {
        setSearchTerm(urlSearch);
      }

      const urlView = params.get('view') || 'list';
      if (urlView === 'add') {
        setEditingProduct(null);
        setView('add');
      } else if (urlView === 'edit') {
        setView('edit');
      } else {
        setView('list');
      }
    };

    syncFromUrl();
    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
  }, []);

  useEffect(() => {
    fetchInventory();
    fetchCategories();
    fetchCashStatus();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchInventory();
        fetchCategories();
        fetchCashStatus();
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);
    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, []);

  const updateUrlParams = (metal: 'GOLD' | 'SILVER' | 'CASH', category: string, search: string, viewParam?: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('module', 'inventory');
    url.searchParams.set('metal', metal.toLowerCase());
    url.searchParams.set('category', category);
    if (search.trim()) {
      url.searchParams.set('search', search.trim());
    } else {
      url.searchParams.delete('search');
    }
    if (viewParam && viewParam !== 'list') {
      url.searchParams.set('view', viewParam);
    } else {
      url.searchParams.delete('view');
    }
    window.history.pushState({}, '', url.toString());
  };

  const handleSelectMetal = (metal: 'GOLD' | 'SILVER' | 'CASH') => {
    setActiveMetal(metal);
    setSelectedOrnament('ALL');
    updateUrlParams(metal, 'ALL', searchTerm);
    if (metal === 'CASH') {
      fetchCashStatus();
    }
  };

  const handleSelectOrnament = (ornamentName: string) => {
    setSelectedOrnament(ornamentName);
    updateUrlParams(activeMetal, ornamentName, searchTerm);
  };

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    updateUrlParams(activeMetal, selectedOrnament, val);
  };

  const openAddPage = () => {
    setEditingProduct(null);
    setSelectedWebpBlob(null);
    setImagePreview('');
    setView('add');
    updateUrlParams(activeMetal, selectedOrnament, searchTerm, 'add');
  };

  const openEditPage = (product: InventoryProduct) => {
    setEditingProduct(product);
    setSelectedWebpBlob(null);
    setImagePreview(product.img || '');
    setView('edit');
    updateUrlParams(activeMetal, selectedOrnament, searchTerm, 'edit');
  };

  const closeFormView = () => {
    setView('list');
    setEditingProduct(null);
    setSelectedWebpBlob(null);
    updateUrlParams(activeMetal, selectedOrnament, searchTerm, 'list');
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_BASE}/inventory/categories?t=${Date.now()}`, {
        cache: 'no-store'
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.categories)) {
        const fetchedOpts = data.categories.map((c: any) => ({
          value: c.name,
          label: c.name,
          icon: 'fa-tag',
        }));
        setCategoryOptions(fetchedOpts);
      }
    } catch (e) {
      console.warn('Categories fetch error:', e);
    }
  };

  const fetchInventory = async () => {
    try {
      const res = await fetch(`${API_BASE}/inventory/products?t=${Date.now()}`, {
        cache: 'no-store'
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.products)) {
        setProducts(data.products);

        // Auto-switch to SILVER if GOLD is empty and SILVER has stock
        const urlParams = new URLSearchParams(window.location.search);
        const hasExplicitMetalParam = urlParams.has('metal');
        if (!hasExplicitMetalParam) {
          const goldItems = data.products.filter((p: any) => (p.item_type || 'GOLD').toUpperCase() === 'GOLD');
          const silverItems = data.products.filter((p: any) => (p.item_type || '').toUpperCase() === 'SILVER');
          if (goldItems.length === 0 && silverItems.length > 0) {
            setActiveMetal('SILVER');
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNewCategory = async (newCatName: string) => {
    const trimmed = newCatName.trim().replace(/\b\w/g, (c) => c.toUpperCase());
    if (!trimmed) return;

    const newOpt = { value: trimmed, label: trimmed, icon: 'fa-tag' };
    setCategoryOptions((prev) => {
      const exists = prev.some((c) => c.value.toLowerCase() === trimmed.toLowerCase());
      if (exists) return prev;
      return [...prev, newOpt];
    });

    try {
      await fetch(`${API_BASE}/inventory/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
    } catch (err) {
      console.error('Failed to add category to Supabase:', err);
    }
  };

  // Camera Management
  const startCamera = async () => {
    try {
      setIsCameraModalOpen(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera access error:', err);
      alert('Unable to access camera. Please allow camera permissions or browse gallery.');
      setIsCameraModalOpen(false);
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setIsCameraModalOpen(false);
  };

  const captureSnapshot = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) {
          setSelectedWebpBlob(blob);
          setImagePreview(URL.createObjectURL(blob));
        }
      }, 'image/webp', 0.85);
      stopCamera();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      stopCamera();
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 800;
          let w = img.width;
          let h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, w, h);
            canvas.toBlob((blob) => {
              if (blob) {
                setSelectedWebpBlob(blob);
                setImagePreview(URL.createObjectURL(blob));
              }
            }, 'image/webp', 0.85);
          }
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadToCloudinary = async (imageDataUrlOrBlob: string, pendingBlob?: Blob | null): Promise<string> => {
    if (!pendingBlob && (!imageDataUrlOrBlob || imageDataUrlOrBlob.startsWith('/') || imageDataUrlOrBlob.startsWith('http'))) {
      return imageDataUrlOrBlob || (activeMetal === 'GOLD' ? '/Eternal_Solitaire_Ring.jpg' : '/Pearl_Drop_Earrings.jpg');
    }

    try {
      let res;
      if (pendingBlob) {
        const formData = new FormData();
        const uniqueFileName = `inve_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.webp`;
        formData.append('file', pendingBlob, uniqueFileName);
        console.log(`📤 Uploading raw WebP blob (${pendingBlob.size} bytes as ${uniqueFileName}) via FormData to Cloudinary...`);
        res = await fetch(`${API_BASE}/inventory/upload-cloudinary`, {
          method: 'POST',
          body: formData,
        });
      } else {
        res = await fetch(`${API_BASE}/inventory/upload-cloudinary`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: imageDataUrlOrBlob }),
        });
      }

      const data = await res.json();
      if (data.success && data.url) {
        return data.url;
      }
    } catch (err) {
      console.warn('Backend Cloudinary upload warning:', err);
    }
    return imageDataUrlOrBlob;
  };

  const handleSaveProduct = async (productData: Partial<InventoryProduct>) => {
    let cloudinaryUrl = productData.img || '';
    if (selectedWebpBlob || (cloudinaryUrl && (cloudinaryUrl.startsWith('data:') || cloudinaryUrl.startsWith('blob:')))) {
      cloudinaryUrl = await uploadToCloudinary(cloudinaryUrl, selectedWebpBlob);
      setSelectedWebpBlob(null);
    }

    const isEdit = Boolean(productData.id);
    const targetId = productData.id;
    const url = isEdit ? `${API_BASE}/inventory/products/${targetId}` : `${API_BASE}/inventory/products`;
    const method = isEdit ? 'PUT' : 'POST';
    const itemType = (productData.item_type || activeMetal) as 'GOLD' | 'SILVER';

    const payload = {
      name: productData.name,
      category: productData.category,
      item_type: itemType,
      weight_from_grams: productData.weight_from_grams,
      weight_to_grams: productData.weight_to_grams,
      weight_grams: productData.weight_grams,
      current_stock_weight: productData.weight_grams,
      img: cloudinaryUrl,
    };

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setActiveMetal(itemType);
          setSelectedOrnament('ALL');
          updateUrlParams(itemType, 'ALL', searchTerm, 'list');
          closeFormView();
          await fetchInventory();
          await fetchCategories();
          return;
        }
      }
    } catch (err) {
      console.error('Failed to save product:', err);
    }

    // Refresh directly from database on finish
    await fetchInventory();
    closeFormView();
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!window.confirm('Are you sure you want to delete this product item?')) return;
    setProducts((prev) => prev.filter((p) => p.id !== productId));

    try {
      await fetch(`${API_BASE}/inventory/products/${productId}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  // Filter products by Selected Metal, Selected Ornament Type & Search Term
  const metalProducts = products.filter((p) => (p.item_type || 'GOLD') === activeMetal);
  const goldCount = products.filter((p) => (p.item_type || 'GOLD') === 'GOLD').length;
  const silverCount = products.filter((p) => (p.item_type || 'GOLD') === 'SILVER').length;

  // Build dynamic Ornament Category List with item counts for current metal
  const categoryCountsMap: Record<string, number> = {};
  metalProducts.forEach((p) => {
    const cat = p.category || 'Other';
    categoryCountsMap[cat] = (categoryCountsMap[cat] || 0) + 1;
  });

  const ornamentCategoriesList: OrnamentCategoryItem[] = Object.keys(categoryCountsMap)
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    .map((catName) => ({
      name: catName,
      count: categoryCountsMap[catName],
    }));

  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 1000);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const filteredProducts = metalProducts
    .filter((p) => {
      const matchesOrnament = selectedOrnament === 'ALL' || !selectedOrnament || p.category.toLowerCase() === selectedOrnament.toLowerCase();

      const query = debouncedSearchTerm.trim().toLowerCase();

      const teCategory = getTeluguTransliterationSync(p.category).toLowerCase();
      const teName = getTeluguTransliterationSync(p.name).toLowerCase();
      const teMetal = p.item_type === 'GOLD' ? 'బంగారం' : 'వెండి';

      const matchesSearch =
        p.name.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query) ||
        (p.item_type && p.item_type.toLowerCase().includes(query)) ||
        teName.includes(query) ||
        teCategory.includes(query) ||
        teMetal.includes(query);

      return matchesOrnament && matchesSearch;
    })
    .sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));

  return (
    <div className="admin-dashboard-root" style={{ color: '#181310', fontFamily: "'Inter', 'Source Sans 3', 'DM Sans', sans-serif" }}>

      {/* -- LOAD CASH VIEW (Full Screen) -- */}
      {view === 'load-cash' ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #e2e8f0' }}>
            <button
              onClick={closeFormView}
              style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '7px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}
            >
              <i className="fa-solid fa-arrow-left"></i> {lang === 'TE' ? 'వెనక్కి' : 'Back'}
            </button>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                <i className="fa-solid fa-money-bill-wave" style={{ color: '#16a34a', marginRight: '8px' }}></i>
                {lang === 'TE' ? 'నగదు లోడ్ చేయండి' : 'Load Cash into Shop Drawer'}
              </h2>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.72rem', color: '#94a3b8' }}>
                Deposit cash into shop drawer and view historical daily cash flow records.
              </p>
            </div>
          </div>

          <div style={{ width: '100%', maxWidth: '1100px', margin: '0 auto' }}>
            <LoadCashView
              onClose={closeFormView}
              onCashUpdated={() => {
                // optionally notify header or accounts
              }}
              lang={lang}
            />
          </div>
        </>
      ) : view === 'load' ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #e2e8f0' }}>
            <button
              onClick={closeFormView}
              style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '7px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}
            >
              <i className="fa-solid fa-arrow-left"></i> {lang === 'TE' ? 'వెనక్కి' : 'Back'}
            </button>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                <i className="fa-solid fa-boxes-packing" style={{ color: '#0284c7', marginRight: '8px' }}></i>
                {lang === 'TE' ? 'స్టాక్ లోడ్ చేయండి' : 'Load Stock to Existing Ornament'}
              </h2>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.72rem', color: '#94a3b8' }}>
                Append incoming stock weight to an existing ornament in inventory.
              </p>
            </div>
          </div>

          <div style={{ width: '100%', maxWidth: '1100px', margin: '0 auto' }}>
            <LoadStockView
              products={products}
              activeMetal={activeMetal === 'SILVER' ? 'SILVER' : 'GOLD'}
              preSelectedProductId={preSelectedLoadItemId}
              onClose={closeFormView}
              onStockLoaded={async () => {
                await fetchInventory();
              }}
              lang={lang}
            />
          </div>
        </>
      ) : (view === 'add' || view === 'edit') ? (
        <>
          {/* Back bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #e2e8f0' }}>
            <button
              onClick={closeFormView}
              style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '7px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}
            >
              <i className="fa-solid fa-arrow-left"></i> {lang === 'TE' ? 'వెనక్కి' : 'Back'}
            </button>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                <i className={`fa-solid ${view === 'edit' ? 'fa-pen-to-square' : 'fa-plus-circle'}`} style={{ color: '#d97706', marginRight: '8px' }}></i>
                {view === 'edit'
                  ? (lang === 'TE' ? 'వస్తువు సవరించు' : 'Edit Stock Item')
                  : (lang === 'TE' ? 'కొత్త వస్తువు జతచేయి' : 'Add New Stock Item')}
              </h2>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.72rem', color: '#94a3b8' }}>
                Fill in the ornament stock details below. New additions will be recorded in both inventory and stock logs.
              </p>
            </div>
          </div>

          {/* Full-width Inline form */}
          <div style={{ width: '100%', maxWidth: '1100px', margin: '0 auto' }}>
            <AddEditProductModal
              isOpen={true}
              isInlinePage={true}
              onClose={closeFormView}
              onSubmit={handleSaveProduct}
              editingProduct={editingProduct}
              existingProducts={products}
              categoryOptions={categoryOptions}
              onAddNewCategory={handleAddNewCategory}
              onStartCamera={startCamera}
              onSwitchToLoadStock={(productId) => {
                setPreSelectedLoadItemId(productId);
                setView('load');
              }}
              imagePreview={imagePreview}
              setImagePreview={setImagePreview}
              fileInputRef={fileInputRef}
              handleFileChange={handleFileChange}
              lang={lang}
            />
          </div>
        </>
      ) : (
        <>
          {/* TOP PAGE HEADER */}
          <div style={{ marginBottom: '1.25rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
            <div>
              <h2 className="admin-page-title inventory-title-heading" style={{ fontFamily: "'Inter', 'Source Sans 3', 'DM Sans', sans-serif", fontSize: '1.5rem', color: '#181310', fontWeight: 800, margin: 0, letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-boxes-stacked" style={{ color: '#d97706', marginRight: '8px' }}></i> {t.inventoryModuleTitle}
                <HeaderRefreshButton onRefresh={fetchInventory} size="sm" title="Hard Refresh Inventory Stock from Server" />
              </h2>
              <p className="inventory-sub-text" style={{ margin: '2px 0 0 0', color: '#786a5e', fontSize: '0.8rem' }}>
                {t.inventoryModuleSub}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                className="inventory-add-btn"
                onClick={openAddPage}
                style={{
                  padding: '10px 18px',
                  background: 'linear-gradient(135deg, #d99b26 0%, #b45309 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 14px rgba(180, 83, 9, 0.3)',
                }}
              >
                <i className="fa-solid fa-plus-circle"></i> {t.addStockItemBtn}
              </button>

              <button
                className="inventory-load-btn"
                onClick={() => {
                  setPreSelectedLoadItemId('');
                  setView('load');
                }}
                style={{
                  padding: '10px 18px',
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 14px rgba(2, 132, 199, 0.3)',
                }}
              >
                <i className="fa-solid fa-boxes-packing"></i> {lang === 'TE' ? 'స్టాక్ లోడ్' : 'Load Stock'}
              </button>

              <button
                className="inventory-load-cash-btn"
                onClick={() => setView('load-cash')}
                style={{
                  padding: '10px 18px',
                  background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 14px rgba(22, 163, 74, 0.3)',
                }}
              >
                <i className="fa-solid fa-money-bill-wave"></i> {lang === 'TE' ? 'నగదు లోడ్' : 'Load Cash'}
              </button>
            </div>
          </div>

          {/* LEVEL 1: METAL / CASH SELECTOR */}
          <MetalCategorySelector
            activeMetal={activeMetal}
            onSelectMetal={handleSelectMetal}
            goldCount={goldCount}
            silverCount={silverCount}
            cashBalance={cashBalance}
            lang={lang}
          />

          {/* If CASH is selected: show Cash History & Ledger View */}
          {activeMetal === 'CASH' ? (
            <CashHistoryTableView
              onOpenLoadCash={() => setView('load-cash')}
              lang={lang}
            />
          ) : (
            <>
              {/* LEVEL 2: ORNAMENT CATEGORY GRID */}
              <OrnamentCategoryGrid
                activeMetal={activeMetal}
                selectedOrnament={selectedOrnament}
                onSelectOrnament={handleSelectOrnament}
                categories={ornamentCategoriesList}
                totalMetalItemsCount={metalProducts.length}
                searchTerm={searchTerm}
                onSearchChange={handleSearchChange}
                lang={lang}
              />

              {/* VIEW MODE TOGGLE (Grid vs Table / Accordion) */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', margin: '1rem 0 0.75rem 0' }}>
                <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: '4px', borderRadius: '12px', border: '1px solid #cbd5e1', gap: '4px' }}>
                  <button
                    type="button"
                    onClick={() => setLayoutMode('grid')}
                    style={{
                      padding: '7px 14px',
                      borderRadius: '9px',
                      border: 'none',
                      background: layoutMode === 'grid' ? '#ffffff' : 'transparent',
                      color: layoutMode === 'grid' ? '#0f172a' : '#64748b',
                      fontWeight: layoutMode === 'grid' ? 800 : 600,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: layoutMode === 'grid' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                    }}
                  >
                    <i className="fa-solid fa-table-cells-large" style={{ color: layoutMode === 'grid' ? '#d97706' : '#94a3b8' }}></i>
                    {lang === 'TE' ? 'గ్రిడ్ వ్యూ' : 'Grid View'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setLayoutMode('table')}
                    style={{
                      padding: '7px 14px',
                      borderRadius: '9px',
                      border: 'none',
                      background: layoutMode === 'table' ? '#ffffff' : 'transparent',
                      color: layoutMode === 'table' ? '#0f172a' : '#64748b',
                      fontWeight: layoutMode === 'table' ? 800 : 600,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: layoutMode === 'table' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                    }}
                  >
                    <i className="fa-solid fa-list-check" style={{ color: layoutMode === 'table' ? '#0284c7' : '#94a3b8' }}></i>
                    {lang === 'TE' ? 'టేబుల్ వ్యూ' : 'Table View'}
                  </button>
                </div>
              </div>

              {/* LEVEL 3: PRODUCTS GRID OR TABLE / ACCORDION */}
              {layoutMode === 'table' ? (
                <ProductTableView
                  products={filteredProducts}
                  loading={loading}
                  activeMetal={activeMetal as 'GOLD' | 'SILVER'}
                  selectedOrnament={selectedOrnament}
                  searchTerm={searchTerm}
                  onEditProduct={(product) => openEditPage(product)}
                  onDeleteProduct={handleDeleteProduct}
                  onViewImage={(url) => setPreviewZoomImage(url)}
                  lang={lang}
                />
              ) : (
                <ProductGridList
                  products={filteredProducts}
                  loading={loading}
                  activeMetal={activeMetal as 'GOLD' | 'SILVER'}
                  selectedOrnament={selectedOrnament}
                  searchTerm={searchTerm}
                  onEditProduct={(product) => openEditPage(product)}
                  onDeleteProduct={handleDeleteProduct}
                  onViewImage={(url) => setPreviewZoomImage(url)}
                  lang={lang}
                />
              )}
            </>
          )}
        </>
      )}

      {/* MODALS - Camera & Image Preview only */}
      <CameraCaptureModal
        isOpen={isCameraModalOpen}
        onClose={stopCamera}
        onCapture={captureSnapshot}
        videoRef={videoRef}
        lang={lang}
      />
      <FullImagePreviewModal
        imageUrl={previewZoomImage}
        onClose={() => setPreviewZoomImage('')}
      />
    </div>
  );
};

export default InventoryModule;