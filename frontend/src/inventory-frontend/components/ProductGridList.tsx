import React from 'react';
import type { Language } from '../../utils/translations';
import { translations } from '../../utils/translations';
import { getTeluguTransliterationSync } from '../../utils/transliterate';

export interface InventoryProduct {
  id: string;
  name: string;
  category: string;
  item_type?: 'GOLD' | 'SILVER';
  price?: number;
  weight_grams?: number;
  weight_from_grams?: number;
  weight_to_grams?: number;
  current_stock_weight?: number;
  sold_quantity?: number;
  sell_count?: number;
  img: string;
  stock_quantity?: number;
  created_at?: string;
  making_charge?: number;
  making_charge_percent?: number;
  making_charge_rs?: number;
  purity?: number;
}

interface ProductGridListProps {
  products: InventoryProduct[];
  loading: boolean;
  activeMetal: 'GOLD' | 'SILVER';
  selectedOrnament: string;
  searchTerm: string;
  onEditProduct: (product: InventoryProduct) => void;
  onDeleteProduct: (productId: string) => void;
  onViewImage: (imgUrl: string) => void;
  lang?: Language;
}

export const ProductGridList: React.FC<ProductGridListProps> = ({
  products,
  loading,
  activeMetal,
  selectedOrnament,
  searchTerm,
  onEditProduct,
  onDeleteProduct,
  onViewImage,
  lang = 'EN',
}) => {
  const t = translations[lang] || translations.EN;

  const metalLabel = lang === 'TE' ? (activeMetal === 'GOLD' ? 'బంగారం' : 'వెండి') : (activeMetal === 'GOLD' ? 'Gold' : 'Silver');
  const catLabel = selectedOrnament === 'ALL' || !selectedOrnament
    ? t.allCategoriesFilter
    : (lang === 'TE' ? getTeluguTransliterationSync(selectedOrnament) : selectedOrnament);

  return (
    <div>
      {/* Active Filter Bar Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h3 className="product-grid-header-title" style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <i className="fa-solid fa-list-check" style={{ color: '#d97706' }}></i>
          {t.showingOrnamentsFor} <span style={{ color: activeMetal === 'GOLD' ? '#b45309' : '#0369a1' }}>[{metalLabel} {catLabel}]</span>
        </h3>

        <div className="product-card-weight" style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
          {lang === 'TE' ? 'ప్రదర్శించబడుతున్నవి:' : 'Showing'} <strong>{products.length}</strong> {products.length === 1 ? t.itemSuffix : t.itemsSuffix}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#64748b', background: '#ffffff', borderRadius: '16px', border: '1px solid #cbd5e1' }}>
          <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '2rem', color: '#d97706', marginBottom: '0.75rem', display: 'block' }}></i>
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Loading inventory items from database...</span>
        </div>
      ) : products.length === 0 ? (
        <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#94a3b8', background: '#ffffff', borderRadius: '16px', border: '1px solid #cbd5e1' }}>
          <i className="fa-solid fa-box-open" style={{ fontSize: '2.2rem', color: '#cbd5e1', marginBottom: '0.75rem', display: 'block' }}></i>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#475569' }}>
            {t.noOrnamentsFound}
          </div>
          {searchTerm && (
            <div style={{ fontSize: '0.8rem', marginTop: '4px', color: '#94a3b8' }}>
              No matches found for search term "{searchTerm}".
            </div>
          )}
        </div>
      ) : (
        /* Responsive Stock Items Grid */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.25rem' }}>
          {products.map((product) => {
            const isGold = (product.item_type || 'GOLD') === 'GOLD';
            const displayWeight = product.weight_from_grams && product.weight_to_grams
              ? `${product.weight_from_grams}g - ${product.weight_to_grams}g`
              : product.weight_grams ? `${product.weight_grams}g` : 'N/A';

            return (
              <div
                key={product.id}
                style={{
                  background: '#ffffff',
                  borderRadius: '16px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
                  overflow: 'hidden',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* Image Container with Metal Tag Badge */}
                <div style={{ position: 'relative', width: '100%', height: '180px', background: '#f8fafc', overflow: 'hidden' }}>
                  <img
                    src={product.img || (isGold ? '/Eternal_Solitaire_Ring.jpg' : '/Pearl_Drop_Earrings.jpg')}
                    alt={product.name}
                    onClick={() => onViewImage(product.img || (isGold ? '/Eternal_Solitaire_Ring.jpg' : '/Pearl_Drop_Earrings.jpg'))}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      cursor: 'pointer',
                      transition: 'transform 0.3s ease',
                    }}
                  />
                  <div
                    className="product-card-badge"
                    style={{
                      position: 'absolute',
                      top: '10px',
                      left: '10px',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      background: isGold ? '#fef3c7' : '#e0f2fe',
                      color: isGold ? '#b45309' : '#0369a1',
                      border: isGold ? '1px solid #fde68a' : '1px solid #bae6fd',
                    }}
                  >
                    {isGold ? (lang === 'TE' ? '🥇 బంగారం' : '🥇 GOLD') : (lang === 'TE' ? '🥈 వెండి' : '🥈 SILVER')}
                  </div>

                  <div
                    className="product-card-badge"
                    style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      background: 'rgba(15, 23, 42, 0.75)',
                      color: '#ffffff',
                      backdropFilter: 'blur(4px)',
                    }}
                  >
                    {lang === 'TE' ? getTeluguTransliterationSync(product.category) : product.category}
                  </div>
                </div>

                {/* Content Info */}
                <div style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <h4 className="product-card-title" style={{ margin: '0 0 0.4rem 0', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.2px' }}>
                      {lang === 'TE' ? getTeluguTransliterationSync(product.name) : product.name}
                    </h4>

                    <div className="product-card-weight" style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '0.65rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span><i className="fa-solid fa-weight-hanging" style={{ color: '#d97706', marginRight: '4px' }}></i>Stock: <strong style={{ color: '#0f172a', fontWeight: 800 }}>{product.current_stock_weight ?? product.weight_grams ?? 0}g</strong></span>
                        <span style={{ fontSize: '0.72rem', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', color: '#475569', fontWeight: 700 }}>
                          Range: {displayWeight}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: '#15803d', background: '#f0fdf4', padding: '3px 8px', borderRadius: '6px', border: '1px solid #dcfce7' }}>
                        <span><i className="fa-solid fa-bag-shopping" style={{ marginRight: '4px' }}></i>Sold: <strong>{product.sold_quantity ?? 0}g</strong></span>
                        <span>Sales: <strong>{product.sell_count ?? 0}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons: Edit & Delete */}
                  <div style={{ display: 'flex', gap: '0.4rem', paddingTop: '0.65rem', borderTop: '1px solid #f1f5f9' }}>
                    <button
                      className="product-action-btn"
                      onClick={() => onEditProduct(product)}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        padding: '6px 6px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        background: '#f8fafc',
                        color: '#334155',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      <i className="fa-solid fa-pen-to-square" style={{ color: '#2563eb', flexShrink: 0 }}></i>
                      <span>{lang === 'TE' ? 'సవరణ' : 'Edit'}</span>
                    </button>

                    <button
                      className="product-action-btn"
                      onClick={() => onDeleteProduct(product.id)}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        padding: '6px 6px',
                        borderRadius: '8px',
                        border: '1px solid #fecdd3',
                        background: '#fff1f2',
                        color: '#e11d48',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      <i className="fa-solid fa-trash-can" style={{ flexShrink: 0 }}></i>
                      <span>{lang === 'TE' ? 'తొలగించు' : 'Delete'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
