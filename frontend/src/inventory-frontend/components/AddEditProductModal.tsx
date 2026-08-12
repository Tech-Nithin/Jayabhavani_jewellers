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
  categoryOptions: CategoryOption[];
  onAddNewCategory: (catName: string) => void;
  onStartCamera: () => void;
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
  categoryOptions,
  onAddNewCategory,
  onStartCamera,
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
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [categorySearchTerm, setCategorySearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (editingProduct) {
      setProductName(editingProduct.name);
      setCategoryType(editingProduct.category);
      setItemType(editingProduct.item_type || 'GOLD');
      setWeightFrom(editingProduct.weight_from_grams?.toString() || editingProduct.weight_grams?.toString() || '');
      setWeightTo(editingProduct.weight_to_grams?.toString() || editingProduct.weight_grams?.toString() || '');
      setImagePreview(editingProduct.img || '');
    } else {
      setProductName('');
      const defaultCat = categoryOptions.find((c) => c.value !== 'Other')?.value || 'Ring';
      setCategoryType(defaultCat);
      setItemType('GOLD');
      setWeightFrom('');
      setWeightTo('');
      setImagePreview('');
    }
  }, [editingProduct, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalCategory = toStartCase(categoryType.trim());
    const finalProductName = toStartCase(productName.trim()) || `${finalCategory} Item`;

    if (!finalCategory) {
      alert('Please select or specify a valid category.');
      return;
    }

    if (!categoryOptions.some((opt) => opt.value.toLowerCase() === finalCategory.toLowerCase())) {
      onAddNewCategory(finalCategory);
    }

    const fromVal = Number(weightFrom) || 0;
    const toVal = Number(weightTo) || fromVal;

    setIsSubmitting(true);
    try {
      await onSubmit({
        id: editingProduct?.id,
        name: finalProductName,
        category: finalCategory,
        item_type: itemType,
        weight_from_grams: fromVal,
        weight_to_grams: toVal,
        weight_grams: fromVal,
        img: imagePreview,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCategories = categoryOptions.filter(
    (opt) => opt.value !== 'Other' && opt.label.toLowerCase().includes(categorySearchTerm.trim().toLowerCase())
  );

  const formCard = (
    <div
      style={{
        background: '#ffffff',
        borderRadius: '20px',
        width: '100%',
        padding: '1.5rem',
        boxShadow: isInlinePage ? '0 4px 24px rgba(0,0,0,0.07)' : '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
        border: '1px solid #cbd5e1',
        maxHeight: isInlinePage ? undefined : '90vh',
        overflowY: isInlinePage ? undefined : 'auto',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
          <i className="fa-solid fa-boxes-stacked" style={{ color: '#d97706', marginRight: '8px' }}></i>
          {editingProduct ? t.editStockItemTitle : t.addStockItemTitle}
        </h3>
        {!isInlinePage && (
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.2rem', color: '#64748b', cursor: 'pointer' }}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit}>
          {/* 1. Photo Capture / Upload Section */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              {t.productPhotoLabel}
            </label>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '12px', background: '#f8fafc', border: '1px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <i className="fa-solid fa-image" style={{ color: '#94a3b8', fontSize: '1.5rem' }}></i>
                )}
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={onStartCamera}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      background: '#f1f5f9',
                      color: '#0f172a',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                    }}
                  >
                    <i className="fa-solid fa-camera" style={{ color: '#d97706' }}></i> {t.cameraBtn}
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      background: '#f1f5f9',
                      color: '#0f172a',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                    }}
                  >
                    <i className="fa-solid fa-upload" style={{ color: '#2563eb' }}></i> {t.galleryBtn}
                  </button>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
              </div>
            </div>
          </div>

          {/* 2. Metal Type Selection */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              {t.metalTypeLabel}
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setItemType('GOLD')}
                style={{
                  padding: '10px',
                  borderRadius: '10px',
                  border: itemType === 'GOLD' ? '2px solid #f59e0b' : '1px solid #cbd5e1',
                  background: itemType === 'GOLD' ? '#fef3c7' : '#ffffff',
                  color: itemType === 'GOLD' ? '#b45309' : '#475569',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                {lang === 'TE' ? '🥇 బంగారం' : '🥇 GOLD'}
              </button>

              <button
                type="button"
                onClick={() => setItemType('SILVER')}
                style={{
                  padding: '10px',
                  borderRadius: '10px',
                  border: itemType === 'SILVER' ? '2px solid #0284c7' : '1px solid #cbd5e1',
                  background: itemType === 'SILVER' ? '#e0f2fe' : '#ffffff',
                  color: itemType === 'SILVER' ? '#0369a1' : '#475569',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                {lang === 'TE' ? '🥈 వెండి' : '🥈 SILVER'}
              </button>
            </div>
          </div>

          {/* 3. Category Dropdown & Custom Category */}
          <div style={{ marginBottom: '1rem', position: 'relative' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              {t.ornamentCategoryLabel}
            </label>
            <div
              onClick={() => setIsCategoryDropdownOpen((prev) => !prev)}
              style={{
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                fontSize: '0.85rem',
                color: '#0f172a',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontWeight: categoryType ? 700 : 500 }}>
                {lang === 'TE' ? getTeluguTransliterationSync(categoryType) : categoryType}
              </span>
              <i className={`fa-solid ${isCategoryDropdownOpen ? 'fa-chevron-up' : 'fa-chevron-down'}`} style={{ color: '#64748b', fontSize: '0.75rem' }}></i>
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
                    style={{ width: '100%', padding: '7px 10px 7px 2rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem', outline: 'none', background: '#f8fafc' }}
                  />
                </div>

                {/* Existing Filtered Options */}
                {filteredCategories.map((opt) => (
                  <div
                    key={opt.value}
                    onClick={() => {
                      setCategoryType(opt.value);
                      setIsCategoryDropdownOpen(false);
                      setCategorySearchTerm('');
                    }}
                    style={{
                      padding: '7px 10px',
                      borderRadius: '6px',
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      color: categoryType === opt.value ? '#2563eb' : '#334155',
                      background: categoryType === opt.value ? '#eff6ff' : 'transparent',
                      fontWeight: categoryType === opt.value ? 700 : 500,
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

                {/* Only show "+ Add Category" button if NO matching category is found */}
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

          {/* 4. Product Name */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              {t.productNameLabel}
            </label>
            <input
              type="text"
              placeholder={t.productNamePlaceholder}
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', color: '#0f172a' }}
            />
          </div>

          {/* 5. Weight Range (Grams From / To) */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              {t.weightRangeLabel}
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <input
                  type="number"
                  step="0.001"
                  placeholder={t.minWeightPlaceholder}
                  value={weightFrom}
                  onChange={(e) => setWeightFrom(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>
              <div>
                <input
                  type="number"
                  step="0.001"
                  placeholder={t.maxWeightPlaceholder}
                  value={weightTo}
                  onChange={(e) => setWeightTo(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>
            </div>
          </div>

          {/* Form Action Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
            >
              {t.cancelBtn}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #d99b26 0%, #b45309 100%)', color: '#ffffff', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}
            >
              {isSubmitting ? t.savingItemBtn : editingProduct ? t.updateStockItemBtn : t.saveStockItemBtn}
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
        padding: '1rem',
      }}
    >
      <div style={{ maxWidth: '520px', width: '100%' }}>
        {formCard}
      </div>
    </div>
  );
};
