import React, { useState } from 'react';
import type { InventoryProduct } from './ProductGridList';
import type { Language } from '../../utils/translations';

interface ProductTableViewProps {
  products: InventoryProduct[];
  loading: boolean;
  activeMetal: 'GOLD' | 'SILVER';
  selectedOrnament: string;
  searchTerm: string;
  onEditProduct: (product: InventoryProduct) => void;
  onDeleteProduct: (productId: string) => void;
  onViewImage: (url: string) => void;
  lang?: Language;
}

export const ProductTableView: React.FC<ProductTableViewProps> = ({
  products,
  loading,
  activeMetal,
  onEditProduct,
  onDeleteProduct,
  onViewImage,
}) => {
  // Track open category accordions
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  // Track expanded item row accordion dropdowns
  const [expandedItemRowId, setExpandedItemRowId] = useState<string | null>(null);

  const toggleItemAccordion = (itemId: string) => {
    setExpandedItemRowId((prev) => (prev === itemId ? null : itemId));
  };

  // Group products by category
  const categoriesGroup = React.useMemo(() => {
    const map: Record<string, InventoryProduct[]> = {};
    products.forEach((p) => {
      const cat = p.category || 'Other';
      if (!map[cat]) map[cat] = [];
      map[cat].push(p);
    });

    // Sort items within each category alphabetically by name ascending (A to Z)
    Object.keys(map).forEach((cat) => {
      map[cat].sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));
    });

    // Sort categories alphabetically (A to Z)
    const sortedCatNames = Object.keys(map).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

    return sortedCatNames.map((catName) => {
      const items = map[catName];
      const totalWeight = items.reduce(
        (sum, item) => sum + Number(item.current_stock_weight ?? item.weight_grams ?? 0),
        0
      );
      const totalSold = items.reduce(
        (sum, item) => sum + Number(item.sold_quantity ?? 0),
        0
      );
      const totalSalesCount = items.reduce(
        (sum, item) => sum + Number(item.sell_count ?? 0),
        0
      );

      return {
        categoryName: catName,
        items,
        totalItems: items.length,
        totalWeight: Number(totalWeight.toFixed(3)),
        totalSold: Number(totalSold.toFixed(3)),
        totalSalesCount,
      };
    });
  }, [products]);

  // Expand / Collapse Category Accordion
  const toggleCategory = (catName: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [catName]: prev[catName] === undefined ? false : !prev[catName],
    }));
  };

  const isCategoryExpanded = (catName: string) => {
    return expandedCategories[catName] !== false;
  };

  const handleExpandAll = () => {
    const allOpen: Record<string, boolean> = {};
    categoriesGroup.forEach((g) => {
      allOpen[g.categoryName] = true;
    });
    setExpandedCategories(allOpen);
  };

  const handleCollapseAll = () => {
    const allClosed: Record<string, boolean> = {};
    categoriesGroup.forEach((g) => {
      allClosed[g.categoryName] = false;
    });
    setExpandedCategories(allClosed);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
        <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '2rem', color: '#d97706', marginBottom: '1rem' }}></i>
        <div style={{ fontSize: '1rem', fontWeight: 700, color: '#475569' }}>Loading inventory items...</div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '3.5rem 1rem', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
        <i className="fa-solid fa-box-open" style={{ fontSize: '2.5rem', color: '#cbd5e1', marginBottom: '1rem' }}></i>
        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>No inventory items found</div>
        <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '4px' }}>
          Try selecting another category or add a new stock item.
        </p>
      </div>
    );
  }

  // Calculate Overall Grand Totals
  const grandTotalWeight = categoriesGroup.reduce((sum, g) => sum + g.totalWeight, 0).toFixed(3);
  const grandTotalItems = categoriesGroup.reduce((sum, g) => sum + g.totalItems, 0);
  const grandTotalSold = categoriesGroup.reduce((sum, g) => sum + g.totalSold, 0).toFixed(3);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      
      {/* Top Accordion Controls Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          padding: '0.85rem 1.25rem',
          background: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>Total Categories:</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>{categoriesGroup.length}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>Total Ornaments:</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>{grandTotalItems} items</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>Total Stock Weight:</span>
            <span style={{ fontSize: '0.95rem', fontWeight: 900, color: activeMetal === 'GOLD' ? '#b45309' : '#0369a1', background: activeMetal === 'GOLD' ? '#fef3c7' : '#e0f2fe', padding: '3px 8px', borderRadius: '6px' }}>
              ⚖️ {grandTotalWeight} g
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>Total Sold:</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>📦 {grandTotalSold} g</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            type="button"
            onClick={handleExpandAll}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#f8fafc',
              fontSize: '0.78rem',
              fontWeight: 700,
              color: '#334155',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <i className="fa-solid fa-angles-down" style={{ fontSize: '0.7rem' }}></i> Expand All
          </button>
          <button
            type="button"
            onClick={handleCollapseAll}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#f8fafc',
              fontSize: '0.78rem',
              fontWeight: 700,
              color: '#334155',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <i className="fa-solid fa-angles-up" style={{ fontSize: '0.7rem' }}></i> Collapse All
          </button>
        </div>
      </div>

      {/* Accordion Categories List */}
      {categoriesGroup.map((group) => {
        const isOpen = isCategoryExpanded(group.categoryName);

        return (
          <div
            key={group.categoryName}
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
              overflow: 'hidden',
              transition: 'box-shadow 0.2s',
            }}
          >
            {/* Category Accordion Header */}
            <div
              onClick={() => toggleCategory(group.categoryName)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1rem 1.25rem',
                cursor: 'pointer',
                background: isOpen ? (activeMetal === 'GOLD' ? '#fffdf7' : '#f8fafc') : '#ffffff',
                borderBottom: isOpen ? '1px solid #f1f5f9' : 'none',
                userSelect: 'none',
              }}
            >
              {/* Category Title & Badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: activeMetal === 'GOLD' ? '#fef3c7' : '#e0f2fe',
                    color: activeMetal === 'GOLD' ? '#d97706' : '#0284c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1rem',
                    fontWeight: 800,
                  }}
                >
                  <i className="fa-solid fa-gem"></i>
                </div>
                <div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {group.categoryName}
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '12px',
                        background: '#f1f5f9',
                        color: '#475569',
                      }}
                    >
                      {group.totalItems} {group.totalItems === 1 ? 'item' : 'items'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                    Sold: <strong>{group.totalSold}g</strong> • Sales: <strong>{group.totalSalesCount}</strong>
                  </div>
                </div>
              </div>

              {/* Category Stock Summary & Accordion Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Category Stock</div>
                  <div
                    style={{
                      fontSize: '1.05rem',
                      fontWeight: 900,
                      color: activeMetal === 'GOLD' ? '#b45309' : '#0369a1',
                      marginTop: '1px',
                    }}
                  >
                    ⚖️ {group.totalWeight} g
                  </div>
                </div>

                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: isOpen ? '#e2e8f0' : '#f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#475569',
                    fontSize: '0.85rem',
                    transition: 'transform 0.2s',
                  }}
                >
                  <i className={`fa-solid ${isOpen ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
                </div>
              </div>
            </div>

            {/* Accordion Content: Table of Ornaments */}
            {isOpen && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.76rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      <th style={{ padding: '10px 14px', width: '30px' }}></th>
                      <th style={{ padding: '10px 14px', width: '45px' }}>#</th>
                      <th style={{ padding: '10px 14px', width: '65px' }}>Photo</th>
                      <th style={{ padding: '10px 14px' }}>Ornament Name (A-Z)</th>
                      <th style={{ padding: '10px 14px' }}>Weight Range</th>
                      <th style={{ padding: '10px 14px' }}>Available Stock</th>
                      <th style={{ padding: '10px 14px' }}>Sold Weight</th>
                      <th style={{ padding: '10px 14px' }}>Sales</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.items.map((item, idx) => {
                      const stockWt = Number(item.current_stock_weight ?? item.weight_grams ?? 0);
                      const minWt = Number(item.weight_from_grams ?? 0);
                      const maxWt = Number(item.weight_to_grams ?? 0);
                      const soldWt = Number(item.sold_quantity ?? 0);
                      const sales = Number(item.sell_count ?? 0);
                      const isItemExpanded = expandedItemRowId === item.id;

                      return (
                        <React.Fragment key={item.id}>
                          <tr
                            onClick={() => toggleItemAccordion(item.id)}
                            style={{
                              borderBottom: isItemExpanded ? 'none' : '1px solid #f1f5f9',
                              background: isItemExpanded ? '#f0f9ff' : 'transparent',
                              cursor: 'pointer',
                              transition: 'background 0.15s',
                            }}
                            onMouseEnter={(e) => {
                              if (!isItemExpanded) e.currentTarget.style.backgroundColor = '#fafafa';
                            }}
                            onMouseLeave={(e) => {
                              if (!isItemExpanded) e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            {/* Expand Chevron Icon */}
                            <td style={{ padding: '10px 14px', color: '#0284c7', fontWeight: 800, fontSize: '0.8rem', textAlign: 'center' }}>
                              {isItemExpanded ? '▲' : '▼'}
                            </td>

                            {/* 1. Index */}
                            <td style={{ padding: '10px 14px', color: '#94a3b8', fontWeight: 700 }}>
                              #{idx + 1}
                            </td>

                            {/* 2. Photo */}
                            <td style={{ padding: '10px 14px' }} onClick={(e) => e.stopPropagation()}>
                              <img
                                src={item.img || '/Eternal_Solitaire_Ring.jpg'}
                                alt={item.name}
                                onClick={() => onViewImage(item.img || '/Eternal_Solitaire_Ring.jpg')}
                                style={{
                                  width: '42px',
                                  height: '42px',
                                  borderRadius: '8px',
                                  objectFit: 'cover',
                                  border: '1px solid #cbd5e1',
                                  cursor: 'zoom-in',
                                  boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                                }}
                              />
                            </td>

                            {/* 3. Item Name */}
                            <td style={{ padding: '10px 14px' }}>
                              <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>{item.name}</div>
                              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{item.category}</div>
                            </td>

                            {/* 4. Weight Range */}
                            <td style={{ padding: '10px 14px', color: '#475569', fontWeight: 600 }}>
                              {minWt > 0 || maxWt > 0 ? (
                                <span>🎯 {minWt}g – {maxWt}g</span>
                              ) : (
                                <span style={{ color: '#94a3b8' }}>—</span>
                              )}
                            </td>

                            {/* 5. Available Stock Weight */}
                            <td style={{ padding: '10px 14px' }}>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  background: stockWt > 0 ? '#f0fdf4' : '#fef2f2',
                                  color: stockWt > 0 ? '#15803d' : '#b91c1c',
                                  border: `1px solid ${stockWt > 0 ? '#bbf7d0' : '#fecaca'}`,
                                  padding: '4px 10px',
                                  borderRadius: '8px',
                                  fontWeight: 800,
                                  fontSize: '0.85rem',
                                }}
                              >
                                ⚖️ {stockWt} g
                              </span>
                            </td>

                            {/* 6. Cumulative Sold Weight */}
                            <td style={{ padding: '10px 14px', color: '#475569', fontWeight: 700 }}>
                              📦 {soldWt} g
                            </td>

                            {/* 7. Sell Count */}
                            <td style={{ padding: '10px 14px' }}>
                              <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '3px 8px', borderRadius: '6px', fontWeight: 800, fontSize: '0.78rem' }}>
                                {sales}
                              </span>
                            </td>

                            {/* 8. Action Buttons */}
                            <td style={{ padding: '10px 14px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                              <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => onEditProduct(item)}
                                  title="Edit Product"
                                  style={{
                                    padding: '6px 10px',
                                    borderRadius: '8px',
                                    border: '1px solid #cbd5e1',
                                    background: '#ffffff',
                                    color: '#0284c7',
                                    cursor: 'pointer',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                  }}
                                >
                                  <i className="fa-solid fa-pen-to-square"></i> Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onDeleteProduct(item.id)}
                                  title="Delete Product"
                                  style={{
                                    padding: '6px 10px',
                                    borderRadius: '8px',
                                    border: '1px solid #fee2e2',
                                    background: '#fff5f5',
                                    color: '#dc2626',
                                    cursor: 'pointer',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                  }}
                                >
                                  <i className="fa-solid fa-trash"></i>
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Interactive Accordion Detail Dropdown */}
                          {isItemExpanded && (
                            <tr style={{ background: '#f0f9ff', borderBottom: '2px solid #bae6fd' }}>
                              <td colSpan={9} style={{ padding: '12px 16px' }}>
                                <div style={{
                                  background: '#ffffff',
                                  borderRadius: '12px',
                                  padding: '14px 18px',
                                  border: '1.5px solid #0284c7',
                                  boxShadow: '0 8px 24px rgba(2,132,199,0.1)',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '10px',
                                }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                                    <div style={{ fontWeight: 900, fontSize: '0.92rem', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <span>🔍 Product Stock Breakdown & Specifications</span>
                                      <span style={{ fontSize: '0.70rem', background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '4px', fontWeight: 800 }}>
                                        Item Code #{item.id}
                                      </span>
                                    </div>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b' }}>
                                      Added: {item.created_at ? new Date(item.created_at).toLocaleDateString('en-IN') : '—'}
                                    </span>
                                  </div>

                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', fontSize: '0.80rem' }}>
                                    <div>
                                      <span style={{ color: '#64748b', fontSize: '0.72rem' }}>Category & Metal Type:</span>
                                      <div style={{ fontWeight: 800, color: '#0f172a' }}>🏷️ {item.category || 'General'}</div>
                                      <div style={{ fontSize: '0.72rem', color: '#b45309', fontWeight: 700 }}>Metal: {item.item_type || activeMetal}</div>
                                    </div>

                                    <div>
                                      <span style={{ color: '#64748b', fontSize: '0.72rem' }}>Weight & Stock Breakdown:</span>
                                      <div style={{ fontWeight: 800, color: '#15803d' }}>
                                        Current Weight: <strong>{stockWt} g</strong>
                                      </div>
                                      <div style={{ fontSize: '0.72rem', color: '#475569' }}>
                                        Target Range: {minWt}g – {maxWt}g · Pcs Stock: <strong>{item.stock_quantity || 1} pcs</strong>
                                      </div>
                                    </div>

                                    <div>
                                      <span style={{ color: '#64748b', fontSize: '0.72rem' }}>Sales & Performance:</span>
                                      <div style={{ fontWeight: 800, color: '#0369a1' }}>
                                        Sold Weight: <strong>{soldWt} g</strong>
                                      </div>
                                      <div style={{ fontSize: '0.72rem', color: '#1d4ed8' }}>
                                        Total Bills Sold: <strong>{sales} times</strong>
                                      </div>
                                    </div>

                                    <div>
                                      <span style={{ color: '#64748b', fontSize: '0.72rem' }}>Making Charges & Purity:</span>
                                      <div style={{ fontWeight: 800, color: '#0f172a' }}>
                                        Making/Vasti: <strong>{item.making_charge || item.making_charge_percent || 0}% / ₹{item.making_charge_rs || 0}</strong>
                                      </div>
                                      <div style={{ fontSize: '0.72rem', color: '#d97706' }}>
                                        Purity: <strong>{item.purity || 91.6}%</strong>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
