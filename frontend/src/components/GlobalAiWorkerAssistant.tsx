import React, { useState, useEffect, useRef } from 'react';
import { API_BASE } from '../config/apiConfig';
import { playJbjNotificationSound } from '../utils/soundUtils';

type WidgetState = 'ORB' | 'EXPANDED';

export const GlobalAiWorkerAssistant: React.FC = () => {
  const [widgetState, setWidgetState] = useState<WidgetState>('ORB');
  const [workers, setWorkers] = useState<any[]>([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('WRKR-3');
  const [direction, setDirection] = useState<'OUTGOING' | 'INCOMING'>('OUTGOING');
  const [amount, setAmount] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Dragging coordinates relative to viewport
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    return {
      x: window.innerWidth - 75,
      y: window.innerHeight - 85,
    };
  });

  const isDraggingRef = useRef(false);
  const dragStartOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const hasMovedRef = useRef(false);

  // Fetch workers
  const fetchWorkers = async () => {
    try {
      const res = await fetch(`${API_BASE}/work-assignment/workers`);
      const data = await res.json();
      if (data?.success && Array.isArray(data.workers)) {
        // Sort so Worker 3 (WRKR-3 / Expenses) is always at the top
        const worker3 = data.workers.find(
          (w: any) =>
            String(w.id).toUpperCase() === 'WRKR-3' ||
            w.name?.trim().toLowerCase() === 'expenses'
        );
        const otherWorkers = data.workers.filter(
          (w: any) =>
            String(w.id).toUpperCase() !== 'WRKR-3' &&
            w.name?.trim().toLowerCase() !== 'expenses'
        );

        const sortedWorkers = worker3 ? [worker3, ...otherWorkers] : data.workers;
        setWorkers(sortedWorkers);

        if (!selectedWorkerId || selectedWorkerId === 'EXPENSES') {
          setSelectedWorkerId(worker3 ? String(worker3.id) : sortedWorkers[0]?.id || 'WRKR-3');
        }
      }
    } catch (err) {
      console.warn('Could not fetch workers for AI panel:', err);
    }
  };

  useEffect(() => {
    fetchWorkers();
  }, []);

  useEffect(() => {
    if (widgetState === 'EXPANDED') {
      fetchWorkers();
      setErrorMessage(null);
    }
  }, [widgetState]);

  // Keep widget bounded within screen on resize
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => ({
        x: Math.min(Math.max(10, prev.x), window.innerWidth - 65),
        y: Math.min(Math.max(10, prev.y), window.innerHeight - 65),
      }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ── DRAGGABLE HANDLERS (MOUSE & TOUCH) ──
  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (
      widgetState === 'EXPANDED' &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'SELECT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'BUTTON' ||
        target.closest('form'))
    ) {
      return;
    }

    isDraggingRef.current = true;
    hasMovedRef.current = false;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    dragStartOffsetRef.current = {
      x: clientX - position.x,
      y: clientY - position.y,
    };

    const handlePointerMove = (moveEvent: MouseEvent | TouchEvent) => {
      if (!isDraggingRef.current) return;
      hasMovedRef.current = true;

      const currentX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const currentY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;

      const newX = currentX - dragStartOffsetRef.current.x;
      const newY = currentY - dragStartOffsetRef.current.y;

      const boundedX = Math.min(Math.max(10, newX), window.innerWidth - 55);
      const boundedY = Math.min(Math.max(10, newY), window.innerHeight - 55);

      setPosition({ x: boundedX, y: boundedY });
    };

    const handlePointerUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchmove', handlePointerMove);
    window.addEventListener('touchend', handlePointerUp);
  };

  const handleOrbClick = () => {
    if (hasMovedRef.current) return; // Prevent opening on drag end
    setWidgetState('EXPANDED');
  };

  const currentTargetWorker = workers.find((w) => String(w.id) === String(selectedWorkerId));

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
      setErrorMessage('Please enter a valid amount.');
      return;
    }

    if (!selectedWorkerId) {
      setErrorMessage('Please select a worker.');
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('worker_id', String(selectedWorkerId));
      formData.append('direction', direction);
      formData.append('category', 'CASH');
      formData.append('cash_metal_link', 'GENERAL_CASH');
      formData.append('amount_cash', String(numericAmount));
      formData.append('item_name', 'Cash Payment');
      formData.append('notes', notes.trim());

      const res = await fetch(`${API_BASE}/work-assignment/worker-transactions`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (data.success && data.transaction) {
        const newTx = { ...data.transaction, status_state: 'DELIVERED' };

        // 1. Play notification sound
        playJbjNotificationSound();

        // 2. Broadcast local chat message event
        window.dispatchEvent(
          new CustomEvent('jbj_chat_message_sent', {
            detail: newTx,
          })
        );

        // 3. Success feedback & reset form
        setSuccessMessage(
          `₹${numericAmount.toLocaleString('en-IN')} ${
            direction === 'OUTGOING' ? 'given to' : 'received from'
          } ${currentTargetWorker?.name || 'Worker'} recorded!`
        );
        setAmount('');
        setNotes('');

        setTimeout(() => {
          setSuccessMessage(null);
        }, 4000);
      } else {
        setErrorMessage(data.message || 'Failed to record transaction.');
      }
    } catch (err: any) {
      console.error('AI Intelligence Transaction Error:', err);
      setErrorMessage(err?.message || 'Network error while recording transaction.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Safe viewport bounds for expanded card
  const getRenderPosition = () => {
    if (widgetState === 'EXPANDED') {
      const cardWidth = 330;
      const cardHeight = 490;
      const safeX = Math.min(position.x, window.innerWidth - cardWidth - 15);
      const safeY = Math.min(position.y, window.innerHeight - cardHeight - 15);
      return { x: Math.max(12, safeX), y: Math.max(12, safeY) };
    }
    return position;
  };

  const renderPos = getRenderPosition();

  return (
    <div
      style={{
        position: 'fixed',
        left: `${renderPos.x}px`,
        top: `${renderPos.y}px`,
        zIndex: 99999,
        touchAction: 'none',
        userSelect: 'none',
      }}
    >
      {/* ── EMBEDDED CSS FOR REFINED SOLAR GOLD/ORANGE ECLIPSE ORB ── */}
      <style>{`
        @keyframes jbjCelestialSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes jbjCelestialBreathe {
          0%, 100% {
            filter: drop-shadow(0 0 4px rgba(250, 204, 21, 0.35)) drop-shadow(0 0 8px rgba(249, 115, 22, 0.3));
          }
          50% {
            filter: drop-shadow(0 0 6px rgba(254, 240, 138, 0.45)) drop-shadow(0 0 12px rgba(234, 88, 12, 0.4));
          }
        }
      `}</style>

      {/* ── STATE 1: YELLOW-TO-ORANGE CELESTIAL ECLIPSE FLOATING ORB ── */}
      {widgetState === 'ORB' && (
        <div
          onMouseDown={handlePointerDown}
          onTouchStart={handlePointerDown}
          onClick={handleOrbClick}
          title="Drag anywhere • Click to open JBJ Intelligence"
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            cursor: 'grab',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            background: '#040208',
            animation: 'jbjCelestialBreathe 3s infinite ease-in-out',
            transition: 'transform 0.2s ease',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.7), inset 0 0 8px rgba(0, 0, 0, 0.9)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          {/* 1. Atmospheric Soft Glow Halo (Yellow to Orange - Gentle) */}
          <div
            style={{
              position: 'absolute',
              inset: '-2px',
              borderRadius: '50%',
              background:
                'conic-gradient(from 0deg at 50% 50%, #ffffff 0deg, #fef08a 25deg, #facc15 75deg, rgba(250, 204, 21, 0.15) 140deg, rgba(249, 115, 22, 0.08) 190deg, #ea580c 255deg, #f97316 315deg, #fde047 345deg, #ffffff 360deg)',
              animation: 'jbjCelestialSpin 6s linear infinite',
              filter: 'blur(2px)',
              opacity: 0.45,
              pointerEvents: 'none',
            }}
          />

          {/* 2. Sharp Crisp Crescent Luminous Rim (Yellow to Orange - Gentle) */}
          <div
            style={{
              position: 'absolute',
              inset: '-1px',
              borderRadius: '50%',
              background:
                'conic-gradient(from 0deg at 50% 50%, #ffffff 0deg, #fef08a 20deg, #facc15 70deg, rgba(251, 191, 36, 0.18) 135deg, rgba(249, 115, 22, 0.10) 190deg, #ea580c 250deg, #f97316 310deg, #fde047 345deg, #ffffff 360deg)',
              animation: 'jbjCelestialSpin 6s linear infinite',
              WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 2.2px), #fff calc(100% - 1.5px))',
              mask: 'radial-gradient(farthest-side, transparent calc(100% - 2.2px), #fff calc(100% - 1.5px))',
              pointerEvents: 'none',
              zIndex: 2,
            }}
          />

          {/* 3. Deep Obsidian Core with JBJ Logo */}
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: '#040208',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              padding: '3px',
              position: 'relative',
              zIndex: 3,
              boxShadow: 'inset 0 0 8px rgba(0,0,0,0.95)',
            }}
          >
            <img
              src="/jb_logo-symmetric.png"
              alt="JBJ Logo"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.9))',
              }}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        </div>
      )}

      {/* ── STATE 2: EXPANDED AI ASSISTANT TRANSACTION CARD ── */}
      {widgetState === 'EXPANDED' && (
        <div
          onMouseDown={handlePointerDown}
          onTouchStart={handlePointerDown}
          style={{
            width: '330px',
            maxWidth: '92vw',
            background: 'linear-gradient(135deg, #120d22 0%, #0a0614 100%)',
            border: '1px solid rgba(251, 191, 36, 0.25)',
            borderRadius: '18px',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.8), 0 0 12px rgba(251, 191, 36, 0.12)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            fontFamily: "'Inter', sans-serif",
            animation: 'scaleUp 0.15s ease-out',
            color: '#f8fafc',
          }}
        >
          {/* Header (Draggable Bar) */}
          <div
            style={{
              padding: '0.75rem 1rem',
              background: 'rgba(255, 255, 255, 0.03)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'grab',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, #3b226e 0%, #120d22 100%)',
                  border: '1px solid #a855f7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '2px',
                }}
              >
                <img src="/jb_logo-symmetric.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>

              <div>
                <div style={{ fontSize: '0.825rem', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  JBJ Intelligence
                  <span
                    style={{
                      fontSize: '0.58rem',
                      fontWeight: 800,
                      background: 'rgba(217, 119, 6, 0.25)',
                      color: '#fbbf24',
                      padding: '1px 5px',
                      borderRadius: '4px',
                      border: '1px solid rgba(251, 191, 36, 0.4)',
                    }}
                  >
                    ADMIN
                  </span>
                </div>
                <div style={{ fontSize: '0.65rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#34d399' }} /> Online
                </div>
              </div>
            </div>

            {/* Close / Minimize to Orb */}
            <button
              type="button"
              onClick={() => setWidgetState('ORB')}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                color: '#cbd5e1',
                width: '24px',
                height: '24px',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.8rem',
              }}
              title="Minimize to Orb"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>

          {/* Form Content */}
          <form
            onSubmit={handleSubmit}
            style={{
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem',
              cursor: 'default',
            }}
          >
            {/* Error Banner */}
            {errorMessage && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  borderRadius: '8px',
                  padding: '0.5rem 0.75rem',
                  color: '#fca5a5',
                  fontSize: '0.74rem',
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

            {/* Success Banner */}
            {successMessage && (
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  borderRadius: '8px',
                  padding: '0.5rem 0.75rem',
                  color: '#6ee7b7',
                  fontSize: '0.74rem',
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
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  color: '#fbbf24',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  marginBottom: '0.3rem',
                }}
              >
                Worker (Karigar) <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                required
                value={selectedWorkerId}
                onChange={(e) => setSelectedWorkerId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.7rem',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(251, 191, 36, 0.35)',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: '#f8fafc',
                  outline: 'none',
                  cursor: 'pointer',
                  boxSizing: 'border-box',
                }}
              >
                {workers.map((w) => {
                  const isWorker3 = String(w.id).toUpperCase() === 'WRKR-3' || w.name?.trim().toLowerCase() === 'expenses';
                  return (
                    <option
                      key={w.id}
                      value={w.id}
                      style={{
                        background: '#120d22',
                        color: isWorker3 ? '#fbbf24' : '#ffffff',
                        fontWeight: isWorker3 ? 800 : 500,
                      }}
                    >
                      {isWorker3
                        ? `🏢 ${w.name} (${w.id}) - General Store Expense`
                        : `👤 ${w.name} ${w.specialization ? `(${w.specialization})` : ''} - ${w.id}`}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* 2. Transaction Type (IN / OUT) Toggle */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  color: '#fbbf24',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  marginBottom: '0.3rem',
                }}
              >
                Transaction Type <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '6px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  padding: '3px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                {/* OUT: Admin to Worker */}
                <button
                  type="button"
                  onClick={() => setDirection('OUTGOING')}
                  style={{
                    padding: '0.45rem',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                    transition: 'all 0.15s ease',
                    background: direction === 'OUTGOING' ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'transparent',
                    color: direction === 'OUTGOING' ? '#ffffff' : '#94a3b8',
                    boxShadow: direction === 'OUTGOING' ? '0 2px 10px rgba(245, 158, 11, 0.45)' : 'none',
                  }}
                >
                  <i className="fa-solid fa-arrow-up-right-from-square"></i> OUT (Given)
                </button>

                {/* IN: Worker to Admin */}
                <button
                  type="button"
                  onClick={() => setDirection('INCOMING')}
                  style={{
                    padding: '0.45rem',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                    transition: 'all 0.15s ease',
                    background: direction === 'INCOMING' ? '#16a34a' : 'transparent',
                    color: direction === 'INCOMING' ? '#ffffff' : '#94a3b8',
                    boxShadow: direction === 'INCOMING' ? '0 2px 8px rgba(22, 163, 74, 0.4)' : 'none',
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
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  color: '#fbbf24',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  marginBottom: '0.3rem',
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
                    fontSize: '0.95rem',
                    fontWeight: 800,
                    color: '#fbbf24',
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
                    padding: '0.55rem 0.65rem 0.55rem 1.9rem',
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(251, 191, 36, 0.4)',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
                    fontWeight: 800,
                    color: '#ffffff',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Quick Add Chips */}
              <div style={{ display: 'flex', gap: '4px', marginTop: '5px', flexWrap: 'wrap' }}>
                {[1000, 5000, 10000, 50000].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleQuickAddAmount(val)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(251, 191, 36, 0.2)',
                      borderRadius: '5px',
                      padding: '2px 6px',
                      fontSize: '0.64rem',
                      fontWeight: 700,
                      color: '#fef08a',
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
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  color: '#fbbf24',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  marginBottom: '0.3rem',
                }}
              >
                Notes / Purpose
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Advance cash for order, Labor making charges, Store tea/snacks..."
                style={{
                  width: '100%',
                  padding: '0.45rem 0.65rem',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(251, 191, 36, 0.25)',
                  borderRadius: '8px',
                  fontSize: '0.78rem',
                  color: '#ffffff',
                  outline: 'none',
                  resize: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            {/* Submit Button */}
            <div style={{ marginTop: '0.35rem' }}>
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background:
                    direction === 'OUTGOING'
                      ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                      : 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '0.825rem',
                  fontWeight: 800,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow:
                    direction === 'OUTGOING'
                      ? '0 4px 14px rgba(245, 158, 11, 0.45)'
                      : '0 4px 14px rgba(22, 163, 74, 0.4)',
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
      )}
    </div>
  );
};
