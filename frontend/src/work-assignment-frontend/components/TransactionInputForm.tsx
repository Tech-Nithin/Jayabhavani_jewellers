import React from 'react';
import type { ReplyMessageData } from '../WorkerTransactionsView';

interface TransactionInputFormProps {
  isAccordionExpanded: boolean;
  setIsAccordionExpanded: (v: boolean) => void;
  replyTo: ReplyMessageData | null;
  setReplyTo: (v: ReplyMessageData | null) => void;
  isMessagePreviewEnabled: boolean;
  onToggleMessagePreview: () => void;
  direction: 'OUTGOING' | 'INCOMING';
  setDirection: (v: 'OUTGOING' | 'INCOMING') => void;
  category: 'GOLD' | 'SILVER' | 'CASH' | 'ORNAMENT' | 'CHAT' | 'ORDER';
  setCategory: (v: 'GOLD' | 'SILVER' | 'CASH' | 'ORNAMENT' | 'CHAT') => void;
  itemName: string;
  setItemName: (v: string) => void;
  amountCash: string;
  setAmountCash: (v: string) => void;
  cashMetalLink: 'FOR_GOLD' | 'FOR_SILVER' | 'GENERAL_CASH';
  setCashMetalLink: (v: 'FOR_GOLD' | 'FOR_SILVER' | 'GENERAL_CASH') => void;
  appliedRatePerGram: string;
  setAppliedRatePerGram: (v: string) => void;
  weightGrams: string;
  setWeightGrams: (v: string) => void;
  touchPercentage: string;
  setTouchPercentage: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  photos: string[];
  setPhotos: (fn: (prev: string[]) => string[]) => void;
  setPhotoFiles: (fn: (prev: File[]) => File[]) => void;
  itemOptions?: string[];
  isSending: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  toSentenceCase: (str?: string | null) => string;
}

const DropUpCreatableSelect: React.FC<{
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  required?: boolean;
}> = ({ value, onChange, options, placeholder = 'Select or type item...', required = false }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [query, setQuery] = React.useState(value || '');
  const wrapperRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!isOpen) {
      setQuery(value || '');
    }
  }, [value, isOpen]);

  React.useEffect(() => {
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

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      <input
        type="text"
        placeholder={placeholder}
        value={isOpen ? query : (value || '')}
        required={required}
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
          padding: '0.55rem 2rem 0.55rem 0.75rem',
          borderRadius: '8px',
          border: '1px solid #cbd5e1',
          fontSize: '0.82rem',
          color: '#0f172a',
          background: '#ffffff',
          outline: 'none',
          fontWeight: 700,
        }}
      />
      <i
        className="fa-solid fa-chevron-up"
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          position: 'absolute',
          right: '10px',
          top: '50%',
          transform: isOpen ? 'translateY(-50%) rotate(180deg)' : 'translateY(-50%)',
          color: '#64748b',
          fontSize: '0.68rem',
          pointerEvents: 'none',
          transition: 'transform 0.2s ease',
        }}
      />
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: 0,
            right: 0,
            marginBottom: '4px',
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            boxShadow: '0 -6px 20px rgba(0, 0, 0, 0.15)',
            maxHeight: '170px',
            overflowY: 'auto',
            zIndex: 9999,
          }}
        >
          {query.trim() !== '' && !exactMatchExists && (
            <div
              onClick={() => handleSelectOption(query.trim())}
              style={{
                padding: '0.5rem 0.75rem',
                fontSize: '0.80rem',
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
              <i className="fa-solid fa-plus-circle"></i> Use "{query.trim()}"
            </div>
          )}

          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt) => (
              <div
                key={opt}
                onClick={() => handleSelectOption(opt)}
                style={{
                  padding: '0.45rem 0.75rem',
                  fontSize: '0.80rem',
                  color: opt === value ? '#2563eb' : '#334155',
                  fontWeight: opt === value ? 800 : 500,
                  background: opt === value ? '#f0f9ff' : 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid #f8fafc',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                onMouseLeave={(e) => (e.currentTarget.style.background = opt === value ? '#f0f9ff' : 'transparent')}
              >
                <span>{opt}</span>
                {opt === value && <i className="fa-solid fa-check" style={{ color: '#2563eb', fontSize: '0.70rem' }} />}
              </div>
            ))
          ) : (
            <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center' }}>
              No matches found
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const TransactionInputForm: React.FC<TransactionInputFormProps> = ({
  isAccordionExpanded,
  setIsAccordionExpanded,
  replyTo,
  setReplyTo,
  isMessagePreviewEnabled,
  onToggleMessagePreview,
  direction,
  setDirection,
  category,
  setCategory,
  itemName,
  setItemName,
  amountCash,
  setAmountCash,
  cashMetalLink,
  setCashMetalLink,
  appliedRatePerGram,
  setAppliedRatePerGram,
  weightGrams,
  setWeightGrams,
  touchPercentage,
  setTouchPercentage,
  notes,
  setNotes,
  photos,
  setPhotos,
  setPhotoFiles,
  itemOptions = [],
  isSending,
  fileInputRef,
  onFileChange,
  onSubmit,
  toSentenceCase,
}) => {
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = React.useState(false);
  const categoryBtnRef = React.useRef<HTMLButtonElement | null>(null);
  const [menuCoords, setMenuCoords] = React.useState<{ top?: number; bottom?: number; left: number; width: number } | null>(null);

  const toggleCategoryMenu = () => {
    if (!isCategoryMenuOpen && categoryBtnRef.current) {
      const rect = categoryBtnRef.current.getBoundingClientRect();
      const spaceAbove = rect.top;
      const spaceBelow = window.innerHeight - rect.bottom;
      const left = Math.max(10, Math.min(rect.left, window.innerWidth - 210));

      if (spaceAbove > 220 || spaceAbove > spaceBelow) {
        setMenuCoords({ bottom: window.innerHeight - rect.top + 8, left, width: Math.max(190, rect.width) });
      } else {
        setMenuCoords({ top: rect.bottom + 8, left, width: Math.max(190, rect.width) });
      }
      setIsCategoryMenuOpen(true);
    } else {
      setIsCategoryMenuOpen(false);
    }
  };

  const CATEGORY_ITEMS: Array<{
    key: 'GOLD' | 'SILVER' | 'CASH' | 'CHAT';
    label: string;
    emoji: string;
    color: string;
    bg: string;
    border: string;
  }> = [
      { key: 'GOLD', label: 'Gold', emoji: '🥇', color: '#b45309', bg: '#fffbe8', border: '#fde68a' },
      { key: 'SILVER', label: 'Silver', emoji: '🥈', color: '#334155', bg: '#f8fafc', border: '#cbd5e1' },
      { key: 'CASH', label: 'Cash', emoji: '💵', color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
      { key: 'CHAT', label: 'Plain Message', emoji: '💬', color: '#0284c7', bg: '#f0f9ff', border: '#bae6fd' },
    ];

  const currentCat = CATEGORY_ITEMS.find((c) => c.key === category) || CATEGORY_ITEMS[0];

  return (
    <div style={{ background: '#ffffff', borderTop: '1px solid #cbd5e1' }}>
      <div
        onClick={() => setIsAccordionExpanded(!isAccordionExpanded)}
        style={{
          padding: '0.35rem 0.85rem',
          background: isAccordionExpanded ? '#f8fafc' : '#ffffff',
          borderBottom: isAccordionExpanded ? '1px solid #e2e8f0' : 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <i className="fa-solid fa-square-plus" style={{ color: '#075e54', fontSize: '0.85rem' }}></i>
          <span style={{ fontWeight: 800, fontSize: '0.76rem', color: '#0f172a' }}>
            {isAccordionExpanded ? 'New Transaction & Live Preview Panel' : 'Add New Transaction / Record (Click to Expand Form)'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700 }}>
            {isAccordionExpanded ? 'Collapse Form (View Full Chat)' : 'Expand Form'}
          </span>
          <i className={`fa-solid fa-chevron-${isAccordionExpanded ? 'down' : 'up'}`} style={{ color: '#075e54', fontSize: '0.78rem' }}></i>
        </div>
      </div>

      {isAccordionExpanded && (
        <form onSubmit={onSubmit} style={{ padding: '0.45rem 0.85rem' }}>

          {/* Quoted Message Reply Preview Banner */}
          {replyTo && (
            <div style={{ background: '#f1f5f9', borderLeft: '4px solid #0284c7', padding: '8px 12px', borderRadius: '8px', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0284c7', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <i className="fa-solid fa-reply"></i> Replying to {replyTo.senderName}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#334155', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', marginTop: '2px' }}>
                  {replyTo.notes || (replyTo.photos && replyTo.photos.length > 0 ? '📷 Photo Attachment' : 'Message')}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReplyTo(null)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.9rem', padding: '4px' }}
                title="Cancel reply"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
          )}

          {/* Live Message Preview Banner (Toggleable ON/OFF) */}
          {isMessagePreviewEnabled && (
            <div className="worker-chat-live-preview" style={{ background: '#f8fafc', padding: '4px 8px', borderRadius: '8px', border: '1px dashed #0284c7', marginBottom: '0.35rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <i className="fa-solid fa-eye"></i> Live Message Preview ({direction === 'OUTGOING' ? 'Sending to Worker' : 'Receiving from Worker'})
                </span>
                <button
                  type="button"
                  onClick={onToggleMessagePreview}
                  style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.62rem', fontWeight: 700 }}
                  title="Click to hide message preview"
                >
                  <i className="fa-solid fa-eye-slash"></i> Disable Preview
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: direction === 'OUTGOING' ? 'flex-end' : 'flex-start' }}>
                <div style={{ width: '85%', maxWidth: '380px', background: '#ffffff', borderRadius: '8px', padding: '6px 8px', border: '1px solid #cbd5e1', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                    <span style={{ fontSize: '0.60rem', fontWeight: 800, padding: '1px 6px', borderRadius: '6px', background: direction === 'OUTGOING' ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' : '#0284c7', color: '#fff', textTransform: 'uppercase' }}>
                      {direction === 'OUTGOING' ? 'OUTGOING (STORE → WORKER)' : 'INCOMING (WORKER → STORE)'}
                    </span>
                    <span style={{ fontSize: '0.58rem', color: '#64748b' }}>Now</span>
                  </div>

                  {photos && photos.length > 0 && !amountCash && !weightGrams ? (
                    <div style={{ margin: '2px 0', padding: '4px 8px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                      <div style={{ fontSize: '0.60rem', color: '#0284c7', fontWeight: 800, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <i className="fa-solid fa-camera" style={{ color: '#0284c7' }}></i> PHOTO ATTACHMENT
                      </div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f172a', margin: '1px 0' }}>
                        {toSentenceCase(itemName.trim()) || 'Photo Attachment'}
                      </div>
                    </div>
                  ) : category === 'CASH' ? (
                    <div style={{ margin: '2px 0', padding: '4px 8px', background: '#f0fdf4', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                      <div style={{ fontSize: '0.60rem', color: '#166534', fontWeight: 800, display: 'flex', justifyContent: 'space-between' }}>
                        <span>💵 CASH {cashMetalLink === 'FOR_GOLD' ? 'FOR GOLD' : cashMetalLink === 'FOR_SILVER' ? 'FOR SILVER' : 'PAYMENT'}</span>
                        <span style={{ fontSize: '0.58rem', color: '#15803d' }}>
                          {cashMetalLink === 'FOR_GOLD' ? '🥇 Raw Gold' : cashMetalLink === 'FOR_SILVER' ? '🥈 Raw Silver' : '💵 General'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#15803d' }}>
                        💵 ₹{amountCash ? Number(amountCash).toLocaleString('en-IN') : '0'}
                      </div>
                      {itemName && itemName.trim() && (
                        <div style={{ fontSize: '0.70rem', color: '#166534', fontWeight: 700, marginTop: '2px' }}>
                          For {toSentenceCase(itemName.trim())}
                        </div>
                      )}
                      {Number(amountCash) > 0 && Number(appliedRatePerGram) > 0 && (
                        <div style={{ marginTop: '2px', fontSize: '0.62rem', background: '#ffffff', padding: '2px 5px', borderRadius: '4px', border: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between' }}>
                          <span>Rate: ₹{Number(appliedRatePerGram).toLocaleString('en-IN')}/g</span>
                          <strong style={{ color: '#15803d' }}>Eq: {(Number(amountCash) / Number(appliedRatePerGram)).toFixed(3)} g</strong>
                        </div>
                      )}
                    </div>
                  ) : Number(weightGrams) > 0 ? (
                    <div style={{ margin: '2px 0', padding: '4px 8px', background: category === 'GOLD' ? '#fffbe8' : category === 'SILVER' ? '#f8fafc' : '#f0f9ff', borderRadius: '6px', border: category === 'GOLD' ? '1px solid #fde68a' : category === 'SILVER' ? '1px solid #cbd5e1' : '1px solid #bae6fd' }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f172a', marginBottom: '2px' }}>
                        <div>{category === 'GOLD' ? '🥇 Gold' : category === 'SILVER' ? '🥈 Silver' : '👑 Ornament'}</div>
                        {itemName && itemName.trim() && (
                          <div style={{ fontSize: '0.70rem', color: category === 'GOLD' ? '#b45309' : '#0369a1', fontWeight: 700 }}>
                            For {toSentenceCase(itemName.trim())}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: '4px', fontSize: '0.66rem', background: '#ffffff', padding: '3px 6px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                        <div>
                          <span style={{ color: '#64748b', display: 'block', fontSize: '0.58rem', fontWeight: 700 }}>GROSS WT</span>
                          <strong>{weightGrams ? Number(weightGrams).toFixed(3) : '0.000'} g</strong>
                        </div>
                        <div>
                          <span style={{ color: '#64748b', display: 'block', fontSize: '0.58rem', fontWeight: 700 }}>TOUCH %</span>
                          <strong>{touchPercentage || '100'}%</strong>
                        </div>
                        <div>
                          <span style={{ color: '#64748b', display: 'block', fontSize: '0.58rem', fontWeight: 700 }}>100% PURE FINE</span>
                          <strong style={{ color: '#15803d' }}>
                            {Number((Number(weightGrams) || 0) * (Number(touchPercentage) || 100.0) / 100).toFixed(3)} g
                          </strong>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {notes && (
                    <div style={{ fontSize: '0.78rem', color: '#0f172a', fontWeight: 600, marginTop: '2px', wordBreak: 'break-word' }}>
                      {notes}
                    </div>
                  )}

                  {photos && photos.length > 0 && (
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                      {photos.map((url, idx) => (
                        <div key={idx} style={{ position: 'relative', display: 'inline-block' }}>
                          <img
                            src={url}
                            alt="Selected Photo Preview"
                            style={{ width: '42px', height: '42px', borderRadius: '6px', objectFit: 'cover', border: '1px solid #0284c7' }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setPhotos((prev) => prev.filter((_, i) => i !== idx));
                              setPhotoFiles((prev) => prev.filter((_, i) => i !== idx));
                            }}
                            style={{
                              position: 'absolute',
                              top: '-4px',
                              right: '-4px',
                              background: '#dc2626',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '50%',
                              width: '16px',
                              height: '16px',
                              fontSize: '0.60rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            title="Remove this photo"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Toggle Mode & Category Dropdown */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', background: '#f1f5f9', padding: '2px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
              <button
                type="button"
                onClick={() => setDirection('OUTGOING')}
                style={{ padding: '3px 8px', borderRadius: '4px', border: 'none', background: direction === 'OUTGOING' ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' : 'transparent', color: direction === 'OUTGOING' ? '#fff' : '#475569', fontWeight: 700, fontSize: '0.70rem', cursor: 'pointer' }}
              >
                ↑ Outgoing (Send)
              </button>
              <button
                type="button"
                onClick={() => setDirection('INCOMING')}
                style={{ padding: '3px 8px', borderRadius: '4px', border: 'none', background: direction === 'INCOMING' ? '#0284c7' : 'transparent', color: direction === 'INCOMING' ? '#fff' : '#475569', fontWeight: 700, fontSize: '0.70rem', cursor: 'pointer' }}
              >
                ↓ Incoming (Receive)
              </button>
            </div>

            {/* Custom Viewport-Fixed Category Menu (Guaranteed inside screen) */}
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <button
                ref={categoryBtnRef}
                type="button"
                onClick={toggleCategoryMenu}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  border: `1.5px solid ${currentCat.border}`,
                  background: currentCat.bg,
                  color: currentCat.color,
                  fontWeight: 800,
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  transition: 'all 0.15s ease',
                }}
              >
                <span style={{ fontSize: '0.9rem' }}>{currentCat.emoji}</span>
                <span>{currentCat.label}</span>
                <i className={`fa-solid fa-chevron-${isCategoryMenuOpen ? 'down' : 'up'}`} style={{ fontSize: '0.68rem', opacity: 0.75, marginLeft: '2px' }} />
              </button>

              {isCategoryMenuOpen && menuCoords && (
                <>
                  <div
                    onClick={() => setIsCategoryMenuOpen(false)}
                    style={{ position: 'fixed', inset: 0, zIndex: 99998, background: 'transparent' }}
                  />
                  <div
                    style={{
                      position: 'fixed',
                      top: menuCoords.top !== undefined ? `${menuCoords.top}px` : 'auto',
                      bottom: menuCoords.bottom !== undefined ? `${menuCoords.bottom}px` : 'auto',
                      left: `${menuCoords.left}px`,
                      zIndex: 99999,
                      background: '#ffffff',
                      borderRadius: '12px',
                      border: '1px solid #cbd5e1',
                      boxShadow: '0 12px 32px rgba(0,0,0,0.22)',
                      padding: '6px',
                      minWidth: `${menuCoords.width}px`,
                      maxWidth: 'calc(100vw - 20px)',
                      maxHeight: '250px',
                      overflowY: 'auto',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <div style={{ padding: '4px 8px 6px 8px', fontSize: '0.62rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #f1f5f9', marginBottom: '2px' }}>
                      Select Category
                    </div>
                    {CATEGORY_ITEMS.map((item) => {
                      const isActive = item.key === category;
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => {
                            setCategory(item.key);
                            if (item.key === 'GOLD' || item.key === 'SILVER') setTouchPercentage('100');
                            setIsCategoryMenuOpen(false);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: 'none',
                            background: isActive ? item.bg : 'transparent',
                            color: isActive ? item.color : '#334155',
                            fontWeight: isActive ? 800 : 600,
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                            textAlign: 'left',
                            width: '100%',
                            transition: 'background 0.12s ease',
                          }}
                        >
                          <span style={{ fontSize: '1rem' }}>{item.emoji}</span>
                          <span style={{ flex: 1 }}>{item.label}</span>
                          {isActive && <i className="fa-solid fa-check" style={{ color: item.color, fontSize: '0.75rem' }} />}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Dynamic Parameter Inputs (Responsive Layout Grid) */}
          <div className="tx-input-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem', alignItems: 'flex-end', width: '100%' }}>

            {category === 'CHAT' ? (
              <div style={{ flex: '1 1 320px', minWidth: '220px' }}>
                <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#475569', marginBottom: '3px' }}>
                  💬 Text Message <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="Type a message to worker..."
                  value={notes}
                  autoCapitalize="sentences"
                  onChange={(e) => setNotes(toSentenceCase(e.target.value))}
                  required
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '8px',
                    border: '1.5px solid #0284c7',
                    fontSize: '0.82rem',
                    outline: 'none',
                    background: '#ffffff',
                    boxShadow: '0 1px 3px rgba(2,132,199,0.08)',
                  }}
                />
              </div>
            ) : category === 'CASH' ? (
              <>
                <div style={{ flex: '1 1 120px', minWidth: '110px' }}>
                  <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#475569', marginBottom: '3px' }}>
                    Amount (₹) <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="number"
                    placeholder="Amount Cash (₹)..."
                    value={amountCash}
                    onChange={(e) => setAmountCash(e.target.value)}
                    required
                    min="1"
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none' }}
                  />
                </div>

                <div style={{ flex: '1 1 120px', minWidth: '110px' }}>
                  <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#475569', marginBottom: '3px' }}>
                    Purpose <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <select
                    value={cashMetalLink}
                    onChange={(e) => setCashMetalLink(e.target.value as 'FOR_GOLD' | 'FOR_SILVER' | 'GENERAL_CASH')}
                    required
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none', background: '#ffffff', color: '#0f172a', fontWeight: 700 }}
                  >
                    <option value="FOR_GOLD">For Gold</option>
                    <option value="FOR_SILVER">For Silver</option>
                    <option value="GENERAL_CASH">General Cash</option>
                  </select>
                </div>

                {cashMetalLink !== 'GENERAL_CASH' && (
                  <div style={{ flex: '1 1 110px', minWidth: '100px' }}>
                    <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#475569', marginBottom: '3px' }}>
                      Rate per gram <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="number"
                      placeholder="eg 14500"
                      value={appliedRatePerGram}
                      onChange={(e) => setAppliedRatePerGram(e.target.value)}
                      required
                      min="1"
                      style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none' }}
                    />
                  </div>
                )}

                <div style={{ flex: '1.4 1 150px', minWidth: '140px' }}>
                  <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#475569', marginBottom: '3px' }}>
                    🏷️ For Which Item
                  </label>
                  <DropUpCreatableSelect
                    value={itemName}
                    onChange={(v) => setItemName(toSentenceCase(v))}
                    options={itemOptions}
                    placeholder="e.g. Raw Gold, Necklace..."
                  />
                </div>
              </>
            ) : (
              <>
                {/* 1. Metal Weight */}
                <div style={{ flex: '1 1 120px', minWidth: '110px' }}>
                  <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#475569', marginBottom: '3px' }}>
                    {category === 'SILVER' ? '🥈 Silver Weight (g)' : '🥇 Gold Weight (g)'} <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    placeholder="Weight (g)..."
                    value={weightGrams}
                    onChange={(e) => setWeightGrams(e.target.value)}
                    required
                    min="0.001"
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none' }}
                  />
                </div>

                {/* 2. Touch (%) */}
                <div style={{ flex: '1 1 95px', minWidth: '85px' }}>
                  <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#475569', marginBottom: '3px' }}>
                    Touch (%) <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Touch %"
                    value={touchPercentage}
                    onChange={(e) => setTouchPercentage(e.target.value)}
                    required
                    min="0.1"
                    max="100"
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none' }}
                  />
                </div>

                {/* 3. For Which Item (Drop-up from inventory) */}
                <div style={{ flex: '1.4 1 150px', minWidth: '140px' }}>
                  <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#475569', marginBottom: '3px' }}>
                    🏷️ For Which Item <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <DropUpCreatableSelect
                    value={itemName}
                    onChange={(v) => setItemName(toSentenceCase(v))}
                    options={itemOptions}
                    placeholder={category === 'SILVER' ? 'e.g. Raw Silver, Silver Glass...' : 'e.g. Raw Gold, Necklace, Ring...'}
                    required
                  />
                </div>
              </>
            )}

            {/* 4. Notes */}
            {category !== 'CHAT' && (
              <div style={{ flex: '1.5 1 160px', minWidth: '140px' }}>
                <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#475569', marginBottom: '3px' }}>
                  Notes <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="Add notes / purpose..."
                  value={notes}
                  autoCapitalize="sentences"
                  onChange={(e) => setNotes(toSentenceCase(e.target.value))}
                  required
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none' }}
                />
              </div>
            )}

            {/* 5. Photo attachment (optional) & Send Button */}
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexShrink: 0 }}>
              <button
                type="button"
                disabled={isSending}
                onClick={() => fileInputRef.current?.click()}
                title="Attach Photos"
                style={{
                  padding: '0.55rem 0.75rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  color: '#475569',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: isSending ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  opacity: isSending ? 0.6 : 1,
                }}
              >
                <i className="fa-solid fa-camera" style={{ color: '#0284c7' }}></i>
                {photos.length > 0 && <span style={{ background: '#d97706', color: '#fff', borderRadius: '50%', padding: '2px 6px', fontSize: '0.65rem' }}>{photos.length}</span>}
              </button>

              <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={onFileChange} style={{ display: 'none' }} />

              <button
                type="submit"
                disabled={isSending}
                style={{
                  padding: '0.55rem 1.25rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: isSending
                    ? '#94a3b8'
                    : direction === 'OUTGOING'
                      ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'
                      : 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  cursor: isSending ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  opacity: isSending ? 0.85 : 1,
                  boxShadow: isSending
                    ? 'none'
                    : direction === 'OUTGOING'
                      ? '0 2px 8px rgba(234, 88, 12, 0.3)'
                      : '0 2px 8px rgba(2, 132, 199, 0.3)',
                  transition: 'all 0.15s ease',
                }}
              >
                {isSending ? (
                  <>
                    <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: '0.88rem' }}></i>
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-paper-plane"></i>
                    <span>Send</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
