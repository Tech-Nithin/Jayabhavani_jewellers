import React, { useState, useEffect, useRef } from 'react';
import { API_BASE } from '../config/apiConfig';
import { translations, type Language } from '../utils/translations';
import { FullImagePreviewModal } from '../inventory-frontend/components/FullImagePreviewModal';

interface WorkerTransactionItem {
  id: string;
  worker_id: string;
  order_id?: string | null;
  direction: 'OUTGOING' | 'INCOMING';
  category: 'CASH' | 'GOLD' | 'SILVER' | 'ORNAMENT';
  amount_cash?: number;
  weight_grams?: number;
  touch_percentage?: number;
  fine_weight_grams?: number;
  item_name?: string;
  photos: string[];
  notes: string;
  created_at: string;
}

interface WorkerTransactionsViewProps {
  worker: any;
  onBack: () => void;
  lang?: Language;
}

const toStartCase = (str?: string | null): string => {
  if (!str) return '';
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
};

export const WorkerTransactionsView: React.FC<WorkerTransactionsViewProps> = ({
  worker,
  onBack,
  lang = 'EN',
}) => {
  const [transactions, setTransactions] = useState<WorkerTransactionItem[]>([]);
  const [loading, setLoading] = useState(true);

  // In-Chat Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMatchIdx, setActiveMatchIdx] = useState(0);

  // Accordion Toggle State for Bottom Form
  const [isAccordionExpanded, setIsAccordionExpanded] = useState(true);

  // Worker Info Modal & 3-Dots Menu State
  const [showWorkerModal, setShowWorkerModal] = useState(false);
  const [is3DotsOpen, setIs3DotsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // New Transaction Form State
  const [direction, setDirection] = useState<'OUTGOING' | 'INCOMING'>('OUTGOING');
  const [category, setCategory] = useState<'GOLD' | 'SILVER' | 'CASH' | 'ORNAMENT'>('GOLD');
  const [itemName, setItemName] = useState('');
  const [amountCash, setAmountCash] = useState('');
  const [weightGrams, setWeightGrams] = useState('');
  const [touchPercentage, setTouchPercentage] = useState('91.6');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);

  // Full-Screen Image Lightbox Preview & WhatsApp Share State
  const [previewImageData, setPreviewImageData] = useState<{ url: string; title: string } | null>(null);

  // Message Preview Panel Preference State (Persisted Locally & Database)
  const [isMessagePreviewEnabled, setIsMessagePreviewEnabled] = useState<boolean>(() => {
    const stored = localStorage.getItem('jbj_message_preview_enabled');
    return stored !== null ? stored === 'true' : true;
  });

  // Error Diagnostics State (100% Error Visibility)
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchTransactions();
    fetchUserSettings();
  }, [worker?.id]);

  const fetchUserSettings = async () => {
    try {
      const res = await fetch(`${API_BASE}/work-assignment/user-settings`);
      const data = await res.json();
      if (data.success && data.settings && typeof data.settings.message_preview_enabled === 'boolean') {
        if (localStorage.getItem('jbj_message_preview_enabled') === null) {
          setIsMessagePreviewEnabled(data.settings.message_preview_enabled);
          localStorage.setItem('jbj_message_preview_enabled', String(data.settings.message_preview_enabled));
        }
      }
    } catch (err) {
      console.warn('Could not fetch user settings:', err);
    }
  };

  const toggleMessagePreview = async () => {
    const newValue = !isMessagePreviewEnabled;
    setIsMessagePreviewEnabled(newValue);
    localStorage.setItem('jbj_message_preview_enabled', String(newValue));

    try {
      await fetch(`${API_BASE}/work-assignment/user-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message_preview_enabled: newValue }),
      });
    } catch (err) {
      console.warn('Failed to sync user settings to database:', err);
    }
  };

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transactions]);

  const fetchTransactions = async () => {
    if (!worker?.id) return;
    try {
      setLoading(true);
      setFetchError(null);
      const res = await fetch(`${API_BASE}/work-assignment/worker-transactions?workerId=${worker.id}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.transactions)) {
        setTransactions(data.transactions);
        if (data.warning) {
          console.warn('⚠️ Server notice:', data.warning);
        }
      } else {
        const errStr = data.message || data.warning || 'Failed to load transaction history from backend';
        setFetchError(errStr);
      }
    } catch (err: any) {
      console.error('Failed to fetch transactions:', err);
      setFetchError(`Network Error: ${err.message || 'Could not connect to backend server'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setPhotos((prev) => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSendTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (category === 'CASH' && !amountCash) {
      alert('⚠️ Validation Error: Please enter cash amount.');
      return;
    }
    if (category !== 'CASH' && !weightGrams) {
      alert('⚠️ Validation Error: Please enter gold/ornament/silver weight.');
      return;
    }

    setIsSending(true);
    setSendError(null);

    try {
      const defaultName = category === 'CASH' ? 'Cash Payment' : category === 'GOLD' ? 'Raw Gold Bar' : category === 'SILVER' ? 'Raw Silver Bar' : 'Ornament Item';
      const formattedItemName = toStartCase(itemName.trim()) || defaultName;
      const formattedNotes = toStartCase(notes.trim());

      const defaultTouch = category === 'SILVER' ? 80.0 : 91.6;

      const res = await fetch(`${API_BASE}/work-assignment/worker-transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          worker_id: worker.id,
          direction,
          category,
          amount_cash: Number(amountCash) || 0,
          weight_grams: Number(weightGrams) || 0,
          touch_percentage: Number(touchPercentage) || defaultTouch,
          item_name: formattedItemName,
          photos,
          notes: formattedNotes,
        }),
      });

      const data = await res.json();
      if (data.success && data.transaction) {
        setTransactions((prev) => [...prev, data.transaction]);
        // Reset form inputs
        setAmountCash('');
        setWeightGrams('');
        setItemName('');
        setNotes('');
        setPhotos([]);

        if (data.warning) {
          console.warn('⚡ Transaction Notice:', data.warning);
        }
      } else {
        const errDetail = data.message || data.warning || JSON.stringify(data);
        setSendError(errDetail);
        alert(`❌ FAILED TO RECORD TRANSACTION:\n\n100% Error Reason: ${errDetail}`);
      }
    } catch (err: any) {
      console.error('Error sending transaction:', err);
      const connErr = `Connection Error: ${err.message || 'Server did not respond'}`;
      setSendError(connErr);
      alert(`❌ NETWORK ERROR RECORDING TRANSACTION:\n\n${connErr}`);
    } finally {
      setIsSending(false);
    }
  };

  // ── STRICT 100% PURE FINE METAL BALANCES CALCULATION ──
  let totalGoldSentFine = 0;
  let totalGoldReceivedFine = 0;
  let totalSilverSentFine = 0;
  let totalSilverReceivedFine = 0;
  let totalCashSent = 0;
  let totalCashReceived = 0;

  transactions.forEach((t) => {
    const weight = Number(t.weight_grams) || 0;
    const touch = Number(t.touch_percentage) || (t.category === 'SILVER' ? 80.0 : 91.6);
    const fine = t.fine_weight_grams ? Number(t.fine_weight_grams) : (weight * touch / 100);

    if (t.direction === 'OUTGOING') {
      if (t.category === 'GOLD' || t.category === 'ORNAMENT') totalGoldSentFine += fine;
      if (t.category === 'SILVER') totalSilverSentFine += fine;
      if (t.category === 'CASH') totalCashSent += Number(t.amount_cash) || 0;
    } else {
      if (t.category === 'GOLD' || t.category === 'ORNAMENT') totalGoldReceivedFine += fine;
      if (t.category === 'SILVER') totalSilverReceivedFine += fine;
      if (t.category === 'CASH') totalCashReceived += Number(t.amount_cash) || 0;
    }
  });

  const netFineGoldBalance = totalGoldSentFine - totalGoldReceivedFine;
  const netFineSilverBalance = totalSilverSentFine - totalSilverReceivedFine;
  const netCashBalance = totalCashSent - totalCashReceived;

  // ── IN-CHAT SEARCH & AUTO SCROLL TO MATCH ──
  const matchedTxIds = transactions.filter((t) => {
    if (!searchQuery.trim()) return false;
    const q = searchQuery.toLowerCase().trim();
    const item = (t.item_name || '').toLowerCase();
    const notesStr = (t.notes || '').toLowerCase();
    const cat = (t.category || '').toLowerCase();
    const amt = String(t.amount_cash || '');
    const wt = String(t.weight_grams || '');
    const touch = String(t.touch_percentage || '');

    return item.includes(q) || notesStr.includes(q) || cat.includes(q) || amt.includes(q) || wt.includes(q) || touch.includes(q);
  }).map((t) => t.id);

  useEffect(() => {
    if (matchedTxIds.length > 0) {
      if (activeMatchIdx >= matchedTxIds.length) {
        setActiveMatchIdx(0);
      }
      const targetId = matchedTxIds[activeMatchIdx] || matchedTxIds[0];
      const el = document.getElementById(`tx-bubble-${targetId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [searchQuery, activeMatchIdx]);

  return (
    <div className="tablet-dense-view" style={{ background: '#f0f2f5', borderRadius: '18px', border: '1px solid #cbd5e1', boxShadow: '0 8px 30px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 45px)', overflow: 'hidden' }}>

      {/* ── CHAT HEADER ── */}
      <div style={{ background: '#ffffff', padding: '0.6rem 1rem', borderBottom: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 10 }}>

        {/* Left Side: Back button + Clickable Worker Profile Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0, flexShrink: 1 }}>
          <button
            onClick={onBack}
            style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.82rem', fontWeight: 700, color: '#475569', flexShrink: 0 }}
            title="Back to Workers"
          >
            <i className="fa-solid fa-arrow-left"></i>
          </button>

            {/* Clickable Worker Profile Header */}
            <div
              onClick={() => {
                if (worker.photo_url) {
                  setPreviewImageData({ url: worker.photo_url, title: `${worker.name} Profile Picture` });
                } else {
                  setShowWorkerModal(true);
                }
              }}
              title="Click to view worker profile picture & information"
              style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', overflow: 'hidden' }}
            >
              {worker.photo_url ? (
                <img
                  src={worker.photo_url}
                  alt={worker.name}
                  style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #d97706', boxShadow: '0 2px 6px rgba(180, 83, 9, 0.3)', flexShrink: 0 }}
                />
              ) : (
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.95rem', boxShadow: '0 2px 6px rgba(180, 83, 9, 0.3)', flexShrink: 0 }}>
                  {worker.name.charAt(0)}
                </div>
              )}

            <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{worker.name}</span>
                <i className="fa-solid fa-circle-info" style={{ fontSize: '0.72rem', color: '#0284c7', flexShrink: 0 }}></i>
              </h3>
              <p style={{ margin: 0, fontSize: '0.68rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {worker.specialization} &nbsp;·&nbsp;
                <strong style={{ color: '#d97706' }}>{worker.assigned_orders_count || 0} Orders</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Center & Right: Fine Metal Balances & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>

          {/* Strict 100% Fine Metal Balance summary pills */}
          <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', whiteSpace: 'nowrap' }}>
            <div style={{ background: '#fef3c7', border: '1px solid #fde68a', padding: '3px 8px', borderRadius: '8px', textAlign: 'right' }}>
              <span style={{ fontSize: '0.55rem', color: '#b45309', fontWeight: 800, display: 'block', textTransform: 'uppercase' }}>100% Fine Gold</span>
              <strong style={{ fontSize: '0.76rem', color: '#92400e' }}>{netFineGoldBalance.toFixed(3)} g</strong>
            </div>

            <div style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '3px 8px', borderRadius: '8px', textAlign: 'right' }}>
              <span style={{ fontSize: '0.55rem', color: '#475569', fontWeight: 800, display: 'block', textTransform: 'uppercase' }}>100% Fine Silver</span>
              <strong style={{ fontSize: '0.76rem', color: '#334155' }}>{netFineSilverBalance.toFixed(3)} g</strong>
            </div>

            <div style={{ background: '#e0f2fe', border: '1px solid #bae6fd', padding: '3px 8px', borderRadius: '8px', textAlign: 'right' }}>
              <span style={{ fontSize: '0.55rem', color: '#0369a1', fontWeight: 800, display: 'block', textTransform: 'uppercase' }}>Net Cash</span>
              <strong style={{ fontSize: '0.76rem', color: '#075985' }}>₹{netCashBalance.toLocaleString('en-IN')}</strong>
            </div>
          </div>

          {/* Search Magnifying Glass Button */}
          {/* <button
            type="button"
            onClick={() => {
              setIsSearchOpen(!isSearchOpen);
              if (!isSearchOpen) setTimeout(() => searchInputRef.current?.focus(), 50);
            }}
            style={{ background: isSearchOpen ? '#e0f2fe' : 'none', border: 'none', width: '32px', height: '32px', borderRadius: '8px', fontSize: '0.95rem', color: '#0284c7', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Search Messages"
          >
            <i className="fa-solid fa-magnifying-glass"></i>
          </button> */}

          {/* Simple Borderless Vertical 3-Dots Menu */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setIs3DotsOpen(!is3DotsOpen)}
              style={{ background: 'none', border: 'none', padding: '4px 6px', fontSize: '1.25rem', color: '#475569', cursor: 'pointer', outline: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title="More Options"
            >
              <i className="fa-solid fa-ellipsis-vertical"></i>
            </button>

            {is3DotsOpen && (
              <div style={{ position: 'absolute', right: 0, top: '120%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', minWidth: '180px', zIndex: 100, overflow: 'hidden' }}>
                <button
                  type="button"
                  onClick={() => {
                    setIs3DotsOpen(false);
                    setIsSearchOpen(true);
                    setTimeout(() => searchInputRef.current?.focus(), 50);
                  }}
                  style={{ width: '100%', padding: '10px 14px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '0.80rem', fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <i className="fa-solid fa-magnifying-glass" style={{ color: '#0284c7' }}></i> Search Messages
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIs3DotsOpen(false);
                    setShowWorkerModal(true);
                  }}
                  style={{ width: '100%', padding: '10px 14px', border: 'none', background: 'none', borderTop: '1px solid #f1f5f9', textAlign: 'left', cursor: 'pointer', fontSize: '0.80rem', fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <i className="fa-solid fa-user-gear" style={{ color: '#d97706' }}></i> Worker Information
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIs3DotsOpen(false);
                    toggleMessagePreview();
                  }}
                  style={{ width: '100%', padding: '10px 14px', border: 'none', background: 'none', borderTop: '1px solid #f1f5f9', textAlign: 'left', cursor: 'pointer', fontSize: '0.80rem', fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fa-solid fa-eye" style={{ color: isMessagePreviewEnabled ? '#15803d' : '#64748b' }}></i> Message Preview
                  </span>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '2px 6px', borderRadius: '6px', background: isMessagePreviewEnabled ? '#dcfce7' : '#f1f5f9', color: isMessagePreviewEnabled ? '#15803d' : '#64748b' }}>
                    {isMessagePreviewEnabled ? 'ON' : 'OFF'}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Floating Search Input Overlay (When Search is Opened) */}
        {isSearchOpen && (
          <div style={{ position: 'absolute', top: 0, right: 0, left: 0, bottom: 0, background: '#ffffff', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.65rem', zIndex: 25, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <i className="fa-solid fa-magnifying-glass" style={{ color: '#0284c7', fontSize: '0.9rem' }}></i>
            <input
              ref={searchInputRef}
              type="text"
              placeholder={translations[lang]?.searchWorkerChatPlaceholder || 'Search in chat history...'}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setActiveMatchIdx(0);
              }}
              style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}
            />

            {searchQuery && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0284c7', whiteSpace: 'nowrap' }}>
                  {matchedTxIds.length > 0 ? `${activeMatchIdx + 1}/${matchedTxIds.length}` : '0 matches'}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveMatchIdx((prev) => (prev - 1 + matchedTxIds.length) % (matchedTxIds.length || 1))}
                  style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '2px 8px', color: '#475569', cursor: 'pointer', fontSize: '0.75rem' }}
                >
                  <i className="fa-solid fa-chevron-up"></i>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMatchIdx((prev) => (prev + 1) % (matchedTxIds.length || 1))}
                  style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '2px 8px', color: '#475569', cursor: 'pointer', fontSize: '0.75rem' }}
                >
                  <i className="fa-solid fa-chevron-down"></i>
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setIsSearchOpen(false);
                setSearchQuery('');
                setActiveMatchIdx(0);
              }}
              style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '4px 10px', color: '#64748b', cursor: 'pointer', fontSize: '0.80rem', fontWeight: 700, flexShrink: 0 }}
            >
              Close
            </button>
          </div>
        )}
      </div>

      {/* ── CHAT MESSAGES TIMELINE (SEAMLESS FIT HEIGHT) ── */}
      <div style={{ flex: 1, minHeight: 0, padding: '1rem 1.25rem', overflowY: 'auto', background: '#efeae2', backgroundImage: 'radial-gradient(#cbd5e1 0.75px, transparent 0.75px)', backgroundSize: '16px 16px' }}>

        {/* ── 100% ERROR DIAGNOSTIC WARNING BANNER ── */}
        {(fetchError || sendError) && (
          <div style={{ background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: '12px', padding: '0.75rem 1rem', marginBottom: '1rem', color: '#991b1b', fontSize: '0.80rem', boxShadow: '0 4px 12px rgba(220, 38, 38, 0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <strong style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                <i className="fa-solid fa-triangle-exclamation"></i> 100% Diagnostic Error Details
              </strong>
              <button
                type="button"
                onClick={() => { setFetchError(null); setSendError(null); }}
                style={{ background: 'none', border: 'none', color: '#991b1b', cursor: 'pointer', fontSize: '0.9rem' }}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <p style={{ margin: 0, fontWeight: 600 }}>{sendError || fetchError}</p>
            <div style={{ marginTop: '6px', fontSize: '0.72rem', color: '#7f1d1d' }}>
              💡 All transactions are automatically backed up to local persistent disk storage so no chat history is ever lost.
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
            <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: '1.5rem', color: '#d97706', marginBottom: '0.5rem' }}></i>
            <p style={{ margin: 0, fontSize: '0.82rem' }}>Loading transaction history...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
            <i className="fa-solid fa-comments" style={{ fontSize: '2.5rem', color: '#cbd5e1', marginBottom: '0.5rem' }}></i>
            <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700 }}>No payment or gold transactions recorded yet</p>
            <span style={{ fontSize: '0.75rem' }}>Use the input bar below to log outgoing cash/gold or incoming return ornaments.</span>
          </div>
        ) : (
          transactions.map((t) => {
            const isOutgoing = t.direction === 'OUTGOING'; // Right aligned (Store to Worker)
            const isMatched = matchedTxIds.includes(t.id);
            const isCurrentActiveMatch = matchedTxIds[activeMatchIdx] === t.id;

            const weight = Number(t.weight_grams) || 0;
            const touch = Number(t.touch_percentage) || (t.category === 'SILVER' ? 80.0 : 91.6);
            const fineGold = t.fine_weight_grams ? Number(t.fine_weight_grams) : (weight * touch / 100);

            return (
              <div
                key={t.id}
                id={`tx-bubble-${t.id}`}
                style={{
                  display: 'flex',
                  justifyContent: isOutgoing ? 'flex-end' : 'flex-start',
                  marginBottom: '1rem',
                }}
              >
                <div
                  style={{
                    maxWidth: '75%',
                    minWidth: '230px',
                    background: isOutgoing ? '#dcf8c6' : '#ffffff',
                    borderRadius: isOutgoing ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                    padding: '0.75rem 1rem',
                    boxShadow: isCurrentActiveMatch ? '0 0 0 3px #d97706, 0 4px 16px rgba(217,119,6,0.3)' : isMatched ? '0 0 0 2px #0284c7' : '0 2px 5px rgba(0,0,0,0.08)',
                    position: 'relative',
                    border: isOutgoing ? '1px solid #b7e4a1' : '1px solid #e2e8f0',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {/* Badge Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', gap: '8px' }}>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '10px',
                        background: isOutgoing ? '#075e54' : '#0284c7',
                        color: '#ffffff',
                        textTransform: 'uppercase',
                      }}
                    >
                      {isOutgoing ? 'OUTGOING (STORE → WORKER)' : 'INCOMING (WORKER → STORE)'}
                    </span>

                    <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600 }}>
                      {new Date(t.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Transaction Category & Detailed Breakdown */}
                  {t.category === 'CASH' ? (
                    <div style={{ margin: '6px 0', padding: '8px 12px', background: '#f0fdf4', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                      <div style={{ fontSize: '0.68rem', color: '#166534', fontWeight: 700, textTransform: 'uppercase' }}>Cash Transaction</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#15803d', marginTop: '2px' }}>
                        💵 ₹{t.amount_cash?.toLocaleString('en-IN') || '0'}
                      </div>
                    </div>
                  ) : (
                    <div style={{ margin: '6px 0', padding: '8px 12px', background: t.category === 'GOLD' ? '#fffbe8' : t.category === 'SILVER' ? '#f8fafc' : '#f0f9ff', borderRadius: '10px', border: t.category === 'GOLD' ? '1px solid #fde68a' : t.category === 'SILVER' ? '1px solid #cbd5e1' : '1px solid #bae6fd' }}>
                      {/* Item Name */}
                      <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{t.category === 'GOLD' ? '🥇' : t.category === 'SILVER' ? '🥈' : '👑'}</span>
                        <span>{toStartCase(t.item_name || (t.category === 'GOLD' ? 'Raw Gold Bar' : t.category === 'SILVER' ? 'Raw Silver Bar' : 'Ornament Item'))}</span>
                      </div>

                      {/* Detailed Metrics Grid (Strict 100% Fine Metal) */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: '6px', fontSize: '0.76rem', background: '#ffffff', padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                        <div>
                          <span style={{ color: '#64748b', display: 'block', fontSize: '0.66rem', fontWeight: 700 }}>GROSS WEIGHT</span>
                          <strong style={{ color: '#0f172a' }}>{weight.toFixed(3)} g</strong>
                        </div>
                        <div>
                          <span style={{ color: '#64748b', display: 'block', fontSize: '0.66rem', fontWeight: 700 }}>TOUCH PURITY</span>
                          <strong style={{ color: t.category === 'GOLD' ? '#b45309' : t.category === 'SILVER' ? '#475569' : '#0369a1' }}>{touch}%</strong>
                        </div>
                        <div>
                          <span style={{ color: '#64748b', display: 'block', fontSize: '0.66rem', fontWeight: 700 }}>100% PURE FINE</span>
                          <strong style={{ color: '#15803d' }}>
                            {fineGold.toFixed(3)} g
                          </strong>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {t.notes && (
                    <p style={{ margin: '6px 0 0 0', fontSize: '0.78rem', color: '#334155', fontStyle: 'italic', background: 'rgba(0,0,0,0.03)', padding: '4px 8px', borderRadius: '6px' }}>
                      "{t.notes}"
                    </p>
                  )}

                  {/* Photo Thumbnails with Full-Screen Expand & Share */}
                  {t.photos && t.photos.length > 0 && (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                      {t.photos.map((url, idx) => (
                        <div key={idx} style={{ position: 'relative', display: 'inline-block' }}>
                          <img
                            src={url}
                            alt="Transaction Photo"
                            style={{ width: '64px', height: '64px', borderRadius: '8px', objectFit: 'cover', border: '1.5px solid #cbd5e1', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}
                            onClick={() => setPreviewImageData({ url, title: `${t.item_name || 'Transaction Photo'} (${t.category})` })}
                            title="Click to view full screen & share"
                          />
                          <span
                            onClick={() => setPreviewImageData({ url, title: `${t.item_name || 'Transaction Photo'} (${t.category})` })}
                            style={{ position: 'absolute', bottom: '3px', right: '3px', background: 'rgba(0,0,0,0.65)', color: '#ffffff', fontSize: '0.62rem', padding: '1px 4px', borderRadius: '4px', cursor: 'pointer' }}
                          >
                            <i className="fa-solid fa-expand"></i>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={chatBottomRef} />
      </div>

      {/* ── ACCORDION EXPAND/COLLAPSE DRAWER HEADER ── */}
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
              {isAccordionExpanded ? 'New Transaction & Live Preview Panel' : '➕ Add New Transaction / Record (Click to Expand Form)'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>
              {isAccordionExpanded ? 'Collapse Form (View Full Chat)' : 'Expand Form'}
            </span>
            <i className={`fa-solid fa-chevron-${isAccordionExpanded ? 'down' : 'up'}`} style={{ color: '#075e54', fontSize: '0.85rem' }}></i>
          </div>
        </div>

        {/* ── ACCORDION BODY (LIVE PREVIEW & FORM INPUTS) ── */}
        {isAccordionExpanded && (
          <form onSubmit={handleSendTransaction} style={{ padding: '0.85rem 1.25rem' }}>

            {/* Live Message Preview Banner (Toggleable ON/OFF) */}
            {isMessagePreviewEnabled && (
              <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '12px', border: '1px dashed #0284c7', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <i className="fa-solid fa-eye"></i> Live Message Preview ({direction === 'OUTGOING' ? 'Sending to Worker' : 'Receiving from Worker'})
                  </span>
                  <button
                    type="button"
                    onClick={toggleMessagePreview}
                    style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.68rem', fontWeight: 700 }}
                    title="Click to hide message preview"
                  >
                    <i className="fa-solid fa-eye-slash"></i> Disable Preview
                  </button>
                </div>

                <div style={{ display: 'flex', justifyContent: direction === 'OUTGOING' ? 'flex-end' : 'flex-start' }}>
                  <div style={{ width: '85%', maxWidth: '420px', background: '#ffffff', borderRadius: '12px', padding: '10px', border: '1px solid #cbd5e1', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '2px 8px', borderRadius: '8px', background: direction === 'OUTGOING' ? '#075e54' : '#0284c7', color: '#fff', textTransform: 'uppercase' }}>
                        {direction === 'OUTGOING' ? 'OUTGOING (STORE → WORKER)' : 'INCOMING (WORKER → STORE)'}
                      </span>
                      <span style={{ fontSize: '0.62rem', color: '#64748b' }}>Now</span>
                    </div>

                    {category === 'CASH' ? (
                      <div style={{ margin: '4px 0', padding: '6px 10px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                        <div style={{ fontSize: '0.65rem', color: '#166534', fontWeight: 700 }}>CASH PAYMENT</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#15803d' }}>
                          💵 ₹{amountCash ? Number(amountCash).toLocaleString('en-IN') : '0'}
                        </div>
                      </div>
                    ) : (
                      <div style={{ margin: '4px 0', padding: '6px 10px', background: category === 'GOLD' ? '#fffbe8' : category === 'SILVER' ? '#f8fafc' : '#f0f9ff', borderRadius: '8px', border: category === 'GOLD' ? '1px solid #fde68a' : category === 'SILVER' ? '1px solid #cbd5e1' : '1px solid #bae6fd' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
                          {category === 'GOLD' ? '🥇' : category === 'SILVER' ? '🥈' : '👑'}{' '}
                          {toStartCase(itemName.trim()) || (category === 'GOLD' ? 'Raw Gold Bar' : category === 'SILVER' ? 'Raw Silver Bar' : 'Ornament Item')}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: '4px', fontSize: '0.72rem', background: '#ffffff', padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.62rem', fontWeight: 700 }}>GROSS WT</span>
                            <strong>{weightGrams ? Number(weightGrams).toFixed(3) : '0.000'} g</strong>
                          </div>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.62rem', fontWeight: 700 }}>TOUCH %</span>
                            <strong>{touchPercentage || (category === 'SILVER' ? '80.0' : '91.6')}%</strong>
                          </div>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.62rem', fontWeight: 700 }}>100% PURE FINE</span>
                            <strong style={{ color: '#15803d' }}>
                              {Number((Number(weightGrams) || 0) * (Number(touchPercentage) || (category === 'SILVER' ? 80.0 : 91.6)) / 100).toFixed(3)} g
                            </strong>
                          </div>
                        </div>
                      </div>
                    )}

                    {notes && (
                      <div style={{ fontSize: '0.72rem', color: '#475569', fontStyle: 'italic', marginTop: '4px', background: '#f1f5f9', padding: '3px 6px', borderRadius: '4px' }}>
                        "{toStartCase(notes)}"
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Toggle Mode & Category Buttons */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.65rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ display: 'flex', background: '#f1f5f9', padding: '2px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                <button
                  type="button"
                  onClick={() => setDirection('OUTGOING')}
                  style={{ padding: '5px 12px', borderRadius: '6px', border: 'none', background: direction === 'OUTGOING' ? '#075e54' : 'transparent', color: direction === 'OUTGOING' ? '#fff' : '#475569', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}
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

              <div style={{ display: 'flex', gap: '0.3rem' }}>
                {(['GOLD', 'SILVER', 'CASH', 'ORNAMENT'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setCategory(cat);
                      if (cat === 'SILVER') setTouchPercentage('80.0');
                      if (cat === 'GOLD') setTouchPercentage('91.6');
                    }}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '6px',
                      border: category === cat ? '1.5px solid #d97706' : '1px solid #cbd5e1',
                      background: category === cat ? '#fef3c7' : '#ffffff',
                      color: category === cat ? '#b45309' : '#475569',
                      fontWeight: category === cat ? 800 : 600,
                      fontSize: '0.74rem',
                      cursor: 'pointer',
                    }}
                  >
                    {cat === 'GOLD' ? '🥇 Gold' : cat === 'SILVER' ? '🥈 Silver' : cat === 'CASH' ? '💵 Cash' : '👑 Ornament'}
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic Parameter Inputs with Field Labels */}
            <div style={{ display: 'grid', gridTemplateColumns: category === 'CASH' ? '1.5fr 2fr auto' : '1.2fr 1fr 1fr 1.5fr auto', gap: '0.65rem', alignItems: 'flex-end' }}>

              {category === 'CASH' ? (
                <div>
                  <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#475569', marginBottom: '3px', textTransform: 'uppercase' }}>
                    💵 Cash Amount (₹)
                  </label>
                  <input
                    type="number"
                    placeholder="Amount Cash (₹)..."
                    value={amountCash}
                    onChange={(e) => setAmountCash(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none' }}
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#475569', marginBottom: '3px', textTransform: 'uppercase' }}>
                      🏷️ Metal / Item Name
                    </label>
                    <input
                      type="text"
                      placeholder={category === 'ORNAMENT' ? 'Ornament Name...' : 'Gold Item...'}
                      value={itemName}
                      onChange={(e) => setItemName(e.target.value)}
                      style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#475569', marginBottom: '3px', textTransform: 'uppercase' }}>
                      ⚖️ Gross Wt (g)
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
                    <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#475569', marginBottom: '3px', textTransform: 'uppercase' }}>
                      🎯 Touch Purity (%)
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
                <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#475569', marginBottom: '3px', textTransform: 'uppercase' }}>
                  📝 Remarks / Notes
                </label>
                <input
                  type="text"
                  placeholder="Add notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none' }}
                />
              </div>

              {/* Photo attachment & Send Button */}
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Attach Photos"
                  style={{ padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <i className="fa-solid fa-camera" style={{ color: '#0284c7' }}></i>
                  {photos.length > 0 && <span style={{ background: '#d97706', color: '#fff', borderRadius: '50%', padding: '2px 6px', fontSize: '0.65rem' }}>{photos.length}</span>}
                </button>

                <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileChange} style={{ display: 'none' }} />

                <button
                  type="submit"
                  disabled={isSending}
                  style={{ padding: '0.55rem 1.25rem', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #075e54 0%, #128c7e 100%)', color: '#ffffff', fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 8px rgba(7, 94, 84, 0.3)' }}
                >
                  <i className="fa-solid fa-paper-plane"></i> Send
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* ── WORKER PROFILE INFORMATION DIALOG MODAL ── */}
      {showWorkerModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#ffffff', borderRadius: '20px', maxWidth: '460px', width: '100%', padding: '1.5rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid #cbd5e1' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-id-card" style={{ color: '#d97706' }}></i>
                Worker Profile Information
              </h3>
              <button
                type="button"
                onClick={() => setShowWorkerModal(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Worker Avatar & Name Banner (Clickable to Expand Photo) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '1rem', marginBottom: '1.25rem' }}>
              {worker.photo_url ? (
                <img
                  src={worker.photo_url}
                  alt={worker.name}
                  onClick={() => setPreviewImageData({ url: worker.photo_url, title: `${worker.name} Profile Picture` })}
                  style={{ width: '58px', height: '58px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #d97706', boxShadow: '0 3px 10px rgba(180, 83, 9, 0.3)', cursor: 'pointer', flexShrink: 0 }}
                  title="Click to view full profile photo"
                />
              ) : (
                <div style={{ width: '58px', height: '58px', borderRadius: '50%', background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.5rem', boxShadow: '0 3px 10px rgba(180, 83, 9, 0.3)', flexShrink: 0 }}>
                  {worker.name.charAt(0)}
                </div>
              )}
              <div>
                <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                  {worker.name}
                  <span style={{ fontSize: '0.72rem', color: '#0284c7', background: '#e0f2fe', padding: '2px 8px', borderRadius: '10px', marginLeft: '6px' }}>{worker.id}</span>
                </h4>
                <span style={{ fontSize: '0.78rem', color: '#b45309', fontWeight: 700 }}>
                  🛠️ {worker.specialization || 'Goldsmith Artisan'}
                </span>
              </div>
            </div>

            {/* Detailed Information Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.82rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>📞 Phone Number:</span>
                <strong style={{ color: '#0f172a' }}>{worker.phone || 'N/A'}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>📍 Address:</span>
                <strong style={{ color: '#0f172a' }}>{worker.address || 'Siddipet'}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>📦 Assigned Orders:</span>
                <strong style={{ color: '#d97706' }}>{worker.assigned_orders_count || 0} Orders</strong>
              </div>

              {worker.notes && (
                <div style={{ padding: '8px 12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <span style={{ color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '2px' }}>📝 Notes & Remarks:</span>
                  <span style={{ color: '#334155', fontStyle: 'italic' }}>"{worker.notes}"</span>
                </div>
              )}
            </div>

            <div style={{ textAlign: 'right' }}>
              <button
                type="button"
                onClick={() => setShowWorkerModal(false)}
                style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', border: 'none', background: '#475569', color: '#ffffff', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── FULL-SCREEN IMAGE LIGHTBOX MODAL & WHATSAPP SHARE ── */}
      {previewImageData && (
        <FullImagePreviewModal
          imageUrl={previewImageData.url}
          title={previewImageData.title}
          onClose={() => setPreviewImageData(null)}
        />
      )}
    </div>
  );
};
