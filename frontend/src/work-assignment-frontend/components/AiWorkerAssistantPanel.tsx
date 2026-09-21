import React, { useState } from 'react';
import { API_BASE } from '../../config/apiConfig';
import { type Language } from '../../utils/translations';
import { playJbjNotificationSound } from '../../utils/soundUtils';

interface AiWorkerAssistantPanelProps {
  isOpen: boolean;
  onClose: () => void;
  activeWorker: any;
  workers?: any[];
  onSelectWorker?: (worker: any) => void;
  onTransactionSuccess?: (newTx: any) => void;
  lang?: Language;
}

export const AiWorkerAssistantPanel: React.FC<AiWorkerAssistantPanelProps> = ({
  isOpen,
  onClose,
  activeWorker,
  workers = [],
  onSelectWorker,
  onTransactionSuccess,
}) => {
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>(activeWorker?.id || '');
  const [direction, setDirection] = useState<'OUTGOING' | 'INCOMING'>('OUTGOING'); // OUT = Admin to Worker, IN = Worker to Admin
  const [amount, setAmount] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Sync selected worker when activeWorker changes
  React.useEffect(() => {
    if (activeWorker?.id) {
      setSelectedWorkerId(activeWorker.id);
    }
  }, [activeWorker?.id]);

  if (!isOpen) return null;

  const currentTargetWorker = workers.find((w) => String(w.id) === String(selectedWorkerId)) || activeWorker;

  const handleQuickAddAmount = (addValue: number) => {
    const current = parseFloat(amount) || 0;
    setAmount(String(current + addValue));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setErrorMessage('Please enter a valid cash amount greater than 0.');
      return;
    }

    if (!selectedWorkerId) {
      setErrorMessage('Please select a target worker.');
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('worker_id', String(selectedWorkerId));
      formData.append('direction', direction);
      formData.append('category', 'CASH');
      formData.append('amount_cash', String(numericAmount));
      formData.append('notes', notes.trim());

      const res = await fetch(`${API_BASE}/work-assignment/worker-transactions`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (data.success && data.transaction) {
        const newTx = { ...data.transaction, status_state: 'DELIVERED' };

        // 1. Play sound
        playJbjNotificationSound();

        // 2. Broadcast local chat message event so chat feed inserts it instantly
        window.dispatchEvent(
          new CustomEvent('jbj_chat_message_sent', {
            detail: newTx,
          })
        );

        // 3. Callback parent if provided
        if (onTransactionSuccess) {
          onTransactionSuccess(newTx);
        }

        // 4. Success feedback in panel & reset form
        setSuccessMessage(`₹${numericAmount.toLocaleString('en-IN')} ${direction === 'OUTGOING' ? 'given to' : 'received from'} ${currentTargetWorker?.name || 'Worker'} successfully!`);
        setAmount('');
        setNotes('');

        // Auto-clear success message after 4 seconds
        setTimeout(() => {
          setSuccessMessage(null);
        }, 4000);
      } else {
        setErrorMessage(data.message || 'Failed to submit transaction.');
      }
    } catch (err: any) {
      console.error('AI Panel Transaction Error:', err);
      setErrorMessage(err?.message || 'Network error while recording transaction.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        width: '340px',
        maxWidth: '90vw',
        background: '#ffffff',
        borderLeft: '1px solid #cbd5e1',
        boxShadow: '-10px 0 30px rgba(0, 0, 0, 0.12)',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        animation: 'slideInRight 0.22s ease-out',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* ── HEADER: Admin Badge & Close Button ── */}
      <div
        style={{
          padding: '0.85rem 1.1rem',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #334155',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #a855f7 0%, #8b5cf6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.85rem',
              color: '#ffffff',
              boxShadow: '0 2px 8px rgba(168, 85, 247, 0.4)',
            }}
          >
            <i className="fa-solid fa-wand-magic-sparkles"></i>
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 800, letterSpacing: '0.02em', display: 'flex', alignItems: 'center', gap: '6px' }}>
              AI Quick Assistant
              <span
                style={{
                  fontSize: '0.625rem',
                  fontWeight: 800,
                  background: 'rgba(217, 119, 6, 0.25)',
                  color: '#fbbf24',
                  padding: '1px 6px',
                  borderRadius: '4px',
                  border: '1px solid rgba(251, 191, 36, 0.4)',
                  textTransform: 'uppercase',
                }}
              >
                ADMIN
              </span>
            </div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
              Fast Worker Cash Entry
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            color: '#cbd5e1',
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.9rem',
          }}
          title="Close Panel"
        >
          <i className="fa-solid fa-xmark"></i>
        </button>
      </div>

      {/* ── FORM CONTAINER ── */}
      <form
        onSubmit={handleSubmit}
        style={{
          padding: '1.1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          flex: 1,
          overflowY: 'auto',
        }}
      >
        {/* Error Alert */}
        {errorMessage && (
          <div
            style={{
              background: '#fef2f2',
              border: '1px solid #fee2e2',
              borderRadius: '10px',
              padding: '0.65rem 0.85rem',
              color: '#dc2626',
              fontSize: '0.78rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <i className="fa-solid fa-circle-exclamation"></i>
            <div>{errorMessage}</div>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div
            style={{
              background: '#f0fdf4',
              border: '1px solid #dcfce7',
              borderRadius: '10px',
              padding: '0.65rem 0.85rem',
              color: '#166534',
              fontSize: '0.78rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <i className="fa-solid fa-circle-check"></i>
            <div>{successMessage}</div>
          </div>
        )}

        {/* 1. Worker Selector */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '0.725rem',
              fontWeight: 800,
              color: '#475569',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: '0.35rem',
            }}
          >
            Worker (Recipient)
          </label>
          <select
            value={selectedWorkerId}
            onChange={(e) => {
              const newId = e.target.value;
              setSelectedWorkerId(newId);
              const found = workers.find((w) => String(w.id) === String(newId));
              if (found && onSelectWorker) {
                onSelectWorker(found);
              }
            }}
            style={{
              width: '100%',
              padding: '0.6rem 0.75rem',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 700,
              color: '#0f172a',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            {workers.length > 0 ? (
              workers.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} {w.specialization ? `(${w.specialization})` : ''}
                </option>
              ))
            ) : (
              <option value={activeWorker?.id || ''}>{activeWorker?.name || 'Current Worker'}</option>
            )}
          </select>
        </div>

        {/* 2. Transaction Type (IN / OUT) Toggle */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '0.725rem',
              fontWeight: 800,
              color: '#475569',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: '0.35rem',
            }}
          >
            Transaction Type
          </label>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '6px',
              background: '#f1f5f9',
              padding: '4px',
              borderRadius: '10px',
            }}
          >
            {/* OUT: Admin to Worker */}
            <button
              type="button"
              onClick={() => setDirection('OUTGOING')}
              style={{
                padding: '0.55rem',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
                background: direction === 'OUTGOING' ? '#ef4444' : 'transparent',
                color: direction === 'OUTGOING' ? '#ffffff' : '#64748b',
                boxShadow: direction === 'OUTGOING' ? '0 2px 6px rgba(239, 68, 68, 0.3)' : 'none',
              }}
            >
              <i className="fa-solid fa-arrow-up-right-from-square"></i> OUT (Given)
            </button>

            {/* IN: Worker to Admin */}
            <button
              type="button"
              onClick={() => setDirection('INCOMING')}
              style={{
                padding: '0.55rem',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
                background: direction === 'INCOMING' ? '#16a34a' : 'transparent',
                color: direction === 'INCOMING' ? '#ffffff' : '#64748b',
                boxShadow: direction === 'INCOMING' ? '0 2px 6px rgba(22, 163, 74, 0.3)' : 'none',
              }}
            >
              <i className="fa-solid fa-arrow-down-left-and-arrow-up-right-to-base"></i> IN (Received)
            </button>
          </div>
        </div>

        {/* 3. Amount Field (₹) */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '0.725rem',
              fontWeight: 800,
              color: '#475569',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: '0.35rem',
            }}
          >
            Amount (Money ₹) <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <div style={{ position: 'relative' }}>
            <span
              style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '1rem',
                fontWeight: 800,
                color: '#64748b',
              }}
            >
              ₹
            </span>
            <input
              type="number"
              required
              min="1"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="15000"
              style={{
                width: '100%',
                padding: '0.65rem 0.75rem 0.65rem 2rem',
                background: '#f8fafc',
                border: '1.5px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '1.05rem',
                fontWeight: 800,
                color: '#0f172a',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Quick Add Chips */}
          <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
            {[1000, 5000, 10000, 50000].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => handleQuickAddAmount(val)}
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '2px 6px',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  color: '#475569',
                  cursor: 'pointer',
                }}
              >
                +₹{val >= 1000 ? `${val / 1000}k` : val}
              </button>
            ))}
          </div>
        </div>

        {/* 4. Notes Field */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '0.725rem',
              fontWeight: 800,
              color: '#475569',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: '0.35rem',
            }}
          >
            Notes / Description
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Advance cash for order, Labor making charges, etc."
            style={{
              width: '100%',
              padding: '0.6rem 0.75rem',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '0.82rem',
              color: '#0f172a',
              outline: 'none',
              resize: 'none',
              boxSizing: 'border-box',
              fontFamily: 'inherit',
            }}
          />
        </div>

        {/* ── SUBMIT BUTTON ── */}
        <div style={{ marginTop: 'auto', paddingTop: '0.5rem' }}>
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              width: '100%',
              padding: '0.85rem',
              background: direction === 'OUTGOING'
                ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                : 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
              border: 'none',
              borderRadius: '10px',
              color: '#ffffff',
              fontSize: '0.875rem',
              fontWeight: 800,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: direction === 'OUTGOING'
                ? '0 6px 16px rgba(239, 68, 68, 0.35)'
                : '0 6px 16px rgba(22, 163, 74, 0.35)',
              transition: 'all 0.15s ease',
              opacity: isSubmitting ? 0.75 : 1,
            }}
          >
            {isSubmitting ? (
              <>
                <i className="fa-solid fa-circle-notch fa-spin"></i> Submitting...
              </>
            ) : (
              <>
                <i className="fa-solid fa-paper-plane"></i> Submit {direction === 'OUTGOING' ? 'Cash OUT' : 'Cash IN'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
