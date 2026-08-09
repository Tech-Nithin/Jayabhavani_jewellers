import React, { useState, useEffect, useRef } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

interface InventoryProduct {
  id: string;
  name: string;
  category: string;
  item_type?: 'GOLD' | 'SILVER';
  price?: number;
  weight_grams?: number;
  weight_from_grams?: number;
  weight_to_grams?: number;
  img: string;
  stock_quantity?: number;
}

export const InventoryModule: React.FC<{ globalSearch?: string }> = ({ globalSearch = '' }) => {
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(globalSearch);

  // Main Modal Dialog State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Separate Camera Dialog Modal State
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);

  // Form Fields (Strict order: Photo 1st, Category 2nd, Weight 3rd, Metal 4th)
  const [categoryType, setCategoryType] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [categorySearchTerm, setCategorySearchTerm] = useState('');
  const [weightFrom, setWeightFrom] = useState('');
  const [weightTo, setWeightTo] = useState('');
  const [itemType, setItemType] = useState<'GOLD' | 'SILVER'>('GOLD');

  const [categoryOptions, setCategoryOptions] = useState<Array<{ value: string; label: string; icon: string }>>([
    { value: 'Other', label: 'Custom Category...', icon: 'fa-pen-nib' },
  ]);

  // Image State
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isFullPreviewOpen, setIsFullPreviewOpen] = useState(false);
  const [_cameraActive, setCameraActive] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setSearchTerm(globalSearch);
  }, [globalSearch]);

  useEffect(() => {
    fetchInventory();
    fetchCategories();
  }, []);

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

        const otherOpt = { value: 'Other', label: 'Custom Category...', icon: 'fa-pen-nib' };
        const newOpts = [...fetchedOpts, otherOpt];
        setCategoryOptions(newOpts);

        setCategoryType((prev) => {
          if (prev && prev !== 'Ring' && newOpts.some((o) => o.value.toLowerCase() === prev.toLowerCase())) {
            return prev;
          }
          return fetchedOpts.length > 0 ? fetchedOpts[0].value : 'Other';
        });
      }
    } catch (e) {
      console.warn('Categories fetch error:', e);
    }
  };

  const handleAddNewCategory = async (newCatName: string) => {
    const trimmed = newCatName.trim();
    if (!trimmed) return;

    // Optimistically add and select new category in dropdown UI
    const newOpt = { value: trimmed, label: trimmed, icon: 'fa-tag' };
    setCategoryOptions((prev) => {
      const exists = prev.some((c) => c.value.toLowerCase() === trimmed.toLowerCase());
      if (exists) return prev;
      const otherOpt = prev.find((opt) => opt.value === 'Other') || { value: 'Other', label: 'Custom Category...', icon: 'fa-pen-nib' };
      const normalOpts = prev.filter((opt) => opt.value !== 'Other');
      return [...normalOpts, newOpt, otherOpt];
    });
    setCategoryType(trimmed);
    setIsCategoryDropdownOpen(false);
    setCategorySearchTerm('');

    // Send HTTP POST to insert into Supabase public.inventory_category table
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

  // Start Webcam for Separate Camera Modal
  const startCamera = async () => {
    try {
      setIsCameraModalOpen(true);
      setCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera access error:', err);
      alert('Unable to access camera. Please allow camera permissions or browse your gallery.');
      setCameraActive(false);
      setIsCameraModalOpen(false);
    }
  };

  // Stop Webcam
  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setCameraActive(false);
    setIsCameraModalOpen(false);
  };

  // Capture Snapshot from Camera Modal
  const captureSnapshot = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const snapshotUrl = canvas.toDataURL('image/webp', 0.85);
      setImagePreview(snapshotUrl);
      stopCamera();
    }
  };

  // Handle Gallery File Selection with fast WebP compression
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
            setImagePreview(canvas.toDataURL('image/webp', 0.8));
          } else {
            setImagePreview(reader.result as string);
          }
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  // Upload Image via Backend Cloudinary Service
  const uploadToCloudinary = async (imageDataUrl: string): Promise<string> => {
    if (!imageDataUrl || imageDataUrl.startsWith('/')) {
      return imageDataUrl || (itemType === 'GOLD' ? '/Eternal_Solitaire_Ring.jpg' : '/Pearl_Drop_Earrings.jpg');
    }

    try {
      const res = await fetch(`${API_BASE}/inventory/upload-cloudinary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageDataUrl }),
      });

      const data = await res.json();
      if (data.success && data.url) {
        return data.url;
      }
    } catch (err) {
      console.warn('Backend Cloudinary upload warning (using image fallback):', err);
    }
    return imageDataUrl;
  };

  const [editingProduct, setEditingProduct] = useState<InventoryProduct | null>(null);

  // Open Main Form Modal for Adding
  const handleOpenModal = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
    const defaultCat = categoryOptions.find((c) => c.value !== 'Other')?.value || 'Other';
    setCategoryType(defaultCat);
    setCustomCategory('');
    setWeightFrom('');
    setWeightTo('');
    setItemType('GOLD');
    setImagePreview('');
  };

  // Open Main Form Modal for Editing
  const handleEditProduct = (prod: InventoryProduct) => {
    setEditingProduct(prod);
    const existingCat = categoryOptions.find((c) => c.value.toLowerCase() === prod.category.toLowerCase());
    if (existingCat) {
      setCategoryType(existingCat.value);
      setCustomCategory('');
    } else {
      setCategoryType('Other');
      setCustomCategory(prod.category);
    }
    setItemType(prod.item_type || 'GOLD');
    setWeightFrom(String(prod.weight_from_grams || prod.weight_grams || ''));
    setWeightTo(String(prod.weight_to_grams || ''));
    setImagePreview(prod.img || '');
    setIsModalOpen(true);
  };

  // Delete Product Handler
  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this product from inventory?')) return;
    try {
      const res = await fetch(`${API_BASE}/inventory/products/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setProducts(products.filter((p) => p.id !== id));
      } else {
        alert('Failed to delete product from database');
      }
    } catch (err) {
      console.error('Delete product error:', err);
      setProducts(products.filter((p) => p.id !== id));
    }
  };

  // Close Main Form Modal
  const handleCloseModal = () => {
    stopCamera();
    setIsModalOpen(false);
    setIsSubmitting(false);
    setEditingProduct(null);
  };

  // Submit Product Creation or Update
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalCat = categoryType === 'Other' ? (customCategory || 'Custom Category') : categoryType;
    if (!finalCat || !weightFrom) return;

    setIsSubmitting(true);

    const isEdit = !!editingProduct;
    const targetId = editingProduct ? editingProduct.id : `prod-${Date.now()}`;

    const productPayload: InventoryProduct = {
      id: targetId,
      name: `${itemType === 'GOLD' ? 'Gold' : 'Silver'} ${finalCat}`,
      category: finalCat,
      item_type: itemType,
      weight_from_grams: Number(weightFrom),
      weight_to_grams: Number(weightTo) || Number(weightFrom),
      weight_grams: Number(weightFrom),
      img: imagePreview || (itemType === 'GOLD' ? '/Eternal_Solitaire_Ring.jpg' : '/Pearl_Drop_Earrings.jpg'),
    };

    try {
      let cloudinaryUrl = imagePreview;
      if (imagePreview && imagePreview.startsWith('data:')) {
        cloudinaryUrl = await uploadToCloudinary(imagePreview);
      }
      productPayload.img = cloudinaryUrl;

      const url = isEdit ? `${API_BASE}/inventory/products/${targetId}` : `${API_BASE}/inventory/products`;
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: productPayload.name,
          category: productPayload.category,
          item_type: productPayload.item_type,
          weight_from_grams: productPayload.weight_from_grams,
          weight_to_grams: productPayload.weight_to_grams,
          weight_grams: productPayload.weight_grams,
          img: productPayload.img,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.product) {
          if (isEdit) {
            setProducts(products.map((p) => (p.id === targetId ? data.product : p)));
          } else {
            setProducts([data.product, ...products]);
          }
          handleCloseModal();
          return;
        }
      }

      if (isEdit) {
        setProducts(products.map((p) => (p.id === targetId ? productPayload : p)));
      } else {
        setProducts([productPayload, ...products]);
      }
      handleCloseModal();
    } catch (err) {
      console.warn('Backend query error:', err);
      if (isEdit) {
        setProducts(products.map((p) => (p.id === targetId ? productPayload : p)));
      } else {
        setProducts([productPayload, ...products]);
      }
      handleCloseModal();
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.item_type && p.item_type.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="admin-dashboard-root" style={{ color: '#181310', fontFamily: "'Inter', 'Source Sans 3', 'DM Sans', sans-serif" }}>
      {/* Header Controls with Title, Search Bar & Add Button */}
      <div style={{ marginBottom: '1.25rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
        <div>
          <h2 className="admin-page-title" style={{ fontFamily: "'Inter', 'Source Sans 3', 'DM Sans', sans-serif", fontSize: '1.5rem', color: '#181310', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>
            <i className="fa-solid fa-boxes-stacked" style={{ color: '#d97706', marginRight: '8px' }}></i> Store Inventory &amp; Stock Catalog
          </h2>
          <p style={{ margin: '2px 0 0 0', color: '#786a5e', fontSize: '0.8rem' }}>
            All available jewelry products with high-resolution photos and weight range metadata
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap', flex: 1, justifyContent: 'flex-end' }}>
          {/* ── TOP SEARCH BAR ── */}
          <div style={{ position: 'relative', minWidth: '240px', flex: '1', maxWidth: '380px' }}>
            <i
              className="fa-solid fa-magnifying-glass"
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8',
                fontSize: '0.85rem',
              }}
            ></i>
            <input
              type="text"
              placeholder="Search product by name, category, or metal..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.6rem 0.85rem 0.6rem 2.2rem',
                borderRadius: '12px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                background: '#ffffff',
                color: '#1e293b',
                outline: 'none',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
              }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                }}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            )}
          </div>

          {/* Add New Product Button */}
          <button
            onClick={handleOpenModal}
            style={{
              padding: '10px 20px',
              background: 'linear-gradient(135deg, #d99b26 0%, #b45309 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(180,83,9,0.3)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              whiteSpace: 'nowrap',
            }}
          >
            <i className="fa-solid fa-plus"></i> Add New Product
          </button>
        </div>
      </div>

      {/* ── Main Add Product Form Modal Dialog ── */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 12, 10, 0.65)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
            animation: 'fadeIn 0.2s ease-in-out'
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              maxWidth: '540px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e6decb',
              padding: '1.5rem',
              position: 'relative'
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', paddingBottom: '0.8rem', borderBottom: '1px solid #f1e7dd' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#181310', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className={`fa-solid ${editingProduct ? 'fa-pen-to-square' : 'fa-wand-magic-sparkles'}`} style={{ color: '#d97706' }}></i>
                {editingProduct ? 'Edit Jewellery Product' : 'Add New Jewellery Item'}
              </h3>
              <button
                type="button"
                onClick={handleCloseModal}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', color: '#64748b', cursor: 'pointer', padding: '4px' }}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleSaveProduct}>
              {/* ── 1ST FIELD: Product Photo Upload / Camera Section (At Very Top) ── */}
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#b45309', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="fa-solid fa-camera" style={{ color: '#d97706' }}></i> Product Photo
                </div>

                <div
                  style={{
                    background: '#fffdfa',
                    border: '2px dashed #f59e0b',
                    borderRadius: '20px',
                    padding: '1.5rem 1rem',
                    textAlign: 'center',
                    position: 'relative'
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />

                  {/* Cloud Upload Icon or Uploaded Image Thumbnail */}
                  {imagePreview ? (
                    <div
                      onClick={() => setIsFullPreviewOpen(true)}
                      style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        margin: '0 auto 10px auto',
                        cursor: 'pointer',
                        overflow: 'hidden',
                        border: '2px solid #d97706',
                        boxShadow: '0 4px 10px rgba(217, 119, 6, 0.25)',
                        transition: 'transform 0.2s ease'
                      }}
                      title="Click to view full preview"
                    >
                      <img
                        src={imagePreview}
                        alt="Uploaded item photo"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                  ) : (
                    <div
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        background: '#fef3c7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 10px auto',
                        color: '#d97706',
                        fontSize: '1.3rem'
                      }}
                    >
                      <i className="fa-solid fa-cloud-arrow-up"></i>
                    </div>
                  )}

                  <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', fontWeight: 800, color: '#1e293b' }}>
                    Upload Item Photo
                  </h4>
                  <p style={{ margin: '0 0 14px 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                    Supports JPEG, PNG, WebP · Max 5MB
                  </p>

                  {/* Side-by-side Action Buttons */}
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        padding: '9px 18px',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        color: '#334155',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.05)'
                      }}
                    >
                      <i className="fa-solid fa-folder-open" style={{ color: '#8b5cf6' }}></i> Browse Gallery
                    </button>

                    <button
                      type="button"
                      onClick={startCamera}
                      style={{
                        padding: '9px 18px',
                        borderRadius: '10px',
                        border: 'none',
                        background: '#0284c7',
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)'
                      }}
                    >
                      <i className="fa-solid fa-camera"></i> Camera
                    </button>
                  </div>

                </div>
              </div>

              {/* ── 2ND FIELD: Category Type (Custom Luxury Dropdown UI/UX) ── */}
              <div style={{ marginBottom: '1.1rem', position: 'relative' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#4a3e35', display: 'block', marginBottom: '6px' }}>
                  <i className="fa-solid fa-layer-group" style={{ color: '#d97706', marginRight: '4px' }}></i> Category Type *
                </label>
                
                {/* Custom Trigger Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (!isCategoryDropdownOpen) fetchCategories();
                    setIsCategoryDropdownOpen(!isCategoryDropdownOpen);
                  }}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '12px',
                    border: isCategoryDropdownOpen ? '2px solid #d99b26' : '1px solid #cbd5e1',
                    background: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.92rem',
                    fontWeight: 700,
                    color: '#181310',
                    cursor: 'pointer',
                    boxShadow: isCategoryDropdownOpen ? '0 4px 14px rgba(217, 155, 38, 0.2)' : '0 2px 6px rgba(0, 0, 0, 0.02)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <i
                      className={`fa-solid ${categoryOptions.find((c) => c.value === categoryType)?.icon || 'fa-tag'}`}
                      style={{ color: '#d97706', width: '18px' }}
                    ></i>
                    {categoryOptions.find((c) => c.value === categoryType)?.label || categoryType}
                  </span>
                  <i
                    className={`fa-solid fa-chevron-down`}
                    style={{
                      color: '#94a3b8',
                      fontSize: '0.8rem',
                      transition: 'transform 0.2s ease',
                      transform: isCategoryDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)'
                    }}
                  ></i>
                </button>

                {/* Custom Popup Options Menu with Search Bar */}
                {isCategoryDropdownOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 6px)',
                      left: 0,
                      right: 0,
                      background: '#ffffff',
                      borderRadius: '16px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 12px 32px rgba(24, 19, 16, 0.15)',
                      zIndex: 100,
                      maxHeight: '260px',
                      overflowY: 'auto',
                      padding: '6px',
                      animation: 'fadeIn 0.15s ease-in-out'
                    }}
                  >
                    {/* Search Bar inside Category Dropdown */}
                    <div style={{ position: 'sticky', top: 0, background: '#ffffff', padding: '2px 2px 8px 2px', zIndex: 10, borderBottom: '1px solid #f1f5f9', marginBottom: '4px' }}>
                      <div style={{ position: 'relative' }}>
                        <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.8rem' }}></i>
                        <input
                          type="text"
                          placeholder="Search category..."
                          value={categorySearchTerm}
                          onChange={(e) => setCategorySearchTerm(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            width: '100%',
                            padding: '0.45rem 0.6rem 0.45rem 2.1rem',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.82rem',
                            outline: 'none',
                            background: '#f8fafc',
                            color: '#1e293b'
                          }}
                        />
                      </div>
                    </div>

                    {/* Dynamic Option to Add New Searched Category if missing */}
                    {categorySearchTerm.trim() && !categoryOptions.some((opt) => opt.value.toLowerCase() === categorySearchTerm.trim().toLowerCase()) && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleAddNewCategory(categorySearchTerm.trim());
                        }}
                        style={{
                          padding: '10px 14px',
                          borderRadius: '10px',
                          background: '#fef3c7',
                          color: '#b45309',
                          fontWeight: 800,
                          fontSize: '0.88rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          cursor: 'pointer',
                          marginBottom: '6px',
                          border: '1px dashed #f59e0b'
                        }}
                      >
                        <i className="fa-solid fa-plus-circle" style={{ color: '#d97706' }}></i>
                        Add "{categorySearchTerm.trim()}" as a new category
                      </div>
                    )}

                    {categoryOptions
                      .filter((opt) => opt.label.toLowerCase().includes(categorySearchTerm.toLowerCase()))
                      .map((opt) => {
                        const isSelected = categoryType === opt.value;
                        return (
                          <div
                            key={opt.value}
                            onClick={() => {
                              setCategoryType(opt.value);
                              setIsCategoryDropdownOpen(false);
                              setCategorySearchTerm('');
                            }}
                            style={{
                              padding: '10px 14px',
                              borderRadius: '10px',
                              background: isSelected ? '#fef3c7' : 'transparent',
                              color: isSelected ? '#b45309' : '#334155',
                              fontWeight: isSelected ? 800 : 600,
                              fontSize: '0.88rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              cursor: 'pointer',
                              transition: 'all 0.12s ease',
                              marginBottom: '2px'
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.background = '#fffbeb';
                                e.currentTarget.style.color = '#d97706';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.color = '#334155';
                              }
                            }}
                          >
                            <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <i className={`fa-solid ${opt.icon}`} style={{ color: isSelected ? '#b45309' : '#94a3b8', width: '18px' }}></i>
                              {opt.label}
                            </span>
                            {isSelected && <i className="fa-solid fa-check" style={{ color: '#b45309', fontSize: '0.85rem' }}></i>}
                          </div>
                        );
                      })}
                  </div>
                )}

                {categoryType === 'Other' && (
                  <input
                    type="text"
                    placeholder="Enter custom category name..."
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.92rem', outline: 'none', marginTop: '10px' }}
                    required
                  />
                )}
              </div>

              {/* ── 3RD FIELD: Item Weight Range (From & To) ── */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '1.1rem' }}>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#4a3e35', display: 'block', marginBottom: '4px' }}>
                    <i className="fa-solid fa-weight-hanging" style={{ color: '#d97706', marginRight: '4px' }}></i> Weight From (g) *
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    placeholder="e.g. 10.500"
                    value={weightFrom}
                    onChange={(e) => setWeightFrom(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.92rem', outline: 'none' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#4a3e35', display: 'block', marginBottom: '4px' }}>
                    <i className="fa-solid fa-weight-hanging" style={{ color: '#64748b', marginRight: '4px' }}></i> Weight To (g)
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    placeholder="e.g. 15.200"
                    value={weightTo}
                    onChange={(e) => setWeightTo(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.92rem', outline: 'none' }}
                  />
                </div>
              </div>

              {/* ── 4TH FIELD: Metal Type (Gold or Silver) ── */}
              <div style={{ marginBottom: '1.2rem' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#4a3e35', display: 'block', marginBottom: '6px' }}>
                  Item Type (Metal Category)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setItemType('GOLD')}
                    style={{
                      padding: '10px',
                      borderRadius: '12px',
                      border: itemType === 'GOLD' ? '2px solid #b45309' : '1px solid #e2d8ce',
                      background: itemType === 'GOLD' ? '#fef3c7' : '#f8fafc',
                      color: itemType === 'GOLD' ? '#92400e' : '#475569',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <i className="fa-solid fa-coins" style={{ color: '#d97706' }}></i> Gold Product
                  </button>
                  <button
                    type="button"
                    onClick={() => setItemType('SILVER')}
                    style={{
                      padding: '10px',
                      borderRadius: '12px',
                      border: itemType === 'SILVER' ? '2px solid #475569' : '1px solid #e2d8ce',
                      background: itemType === 'SILVER' ? '#f1f5f9' : '#f8fafc',
                      color: itemType === 'SILVER' ? '#0f172a' : '#475569',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <i className="fa-solid fa-gem" style={{ color: '#64748b' }}></i> Silver Product
                  </button>
                </div>
              </div>

              {/* Modal Action Buttons (Cancel & Add Product) */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '1rem', borderTop: '1px solid #f1e7dd' }}>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#475569',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <i className="fa-solid fa-xmark"></i> Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    padding: '10px 24px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #d99b26 0%, #b45309 100%)',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(180,83,9,0.3)',
                    opacity: isSubmitting ? 0.7 : 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin"></i> {editingProduct ? 'Saving...' : 'Uploading...'}
                    </>
                  ) : (
                    <>
                      <i className={`fa-solid ${editingProduct ? 'fa-floppy-disk' : 'fa-plus'}`}></i> {editingProduct ? 'Update Product' : 'Add Product'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Separate White Camera Modal Dialog Box ── */}
      {isCameraModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '1rem',
            animation: 'fadeIn 0.2s ease-in-out'
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              maxWidth: '480px',
              width: '100%',
              padding: '1.5rem',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e6decb',
              color: '#181310',
              textAlign: 'center'
            }}
          >
            {/* Camera Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid #f1e7dd' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#181310', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-camera" style={{ color: '#d97706' }}></i> Camera Capture
              </h3>
              <button
                type="button"
                onClick={stopCamera}
                style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '1.2rem', cursor: 'pointer', padding: '4px' }}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Video Viewport */}
            <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '16px', background: '#000', marginBottom: '1.25rem', border: '2px solid #e2e8f0' }}>
              <video ref={videoRef} autoPlay playsInline style={{ width: '100%', maxHeight: '300px', objectFit: 'cover', display: 'block' }} />
            </div>

            {/* Camera Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <button
                type="button"
                onClick={stopCamera}
                style={{
                  padding: '10px 20px',
                  borderRadius: '12px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <i className="fa-solid fa-xmark"></i> Cancel
              </button>

              <button
                type="button"
                onClick={captureSnapshot}
                style={{
                  padding: '10px 24px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(217, 119, 6, 0.4)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <i className="fa-solid fa-camera-retro"></i> Take Snapshot
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Items Grid */}
      {loading ? (
        <p style={{ color: '#786a5e' }}>Loading inventory items...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
          {filteredProducts.map((prod) => (
            <div
              key={prod.id}
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                padding: '1rem',
                border: '1px solid #e6decb',
                boxShadow: '0 6px 20px rgba(24,19,16,0.03)',
                display: 'flex',
                gap: '0.85rem',
                alignItems: 'center',
                position: 'relative'
              }}
            >
              <img
                src={prod.img}
                alt={prod.name}
                style={{ width: '70px', height: '70px', borderRadius: '12px', objectFit: 'cover', border: '1px solid #e6decb' }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.65rem', color: prod.item_type === 'SILVER' ? '#334155' : '#b45309', background: prod.item_type === 'SILVER' ? '#e2e8f0' : '#fef3c7', padding: '2px 8px', borderRadius: '20px', fontWeight: 800 }}>
                      {prod.item_type || 'GOLD'}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: '#475569', background: '#f1f5f9', padding: '2px 8px', borderRadius: '20px', fontWeight: 600 }}>
                      {prod.category}
                    </span>
                  </div>

                  {/* Edit & Delete Action Buttons Side-by-Side */}
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => handleEditProduct(prod)}
                      title="Edit Product"
                      style={{
                        background: '#fef3c7',
                        border: '1px solid #fde68a',
                        color: '#b45309',
                        borderRadius: '8px',
                        width: '28px',
                        height: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <i className="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(prod.id)}
                      title="Delete Product"
                      style={{
                        background: '#fee2e2',
                        border: '1px solid #fca5a5',
                        color: '#dc2626',
                        borderRadius: '8px',
                        width: '28px',
                        height: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <i className="fa-solid fa-trash-can"></i>
                    </button>
                  </div>
                </div>

                <h4 style={{ margin: '2px 0', fontSize: '0.9rem', color: '#181310', fontWeight: 800 }}>{prod.name}</h4>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Weight: {prod.weight_from_grams ? `${prod.weight_from_grams}g - ${prod.weight_to_grams || prod.weight_from_grams}g` : `${prod.weight_grams || 0}g`}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Full-Screen Image Preview Modal */}
      {isFullPreviewOpen && imagePreview && (
        <div
          onClick={() => setIsFullPreviewOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999999,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '90vh',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              background: '#000000'
            }}
          >
            <button
              type="button"
              onClick={() => setIsFullPreviewOpen(false)}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'rgba(0, 0, 0, 0.65)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                fontSize: '1.2rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10
              }}
              title="Close Preview"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
            <img
              src={imagePreview}
              alt="Full Preview"
              style={{
                maxWidth: '90vw',
                maxHeight: '85vh',
                objectFit: 'contain',
                display: 'block'
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryModule;
