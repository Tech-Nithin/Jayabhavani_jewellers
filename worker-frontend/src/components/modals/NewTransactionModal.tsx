import React, { useState } from 'react';
import { TransactionCategory } from '../../types/worker';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmitTransaction: (data: {
    category: TransactionCategory;
    itemName: string;
    weightGrams?: number;
    touchPercentage?: number;
    amountCash?: number;
    cashMetalLink?: 'FOR_GOLD' | 'FOR_SILVER' | 'GENERAL_CASH';
    appliedRatePerGram?: number;
    notes: string;
    photos: File[];
  }) => Promise<void>;
}

const toSentenceCase = (str?: string | null): string => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export const NewTransactionModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSubmitTransaction,
}) => {
  const [category, setCategory] = useState<TransactionCategory>('GOLD');
  const [itemName, setItemName] = useState('');
  const [weightGrams, setWeightGrams] = useState('');
  const [touchPercentage, setTouchPercentage] = useState('100');
  const [amountCash, setAmountCash] = useState('');
  const [cashMetalLink, setCashMetalLink] = useState<'FOR_GOLD' | 'FOR_SILVER' | 'GENERAL_CASH'>('FOR_GOLD');
  const [appliedRatePerGram, setAppliedRatePerGram] = useState('');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      setPhotos((prev) => [...prev, ...selectedFiles]);

      const newPreviews = selectedFiles.map((file) => URL.createObjectURL(file));
      setPreviews((prev) => [...prev, ...newPreviews]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (category === 'CASH' && cashMetalLink !== 'GENERAL_CASH' && !appliedRatePerGram) {
      alert(`⚠️ Mandatory Field: Please enter the Rate per Gram (₹) for ${cashMetalLink === 'FOR_GOLD' ? 'Gold' : 'Silver'} purpose.`);
      return;
    }

    setIsSubmitting(true);

    try {
      const formattedName = toSentenceCase(itemName.trim());
      await onSubmitTransaction({
        category,
        itemName: formattedName || (category === 'GOLD' ? 'Raw Gold Bar' : category === 'SILVER' ? 'Raw Silver Bar' : category === 'CASH' ? 'Cash Transfer' : 'Ornament Item'),
        weightGrams: weightGrams ? parseFloat(weightGrams) : undefined,
        touchPercentage: touchPercentage ? parseFloat(touchPercentage) : undefined,
        amountCash: amountCash ? parseFloat(amountCash) : undefined,
        cashMetalLink: category === 'CASH' ? cashMetalLink : undefined,
        appliedRatePerGram: category === 'CASH' && appliedRatePerGram ? parseFloat(appliedRatePerGram) : undefined,
        notes: toSentenceCase(notes.trim()),
        photos,
      });

      // Reset and close
      setItemName('');
      setWeightGrams('');
      setTouchPercentage('100');
      setAmountCash('');
      setCashMetalLink('FOR_GOLD');
      setAppliedRatePerGram('');
      setNotes('');
      setPhotos([]);
      setPreviews([]);
      onClose();
    } catch (err: any) {
      alert(`Failed to save transaction: ${err.message || 'Error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '440px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out',
        }}
      >
        <div
          style={{
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: '#ffffff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.2rem' }}>⚡</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800 }}>New Transaction Entry</h3>
              <p style={{ margin: 0, fontSize: '0.68rem', color: '#94a3b8' }}>Record work assignment item or cash</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              color: '#ffffff',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              cursor: 'pointer',
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px' }}>
          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
              Select Category
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '6px' }}>
              {(['GOLD', 'SILVER', 'CASH', 'ORNAMENT'] as TransactionCategory[]).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setCategory(cat);
                    if (cat === 'SILVER' || cat === 'GOLD' || cat === 'ORNAMENT') setTouchPercentage('100');
                  }}
                  style={{
                    padding: '6px 4px',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    borderRadius: '6px',
                    border: category === cat ? '2px solid #d97706' : '1px solid #cbd5e1',
                    background: category === cat ? '#fef3c7' : '#ffffff',
                    color: category === cat ? '#92400e' : '#475569',
                    cursor: 'pointer',
                  }}
                >
                  {cat === 'GOLD' ? '🥇 Gold' : cat === 'SILVER' ? '🥈 Silver' : cat === 'CASH' ? '🏅 Cash' : '👑 Item'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '3px' }}>
              Item Name / Description
            </label>
            <input
              type="text"
              placeholder={category === 'GOLD' ? 'e.g. Bank Metal, Pusthela Thadu' : category === 'SILVER' ? 'e.g. Silver Pattilu' : 'e.g. Cash Deposit'}
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              className="wa-dialog-textarea"
              style={{ height: '36px', padding: '6px 10px' }}
            />
          </div>

          {category !== 'CASH' ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '3px' }}>
                  Gross Weight (g) *
                </label>
                <input
                  type="number"
                  step="0.001"
                  placeholder="0.000"
                  value={weightGrams}
                  onChange={(e) => setWeightGrams(e.target.value)}
                  className="wa-dialog-textarea"
                  style={{ height: '36px', padding: '6px 10px', fontWeight: 700 }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '3px' }}>
                  Touch % (Purity)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="100"
                  value={touchPercentage}
                  onChange={(e) => setTouchPercentage(e.target.value)}
                  className="wa-dialog-textarea"
                  style={{ height: '36px', padding: '6px 10px', color: '#d97706', fontWeight: 700 }}
                />
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '3px' }}>
                  Cash Amount (₹) *
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={amountCash}
                  onChange={(e) => setAmountCash(e.target.value)}
                  className="wa-dialog-textarea"
                  style={{ height: '36px', padding: '6px 10px', color: '#15803d', fontWeight: 700 }}
                  required
                />
              </div>

              {/* Purpose Selector Tabs */}
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '3px' }}>
                  Cash Purpose / Metal Link *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setCashMetalLink('FOR_GOLD')}
                    style={{
                      padding: '5px 2px',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      borderRadius: '6px',
                      border: cashMetalLink === 'FOR_GOLD' ? '2px solid #d97706' : '1px solid #cbd5e1',
                      background: cashMetalLink === 'FOR_GOLD' ? '#fef3c7' : '#ffffff',
                      color: cashMetalLink === 'FOR_GOLD' ? '#92400e' : '#475569',
                      cursor: 'pointer',
                    }}
                  >
                    🥇 For Gold
                  </button>

                  <button
                    type="button"
                    onClick={() => setCashMetalLink('FOR_SILVER')}
                    style={{
                      padding: '5px 2px',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      borderRadius: '6px',
                      border: cashMetalLink === 'FOR_SILVER' ? '2px solid #475569' : '1px solid #cbd5e1',
                      background: cashMetalLink === 'FOR_SILVER' ? '#f1f5f9' : '#ffffff',
                      color: cashMetalLink === 'FOR_SILVER' ? '#1e293b' : '#475569',
                      cursor: 'pointer',
                    }}
                  >
                    🥈 For Silver
                  </button>

                  <button
                    type="button"
                    onClick={() => setCashMetalLink('GENERAL_CASH')}
                    style={{
                      padding: '5px 2px',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      borderRadius: '6px',
                      border: cashMetalLink === 'GENERAL_CASH' ? '2px solid #16a34a' : '1px solid #cbd5e1',
                      background: cashMetalLink === 'GENERAL_CASH' ? '#dcfce7' : '#ffffff',
                      color: cashMetalLink === 'GENERAL_CASH' ? '#15803d' : '#475569',
                      cursor: 'pointer',
                    }}
                  >
                    💵 General Cash
                  </button>
                </div>
              </div>

              {cashMetalLink !== 'GENERAL_CASH' && (
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '3px' }}>
                    {cashMetalLink === 'FOR_GOLD' ? 'Gold Rate per Gram (₹) *' : 'Silver Rate per Gram (₹) *'}
                  </label>
                  <input
                    type="number"
                    placeholder={cashMetalLink === 'FOR_GOLD' ? 'e.g. 7200' : 'e.g. 95'}
                    value={appliedRatePerGram}
                    onChange={(e) => setAppliedRatePerGram(e.target.value)}
                    className="wa-dialog-textarea"
                    style={{ height: '36px', padding: '6px 10px', color: '#d97706', fontWeight: 700 }}
                    required
                  />
                </div>
              )}
            </div>
          )}

          {/* Notes / Comments */}
          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '3px' }}>
              Notes / Instructions
            </label>
            <textarea
              rows={2}
              placeholder="e.g. 92 Touch 30 Grams Pusthela Thadu Completed"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="wa-dialog-textarea"
            />
          </div>

          {/* Photo Upload Attachment */}
          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '3px' }}>
              Attach Photos (Optional)
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoSelect}
              style={{ fontSize: '0.75rem', width: '100%' }}
            />
            {previews.length > 0 && (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                {previews.map((src, i) => (
                  <div key={i} style={{ position: 'relative' }}>
                    <img
                      src={src}
                      alt="Preview"
                      style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      style={{
                        position: 'absolute',
                        top: '-4px',
                        right: '-4px',
                        background: '#dc2626',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '50%',
                        width: '16px',
                        height: '16px',
                        fontSize: '0.6rem',
                        cursor: 'pointer',
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="wa-dialog-actions" style={{ marginTop: '8px' }}>
            <button type="button" className="wa-btn-cancel" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="wa-btn-save" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin" /> Saving...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-paper-plane" /> Send Spec Card
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
