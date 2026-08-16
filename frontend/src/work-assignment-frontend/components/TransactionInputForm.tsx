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
  category: 'GOLD' | 'SILVER' | 'CASH' | 'ORNAMENT' | 'CHAT';
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
  isSending: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  toSentenceCase: (str?: string | null) => string;
}

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
  isSending,
  fileInputRef,
  onFileChange,
  onSubmit,
  toSentenceCase,
}) => {
  return (
    <div style={{ background: '#ffffff', borderTop: '1px solid #cbd5e1' }}>
      <div
        onClick={() => setIsAccordionExpanded(!isAccordionExpanded)}
        style={{
          padding: '0.55rem 1.25rem',
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
          <i className="fa-solid fa-square-plus" style={{ color: '#075e54', fontSize: '0.95rem' }}></i>
          <span style={{ fontWeight: 800, fontSize: '0.82rem', color: '#0f172a' }}>
            {isAccordionExpanded ? 'New Transaction & Live Preview Panel' : 'Add New Transaction / Record (Click to Expand Form)'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>
            {isAccordionExpanded ? 'Collapse Form (View Full Chat)' : 'Expand Form'}
          </span>
          <i className={`fa-solid fa-chevron-${isAccordionExpanded ? 'down' : 'up'}`} style={{ color: '#075e54', fontSize: '0.85rem' }}></i>
        </div>
      </div>

      {isAccordionExpanded && (
        <form onSubmit={onSubmit} style={{ padding: '0.85rem 1.25rem' }}>

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
            <div className="worker-chat-live-preview" style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '12px', border: '1px dashed #0284c7', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <i className="fa-solid fa-eye"></i> Live Message Preview ({direction === 'OUTGOING' ? 'Sending to Worker' : 'Receiving from Worker'})
                </span>
                <button
                  type="button"
                  onClick={onToggleMessagePreview}
                  style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.68rem', fontWeight: 700 }}
                  title="Click to hide message preview"
                >
                  <i className="fa-solid fa-eye-slash"></i> Disable Preview
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: direction === 'OUTGOING' ? 'flex-end' : 'flex-start' }}>
                <div style={{ width: '85%', maxWidth: '420px', background: '#ffffff', borderRadius: '12px', padding: '10px', border: '1px solid #cbd5e1', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '2px 8px', borderRadius: '8px', background: direction === 'OUTGOING' ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' : '#0284c7', color: '#fff', textTransform: 'uppercase' }}>
                      {direction === 'OUTGOING' ? 'OUTGOING (STORE → WORKER)' : 'INCOMING (WORKER → STORE)'}
                    </span>
                    <span style={{ fontSize: '0.62rem', color: '#64748b' }}>Now</span>
                  </div>

                  {photos && photos.length > 0 && !amountCash && !weightGrams ? (
                    <div style={{ margin: '4px 0', padding: '6px 10px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                      <div style={{ fontSize: '0.65rem', color: '#0284c7', fontWeight: 800, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <i className="fa-solid fa-camera" style={{ color: '#0284c7' }}></i> PHOTO ATTACHMENT
                      </div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', margin: '2px 0' }}>
                        {toSentenceCase(itemName.trim()) || 'Photo Attachment'}
                      </div>
                    </div>
                  ) : category === 'CASH' ? (
                    <div style={{ margin: '4px 0', padding: '6px 10px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                      <div style={{ fontSize: '0.65rem', color: '#166534', fontWeight: 800, display: 'flex', justifyContent: 'space-between' }}>
                        <span>CASH PAYMENT</span>
                        <span style={{ fontSize: '0.60rem', color: '#15803d' }}>
                          {cashMetalLink === 'FOR_GOLD' ? '🥇 For Gold' : cashMetalLink === 'FOR_SILVER' ? '🥈 For Silver' : '💵 General'}
                        </span>
                      </div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#15803d' }}>
                        💵 ₹{amountCash ? Number(amountCash).toLocaleString('en-IN') : '0'}
                      </div>
                      {Number(amountCash) > 0 && Number(appliedRatePerGram) > 0 && (
                        <div style={{ marginTop: '3px', fontSize: '0.68rem', background: '#ffffff', padding: '3px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between' }}>
                          <span>Rate: ₹{Number(appliedRatePerGram).toLocaleString('en-IN')}/g</span>
                          <strong style={{ color: '#15803d' }}>Eq: {(Number(amountCash) / Number(appliedRatePerGram)).toFixed(3)} g</strong>
                        </div>
                      )}
                    </div>
                  ) : Number(weightGrams) > 0 ? (
                    <div style={{ margin: '4px 0', padding: '6px 10px', background: category === 'GOLD' ? '#fffbe8' : category === 'SILVER' ? '#f8fafc' : '#f0f9ff', borderRadius: '8px', border: category === 'GOLD' ? '1px solid #fde68a' : category === 'SILVER' ? '1px solid #cbd5e1' : '1px solid #bae6fd' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
                        {category === 'GOLD' ? '🥇' : category === 'SILVER' ? '🥈' : '👑'}{' '}
                        {toSentenceCase(itemName.trim()) || (category === 'GOLD' ? 'Raw Gold Bar' : category === 'SILVER' ? 'Raw Silver Bar' : 'Ornament Item')}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: '4px', fontSize: '0.72rem', background: '#ffffff', padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                        <div>
                          <span style={{ color: '#64748b', display: 'block', fontSize: '0.62rem', fontWeight: 700 }}>GROSS WT</span>
                          <strong>{weightGrams ? Number(weightGrams).toFixed(3) : '0.000'} g</strong>
                        </div>
                        <div>
                          <span style={{ color: '#64748b', display: 'block', fontSize: '0.62rem', fontWeight: 700 }}>TOUCH %</span>
                          <strong>{touchPercentage || '100'}%</strong>
                        </div>
                        <div>
                          <span style={{ color: '#64748b', display: 'block', fontSize: '0.62rem', fontWeight: 700 }}>100% PURE FINE</span>
                          <strong style={{ color: '#15803d' }}>
                            {Number((Number(weightGrams) || 0) * (Number(touchPercentage) || 100.0) / 100).toFixed(3)} g
                          </strong>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {notes && (
                    <div style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 600, marginTop: '2px', wordBreak: 'break-word' }}>
                      {notes}
                    </div>
                  )}

                  {photos && photos.length > 0 && (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                      {photos.map((url, idx) => (
                        <div key={idx} style={{ position: 'relative', display: 'inline-block' }}>
                          <img
                            src={url}
                            alt="Selected Photo Preview"
                            style={{ width: '56px', height: '56px', borderRadius: '8px', objectFit: 'cover', border: '1.5px solid #0284c7', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setPhotos((prev) => prev.filter((_, i) => i !== idx));
                              setPhotoFiles((prev) => prev.filter((_, i) => i !== idx));
                            }}
                            style={{
                              position: 'absolute',
                              top: '-5px',
                              right: '-5px',
                              background: '#dc2626',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '50%',
                              width: '18px',
                              height: '18px',
                              fontSize: '0.65rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
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
          <div style={{ display: 'flex', gap: '0.65rem', marginBottom: '0.65rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', background: '#f1f5f9', padding: '2px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
              <button
                type="button"
                onClick={() => setDirection('OUTGOING')}
                style={{ padding: '5px 12px', borderRadius: '6px', border: 'none', background: direction === 'OUTGOING' ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' : 'transparent', color: direction === 'OUTGOING' ? '#fff' : '#475569', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}
              >
                📤 Outgoing (Send)
              </button>
              <button
                type="button"
                onClick={() => setDirection('INCOMING')}
                style={{ padding: '5px 12px', borderRadius: '6px', border: 'none', background: direction === 'INCOMING' ? '#0284c7' : 'transparent', color: direction === 'INCOMING' ? '#fff' : '#475569', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}
              >
                📥 Incoming (Receive)
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <select
                value={category}
                onChange={(e) => {
                  const cat = e.target.value as 'GOLD' | 'SILVER' | 'CASH' | 'ORNAMENT' | 'CHAT';
                  setCategory(cat);
                  if (cat === 'GOLD' || cat === 'SILVER' || cat === 'ORNAMENT') setTouchPercentage('100');
                }}
                style={{
                  padding: '5px 10px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#0f172a',
                  fontWeight: 800,
                  fontSize: '0.78rem',
                  outline: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                <option value="GOLD">🥇 Gold</option>
                <option value="SILVER">🥈 Silver</option>
                <option value="CASH">💵 Cash</option>
                <option value="ORNAMENT">👑 Ornament</option>
                <option value="CHAT">💬 Plain Message</option>
              </select>
            </div>
          </div>

          {/* Dynamic Parameter Inputs */}
          <div style={{ display: 'grid', gridTemplateColumns: category === 'CHAT' ? '1fr auto' : category === 'CASH' ? '1.2fr 1.4fr 1.2fr 1.5fr auto' : '1.2fr 1fr 1fr 1.5fr auto', gap: '0.65rem', alignItems: 'flex-end' }}>

            {category === 'CHAT' ? null : category === 'CASH' ? (
              <>
                <div>
                  <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#475569', marginBottom: '3px' }}>
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    placeholder="Amount Cash (₹)..."
                    value={amountCash}
                    onChange={(e) => setAmountCash(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#475569', marginBottom: '3px' }}>
                    Purpose
                  </label>
                  <select
                    value={cashMetalLink}
                    onChange={(e) => setCashMetalLink(e.target.value as 'FOR_GOLD' | 'FOR_SILVER' | 'GENERAL_CASH')}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none', background: '#ffffff', color: '#0f172a', fontWeight: 700 }}
                  >
                    <option value="FOR_GOLD">For Gold</option>
                    <option value="FOR_SILVER">For Silver</option>
                    <option value="GENERAL_CASH">General Cash</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#475569', marginBottom: '3px' }}>
                    Rate per grm
                  </label>
                  <input
                    type="number"
                    placeholder="eg 14500"
                    value={appliedRatePerGram}
                    onChange={(e) => setAppliedRatePerGram(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none' }}
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#475569', marginBottom: '3px' }}>
                    🏷️ Item Name
                  </label>
                  <input
                    type="text"
                    placeholder={category === 'ORNAMENT' ? 'Ornament Name...' : 'Gold Item...'}
                    value={itemName}
                    autoCapitalize="sentences"
                    onChange={(e) => setItemName(toSentenceCase(e.target.value))}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#475569', marginBottom: '3px' }}>
                    Weight
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    placeholder="Weight (g)..."
                    value={weightGrams}
                    onChange={(e) => setWeightGrams(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#475569', marginBottom: '3px' }}>
                    Touch (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Touch %"
                    value={touchPercentage}
                    onChange={(e) => setTouchPercentage(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none' }}
                  />
                </div>
              </>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#475569', marginBottom: '3px' }}>
                Notes
              </label>
              <input
                type="text"
                placeholder="Add notes..."
                value={notes}
                autoCapitalize="sentences"
                onChange={(e) => setNotes(toSentenceCase(e.target.value))}
                style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none' }}
              />
            </div>

            {/* Photo attachment & Send Button */}
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
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
