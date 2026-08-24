import React, { useState } from 'react';
import type { InventoryProduct } from './ProductGridList';
import type { Language } from '../../utils/translations';
import { translations } from '../../utils/translations';
import { getTeluguTransliterationSync } from '../../utils/transliterate';

interface CategoryOption {
  value: string;
  label: string;
  icon?: string;
}

interface AddEditProductModalProps {
  isOpen: boolean;
  isInlinePage?: boolean;
  onClose: () => void;
  onSubmit: (productData: Partial<InventoryProduct>) => Promise<void>;
  editingProduct: InventoryProduct | null;
  existingProducts?: InventoryProduct[];
  categoryOptions: CategoryOption[];
  onAddNewCategory: (catName: string) => void;
  onStartCamera: () => void;
  onSwitchToLoadStock?: (productId: string) => void;
  imagePreview: string;
  setImagePreview: (url: string) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  lang?: Language;
}

const toStartCase = (str: string): string => {
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
};

export const AddEditProductModal: React.FC<AddEditProductModalProps> = ({
  isOpen,
  isInlinePage = false,
  onClose,
  onSubmit,
  editingProduct,
  existingProducts = [],
  categoryOptions,
  onAddNewCategory,
  onStartCamera,
  onSwitchToLoadStock,
  imagePreview,
  setImagePreview,
  fileInputRef,
  handleFileChange,
  lang = 'EN',
}) => {
  const t = translations[lang] || translations.EN;
  const [productName, setProductName] = useState(editingProduct?.name || '');
  const [categoryType, setCategoryType] = useState(editingProduct?.category || 'Ring');
  const [itemType, setItemType] = useState<'GOLD' | 'SILVER'>(editingProduct?.item_type || 'GOLD');
  const [weightFrom, setWeightFrom] = useState(editingProduct?.weight_from_grams?.toString() || '');
  const [weightTo, setWeightTo] = useState(editingProduct?.weight_to_grams?.toString() || '');
  const [totalWeightGrams, setTotalWeightGrams] = useState(editingProduct?.weight_grams?.toString() || '');
  const [stockQuantity, setStockQuantity] = useState((editingProduct as any)?.stock_quantity?.toString() || '');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isProductNameDropdownOpen, setIsProductNameDropdownOpen] = useState(false);
  const [categorySearchTerm, setCategorySearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categoryDropdownRef = React.useRef<HTMLDivElement>(null);
  const productNameDropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(target)) {
        setIsCategoryDropdownOpen(false);
      }
      if (productNameDropdownRef.current && !productNameDropdownRef.current.contains(target)) {
        setIsProductNameDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  React.useEffect(() => {
    if (editingProduct) {
      setProductName(editingProduct.name);
      setCategoryType(editingProduct.category);
      setItemType(editingProduct.item_type || 'GOLD');
      setWeightFrom(editingProduct.weight_from_grams?.toString() || '');
      setWeightTo(editingProduct.weight_to_grams?.toString() || '');
      setTotalWeightGrams(editingProduct.current_stock_weight?.toString() || editingProduct.weight_grams?.toString() || editingProduct.weight_from_grams?.toString() || '');
      setStockQuantity((editingProduct as any)?.stock_quantity?.toString() || '');
      setImagePreview(editingProduct.img || '');
    } else {
      setProductName('');
      const defaultCat = categoryOptions.find((c) => c.value !== 'Other')?.value || 'Ring';
      setCategoryType(defaultCat);
      setItemType('GOLD');
      setWeightFrom('');
      setWeightTo('');
      setTotalWeightGrams('');
      setStockQuantity('');
      setImagePreview('');
    }
  }, [editingProduct, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (existingDuplicateProduct) {
      alert(`Item "${existingDuplicateProduct.name}" is already present in stock (${existingDuplicateProduct.item_type}). Please use "Load Stock" to add more weight.`);
      return;
    }

    const finalCategory = toStartCase(categoryType.trim());
    const finalProductName = toStartCase(productName.trim()) || `${finalCategory} Item`;

    if (!finalCategory) {
      alert('Please select or specify a valid category.');
      return;
    }

    if (!categoryOptions.some((opt) => opt.value.toLowerCase() === finalCategory.toLowerCase())) {
      onAddNewCategory(finalCategory);
    }

    const minVal = Number(weightFrom) || 0;
    const maxVal = Number(weightTo) || minVal;
    const totalNetVal = totalWeightGrams !== '' ? Number(totalWeightGrams) : minVal;

    setIsSubmitting(true);
    try {
      await onSubmit({
        id: editingProduct?.id,
        name: finalProductName,
        category: finalCategory,
        item_type: itemType,
        weight_from_grams: minVal,
        weight_to_grams: maxVal,
        weight_grams: totalNetVal,
        stock_quantity: Number(stockQuantity) || 0,
        img: imagePreview,
      } as any);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCategories = React.useMemo(() => {
    return categoryOptions
      .filter(
        (opt) => opt.value !== 'Other' && opt.label.toLowerCase().includes(categorySearchTerm.trim().toLowerCase())
      )
      .sort((a, b) => (a.label || '').localeCompare(b.label || '', undefined, { sensitivity: 'base' }));
  }, [categoryOptions, categorySearchTerm]);

  const categoryProductsList = React.useMemo(() => {
    if (!existingProducts || !Array.isArray(existingProducts)) return [];
    const cat = (categoryType || '').trim().toLowerCase();
    const itemMet = (itemType || '').trim().toUpperCase();

    const setNames = new Set<string>();
    existingProducts.forEach((p) => {
      const pCat = (p.category || '').trim().toLowerCase();
      const pMet = (p.item_type || 'GOLD').trim().toUpperCase();
      if ((pCat === cat || !cat) && pMet === itemMet && p.name) {
        setNames.add(p.name);
      }
    });

    return Array.from(setNames).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [existingProducts, categoryType, itemType]);

  const filteredProductNameSuggestions = React.useMemo(() => {
    const query = productName.trim().toLowerCase();
    if (!query) return categoryProductsList;
    return categoryProductsList.filter((n) => n.toLowerCase().includes(query));
  }, [categoryProductsList, productName]);

  // Check if typed product already exists in current metal & category
  const existingDuplicateProduct = React.useMemo(() => {
    if (!productName.trim() || editingProduct) return null;
    const nameTrim = productName.trim().toLowerCase();
    const met = (itemType || 'GOLD').trim().toUpperCase();
    return (existingProducts || []).find(
      (p) => (p.name || '').trim().toLowerCase() === nameTrim && (p.item_type || 'GOLD').trim().toUpperCase() === met
    );
  }, [productName, itemType, existingProducts, editingProduct]);

  const formCard = (
    <div
      style={{
        background: '#ffffff',
        borderRadius: '20px',
        width: '100%',
        padding: isInlinePage ? '2rem' : '1.5rem',
        boxShadow: isInlinePage ? '0 4px 24px rgba(0,0,0,0.06)' : '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
        border: '1px solid #cbd5e1',
        maxHeight: isInlinePage ? undefined : '90vh',
        overflowY: isInlinePage ? undefined : 'auto',
      }}
    >
      {/* <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '0.85rem', borderBottom: '1px solid #f1f5f9' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fa-solid fa-boxes-stacked" style={{ color: '#d97706' }}></i>
            {editingProduct ? t.editStockItemTitle : t.addStockItemTitle}
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
            Fill in the ornament stock details below. New additions will be recorded in both inventory and stock logs.
          </p>
        </div>
        {!isInlinePage && (
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '1rem', color: '#64748b', cursor: 'pointer' }}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        )}
      </div> */}

      <form onSubmit={handleSubmit}>
        {/* Responsive 2-Column Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.75rem', marginBottom: '1.75rem' }}>

          {/* LEFT COLUMN: Photo, Metal Type, and Stock Weight */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', background: '#f8fafc', padding: '1.25rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>

            {/* 1. Photo Capture / Upload Section */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                <i className="fa-solid fa-camera" style={{ color: '#d97706', marginRight: '6px' }}></i>
                {t.productPhotoLabel}
              </label>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ width: '110px', height: '110px', borderRadius: '14px', background: '#ffffff', border: '2px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <i className="fa-solid fa-image" style={{ color: '#94a3b8', fontSize: '2rem' }}></i>
                  )}
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={onStartCamera}
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        color: '#0f172a',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                      }}
                    >
                      <i className="fa-solid fa-camera" style={{ color: '#d97706' }}></i> {t.cameraBtn}
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        color: '#0f172a',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                      }}
                    >
                      <i className="fa-solid fa-upload" style={{ color: '#2563eb' }}></i> {t.galleryBtn}
                    </button>
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Supports PNG, JPEG, WebP</span>
                </div>
              </div>
            </div>

            {/* 2. Metal Type Selection */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                <i className="fa-solid fa-gem" style={{ color: '#d97706', marginRight: '6px' }}></i>
                {t.metalTypeLabel}
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setItemType('GOLD')}
                  style={{
                    padding: '12px',
                    borderRadius: '12px',
                    border: itemType === 'GOLD' ? '2px solid #f59e0b' : '1px solid #cbd5e1',
                    background: itemType === 'GOLD' ? '#fef3c7' : '#ffffff',
                    color: itemType === 'GOLD' ? '#b45309' : '#475569',
                    fontWeight: 800,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: itemType === 'GOLD' ? '0 0 0 3px rgba(245, 158, 11, 0.2)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {lang === 'TE' ? '🥇 బంగారం (GOLD)' : '🥇 GOLD'}
                </button>

                <button
                  type="button"
                  onClick={() => setItemType('SILVER')}
                  style={{
                    padding: '12px',
                    borderRadius: '12px',
                    border: itemType === 'SILVER' ? '2px solid #0284c7' : '1px solid #cbd5e1',
                    background: itemType === 'SILVER' ? '#e0f2fe' : '#ffffff',
                    color: itemType === 'SILVER' ? '#0369a1' : '#475569',
                    fontWeight: 800,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: itemType === 'SILVER' ? '0 0 0 3px rgba(2, 132, 199, 0.2)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {lang === 'TE' ? '🥈 వెండి (SILVER)' : '🥈 SILVER'}
                </button>
              </div>
            </div>

            {/* 3. Total Stock Net Weight (Prominent) */}
            <div style={{ background: '#fffbe6', padding: '1rem', borderRadius: '12px', border: '1.5px solid #fde68a' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: '#92400e', marginBottom: '6px' }}>
                ⚖️ Loading Stock Weight (Grams) *
              </label>
              <input
                type="number"
                step="0.001"
                placeholder="e.g. 80.000 g"
                value={totalWeightGrams}
                onChange={(e) => setTotalWeightGrams(e.target.value)}
                required
                style={{ width: '100%', padding: '0.75rem 0.85rem', borderRadius: '8px', border: '1.5px solid #f59e0b', fontSize: '1.05rem', fontWeight: 800, color: '#92400e', background: '#ffffff' }}
              />
              <span style={{ fontSize: '0.72rem', color: '#b45309', display: 'block', marginTop: '4px' }}>
                Active inventory stock will initialize with this net weight.
              </span>
            </div>

          </div>

          {/* RIGHT COLUMN: Category, Name, Range, and Total Pieces */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* 4. Category Dropdown & Custom Category */}
            <div ref={categoryDropdownRef} style={{ position: 'relative' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                <i className="fa-solid fa-tags" style={{ color: '#0284c7', marginRight: '6px' }}></i>
                {t.ornamentCategoryLabel} *
              </label>
              <div
                onClick={() => setIsCategoryDropdownOpen((prev) => !prev)}
                style={{
                  padding: '0.75rem 0.85rem',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  background: '#ffffff',
                  fontSize: '0.9rem',
                  color: '#0f172a',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                }}
              >
                <span style={{ fontWeight: categoryType ? 800 : 500 }}>
                  {lang === 'TE' ? getTeluguTransliterationSync(categoryType) : categoryType}
                </span>
                <i className={`fa-solid ${isCategoryDropdownOpen ? 'fa-chevron-up' : 'fa-chevron-down'}`} style={{ color: '#64748b', fontSize: '0.8rem' }}></i>
              </div>

              {isCategoryDropdownOpen && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', background: '#ffffff', borderRadius: '12px', border: '1px solid #cbd5e1', boxShadow: '0 12px 28px rgba(0,0,0,0.15)', zIndex: 100, maxHeight: '240px', overflowY: 'auto', padding: '0.5rem' }}>
                  <div style={{ position: 'relative', marginBottom: '6px' }}>
                    <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.75rem' }}></i>
                    <input
                      type="text"
                      autoFocus
                      placeholder={lang === 'TE' ? 'వర్గం పేరు టైప్ చేయండి...' : 'Type category name...'}
                      value={categorySearchTerm}
                      onChange={(e) => setCategorySearchTerm(e.target.value)}
                      style={{ width: '100%', padding: '7px 10px 7px 2rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none', background: '#f8fafc' }}
                    />
                  </div>

                  {filteredCategories.map((opt) => (
                    <div
                      key={opt.value}
                      onClick={() => {
                        setCategoryType(opt.value);
                        setIsCategoryDropdownOpen(false);
                        setCategorySearchTerm('');
                      }}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '6px',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        color: categoryType === opt.value ? '#2563eb' : '#334155',
                        background: categoryType === opt.value ? '#eff6ff' : 'transparent',
                        fontWeight: categoryType === opt.value ? 800 : 500,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '2px',
                      }}
                    >
                      <span>{lang === 'TE' ? getTeluguTransliterationSync(opt.label) : opt.label}</span>
                      {categoryType === opt.value && <i className="fa-solid fa-check" style={{ color: '#2563eb', fontSize: '0.75rem' }}></i>}
                    </div>
                  ))}

                  {categorySearchTerm.trim() && filteredCategories.length === 0 && (
                    <div
                      onClick={() => {
                        const formatted = toStartCase(categorySearchTerm.trim());
                        setCategoryType(formatted);
                        setIsCategoryDropdownOpen(false);
                        setCategorySearchTerm('');
                      }}
                      style={{
                        padding: '9px 12px',
                        borderRadius: '8px',
                        fontSize: '0.83rem',
                        fontWeight: 800,
                        color: '#b45309',
                        background: '#fef3c7',
                        cursor: 'pointer',
                        marginTop: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        border: '1.5px solid #f59e0b',
                        boxShadow: '0 2px 6px rgba(245, 158, 11, 0.15)',
                      }}
                    >
                      <i className="fa-solid fa-plus-circle" style={{ fontSize: '0.9rem' }}></i>
                      <span>{lang === 'TE' ? `"${toStartCase(categorySearchTerm.trim())}" ని జతచేయి` : `Add "${toStartCase(categorySearchTerm.trim())}"`}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 5. Product Name with Autocomplete */}
            <div ref={productNameDropdownRef} style={{ position: 'relative' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                <i className="fa-solid fa-font" style={{ color: '#6366f1', marginRight: '6px' }}></i>
                {t.productNameLabel} *
              </label>
              <input
                type="text"
                placeholder={t.productNamePlaceholder || "e.g. Coffee Beans Chain"}
                value={productName}
                onFocus={() => setIsProductNameDropdownOpen(true)}
                onChange={(e) => {
                  setProductName(e.target.value);
                  setIsProductNameDropdownOpen(true);
                }}
                required
                style={{ width: '100%', padding: '0.75rem 0.85rem', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.9rem', color: '#0f172a', fontWeight: 700 }}
              />

              {isProductNameDropdownOpen && (filteredProductNameSuggestions.length > 0 || productName.trim()) && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '4px',
                    background: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #cbd5e1',
                    boxShadow: '0 12px 28px rgba(0,0,0,0.15)',
                    zIndex: 100,
                    maxHeight: '220px',
                    overflowY: 'auto',
                    padding: '0.5rem',
                  }}
                >
                  {filteredProductNameSuggestions.map((nameOpt, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setProductName(nameOpt);
                        setIsProductNameDropdownOpen(false);
                      }}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        color: '#0f172a',
                        cursor: 'pointer',
                        background: productName === nameOpt ? '#f1f5f9' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <i className="fa-solid fa-gem" style={{ color: '#d97706', fontSize: '0.75rem' }}></i>
                      {nameOpt}
                    </div>
                  ))}

                  {existingDuplicateProduct ? (
                    <div
                      onClick={() => {
                        if (onSwitchToLoadStock) {
                          onSwitchToLoadStock(existingDuplicateProduct.id);
                        }
                      }}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '10px',
                        background: '#fef3c7',
                        border: '2px solid #f59e0b',
                        color: '#92400e',
                        cursor: 'pointer',
                        marginTop: '6px',
                        boxShadow: '0 4px 12px rgba(245,158,11,0.2)',
                      }}
                    >
                      <div style={{ fontWeight: 800, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <i className="fa-solid fa-triangle-exclamation" style={{ color: '#d97706' }}></i>
                        Item "{existingDuplicateProduct.name}" already exists!
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#b45309', marginTop: '3px' }}>
                        Current stock: <strong>{existingDuplicateProduct.current_stock_weight ?? existingDuplicateProduct.weight_grams ?? 0}g</strong>.
                        <span style={{ textDecoration: 'underline', fontWeight: 800, marginLeft: '6px', color: '#0284c7' }}>
                          Click here to go to "Load Stock" to add more weight ➔
                        </span>
                      </div>
                    </div>
                  ) : (
                    productName.trim() && !categoryProductsList.some((n) => n.toLowerCase() === productName.trim().toLowerCase()) && (
                      <div
                        onClick={() => {
                          const formatted = toStartCase(productName.trim());
                          setProductName(formatted);
                          setIsProductNameDropdownOpen(false);
                        }}
                        style={{
                          padding: '9px 12px',
                          borderRadius: '8px',
                          fontSize: '0.83rem',
                          fontWeight: 800,
                          color: '#b45309',
                          background: '#fef3c7',
                          cursor: 'pointer',
                          marginTop: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          border: '1.5px solid #f59e0b',
                        }}
                      >
                        <i className="fa-solid fa-plus-circle" style={{ fontSize: '0.9rem' }}></i>
                        <span>Add: "{toStartCase(productName.trim())}"</span>
                      </div>
                    )
                  )}
                </div>
              )}

              {/* Outside Warning Notice when duplicate name is entered */}
              {existingDuplicateProduct && (
                <div
                  onClick={() => {
                    if (onSwitchToLoadStock) {
                      onSwitchToLoadStock(existingDuplicateProduct.id);
                    }
                  }}
                  style={{
                    marginTop: '6px',
                    padding: '8px 12px',
                    background: '#fffbe6',
                    border: '1.5px solid #fde68a',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    color: '#b45309',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>⚠️ "{existingDuplicateProduct.name}" already in stock ({existingDuplicateProduct.current_stock_weight ?? existingDuplicateProduct.weight_grams ?? 0}g).</span>
                  <span style={{ color: '#0284c7', textDecoration: 'underline' }}>Load Stock ➔</span>
                </div>
              )}
            </div>

            {/* 6. Customer Weight Range (Min & Max) */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Item Weight Range (e.g. 4g to 7g)
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <input
                    type="number"
                    step="0.001"
                    placeholder="Min Weight (e.g. 4g)"
                    value={weightFrom}
                    onChange={(e) => setWeightFrom(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem 0.85rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <input
                    type="number"
                    step="0.001"
                    placeholder="Max Weight (e.g. 7g)"
                    value={weightTo}
                    onChange={(e) => setWeightTo(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem 0.85rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
              </div>
            </div>

            {/* 7. Total Pieces (Optional) */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                📦 Total Pieces (e.g. 10 pcs - Optional)
              </label>
              <input
                type="number"
                step="1"
                placeholder="e.g. 10 pcs (optional)"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
                style={{ width: '100%', padding: '0.75rem 0.85rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem', color: '#0f172a' }}
              />
            </div>

          </div>
        </div>

        {/* Form Action Buttons Bar */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', paddingTop: '1.25rem', borderTop: '1px solid #e2e8f0' }}>
          <button
            type="button"
            onClick={onClose}
            style={{ minWidth: '130px', padding: '12px 20px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}
          >
            {t.cancelBtn}
          </button>
          <button
            type="submit"
            disabled={isSubmitting || Boolean(existingDuplicateProduct)}
            style={{
              minWidth: '220px',
              padding: '12px 24px',
              borderRadius: '12px',
              border: existingDuplicateProduct ? '1.5px solid #f59e0b' : 'none',
              background: isSubmitting || Boolean(existingDuplicateProduct)
                ? '#fef3c7'
                : 'linear-gradient(135deg, #d99b26 0%, #b45309 100%)',
              color: isSubmitting || Boolean(existingDuplicateProduct)
                ? '#b45309'
                : '#ffffff',
              fontWeight: 800,
              fontSize: '0.95rem',
              cursor: isSubmitting || Boolean(existingDuplicateProduct) ? 'not-allowed' : 'pointer',
              boxShadow: isSubmitting || Boolean(existingDuplicateProduct)
                ? 'none'
                : '0 4px 14px rgba(180, 83, 9, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              opacity: isSubmitting ? 0.7 : 1,
            }}
          >
            {isSubmitting ? (
              <>
                <i className="fa-solid fa-spinner fa-spin"></i> {t.savingItemBtn}
              </>
            ) : existingDuplicateProduct ? (
              <>
                <i className="fa-solid fa-ban" style={{ color: '#d97706' }}></i> Item Already In Stock
              </>
            ) : (
              <>
                <i className="fa-solid fa-check-circle"></i> {editingProduct ? t.updateStockItemBtn : t.saveStockItemBtn}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );

  if (isInlinePage) return formCard;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <div style={{ maxWidth: '1000px', width: '100%' }}>
        {formCard}
      </div>
    </div>
  );
};
