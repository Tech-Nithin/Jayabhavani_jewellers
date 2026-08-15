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
    notes: string;
    photos: File[];
  }) => Promise<void>;
}

export const NewTransactionModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSubmitTransaction,
}) => {
  const [category, setCategory] = useState<TransactionCategory>('GOLD');
  const [itemName, setItemName] = useState('');
  const [weightGrams, setWeightGrams] = useState('');
  const [touchPercentage, setTouchPercentage] = useState('91.6');
  const [amountCash, setAmountCash] = useState('');
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
    setIsSubmitting(true);

    try {
      await onSubmitTransaction({
        category,
        itemName: itemName.trim() || (category === 'GOLD' ? 'Raw Gold Bar' : category === 'SILVER' ? 'Raw Silver Bar' : category === 'CASH' ? 'Cash Transfer' : 'Ornament Item'),
        weightGrams: weightGrams ? parseFloat(weightGrams) : undefined,
        touchPercentage: touchPercentage ? parseFloat(touchPercentage) : undefined,
        amountCash: amountCash ? parseFloat(amountCash) : undefined,
        notes: notes.trim(),
        photos,
      });

      // Reset and close
      setItemName('');
      setWeightGrams('');
      setTouchPercentage('91.6');
      setAmountCash('');
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
    <div className="wa-modal-backdrop" onClick={onClose}>
      <div
        className="wa-dialog-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '460px', width: '92%' }}
      >
        <div className="wa-dialog-header" style={{ marginBottom: '12px' }}>
          <div>
            <h3 className="wa-dialog-title" style={{ fontSize: '1.05rem', margin: 0 }}>
              <i className="fa-solid fa-calculator" style={{ color: '#d97706', marginRight: '6px' }} />
              Add Gold / Silver / Cash Spec
            </h3>
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
              Submit metal specs, weight, touch & notes to Admin
            </span>
          </div>
          <button type="button" className="wa-reply-close-btn" onClick={onClose}>
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Category Selector Tabs */}
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
                    if (cat === 'SILVER') setTouchPercentage('80.0');
                    if (cat === 'GOLD') setTouchPercentage('91.6');
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

          {/* Item Name Input */}
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

          {/* Weight & Touch for Gold / Silver / Ornament */}
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
                  placeholder="91.6"
                  value={touchPercentage}
                  onChange={(e) => setTouchPercentage(e.target.value)}
                  className="wa-dialog-textarea"
                  style={{ height: '36px', padding: '6px 10px', color: '#d97706', fontWeight: 700 }}
                />
              </div>
            </div>
          ) : (
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
