import React, { useState, useEffect, useRef } from 'react';
import { API_BASE } from '../config/apiConfig';
import { translations } from '../utils/translations';
import type { Language } from '../utils/translations';
import { getTeluguTransliterationSync } from '../utils/transliterate';

// Modular Child Components
import { MetalCategorySelector } from './components/MetalCategorySelector';
import { OrnamentCategoryGrid } from './components/OrnamentCategoryGrid';
import type { OrnamentCategoryItem } from './components/OrnamentCategoryGrid';
import { ProductGridList } from './components/ProductGridList';
import type { InventoryProduct } from './components/ProductGridList';
import { AddEditProductModal } from './components/AddEditProductModal';
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

  // View: 'list' = main inventory, 'add' = full-screen add form, 'edit' = full-screen edit form
  const [view, setView] = useState<'list' | 'add' | 'edit'>('list');
  // Active Hierarchical Filter States
  const [activeMetal, setActiveMetal] = useState<'GOLD' | 'SILVER'>('GOLD');
  const [selectedOrnament, setSelectedOrnament] = useState<string>('ALL');

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

  // 1. Initial URL Params Sync & PopState Gesture Navigation Handler
  useEffect(() => {
    const syncFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const urlMetal = (params.get('metal') || 'GOLD').toUpperCase();
      if (urlMetal === 'GOLD' || urlMetal === 'SILVER') {
        setActiveMetal(urlMetal as 'GOLD' | 'SILVER');
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
  }, []);

  const updateUrlParams = (metal: 'GOLD' | 'SILVER', category: string, search: string, viewParam?: string) => {
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

  const handleSelectMetal = (metal: 'GOLD' | 'SILVER') => {
    setActiveMetal(metal);
    setSelectedOrnament('ALL');
    updateUrlParams(metal, 'ALL', searchTerm);
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
      const res = await fetch(`${API_BASE}/inventory/categories`);
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
      const res = await fetch(`${API_BASE}/inventory/products`);
      const data = await res.json();
      if (data.success) {
        setProducts(data.products || []);
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
        formData.append('file', pendingBlob, 'inventory_item.webp');
        console.log(`📤 Uploading raw WebP blob (${pendingBlob.size} bytes) via FormData to Cloudinary...`);
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
        if (data.success && data.product) {
          if (isEdit) {
            setProducts(products.map((p) => (p.id === targetId ? data.product : p)));
          } else {
            setProducts([data.product, ...products]);
          }
          setActiveMetal(itemType);
          setSelectedOrnament('ALL');
          updateUrlParams(itemType, 'ALL', searchTerm, 'list');
          closeFormView();
          await fetchInventory();
          return;
        }
      }
    } catch (err) {
      console.error('Failed to save product:', err);
    }

    // Local fallback state update
    const fallbackItem: InventoryProduct = {
      id: targetId || `prod-${Date.now()}`,
      name: payload.name || 'New Item',
      category: payload.category || 'Ring',
      item_type: itemType,
      weight_from_grams: payload.weight_from_grams,
      weight_to_grams: payload.weight_to_grams,
      weight_grams: payload.weight_grams,
      img: payload.img,
    };

    if (isEdit) {
      setProducts(products.map((p) => (p.id === targetId ? fallbackItem : p)));
    } else {
      setProducts([fallbackItem, ...products]);
    }
    setActiveMetal(itemType);
    setSelectedOrnament('ALL');
    updateUrlParams(itemType, 'ALL', searchTerm, 'list');
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

  const ornamentCategoriesList: OrnamentCategoryItem[] = Object.keys(categoryCountsMap).map((catName) => ({
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

  const filteredProducts = metalProducts.filter((p) => {
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
  });

  return (
    <div className="admin-dashboard-root" style={{ color: '#181310', fontFamily: "'Inter', 'Source Sans 3', 'DM Sans', sans-serif" }}>

      {/* -- ADD / EDIT VIEW (replaces full content area, same as Billing CUSTOMERS view) -- */}
      {(view === 'add' || view === 'edit') ? (
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
                {activeMetal === 'GOLD' ? (lang === 'TE' ? 'బంగారం' : 'GOLD') : (lang === 'TE' ? 'వెండి' : 'SILVER')} • {selectedOrnament !== 'ALL' ? (lang === 'TE' ? getTeluguTransliterationSync(selectedOrnament) : selectedOrnament) : (lang === 'TE' ? 'అన్ని వర్గాలు' : 'All Categories')}
              </p>
            </div>
          </div>

          {/* Inline form */}
          <div style={{ maxWidth: '580px', margin: '0 auto' }}>
            <AddEditProductModal
              isOpen={true}
              isInlinePage={true}
              onClose={closeFormView}
              onSubmit={handleSaveProduct}
              editingProduct={editingProduct}
              categoryOptions={categoryOptions}
              onAddNewCategory={handleAddNewCategory}
              onStartCamera={startCamera}
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
              <h2 className="admin-page-title inventory-title-heading" style={{ fontFamily: "'Inter', 'Source Sans 3', 'DM Sans', sans-serif", fontSize: '1.5rem', color: '#181310', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>
                <i className="fa-solid fa-boxes-stacked" style={{ color: '#d97706', marginRight: '8px' }}></i> {t.inventoryModuleTitle}
              </h2>
              <p className="inventory-sub-text" style={{ margin: '2px 0 0 0', color: '#786a5e', fontSize: '0.8rem' }}>
                {t.inventoryModuleSub}
              </p>
            </div>
            <div>
              <button
                className="inventory-add-btn"
                onClick={openAddPage}
                style={{
                  padding: '10px 20px',
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
            </div>
          </div>

          {/* LEVEL 1: METAL SELECTOR */}
          <MetalCategorySelector
            activeMetal={activeMetal}
            onSelectMetal={handleSelectMetal}
            goldCount={goldCount}
            silverCount={silverCount}
            lang={lang}
          />

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

          {/* LEVEL 3: PRODUCTS GRID */}
          <ProductGridList
            products={filteredProducts}
            loading={loading}
            activeMetal={activeMetal}
            selectedOrnament={selectedOrnament}
            searchTerm={searchTerm}
            onEditProduct={(product) => openEditPage(product)}
            onDeleteProduct={handleDeleteProduct}
            onViewImage={(url) => setPreviewZoomImage(url)}
            lang={lang}
          />
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