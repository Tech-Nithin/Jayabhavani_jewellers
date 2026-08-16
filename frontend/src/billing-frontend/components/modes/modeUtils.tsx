import React, { useState, useEffect } from 'react';
import type { GlobalRates, BillItem } from '../../types';
import type { Language } from '../../../utils/translations';

/** Converts any string to Start Case (Title Case) — frontend-only display formatting */
export const toStartCase = (str: string): string =>
  str.replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());

export const formatMax3Decimals = (val: number | string | undefined | null): string => {
  if (val === undefined || val === null || val === '') return '0';
  const num = Number(val);
  if (isNaN(num)) return '0';
  const rounded = Math.round((num + Number.EPSILON) * 1000) / 1000;
  return String(rounded);
};

/** Formats text input dynamically into Indian currency format (e.g., 1,00,000) while typing */
export const formatIndianCurrencyInput = (val: string): string => {
  const clean = val.replace(/[^0-9.]/g, '');
  if (!clean) return '';
  const parts = clean.split('.');
  const intStr = parts[0];
  const decimalStr = parts.length > 1 ? '.' + parts[1] : '';
  if (!intStr) return '0' + decimalStr;
  const formattedInt = Number(intStr).toLocaleString('en-IN');
  return formattedInt + decimalStr;
};

export const parseIndianCurrencyNumber = (val: string | number | undefined | null): number => {
  const clean = String(val ?? '').replace(/,/g, '');
  return Number(clean) || 0;
};

export interface ModeFormProps {
  items: BillItem[];
  handleUpdateItem: (itemId: string, field: keyof BillItem, value: any) => void;
  handleUpdateItemMultiple?: (itemId: string, updates: Partial<BillItem>) => void;
  handleAddItem?: (type: 'SELL' | 'BUY') => void;
  handleRemoveItem?: (itemId: string) => void;
  calcResults: any;
  presets: Record<string, string[]>;
  handleAddNewPreset: (name: string, category: string) => void;
  rates: GlobalRates | null;
  lang: Language;
  t: Record<string, any>;
  showValidationErrors: boolean;
  setShowValidationErrors: (val: boolean) => void;
  uploadingImageItemId?: string | null;
  handleItemImageUpload?: (itemId: string, file: File) => void;
  setPreviewImage?: (img: { url: string; title: string } | null) => void;
}

export interface CreatablePresetSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder: string;
  categoryName: string;
  onAddNewPreset: (name: string, category: string) => void;
  style?: React.CSSProperties;
}

export const CreatablePresetSelect: React.FC<CreatablePresetSelectProps> = ({
  value,
  onChange,
  options = [],
  placeholder,
  categoryName,
  onAddNewPreset,
  style,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapperRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setQuery(value || '');
    }
  }, [value, isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter((opt) =>
    opt.toLowerCase().includes(query.trim().toLowerCase())
  );

  const exactMatchExists = options.some(
    (opt) => opt.toLowerCase() === query.trim().toLowerCase()
  );

  const handleSelectOption = (optName: string) => {
    onChange(optName);
    setQuery(optName);
    setIsOpen(false);
  };

  const handleCreateNew = (newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    onChange(trimmed);
    setQuery(trimmed);
    setIsOpen(false);
    onAddNewPreset(trimmed, categoryName);
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      <input
        type="text"
        placeholder={placeholder}
        value={isOpen ? query : (value || '')}
        onFocus={() => {
          setIsOpen(true);
          setQuery(value || '');
        }}
        onChange={(e) => {
          const val = e.target.value;
          setQuery(val);
          onChange(val);
          if (!isOpen) setIsOpen(true);
        }}
        style={{
          width: '100%',
          padding: '0.55rem 2.2rem 0.55rem 0.75rem',
          borderRadius: '6px',
          border: '1px solid #cbd5e1',
          fontSize: '0.85rem',
          color: '#0f172a',
          background: '#ffffff',
          ...style,
        }}
      />
      <i
        className="fa-solid fa-chevron-down"
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          position: 'absolute',
          right: '10px',
          top: '50%',
          transform: isOpen ? 'translateY(-50%) rotate(180deg)' : 'translateY(-50%)',
          color: '#64748b',
          fontSize: '0.70rem',
          pointerEvents: 'none',
          transition: 'transform 0.2s ease, color 0.2s ease',
        }}
      ></i>
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '4px',
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            boxShadow: '0 8px 20px rgba(0, 0, 0, 0.12)',
            maxHeight: '140px',
            overflowY: 'auto',
            zIndex: 30,
          }}
        >
          {query.trim() !== '' && !exactMatchExists && (
            <div
              onClick={() => handleCreateNew(query)}
              style={{
                padding: '0.5rem 0.75rem',
                fontSize: '0.82rem',
                fontWeight: 700,
                color: '#2563eb',
                background: '#eff6ff',
                cursor: 'pointer',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <i className="fa-solid fa-plus-circle"></i> + Add "{query.trim()}"
            </div>
          )}

          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt) => (
              <div
                key={opt}
                onClick={() => handleSelectOption(opt)}
                style={{
                  padding: '0.45rem 0.75rem',
                  fontSize: '0.82rem',
                  color: opt === value ? '#2563eb' : '#334155',
                  fontWeight: opt === value ? 700 : 500,
                  background: opt === value ? '#f0f9ff' : 'transparent',
                  cursor: 'pointer',
                  borderBottom: '1px solid #f1f5f9',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                onMouseLeave={(e) => (e.currentTarget.style.background = opt === value ? '#f0f9ff' : 'transparent')}
              >
                {opt}
              </div>
            ))
          ) : (
            <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.78rem', color: '#94a3b8' }}>
              No presets found
            </div>
          )}
        </div>
      )}
    </div>
  );
};
