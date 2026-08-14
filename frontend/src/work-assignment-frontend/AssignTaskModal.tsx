import React, { useState, useEffect } from 'react';
import { getWorkAssignmentTranslation, type Language } from './workAssignmentTranslations';

interface AssignTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: {
    weight?: number;
    purity?: number;
    invoiceId?: string | number;
  } | null;
  onSubmit: (formData: {
    workerName: string;
    itemWeight: number;
    itemPurity: number;
    mode: 'METAL' | 'CASH';
    invoiceId?: string | number;
  }) => Promise<void>;
  lang?: Language;
}

export const AssignTaskModal: React.FC<AssignTaskModalProps> = ({
  isOpen,
  onClose,
  initialData,
  onSubmit,
  lang = 'EN',
}) => {
  const t = getWorkAssignmentTranslation(lang);
  const [workerName, setWorkerName] = useState('');
  const [itemWeight, setItemWeight] = useState(0);
  const [itemPurity, setItemPurity] = useState(91.6); // Default 22K (91.6%)
  const [mode, setMode] = useState<'METAL' | 'CASH'>('METAL');
  const [submitting, setSubmitting] = useState(false);

  // Sync modal values with pre-populated row data when opened
  useEffect(() => {
    if (isOpen && initialData) {
      setItemWeight(initialData.weight || 0);
      setItemPurity(initialData.purity || 91.6);
      setWorkerName('');
      setMode('METAL');
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workerName.trim()) {
      alert('Please enter a worker name.');
      return;
    }
    if (itemWeight <= 0) {
      alert('Please enter a valid item weight.');
      return;
    }
    if (itemPurity <= 0 || itemPurity > 100) {
      alert('Item purity must be between 1% and 100%.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        workerName: workerName.trim(),
        itemWeight,
        itemPurity,
        mode,
        invoiceId: initialData?.invoiceId,
      });
      onClose();
    } catch (err) {
      console.error('Error submitting assignment:', err);
      alert('Failed to submit assignment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Overlay Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(24, 19, 16, 0.65)',
          backdropFilter: 'blur(6px)',
          zIndex: 990,
          transition: 'opacity 0.2s ease',
        }}
      />

      {/* Dialog box wrapper */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '100%',
          maxWidth: '430px',
          background: '#ffffff',
          borderRadius: '18px',
          border: '1px solid #e6decb',
          boxShadow: '0 24px 48px -12px rgba(24, 19, 16, 0.25)',
          padding: '1.5rem',
          zIndex: 1000,
          fontFamily: "'Inter', sans-serif",
          color: '#181310',
        }}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#181310', margin: 0, letterSpacing: '-0.3px' }}>
            <i className="fa-solid fa-clipboard-user" style={{ color: '#d97706', marginRight: '8px' }}></i>
            {t.addWorkerTitle}
          </h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.1rem', cursor: 'pointer', padding: '4px' }}
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          {/* Field 1: Worker/Artisan Name */}
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#4a3e35', display: 'block', marginBottom: '6px' }}>
              Worker Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Satish Chari / Veera Chari"
              value={workerName}
              onChange={(e) => setWorkerName(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                fontSize: '0.88rem',
                outline: 'none',
                background: '#ffffff',
                color: '#1e293b',
              }}
              required
            />
          </div>

          {/* Field 2 & 3: Weight and Purity (Grid) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#4a3e35', display: 'block', marginBottom: '6px' }}>
                Item Weight (g) *
              </label>
              <input
                type="number"
                step="0.001"
                min="0.001"
                value={itemWeight || ''}
                onChange={(e) => setItemWeight(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.88rem',
                  outline: 'none',
                  background: '#ffffff',
                  color: '#1e293b',
                }}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#4a3e35', display: 'block', marginBottom: '6px' }}>
                Item Purity (%) *
              </label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="100"
                value={itemPurity || ''}
                onChange={(e) => setItemPurity(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.88rem',
                  outline: 'none',
                  background: '#ffffff',
                  color: '#1e293b',
                }}
                required
              />
            </div>
          </div>

          {/* Field 4: Segmented Toggle Switch (Metal vs Cash) */}
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#4a3e35', display: 'block', marginBottom: '6px' }}>
              Compensation Mode
            </label>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '4px',
              }}
            >
              <button
                type="button"
                onClick={() => setMode('METAL')}
                style={{
                  padding: '8px 0',
                  border: 'none',
                  borderRadius: '7px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: mode === 'METAL' ? 'linear-gradient(135deg, #d99b26 0%, #b45309 100%)' : 'transparent',
                  color: mode === 'METAL' ? '#ffffff' : '#64748b',
                  transition: 'all 0.15s ease',
                }}
              >
                <i className="fa-solid fa-gem" style={{ marginRight: '6px' }}></i>
                Metal
              </button>
              <button
                type="button"
                onClick={() => setMode('CASH')}
                style={{
                  padding: '8px 0',
                  border: 'none',
                  borderRadius: '7px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: mode === 'CASH' ? 'linear-gradient(135deg, #d99b26 0%, #b45309 100%)' : 'transparent',
                  color: mode === 'CASH' ? '#ffffff' : '#64748b',
                  transition: 'all 0.15s ease',
                }}
              >
                <i className="fa-solid fa-money-bill-wave" style={{ marginRight: '6px' }}></i>
                Cash
              </button>
            </div>
          </div>

          {/* Modal Action Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#475569',
                fontWeight: 700,
                fontSize: '0.84rem',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                flex: 1.2,
                padding: '10px',
                background: 'linear-gradient(135deg, #d99b26 0%, #b45309 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '0.84rem',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(180, 83, 9, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              {submitting ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i> Saving...
                </>
              ) : (
                <>Assign Task</>
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};
