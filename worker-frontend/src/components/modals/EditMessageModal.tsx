import React, { useState, useEffect } from 'react';
import { WorkerTransaction } from '../../types/worker';

interface Props {
  transaction: WorkerTransaction | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (transactionId: string, editPayload: any) => Promise<void>;
}

const toSentenceCase = (str?: string | null): string => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export const EditMessageModal: React.FC<Props> = ({ transaction, isOpen, onClose, onSave }) => {
  const [category, setCategory] = useState<'GOLD' | 'SILVER' | 'CASH' | 'ORNAMENT' | 'CHAT'>('GOLD');
  const [itemName, setItemName] = useState('');
  const [weightGrams, setWeightGrams] = useState('');
  const [touchPercentage, setTouchPercentage] = useState('100');
  const [amountCash, setAmountCash] = useState('');
  const [cashMetalLink, setCashMetalLink] = useState<'FOR_GOLD' | 'FOR_SILVER' | 'GENERAL_CASH'>('GENERAL_CASH');
  const [appliedRatePerGram, setAppliedRatePerGram] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (transaction) {
      setCategory((transaction.category as any) || 'GOLD');
      setItemName(transaction.item_name || '');
      setWeightGrams(transaction.weight_grams ? String(transaction.weight_grams) : '');
      setTouchPercentage(transaction.touch_percentage ? String(transaction.touch_percentage) : '100');
      setAmountCash(transaction.amount_cash ? String(transaction.amount_cash) : '');
      setCashMetalLink((transaction.cash_metal_link as any) || 'GENERAL_CASH');
      setAppliedRatePerGram(transaction.applied_rate_per_gram ? String(transaction.applied_rate_per_gram) : '');
      setNotes(transaction.notes || '');
    }
  }, [transaction]);

  if (!isOpen || !transaction) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSaving(true);
    try {
      const payload: any = {
        category,
        itemName: toSentenceCase(itemName.trim()) || undefined,
        notes: toSentenceCase(notes.trim()),
      };

      if (category === 'GOLD' || category === 'SILVER') {
        payload.weightGrams = weightGrams ? parseFloat(weightGrams) : undefined;
        payload.touchPercentage = touchPercentage ? parseFloat(touchPercentage) : undefined;
      } else if (category === 'CASH') {
        payload.amountCash = amountCash ? parseFloat(amountCash) : undefined;
        payload.cashMetalLink = cashMetalLink;
        payload.appliedRatePerGram = appliedRatePerGram ? parseFloat(appliedRatePerGram) : undefined;
      }

      await onSave(transaction.id, payload);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const calculatedPure =
    (parseFloat(weightGrams || '0') * parseFloat(touchPercentage || '100')) / 100;

  return (
    <div className="wa-modal-overlay" onClick={onClose} style={{ zIndex: 99999 }}>
      <div
        className="wa-dialog-box"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '440px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <h3 className="wa-dialog-title" style={{ margin: 0, fontSize: '0.92rem' }}>
            <i className="fa-solid fa-pen-to-square" style={{ color: '#075e54' }} /> Edit Transaction
          </h3>
          <span style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 700 }}>
            {transaction.direction === 'OUTGOING' ? '↑ Given' : '↓ Returned'}
          </span>
        </div>

        <p className="wa-dialog-desc" style={{ fontSize: '0.68rem', marginBottom: '12px' }}>
          Correct any entered weights, purity %, cash amounts, item names, or notes.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Category Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#475569', marginBottom: '3px' }}>
              Category
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
              {[
                { key: 'GOLD', label: '🥇 Gold', color: '#b45309', bg: '#fef3c7' },
                { key: 'SILVER', label: '🥈 Silver', color: '#475569', bg: '#f1f5f9' },
                { key: 'CASH', label: '💵 Cash', color: '#0369a1', bg: '#e0f2fe' },
              ].map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setCategory(c.key as any)}
                  style={{
                    padding: '6px 4px',
                    borderRadius: '6px',
                    border: category === c.key ? `2px solid ${c.color}` : '1px solid #cbd5e1',
                    background: category === c.key ? c.bg : '#ffffff',
                    color: c.color,
                    fontWeight: 800,
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                  }}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Metal Specific Inputs */}
          {(category === 'GOLD' || category === 'SILVER') && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#475569', marginBottom: '3px' }}>
                    Weight (g) <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    value={weightGrams}
                    onChange={(e) => setWeightGrams(e.target.value)}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.80rem', fontWeight: 700 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#475569', marginBottom: '3px' }}>
                    Touch (%) <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    min="1"
                    max="100"
                    value={touchPercentage}
                    onChange={(e) => setTouchPercentage(e.target.value)}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.80rem', fontWeight: 700 }}
                  />
                </div>
              </div>

              {/* Calculated Pure Weight Pill */}
              <div style={{ background: '#f8fafc', padding: '6px 10px', borderRadius: '6px', border: '1px dashed #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.70rem' }}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Pure Calculated:</span>
                <strong style={{ color: '#15803d', fontWeight: 800 }}>{calculatedPure.toFixed(3)} g</strong>
              </div>

              {/* Item Name */}
              <div>
                <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#475569', marginBottom: '3px' }}>
                  For Which Item / Purpose
                </label>
                <input
                  type="text"
                  placeholder="e.g. Drops, Ring, Raw Gold..."
                  value={itemName}
                  onChange={(e) => setItemName(toSentenceCase(e.target.value))}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.80rem' }}
                />
              </div>
            </>
          )}

          {/* Cash Specific Inputs */}
          {category === 'CASH' && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#475569', marginBottom: '3px' }}>
                  Cash Amount (₹) <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={amountCash}
                  onChange={(e) => setAmountCash(e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.80rem', fontWeight: 700 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#475569', marginBottom: '3px' }}>
                    Cash Link
                  </label>
                  <select
                    value={cashMetalLink}
                    onChange={(e) => setCashMetalLink(e.target.value as any)}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.78rem' }}
                  >
                    <option value="GENERAL_CASH">General Cash</option>
                    <option value="FOR_GOLD">For Gold</option>
                    <option value="FOR_SILVER">For Silver</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#475569', marginBottom: '3px' }}>
                    Applied Rate
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 14500"
                    value={appliedRatePerGram}
                    onChange={(e) => setAppliedRatePerGram(e.target.value)}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.80rem' }}
                  />
                </div>
              </div>
            </>
          )}

          {/* Notes */}
          <div>
            <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#475569', marginBottom: '3px' }}>
              Notes / Description
            </label>
            <textarea
              value={notes}
              autoCapitalize="sentences"
              onChange={(e) => setNotes(toSentenceCase(e.target.value))}
              className="wa-dialog-textarea"
              rows={2}
              placeholder="Type notes..."
              style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.80rem', resize: 'vertical' }}
            />
          </div>

          <div className="wa-dialog-actions" style={{ marginTop: '8px' }}>
            <button type="button" className="wa-btn-cancel" onClick={onClose} disabled={isSaving}>
              Cancel
            </button>
            <button type="submit" className="wa-btn-save" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
