import React, { useState, useRef, useEffect } from 'react';
import type { Language } from '../../utils/translations';
import { translations } from '../../utils/translations';
import { getTeluguTransliterationSync } from '../../utils/transliterate';

export interface OrnamentCategoryItem {
  name: string;
  count: number;
  icon?: string;
}

interface OrnamentCategoryGridProps {
  activeMetal: 'GOLD' | 'SILVER';
  selectedOrnament: string;
  onSelectOrnament: (ornamentName: string) => void;
  categories: OrnamentCategoryItem[];
  totalMetalItemsCount: number;
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
  lang?: Language;
}

const getCategoryIcon = (categoryName: string): string => {
  const lower = categoryName.toLowerCase();
  if (lower.includes('ring')) return 'fa-ring';
  if (lower.includes('chain') || lower.includes('neck')) return 'fa-link';
  if (lower.includes('ear') || lower.includes('jhum')) return 'fa-gem';
  if (lower.includes('bangle') || lower.includes('brac')) return 'fa-circle-notch';
  if (lower.includes('anklet') || lower.includes('patt')) return 'fa-shoe-prints';
  if (lower.includes('coin') || lower.includes('bar')) return 'fa-coins';
  return 'fa-tags';
};

export const OrnamentCategoryGrid: React.FC<OrnamentCategoryGridProps> = ({
  activeMetal,
  selectedOrnament,
  onSelectOrnament,
  categories,
  totalMetalItemsCount,
  searchTerm = '',
  onSearchChange,
  lang = 'EN',
}) => {
  const t = translations[lang] || translations.EN;
  const isAllActive = selectedOrnament === 'ALL' || !selectedOrnament;

  const [showDropdown, setShowDropdown] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchTerm);
  const searchRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setLocalSearch(searchTerm); }, [searchTerm]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearchInput = (val: string) => {
    setLocalSearch(val);
    onSearchChange?.(val);
    setShowDropdown(val.trim().length > 0);
  };

  const handleDropdownSelect = (displayName: string, raw: string) => {
    const val = raw === 'ALL' ? '' : displayName;
    setLocalSearch(val);
    onSearchChange?.(val);
    setShowDropdown(false);
    if (raw === 'ALL') onSelectOrnament('ALL');
    else onSelectOrnament(raw);
  };

  const clearSearch = () => {
    setLocalSearch('');
    onSearchChange?.('');
    setShowDropdown(false);
  };

  const allSuggestions = [
    { name: lang === 'TE' ? 'అన్నీ' : 'All', raw: 'ALL' },
    ...categories.map((c) => ({
      name: lang === 'TE' ? getTeluguTransliterationSync(c.name) : c.name,
      raw: c.name,
    })),
  ];
  const suggestions = allSuggestions.filter((s) =>
    s.name.toLowerCase().includes(localSearch.toLowerCase())
  );

  const trimmed = localSearch.trim().toLowerCase();
  const showAll = !trimmed;
  const allCardVisible =
    showAll ||
    'all'.includes(trimmed) ||
    (lang === 'TE' && 'అన్నీ'.includes(trimmed));
  const filteredCategories = showAll
    ? categories
    : categories.filter(
        (c) =>
          c.name.toLowerCase().includes(trimmed) ||
          (lang === 'TE' &&
            getTeluguTransliterationSync(c.name).toLowerCase().includes(trimmed))
      );

  const accentColor  = activeMetal === 'GOLD' ? '#d97706' : '#0284c7';
  const accentBg     = activeMetal === 'GOLD' ? '#fef3c7' : '#e0f2fe';
  const accentBorder = activeMetal === 'GOLD' ? '#f59e0b' : '#0284c7';

  /* ── drag-to-scroll ── */
  const startDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = sliderRef.current;
    if (!el) return;
    el.style.cursor = 'grabbing';
    const startX = e.pageX - el.offsetLeft;
    const scrollLeft = el.scrollLeft;
    const onMove = (ev: MouseEvent) => {
      el.scrollLeft = scrollLeft - (ev.pageX - el.offsetLeft - startX);
    };
    const onUp = () => {
      if (el) el.style.cursor = 'grab';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <div style={{ marginBottom: '1.5rem', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 4px 16px rgba(0,0,0,0.02)', position: 'relative' }}>

      {/* ── HEADER ROW ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '0.75rem', flexWrap: 'nowrap', position: 'relative', zIndex: 10 }}>

        {/* LEFT */}
        <div style={{ minWidth: 0 }}>
          <h3 className="ornament-grid-header-title" style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            <i className={`fa-solid ${activeMetal === 'GOLD' ? 'fa-crown' : 'fa-certificate'}`} style={{ color: accentColor }}></i>
            {lang === 'TE'
              ? (activeMetal === 'GOLD' ? 'బంగారం ఆభరణాల వర్గాలు' : 'వెండి ఆభరణాల వర్గాలు')
              : (activeMetal === 'GOLD' ? 'Gold Ornament Categories' : 'Silver Ornament Categories')}
          </h3>
          <p className="inventory-sub-text" style={{ margin: '2px 0 0 0', fontSize: '0.65rem', color: '#94a3b8' }}>
            {t.selectOrnamentSubTitle}
          </p>
        </div>

        {/* RIGHT */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0, flexWrap: 'nowrap' }}>

          {/* SEARCH + DROPDOWN */}
          {onSearchChange && (
            <div ref={searchRef} style={{ position: 'relative', width: '200px', flexShrink: 0, zIndex: 1000 }}>
              <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.75rem', zIndex: 1, pointerEvents: 'none' }}></i>
              <input
                type="text"
                className="inventory-search-input"
                placeholder={t.searchInventoryPlaceholder}
                value={localSearch}
                onChange={(e) => handleSearchInput(e.target.value)}
                onFocus={() => localSearch.trim() && setShowDropdown(true)}
                style={{
                  width: '100%',
                  padding: '0.4rem 1.8rem 0.4rem 1.9rem',
                  borderRadius: '10px',
                  border: `1px solid ${showDropdown ? accentBorder : '#cbd5e1'}`,
                  fontSize: '0.78rem',
                  background: '#f8fafc',
                  color: '#1e293b',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                }}
              />
              {localSearch && (
                <button
                  onClick={clearSearch}
                  style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.75rem', padding: 0 }}
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              )}

              {/* DROPDOWN */}
              {showDropdown && suggestions.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  left: 0,
                  right: 0,
                  background: '#ffffff',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                  zIndex: 9999,
                  maxHeight: '180px',
                  overflowY: 'auto',
                }}>
                  {suggestions.map((s) => (
                    <div
                      key={s.raw}
                      onMouseDown={() => handleDropdownSelect(s.name, s.raw)}
                      style={{
                        padding: '7px 12px',
                        fontSize: '0.8rem',
                        color: '#1e293b',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = accentBg)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <i
                        className={`fa-solid ${s.raw === 'ALL' ? 'fa-boxes-stacked' : getCategoryIcon(s.raw)}`}
                        style={{ color: accentColor, fontSize: '0.75rem', width: '14px', textAlign: 'center' }}
                      ></i>
                      {s.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TOTAL COUNT */}
          <div style={{ fontSize: '0.78rem', color: '#475569', background: '#f8fafc', padding: '4px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>
            {t.totalTypes} <strong>{categories.length + 1}</strong>
          </div>
        </div>
      </div>

      {/* ── HORIZONTAL SLIDER ── */}
      <div
        ref={sliderRef}
        className="ornament-slider"
        onMouseDown={startDrag}
        style={{
          display: 'flex',
          gap: '0.65rem',
          overflowX: 'auto',
          position: 'relative',
          zIndex: 1,
          WebkitOverflowScrolling: 'touch',
          paddingBottom: '4px',
          cursor: 'grab',
          scrollbarWidth: 'none',
        }}
      >
        {/* ALL Card */}
        {allCardVisible && (
          <div
            onClick={() => { onSelectOrnament('ALL'); }}
            style={{
              flexShrink: 0,
              width: '110px',
              padding: '0.75rem 0.6rem',
              borderRadius: '12px',
              cursor: 'pointer',
              background: isAllActive ? accentBg : '#f8fafc',
              border: isAllActive ? `2px solid ${accentBorder}` : '1px solid #cbd5e1',
              boxShadow: isAllActive ? '0 4px 12px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              userSelect: 'none',
            }}
          >
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: isAllActive ? accentColor : '#e2e8f0', color: isAllActive ? '#ffffff' : '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', marginBottom: '6px' }}>
              <i className="fa-solid fa-boxes-stacked"></i>
            </div>
            <div className="ornament-card-label" style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
              {t.allOrnaments}
            </div>
            <div className="ornament-card-count" style={{ fontSize: '0.68rem', color: isAllActive ? accentColor : '#64748b', fontWeight: 600, marginTop: '2px' }}>
              {totalMetalItemsCount} {totalMetalItemsCount === 1 ? t.itemSuffix : t.itemsSuffix}
            </div>
          </div>
        )}

        {/* Filtered Category Cards */}
        {filteredCategories.map((cat) => {
          const isSelected = selectedOrnament.toLowerCase() === cat.name.toLowerCase();
          const iconClass = cat.icon || getCategoryIcon(cat.name);
          const displayName = lang === 'TE' ? getTeluguTransliterationSync(cat.name) : cat.name;

          return (
            <div
              key={cat.name}
              onClick={() => onSelectOrnament(cat.name)}
              style={{
                flexShrink: 0,
                width: '110px',
                padding: '0.75rem 0.6rem',
                borderRadius: '12px',
                cursor: 'pointer',
                background: isSelected ? accentBg : '#ffffff',
                border: isSelected ? `2px solid ${accentBorder}` : '1px solid #cbd5e1',
                boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                userSelect: 'none',
              }}
            >
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: isSelected ? accentColor : '#f1f5f9', color: isSelected ? '#ffffff' : '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', marginBottom: '6px' }}>
                <i className={`fa-solid ${iconClass}`}></i>
              </div>
              <div className="ornament-card-label" style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                {displayName}
              </div>
              <div className="ornament-card-count" style={{ fontSize: '0.68rem', color: isSelected ? accentColor : '#64748b', fontWeight: 600, marginTop: '2px' }}>
                {cat.count} {cat.count === 1 ? t.itemSuffix : t.itemsSuffix}
              </div>
            </div>
          );
        })}

        {/* Empty state */}
        {!allCardVisible && filteredCategories.length === 0 && (
          <div style={{ padding: '1rem 1.5rem', fontSize: '0.82rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fa-solid fa-magnifying-glass" style={{ color: '#cbd5e1' }}></i>
            {lang === 'TE' ? 'వర్గాలు కనుగొనబడలేదు' : 'No categories found'}
          </div>
        )}
      </div>
    </div>
  );
};


