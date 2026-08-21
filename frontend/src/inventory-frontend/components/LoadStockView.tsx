import React, { useState } from 'react';
import type { InventoryProduct } from './ProductGridList';
import type { Language } from '../../utils/translations';
import { translations } from '../../utils/translations';

interface LoadStockViewProps {
  products: InventoryProduct[];
  activeMetal: 'GOLD' | 'SILVER';
  onClose: () => void;
  onStockLoaded: () => Promise<void>;
  preSelectedProductId?: string;
  lang?: Language;
}

export const LoadStockView: React.FC<LoadStockViewProps> = ({
  products,
  activeMetal: initialMetal,
  onClose,
  onStockLoaded,
  preSelectedProductId,
  lang = 'EN',
}) => {
  const t = translations[lang] || translations.EN;
  const [selectedMetal, setSelectedMetal] = useState<'GOLD' | 'SILVER'>(initialMetal || 'GOLD');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedProductId, setSelectedProductId] = useState<string>(preSelectedProductId || '');
  const [weightToAdd, setWeightToAdd] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [categorySearchTerm, setCategorySearchTerm] = useState('');
  const [isItemDropdownOpen, setIsItemDropdownOpen] = useState(false);
  const [itemSearchTerm, setItemSearchTerm] = useState('');

  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const categoryDropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setIsItemDropdownOpen(false);
      }
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(target)) {
        setIsCategoryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Filter products by selected metal & category (Sorted A to Z)
  const filteredProducts = React.useMemo(() => {
    return products
      .filter((p) => {
        const matchMetal = (p.item_type || 'GOLD') === selectedMetal;
        const matchCategory = selectedCategory === 'ALL' || p.category === selectedCategory;
        const matchSearch = !itemSearchTerm || p.name.toLowerCase().includes(itemSearchTerm.toLowerCase());
        return matchMetal && matchCategory && matchSearch;
      })
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));
  }, [products, selectedMetal, selectedCategory, itemSearchTerm]);

  // Categories available for the selected metal (Sorted A to Z, with ALL at top)
  const availableCategories = React.useMemo(() => {
    const cats = new Set<string>();
    products
      .filter((p) => (p.item_type || 'GOLD') === selectedMetal)
      .forEach((p) => {
        if (p.category) cats.add(p.category);
      });
    const sortedCats = Array.from(cats).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    return ['ALL', ...sortedCats];
  }, [products, selectedMetal]);

  const filteredCategories = React.useMemo(() => {
    if (!categorySearchTerm.trim()) return availableCategories;
    return availableCategories.filter((c) =>
      c.toLowerCase().includes(categorySearchTerm.trim().toLowerCase())
    );
  }, [availableCategories, categorySearchTerm]);

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const currentWeight = Number(selectedProduct?.current_stock_weight ?? selectedProduct?.weight_grams ?? 0);
  const addWeightNum = Number(weightToAdd) || 0;
  const newTotalWeight = Number((currentWeight + addWeightNum).toFixed(3));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      alert('Please select an existing ornament to load stock.');
      return;
    }
    if (addWeightNum <= 0) {
      alert('Please enter a valid stock weight greater than 0g.');
      return;
    }

    setIsSubmitting(true);
    try {
      const API_BASE = (window as any).__JBJ_API_BASE__ || '/api';
      const res = await fetch(`${API_BASE}/inventory/products/${selectedProductId}/restock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restock_weight: addWeightNum,
          notes: notes.trim() || `Loaded +${addWeightNum}g stock by shop owner`,
        }),
      });

      const data = await res.json();
      if (data.success) {
        await onStockLoaded();
        onClose();
      } else {
        alert(data.message || 'Failed to load stock');
      }
    } catch (err: any) {
      console.error('Error loading stock:', err);
      alert('Network error while loading stock');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: '20px',
        width: '100%',
        padding: '2rem',
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        border: '1px solid #cbd5e1',
      }}
    >
      {/* Header */}
      {/* <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #f1f5f9' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fa-solid fa-boxes-packing" style={{ color: '#0284c7' }}></i>
            {lang === 'TE' ? 'స్టాక్ లోడ్ చేయండి' : 'Load Stock to Existing Ornament'}
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
            Select an existing ornament item to append incoming stock weight. The new weight will be logged in the stock ledger.
          </p>
        </div>
      </div> */}

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.75rem', marginBottom: '1.75rem' }}>

          {/* LEFT COLUMN: Filters & Item Selection */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', background: '#f8fafc', padding: '1.25rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>

            {/* 1. Metal Filter */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                <i className="fa-solid fa-gem" style={{ color: '#d97706', marginRight: '6px' }}></i>
                Select Metal
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMetal('GOLD');
                    setSelectedCategory('ALL');
                    setSelectedProductId('');
                  }}
                  style={{
                    padding: '12px',
                    borderRadius: '12px',
                    border: selectedMetal === 'GOLD' ? '2px solid #f59e0b' : '1px solid #cbd5e1',
                    background: selectedMetal === 'GOLD' ? '#fef3c7' : '#ffffff',
                    color: selectedMetal === 'GOLD' ? '#b45309' : '#475569',
                    fontWeight: 800,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: selectedMetal === 'GOLD' ? '0 0 0 3px rgba(245, 158, 11, 0.2)' : 'none',
                  }}
                >
                  🥇 GOLD
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedMetal('SILVER');
                    setSelectedCategory('ALL');
                    setSelectedProductId('');
                  }}
                  style={{
                    padding: '12px',
                    borderRadius: '12px',
                    border: selectedMetal === 'SILVER' ? '2px solid #0284c7' : '1px solid #cbd5e1',
                    background: selectedMetal === 'SILVER' ? '#e0f2fe' : '#ffffff',
                    color: selectedMetal === 'SILVER' ? '#0369a1' : '#475569',
                    fontWeight: 800,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: selectedMetal === 'SILVER' ? '0 0 0 3px rgba(2, 132, 199, 0.2)' : 'none',
                  }}
                >
                  🥈 SILVER
                </button>
              </div>
            </div>

            {/* 2. Category Selector Dropdown */}
            <div ref={categoryDropdownRef} style={{ position: 'relative' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                <i className="fa-solid fa-tags" style={{ color: '#0284c7', marginRight: '6px' }}></i>
                Select Category Filter
              </label>
              <div
                onClick={() => setIsCategoryDropdownOpen((prev) => !prev)}
                style={{
                  padding: '0.85rem 1rem',
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
                <span style={{ fontWeight: 700 }}>
                  {selectedCategory === 'ALL' ? '🏷️ All Categories' : `🏷️ ${selectedCategory}`}
                </span>
                <i className={`fa-solid ${isCategoryDropdownOpen ? 'fa-chevron-up' : 'fa-chevron-down'}`} style={{ color: '#64748b', fontSize: '0.8rem' }}></i>
              </div>

              {isCategoryDropdownOpen && (
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
                  <div style={{ position: 'relative', marginBottom: '6px' }}>
                    <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.75rem' }}></i>
                    <input
                      type="text"
                      autoFocus
                      placeholder="Search category..."
                      value={categorySearchTerm}
                      onChange={(e) => setCategorySearchTerm(e.target.value)}
                      style={{ width: '100%', padding: '7px 10px 7px 2rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none', background: '#f8fafc' }}
                    />
                  </div>

                  {filteredCategories.map((cat) => {
                    const isSelected = selectedCategory === cat;
                    return (
                      <div
                        key={cat}
                        onClick={() => {
                          setSelectedCategory(cat);
                          setSelectedProductId('');
                          setIsCategoryDropdownOpen(false);
                          setCategorySearchTerm('');
                        }}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '8px',
                          fontSize: '0.85rem',
                          fontWeight: isSelected ? 800 : 500,
                          cursor: 'pointer',
                          color: isSelected ? '#2563eb' : '#334155',
                          background: isSelected ? '#eff6ff' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '2px',
                        }}
                      >
                        <span>{cat === 'ALL' ? 'All Categories' : cat}</span>
                        {isSelected && <i className="fa-solid fa-check" style={{ color: '#2563eb', fontSize: '0.75rem' }}></i>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 3. Existing Item Selector Dropdown */}
            <div ref={dropdownRef} style={{ position: 'relative' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
                <i className="fa-solid fa-box-open" style={{ color: '#d97706', marginRight: '6px' }}></i>
                Select Existing Ornament Item *
              </label>
              <div
                onClick={() => setIsItemDropdownOpen((prev) => !prev)}
                style={{
                  padding: '0.85rem 1rem',
                  borderRadius: '10px',
                  border: selectedProductId ? '2px solid #2563eb' : '1.5px solid #cbd5e1',
                  background: '#ffffff',
                  fontSize: '0.9rem',
                  color: '#0f172a',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                }}
              >
                {selectedProduct ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img
                      src={selectedProduct.img || '/Eternal_Solitaire_Ring.jpg'}
                      alt={selectedProduct.name}
                      style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'cover' }}
                    />
                    <div>
                      <div style={{ fontWeight: 800, color: '#0f172a' }}>{selectedProduct.name}</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{selectedProduct.category} • Stock: <strong>{currentWeight}g</strong></div>
                    </div>
                  </div>
                ) : (
                  <span style={{ color: '#94a3b8', fontWeight: 600 }}>-- Click to select an ornament --</span>
                )}
                <i className={`fa-solid ${isItemDropdownOpen ? 'fa-chevron-up' : 'fa-chevron-down'}`} style={{ color: '#64748b', fontSize: '0.8rem' }}></i>
              </div>

              {isItemDropdownOpen && (
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
                    maxHeight: '260px',
                    overflowY: 'auto',
                    padding: '0.5rem',
                  }}
                >
                  <div style={{ position: 'relative', marginBottom: '6px' }}>
                    <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.75rem' }}></i>
                    <input
                      type="text"
                      autoFocus
                      placeholder="Search existing items..."
                      value={itemSearchTerm}
                      onChange={(e) => setItemSearchTerm(e.target.value)}
                      style={{ width: '100%', padding: '7px 10px 7px 2rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none', background: '#f8fafc' }}
                    />
                  </div>

                  {filteredProducts.length === 0 ? (
                    <div style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>
                      No matching ornaments found.
                    </div>
                  ) : (
                    filteredProducts.map((p) => {
                      const isSelected = selectedProductId === p.id;
                      const stockWt = Number(p.current_stock_weight ?? p.weight_grams ?? 0);
                      return (
                        <div
                          key={p.id}
                          onClick={() => {
                            setSelectedProductId(p.id);
                            setIsItemDropdownOpen(false);
                            setItemSearchTerm('');
                          }}
                          style={{
                            padding: '8px 10px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            background: isSelected ? '#eff6ff' : 'transparent',
                            border: isSelected ? '1px solid #bfdbfe' : '1px solid transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '4px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <img
                              src={p.img || '/Eternal_Solitaire_Ring.jpg'}
                              alt={p.name}
                              style={{ width: '30px', height: '30px', borderRadius: '6px', objectFit: 'cover' }}
                            />
                            <div>
                              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>{p.name}</div>
                              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{p.category}</div>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0284c7', background: '#f0f9ff', padding: '2px 6px', borderRadius: '4px' }}>
                              {stockWt}g
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

          </div>

          {/* RIGHT COLUMN: Weight to Load & Calculation Preview */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* 4. Weight to Load Input */}
            <div style={{ background: '#f0fdf4', padding: '1.25rem', borderRadius: '16px', border: '1.5px solid #bbf7d0' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#166534', marginBottom: '8px' }}>
                ⚖️ Weight to Load (Grams) *
              </label>
              <input
                type="number"
                step="0.001"
                placeholder="e.g. 50.000 g"
                value={weightToAdd}
                onChange={(e) => setWeightToAdd(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.85rem 1rem',
                  borderRadius: '10px',
                  border: '2px solid #22c55e',
                  fontSize: '1.2rem',
                  fontWeight: 800,
                  color: '#166534',
                  background: '#ffffff',
                  outline: 'none',
                }}
              />
              <span style={{ fontSize: '0.72rem', color: '#15803d', marginTop: '6px', display: 'block' }}>
                This weight will be added to the ornament's active stock.
              </span>
            </div>

            {/* 5. Live Calculation Preview Card */}
            <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '16px', border: '1px solid #cbd5e1' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                📊 Stock Calculation Summary
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto 1fr', alignItems: 'center', gap: '8px', textAlign: 'center' }}>
                <div style={{ background: '#ffffff', padding: '10px 8px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>Previous Stock</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{currentWeight}g</div>
                </div>

                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#94a3b8' }}>+</div>

                <div style={{ background: '#dcfce7', padding: '10px 8px', borderRadius: '10px', border: '1px solid #86efac' }}>
                  <div style={{ fontSize: '0.68rem', color: '#15803d', fontWeight: 700 }}>Incoming Load</div>
                  <div style={{ fontSize: '1rem', fontWeight: 900, color: '#166534', marginTop: '2px' }}>+{addWeightNum}g</div>
                </div>

                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#94a3b8' }}>=</div>

                <div style={{ background: '#eff6ff', padding: '10px 8px', borderRadius: '10px', border: '1.5px solid #93c5fd' }}>
                  <div style={{ fontSize: '0.68rem', color: '#1d4ed8', fontWeight: 700 }}>New Total Stock</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#1e40af', marginTop: '2px' }}>{newTotalWeight}g</div>
                </div>
              </div>
            </div>

            {/* 6. Notes field */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                📝 Notes / Supplier Info (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Received from Bombay Supplier"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{ width: '100%', padding: '0.75rem 0.85rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem', color: '#0f172a' }}
              />
            </div>

          </div>
        </div>

        {/* Action Buttons Bar */}
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
            disabled={isSubmitting || !selectedProductId || addWeightNum <= 0}
            style={{
              minWidth: '220px',
              padding: '12px 24px',
              borderRadius: '12px',
              border: 'none',
              background: (!selectedProductId || addWeightNum <= 0) ? '#94a3b8' : 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '0.95rem',
              cursor: (!selectedProductId || addWeightNum <= 0) ? 'not-allowed' : 'pointer',
              boxShadow: (!selectedProductId || addWeightNum <= 0) ? 'none' : '0 4px 14px rgba(2, 132, 199, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            {isSubmitting ? (
              <>
                <i className="fa-solid fa-spinner fa-spin"></i> Loading Stock...
              </>
            ) : (
              <>
                <i className="fa-solid fa-check-circle"></i> Confirm & Load Stock (+{addWeightNum}g)
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
