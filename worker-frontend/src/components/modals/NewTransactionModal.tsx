import React, { useState, useEffect } from 'react';
import { TransactionCategory } from '../../types/worker';
import { fetchWorkerAssignedOrders } from '../../services/workerApi';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  workerId?: string;
  onSubmitTransaction: (data: {
    category: TransactionCategory;
    itemName: string;
    orderId?: string | null;
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
  workerId,
  onSubmitTransaction,
}) => {
  const [category, setCategory] = useState<TransactionCategory>('GOLD');
  const [itemName, setItemName] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [customItemName, setCustomItemName] = useState('');
  const [weightGrams, setWeightGrams] = useState('');
  const [touchPercentage, setTouchPercentage] = useState('100');
  const [amountCash, setAmountCash] = useState('');
  const [cashMetalLink, setCashMetalLink] = useState<'FOR_GOLD' | 'FOR_SILVER' | 'GENERAL_CASH'>('FOR_GOLD');
  const [appliedRatePerGram, setAppliedRatePerGram] = useState('');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pending Orders State
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  useEffect(() => {
    if (isOpen && workerId) {
      setIsLoadingOrders(true);
      fetchWorkerAssignedOrders(workerId)
        .then((all) => {
          const pending = all.filter((o: any) => o.returned_from_worker !== 'yes' && o.status !== 'COMPLETED');
          setPendingOrders(pending);
        })
        .finally(() => setIsLoadingOrders(false));
    }
  }, [isOpen, workerId]);

  if (!isOpen) return null;

  const filteredOrders = pendingOrders.filter((o) => {
    const orderMetal = (o.metal_type || 'GOLD').toUpperCase();
    if (category === 'GOLD') return orderMetal === 'GOLD';
    if (category === 'SILVER') return orderMetal === 'SILVER';
    if (category === 'CASH') {
      if (cashMetalLink === 'FOR_GOLD') return orderMetal === 'GOLD';
      if (cashMetalLink === 'FOR_SILVER') return orderMetal === 'SILVER';
    }
    return true;
  });

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

    const finalItemName = selectedOrderId && selectedOrderId !== 'CUSTOM'
      ? (pendingOrders.find((o) => o.id === selectedOrderId)?.item_name || itemName)
      : (customItemName.trim() || itemName.trim());

    if (!finalItemName && category !== 'CASH') {
      alert('⚠️ Please select or specify which order item this is for.');
      return;
    }

    setIsSubmitting(true);

    try {
      const formattedName = toSentenceCase(finalItemName);
      await onSubmitTransaction({
        category,
        itemName: formattedName || (category === 'GOLD' ? 'Raw Gold Bar' : category === 'SILVER' ? 'Raw Silver Bar' : 'Cash Transfer'),
        orderId: selectedOrderId && selectedOrderId !== 'CUSTOM' ? selectedOrderId : null,
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
      setSelectedOrderId('');
      setCustomItemName('');
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
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
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
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.2rem' }}>⚡</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800 }}>New Transaction Entry</h3>
              <p style={{ margin: 0, fontSize: '0.68rem', color: '#94a3b8' }}>Return order item or transfer cash</p>
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
          {/* Category Selector (Gold, Silver, Cash only) */}
          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
              Select Category
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
              {[
                { key: 'GOLD' as TransactionCategory, label: 'Gold', emoji: '🥇', color: '#92400e', bg: '#fef3c7', border: '#d97706' },
                { key: 'SILVER' as TransactionCategory, label: 'Silver', emoji: '🥈', color: '#1e293b', bg: '#f1f5f9', border: '#64748b' },
                { key: 'CASH' as TransactionCategory, label: 'Cash', emoji: '💵', color: '#15803d', bg: '#dcfce7', border: '#16a34a' },
              ].map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => {
                    setCategory(cat.key);
                    setSelectedOrderId('');
                    setItemName('');
                    setCustomItemName('');
                    if (cat.key === 'SILVER' || cat.key === 'GOLD') setTouchPercentage('100');
                  }}
                  style={{
                    padding: '8px 4px',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    borderRadius: '8px',
                    border: category === cat.key ? `2px solid ${cat.border}` : '1px solid #cbd5e1',
                    background: category === cat.key ? cat.bg : '#ffffff',
                    color: category === cat.key ? cat.color : '#475569',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                  }}
                >
                  <span>{cat.emoji}</span> {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* For Which Item (Assigned Pending Orders Dropdown) */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#334155' }}>
                🏷️ For Which Item (Assigned Order) <span style={{ color: '#dc2626' }}>*</span>
              </label>
              {isLoadingOrders && (
                <span style={{ fontSize: '0.62rem', color: '#0284c7', fontWeight: 600 }}>Loading orders...</span>
              )}
            </div>

            {filteredOrders.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <select
                  value={selectedOrderId}
                  onChange={(e) => {
                    const ordId = e.target.value;
                    setSelectedOrderId(ordId);
                    if (ordId && ordId !== 'CUSTOM') {
                      const found = pendingOrders.find((o) => o.id === ordId);
                      if (found) {
                        setItemName(found.item_name);
                        if (found.gross_weight_grams && !weightGrams) {
                          setWeightGrams(String(found.gross_weight_grams));
                        }
                        if (found.touch_percentage) {
                          setTouchPercentage(String(found.touch_percentage));
                        }
                      }
                    } else if (ordId === 'CUSTOM') {
                      setItemName('');
                    } else {
                      setItemName('');
                    }
                  }}
                  className="wa-dialog-textarea"
                  style={{ height: '38px', padding: '6px 10px', fontWeight: 700, fontSize: '0.78rem' }}
                  required={category !== 'CASH'}
                >
                  <option value="">-- Select Pending Assigned Order --</option>
                  {filteredOrders.map((ord) => (
                    <option key={ord.id} value={ord.id}>
                      {ord.item_name} ({ord.gross_weight_grams || 0}g - {ord.customer_name})
                    </option>
                  ))}
                  <option value="CUSTOM">➕ Other / Custom Item</option>
                </select>

                {selectedOrderId === 'CUSTOM' && (
                  <input
                    type="text"
                    placeholder="Enter custom item name..."
                    value={customItemName}
                    onChange={(e) => setCustomItemName(e.target.value)}
                    className="wa-dialog-textarea"
                    style={{ height: '36px', padding: '6px 10px', fontSize: '0.80rem' }}
                    required
                  />
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <input
                  type="text"
                  placeholder={category === 'GOLD' ? 'e.g. Raw Gold, Pusthela Thadu' : category === 'SILVER' ? 'e.g. Raw Silver, Pattilu' : 'e.g. General Cash / Order Item'}
                  value={customItemName || itemName}
                  onChange={(e) => {
                    setCustomItemName(e.target.value);
                    setItemName(e.target.value);
                  }}
                  className="wa-dialog-textarea"
                  style={{ height: '36px', padding: '6px 10px', fontSize: '0.80rem' }}
                  required={category !== 'CASH'}
                />
                <span style={{ fontSize: '0.62rem', color: '#64748b' }}>
                  No pending {category.toLowerCase()} orders found assigned to you. You can type an item name.
                </span>
              </div>
            )}
          </div>

          {/* Metal Weight & Touch Inputs */}
          {category !== 'CASH' ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '3px' }}>
                  {category === 'GOLD' ? '🥇 Gold' : '🥈 Silver'} Weight (g) *
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
                      padding: '6px 2px',
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
                      padding: '6px 2px',
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
                      padding: '6px 2px',
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
                    Rate per Gram (₹) *
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 7200"
                    value={appliedRatePerGram}
                    onChange={(e) => setAppliedRatePerGram(e.target.value)}
                    className="wa-dialog-textarea"
                    style={{ height: '36px', padding: '6px 10px', color: '#1e293b', fontWeight: 700 }}
                    required
                  />
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '3px' }}>
              Notes / Work Details (Optional)
            </label>
            <textarea
              placeholder="e.g. Returned with polish complete, scrap dust remaining..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="wa-dialog-textarea"
              rows={2}
              style={{ padding: '6px 10px', fontSize: '0.80rem' }}
            />
          </div>

          {/* Photo Uploads */}
          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '3px' }}>
              Attach Photos (Optional)
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  background: '#f1f5f9',
                  border: '1px dashed #94a3b8',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#475569',
                }}
              >
                <i className="fa-solid fa-camera" /> Add Photo
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoSelect}
                  style={{ display: 'none' }}
                />
              </label>

              {previews.map((url, idx) => (
                <div key={idx} style={{ position: 'relative', width: '40px', height: '40px' }}>
                  <img
                    src={url}
                    alt="preview"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(idx)}
                    style={{
                      position: 'absolute',
                      top: '-4px',
                      right: '-4px',
                      background: '#ef4444',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '50%',
                      width: '16px',
                      height: '16px',
                      fontSize: '0.55rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Submit Action Buttons */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '9px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#f8fafc',
                color: '#475569',
                fontWeight: 700,
                fontSize: '0.80rem',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                flex: 2,
                padding: '9px 14px',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.82rem',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.7 : 1,
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
              }}
            >
              {isSubmitting ? 'Recording...' : 'Send Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
