import React, { useState, useEffect, useRef } from 'react';

import { API_BASE } from '../config/apiConfig';

// ── Types ──────────────────────────────────────────────────────────────────
interface LoanRecord {
  id: string;
  customer_id: string;
  loan_date: string;
  customer_name: string;
  customer_surname: string;
  customer_phone: string;
  customer_address?: string;
  amount: number;
  interest_rate_percent: number;
  timeline_months: number;
  monthly_interest: number;
  total_interest: number;
  total_payable: number;
  item_name: string;
  item_weight_grams: number;
  item_purity_percent: number;
  item_metal_type: 'gold' | 'silver';
  item_pure_weight: number;
  item_metal_rate_per_gram: number;
  item_total_value: number;
  item_image_url?: string;
  status: 'OPEN' | 'CLOSED';
  actual_timeline_till_date?: string;
  total_interest_till_today?: number;
  total_payable_till_today?: number;
  month_wise_count?: number;
  month_wise_interest?: number;
  final_consideration_interest_amount?: number;
  closing_date?: string;
  considered_type?: string;
}

interface MetalRates {
  gold_rate_per_gram: number;
  silver_rate_per_gram: number;
}

const INTEREST_RATES = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];
const TIMELINE_MONTHS = Array.from({ length: 24 }, (_, i) => i + 1);

// ── FinanceModule ──────────────────────────────────────────────────────────
export const FinanceModule: React.FC<{ globalSearch?: string }> = ({ globalSearch = '' }) => {
  const [ledger, setLedger] = useState<LoanRecord[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(globalSearch);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed' | 'overdue'>('all');
  const [metalFilter, setMetalFilter] = useState<'all' | 'gold' | 'silver'>('all');
  const [metalRates, setMetalRates] = useState<MetalRates>({ gold_rate_per_gram: 1420, silver_rate_per_gram: 25 });
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Full-size Image Preview Lightbox Modal State
  const [selectedLedgerImage, setSelectedLedgerImage] = useState<{ url: string; title: string; subtitle: string } | null>(null);

  // Settlement Confirmation Modal State
  const [confirmCompleteRecord, setConfirmCompleteRecord] = useState<LoanRecord | null>(null);
  const [selectedInterestOption, setSelectedInterestOption] = useState<'till_today' | 'month_wise'>('till_today');
  const [completingLoan, setCompletingLoan] = useState(false);

  // Custom Dropdown Popover States
  const [openRateSelect, setOpenRateSelect] = useState(false);
  const [openTimelineSelect, setOpenTimelineSelect] = useState(false);
  const [openCalendar, setOpenCalendar] = useState(false);
  const [calendarViewDate, setCalendarViewDate] = useState<Date>(new Date());
  const rateDropdownRef = useRef<HTMLDivElement>(null);
  const timelineDropdownRef = useRef<HTMLDivElement>(null);
  const calendarDropdownRef = useRef<HTMLDivElement>(null);

  // Click outside to close custom dropdown popovers
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (rateDropdownRef.current && !rateDropdownRef.current.contains(e.target as Node)) {
        setOpenRateSelect(false);
      }
      if (timelineDropdownRef.current && !timelineDropdownRef.current.contains(e.target as Node)) {
        setOpenTimelineSelect(false);
      }
      if (calendarDropdownRef.current && !calendarDropdownRef.current.contains(e.target as Node)) {
        setOpenCalendar(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Live Webcam Modal State
  const [showWebcam, setShowWebcam] = useState(false);
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      setWebcamStream(stream);
      setShowWebcam(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      // If live webcam fails or denied, fallback to native camera file input
      cameraInputRef.current?.click();
    }
  };

  const stopWebcam = () => {
    if (webcamStream) {
      webcamStream.getTracks().forEach(track => track.stop());
      setWebcamStream(null);
    }
    setShowWebcam(false);
  };

  const captureWebcamPhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
          handleImageChange(file);
        }
      }, 'image/jpeg', 0.9);
    }
    stopWebcam();
  };

  // ── Form State ────────────────────────────────────────────────────────────
  const emptyForm = {
    loan_date: new Date().toISOString().split('T')[0],
    customer_name: '',
    customer_surname: '',
    customer_phone: '',
    customer_address: '',
    amount: '',
    interest_rate_percent: '3',
    timeline_months: '3',
    item_name: '',
    item_weight_grams: '',
    item_purity_percent: '',
    item_metal_type: 'gold' as 'gold' | 'silver',
    item_image_url: '',
  };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => { setSearchTerm(globalSearch); }, [globalSearch]);
  useEffect(() => { fetchData(); fetchMetalRates(); }, []);

  // Prevent mouse wheel from changing input values when scrolling over focused number inputs
  useEffect(() => {
    const handleWheel = () => {
      if (document.activeElement instanceof HTMLInputElement && document.activeElement.type === 'number') {
        document.activeElement.blur();
      }
    };
    window.addEventListener('wheel', handleWheel, { passive: true });
    return () => window.removeEventListener('wheel', handleWheel);
  }, []);

  const fetchMetalRates = async () => {
    try {
      const res = await fetch(`${API_BASE}/finance/metal-rates`);
      const data = await res.json();
      if (data.success) {
        setMetalRates({
          gold_rate_per_gram: data.gold_rate_per_gram,
          silver_rate_per_gram: data.silver_rate_per_gram,
        });
      }
    } catch { /* use defaults */ }
  };

  const fetchData = async () => {
    try {
      const res = await fetch(`${API_BASE}/finance/overview`);
      const data = await res.json();
      if (data.success) { setLedger(data.ledger || []); setSummary(data.summary); }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  // ── Derived calculations ──────────────────────────────────────────────────
  const ratePerGram = form.item_metal_type === 'gold' ? metalRates.gold_rate_per_gram : metalRates.silver_rate_per_gram;
  const pureWeight = Number(form.item_weight_grams) * (Number(form.item_purity_percent) / 100);
  const itemTotalValue = pureWeight * ratePerGram;
  const monthlyInterest = Number(form.amount) * (Number(form.interest_rate_percent) / 100);
  const totalInterest = monthlyInterest * Number(form.timeline_months);
  const totalPayable = Number(form.amount) + totalInterest;

  // ── Image Local Selection (preview only — deferred upload to submit) ─────
  const handleImageChange = (file: File) => {
    if (!file) return;
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  // ── Submit Loan (Uploads image to bucket ONLY when submit button is clicked) ─
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customer_name || !form.customer_surname || !form.customer_phone ||
      !form.amount || !form.item_name || !form.item_weight_grams || !form.item_purity_percent) {
      alert('Please fill all required fields.');
      return;
    }
    setSubmitting(true);
    try {
      let finalImageUrl = form.item_image_url;

      // Upload image to bucket ONLY now upon explicit submit
      if (selectedFile) {
        setImageUploading(true);
        const formData = new FormData();
        formData.append('image', selectedFile);

        const uploadRes = await fetch(`${API_BASE}/finance/upload-image`, {
          method: 'POST',
          body: formData,
        });
        const uploadData = await uploadRes.json();

        if (!uploadData.success) {
          alert('Image upload to storage failed: ' + uploadData.message);
          setSubmitting(false);
          setImageUploading(false);
          return;
        }
        finalImageUrl = uploadData.url;
        setImageUploading(false);
      }

      const payload = {
        ...form,
        amount: Number(form.amount),
        interest_rate_percent: Number(form.interest_rate_percent),
        timeline_months: Number(form.timeline_months),
        item_weight_grams: Number(form.item_weight_grams),
        item_purity_percent: Number(form.item_purity_percent),
        item_metal_rate_per_gram: ratePerGram,
        item_image_url: finalImageUrl || null,
      };

      const res = await fetch(`${API_BASE}/finance/debt/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setLedger(prev => [data.record, ...prev]);
        setShowModal(false);
        setForm(emptyForm);
        setSelectedFile(null);
        setImagePreview(null);
        fetchData(); // refresh summary
      } else {
        alert('Failed to create loan: ' + data.message);
      }
    } catch { alert('Server error, please try again.'); }
    finally { setSubmitting(false); }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setForm(emptyForm);
    setSelectedFile(null);
    setImagePreview(null);
  };

  const handleCompleteLoan = async (rec: LoanRecord) => {
    setCompletingLoan(true);
    const chosenInterest = selectedInterestOption === 'till_today'
      ? (rec.total_interest_till_today || 0)
      : (rec.month_wise_interest || 0);
    const chosenTypeStr = selectedInterestOption === 'till_today'
      ? 'Interest Till Today'
      : 'Month-Wise Interest';
    const closingDateStr = new Date().toISOString().split('T')[0];

    try {
      const res = await fetch(`${API_BASE}/finance/debt/${rec.id}/close`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          final_consideration_interest_amount: chosenInterest,
          closing_date: closingDateStr,
          considered_type: chosenTypeStr,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setLedger(prev => prev.map(r => r.id === rec.id ? {
          ...r,
          status: 'CLOSED',
          final_consideration_interest_amount: chosenInterest,
          closing_date: closingDateStr,
          considered_type: chosenTypeStr,
        } : r));
        setConfirmCompleteRecord(null);
        fetchData(); // refresh summary counts
      } else {
        alert('Failed to complete loan: ' + data.message);
      }
    } catch {
      alert('Server error while settling loan.');
    } finally {
      setCompletingLoan(false);
    }
  };

  const isRecordOverdue = (rec: LoanRecord) => {
    if (rec.status !== 'OPEN') return false;
    const diffDays = Math.max(0, Math.floor((new Date().getTime() - new Date(rec.loan_date).getTime()) / (1000 * 60 * 60 * 24)));
    return (diffDays / 30 > rec.timeline_months);
  };

  const overdueCount = ledger.filter(isRecordOverdue).length;

  const filteredLedger = ledger.filter(rec => {
    if (statusFilter === 'pending' && rec.status !== 'OPEN') return false;
    if (statusFilter === 'completed' && rec.status !== 'CLOSED') return false;
    if (statusFilter === 'overdue' && !isRecordOverdue(rec)) return false;
    if (metalFilter !== 'all' && rec.item_metal_type?.toLowerCase() !== metalFilter) return false;

    const match = rec.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.customer_surname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.customer_phone?.includes(searchTerm) ||
      rec.customer_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.item_name.toLowerCase().includes(searchTerm.toLowerCase());
    const d = new Date(rec.loan_date);
    if (startDate && d < new Date(startDate)) return false;
    if (endDate && d > new Date(endDate)) return false;
    return match;
  });

  // ────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ color: '#1e293b', fontFamily: "'Inter', 'DM Sans', sans-serif" }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: '1.15rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', color: '#0f172a', fontWeight: 800, margin: 0 }}>
            <i className="fa-solid fa-scale-balanced" style={{ color: '#6366f1', marginRight: '8px' }} />
            Girvi / Pledge Loan Ledger
          </h2>
          <p style={{ margin: '2px 0 0 0', color: '#64748b', fontSize: '0.8rem' }}>
            Customer pledge records with interest tracking — using live gold/silver buy rates
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', background: '#fff', padding: '0.4rem 0.75rem', borderRadius: '10px', border: '1px solid #e6decb' }}>
            <span style={{ fontSize: '0.72rem', color: '#786a5e' }}>From:</span>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ border: '1px solid #d4c7b8', borderRadius: '6px', padding: '0.3rem', fontSize: '0.78rem' }} />
            <span style={{ fontSize: '0.72rem', color: '#786a5e' }}>To:</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ border: '1px solid #d4c7b8', borderRadius: '6px', padding: '0.3rem', fontSize: '0.78rem' }} />
          </div>

          <button
            onClick={() => setShowModal(true)}
            style={{ padding: '8px 16px', background: 'linear-gradient(135deg, #d99b26 0%, #b45309 100%)', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px', boxShadow: '0 4px 14px rgba(180, 83, 9, 0.3)' }}
          >
            <i className="fa-solid fa-plus" /> Issue New Loan
          </button>
        </div>
      </div>

      {/* ── Summary Cards (First 2 Gold, Next 2 Silver - Styled like CustomerDirectoryView) ── */}
      <style>{`
        .finance-kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.75rem;
          margin-bottom: 1.25rem;
        }
        @media (max-width: 1024px) {
          .finance-kpi-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 640px) {
          .finance-kpi-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
      <div className="finance-kpi-grid">
        {[
          { label: 'TOTAL DEBT PRINCIPAL', value: `₹${(summary?.totalDebtIssued || 0).toLocaleString('en-IN')}`, sub: 'Active loan capital', icon: 'fa-briefcase', isGold: true },
          { label: 'INTEREST ACCRUED', value: `₹${(summary?.totalInterestEarned || 0).toLocaleString('en-IN')}`, sub: 'Live per-month interest', icon: 'fa-chart-line', isGold: true },
          { label: 'OPEN LOAN ACCOUNTS', value: String(summary?.activeOpenLoans || 0), sub: 'Active interest monthly', icon: 'fa-key', isGold: false },
          { label: 'CLOSED ACCOUNTS', value: String(summary?.totalClosedLoans || 0), sub: 'Fully settled', icon: 'fa-circle-check', isGold: false },
        ].map((card, i) => (
          <div
            key={i}
            style={{
              position: 'relative',
              overflow: 'hidden',
              background: card.isGold ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
              borderRadius: '12px',
              padding: '0.75rem 0.85rem',
              border: card.isGold ? '1px solid #d99b26' : '1px solid #94a3b8',
              boxShadow: card.isGold ? '0 4px 14px rgba(180,83,9,0.1)' : '0 4px 14px rgba(0,0,0,0.06)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <span style={{ fontSize: '0.65rem', fontWeight: 500, color: card.isGold ? '#78350f' : '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{card.label}</span>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.1, margin: '3px 0' }}>{card.value}</div>
              <span style={{ fontSize: '0.72rem', fontWeight: 400, color: card.isGold ? '#78350f' : '#64748b' }}>{card.sub}</span>
            </div>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: card.isGold ? '#b45309' : '#475569',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.9rem',
                flexShrink: 0,
              }}
            >
              <i className={`fa-solid ${card.icon}`} />
            </div>
          </div>
        ))}
      </div>

      {/* ── Loan Table ── */}
      <div style={{ background: '#fff', borderRadius: '16px', padding: '1.25rem', border: '1px solid #e6decb', boxShadow: '0 6px 20px rgba(24,19,16,0.03)', overflowX: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', color: '#181310', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="fa-solid fa-table-list" style={{ color: '#d97706' }} />
            Pledge Loan Interest Ledger
          </h3>

          {/* Status Filter Toggle Group (All / Pending / Completed) */}
          <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              style={{
                padding: '5px 14px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: statusFilter === 'all' ? '#ffffff' : 'transparent',
                color: statusFilter === 'all' ? '#4f46e5' : '#64748b',
                boxShadow: statusFilter === 'all' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.2s',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <i className="fa-solid fa-layer-group" /> All ({ledger.length})
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('pending')}
              style={{
                padding: '5px 14px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: statusFilter === 'pending' ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'transparent',
                color: statusFilter === 'pending' ? '#ffffff' : '#64748b',
                boxShadow: statusFilter === 'pending' ? '0 2px 6px rgba(245, 158, 11, 0.3)' : 'none',
                transition: 'all 0.2s',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <i className="fa-solid fa-clock-rotate-left" /> Pending ({ledger.filter(r => r.status === 'OPEN').length})
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('completed')}
              style={{
                padding: '5px 14px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: statusFilter === 'completed' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'transparent',
                color: statusFilter === 'completed' ? '#ffffff' : '#64748b',
                boxShadow: statusFilter === 'completed' ? '0 2px 6px rgba(16, 185, 129, 0.3)' : 'none',
                transition: 'all 0.2s',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <i className="fa-solid fa-circle-check" /> Completed ({ledger.filter(r => r.status === 'CLOSED').length})
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('overdue')}
              style={{
                padding: '5px 14px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: statusFilter === 'overdue' ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : 'transparent',
                color: statusFilter === 'overdue' ? '#ffffff' : '#64748b',
                boxShadow: statusFilter === 'overdue' ? '0 2px 6px rgba(239, 68, 68, 0.3)' : 'none',
                transition: 'all 0.2s',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <i className="fa-solid fa-triangle-exclamation" /> Overdue ({overdueCount})
            </button>
          </div>

          {/* Line 2: Gold & Silver Metal Filter Toggle Bar */}
          <div style={{ display: 'flex', gap: '0.4rem', background: '#f8fafc', padding: '3px', borderRadius: '10px', border: '1px solid #e2e8f0', width: 'fit-content', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setMetalFilter('all')}
              style={{
                padding: '4px 12px',
                borderRadius: '7px',
                border: 'none',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: metalFilter === 'all' ? 'linear-gradient(135deg, #475569 0%, #334155 100%)' : 'transparent',
                color: metalFilter === 'all' ? '#ffffff' : '#64748b',
                boxShadow: metalFilter === 'all' ? '0 2px 4px rgba(51, 65, 85, 0.25)' : 'none',
                transition: 'all 0.2s',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <i className="fa-solid fa-shapes" /> All Metals ({ledger.length})
            </button>

            <button
              type="button"
              onClick={() => setMetalFilter('gold')}
              style={{
                padding: '4px 12px',
                borderRadius: '7px',
                border: 'none',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: metalFilter === 'gold' ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'transparent',
                color: metalFilter === 'gold' ? '#ffffff' : '#b45309',
                boxShadow: metalFilter === 'gold' ? '0 2px 4px rgba(245, 158, 11, 0.3)' : 'none',
                transition: 'all 0.2s',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <i className="fa-solid fa-coins" /> Gold ({ledger.filter(r => r.item_metal_type?.toLowerCase() === 'gold').length})
            </button>

            <button
              type="button"
              onClick={() => setMetalFilter('silver')}
              style={{
                padding: '4px 12px',
                borderRadius: '7px',
                border: 'none',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: metalFilter === 'silver' ? 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)' : 'transparent',
                color: metalFilter === 'silver' ? '#ffffff' : '#64748b',
                boxShadow: metalFilter === 'silver' ? '0 2px 4px rgba(100, 116, 139, 0.3)' : 'none',
                transition: 'all 0.2s',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <i className="fa-solid fa-gem" /> Silver ({ledger.filter(r => r.item_metal_type?.toLowerCase() === 'silver').length})
            </button>
          </div>
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '1.5rem', marginBottom: '8px' }} />
            <p>Loading records...</p>
          </div>
        ) : (
          <table style={{ width: '100%', minWidth: '950px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #eaecf0', background: '#f8fafc', color: '#475569' }}>
                <th style={{ padding: '10px 12px' }}>Cust. ID</th>
                <th style={{ padding: '10px 12px' }}>Customer</th>
                <th style={{ padding: '10px 12px' }}>Item</th>
                <th style={{ padding: '10px 12px' }}>Amount</th>
                <th style={{ padding: '10px 12px' }}>Rate</th>
                <th style={{ padding: '10px 12px' }}>Monthly ₹</th>
                <th style={{ padding: '10px 12px' }}>Timeline</th>
                <th style={{ padding: '10px 12px' }}>Item Value</th>
                {statusFilter === 'completed' ? (
                  <th style={{ padding: '10px 12px' }}>Final Settled Interest</th>
                ) : (
                  <>
                    <th style={{ padding: '10px 12px' }}>Interest Till Today</th>
                    <th style={{ padding: '10px 12px' }}>Month-Wise Interest</th>
                  </>
                )}
                <th style={{ padding: '10px 12px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredLedger.length === 0 ? (
                <tr><td colSpan={statusFilter === 'completed' ? 10 : 11} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No loan records found.</td></tr>
              ) : filteredLedger.map(rec => (
                <tr key={rec.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 700, color: '#6366f1', fontSize: '0.78rem' }}>{rec.customer_id}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{rec.customer_name} {rec.customer_surname}</div>
                    <small style={{ color: '#64748b', display: 'block' }}>{rec.customer_phone}</small>
                    {rec.customer_address && <small style={{ color: '#94a3b8', fontSize: '0.68rem', display: 'block' }}><i className="fa-solid fa-location-dot" style={{ color: '#ef4444', marginRight: '3px' }} /> {rec.customer_address}</small>}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {rec.item_image_url && (
                        <img
                          src={rec.item_image_url}
                          alt={rec.item_name}
                          onClick={() => setSelectedLedgerImage({
                            url: rec.item_image_url!,
                            title: rec.item_name,
                            subtitle: `${rec.item_weight_grams}g · ${rec.item_purity_percent}% · ${rec.item_metal_type.toUpperCase()} · ${rec.customer_name} ${rec.customer_surname}`,
                          })}
                          title="Click to view full-size photo"
                          style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'cover', border: '1.5px solid #cbd5e1', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
                          onMouseEnter={e => e.currentTarget.style.borderColor = '#6366f1'}
                          onMouseLeave={e => e.currentTarget.style.borderColor = '#cbd5e1'}
                        />
                      )}
                      <div>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{rec.item_name}</div>
                        <small style={{ color: '#64748b' }}>{rec.item_weight_grams}g · {rec.item_purity_percent}% · {rec.item_metal_type}</small>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px', fontWeight: 700, color: '#b45309' }}>₹{Number(rec.amount).toLocaleString('en-IN')}</td>
                  <td style={{ padding: '10px 12px', color: '#4f46e5', fontWeight: 600 }}>{rec.interest_rate_percent}%</td>
                  <td style={{ padding: '10px 12px', fontWeight: 600, color: '#10b981' }}>₹{Number(rec.monthly_interest).toLocaleString('en-IN')}</td>
                  <td style={{ padding: '10px 12px', color: '#64748b' }}>{rec.timeline_months} mo</td>
                  <td style={{ padding: '10px 12px', fontWeight: 600 }}>₹{Number(rec.item_total_value).toLocaleString('en-IN')}</td>
                  {statusFilter === 'completed' ? (
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: '#059669' }}>
                      ₹{Number(rec.final_consideration_interest_amount ?? rec.total_interest_till_today ?? 0).toLocaleString('en-IN')}
                      <i className="fa-solid fa-circle-check" style={{ color: '#059669', marginLeft: '5px', fontSize: '0.85rem' }} title="Final Considered Settlement Interest" />
                    </td>
                  ) : (
                    <>
                      {/* Interest Till Today Column Cell */}
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: (rec.status === 'CLOSED' && (rec.considered_type === 'Interest Till Today' || !rec.considered_type)) ? '#059669' : rec.status === 'CLOSED' ? '#64748b' : '#10b981' }}>
                        {rec.status === 'CLOSED' ? (
                          (rec.considered_type === 'Interest Till Today' || !rec.considered_type) ? (
                            <>
                              ₹{Number(rec.final_consideration_interest_amount ?? rec.total_interest_till_today ?? 0).toLocaleString('en-IN')}
                              <i className="fa-solid fa-circle-check" style={{ color: '#059669', marginLeft: '5px', fontSize: '0.85rem' }} title="Settled Amount (Till Today)" />
                              <div style={{ fontSize: '0.68rem', color: '#7c3aed', fontWeight: 600 }}>Settled ({rec.closing_date})</div>
                            </>
                          ) : (
                            <>
                              <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>-</span>
                              <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 400 }}>Account Closed</div>
                            </>
                          )
                        ) : (
                          <>
                            ₹{(rec.total_interest_till_today || 0).toLocaleString('en-IN')}
                            <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 400 }}>{rec.actual_timeline_till_date}</div>
                          </>
                        )}
                      </td>

                      {/* Month-Wise Interest Column Cell */}
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: (rec.status === 'CLOSED' && rec.considered_type === 'Month-Wise Interest') ? '#059669' : rec.status === 'CLOSED' ? '#64748b' : '#4f46e5' }}>
                        {rec.status === 'CLOSED' ? (
                          rec.considered_type === 'Month-Wise Interest' ? (
                            <>
                              ₹{Number(rec.final_consideration_interest_amount ?? rec.month_wise_interest ?? 0).toLocaleString('en-IN')}
                              <i className="fa-solid fa-circle-check" style={{ color: '#059669', marginLeft: '5px', fontSize: '0.85rem' }} title="Settled Amount (Month-Wise)" />
                              <div style={{ fontSize: '0.68rem', color: '#7c3aed', fontWeight: 600 }}>Settled ({rec.closing_date})</div>
                            </>
                          ) : (
                            <>
                              <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>-</span>
                              <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 400 }}>Account Closed</div>
                            </>
                          )
                        ) : (
                          <>
                            ₹{(rec.month_wise_interest || 0).toLocaleString('en-IN')}
                            <div style={{ fontSize: '0.68rem', color: '#6366f1', fontWeight: 600 }}>
                              {rec.month_wise_count || 1} Month{(rec.month_wise_count || 1) > 1 ? 's' : ''} ({rec.interest_rate_percent}% / mo)
                            </div>
                          </>
                        )}
                      </td>
                    </>
                  )}
                  <td style={{ padding: '10px 12px' }}>
                    {rec.status?.toUpperCase() === 'OPEN' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                        <button
                          type="button"
                          onClick={() => setConfirmCompleteRecord(rec)}
                          title="Click to complete/settle this loan"
                          style={{ padding: '6px 14px', background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px', boxShadow: '0 2px 6px rgba(245, 158, 11, 0.25)', transition: 'all 0.2s' }}
                        >
                          <i className="fa-solid fa-clock-rotate-left" /> Pending
                        </button>
                        {isRecordOverdue(rec) && (
                          <span style={{ padding: '2px 8px', borderRadius: '4px', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: '0.66rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <i className="fa-solid fa-triangle-exclamation" /> Overdue
                          </span>
                        )}
                      </div>
                    ) : (
                      <div>
                        <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800, background: '#d1fae5', color: '#047857', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <i className="fa-solid fa-circle-check" /> Completed
                        </span>
                        {rec.closing_date && (
                          <div style={{ fontSize: '0.68rem', color: '#7c3aed', fontWeight: 700, marginTop: '3px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <i className="fa-solid fa-calendar-check" style={{ fontSize: '0.65rem' }} />
                            {rec.closing_date}
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Modal Overlay ── */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(6px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#ffffff', borderRadius: '24px', width: '100%', maxWidth: '860px', maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(15,23,42,0.25)', border: '1px solid #eaecf0' }}>

            {/* ── Modal Header ── */}
            <div style={{ padding: '1.25rem 1.75rem', borderBottom: '1px solid #eaecf0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#ffffff', zIndex: 10, borderRadius: '24px 24px 0 0', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#e0e7ff', padding: '2px 10px', borderRadius: '20px', fontSize: '0.68rem', color: '#4338ca', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                  <i className="fa-solid fa-scale-balanced" /> Girvi Loan Processing
                </div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a', fontWeight: 800, letterSpacing: '-0.3px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-hand-holding-dollar" style={{ color: '#6366f1' }} />
                  Issue New Pledge Loan
                </h3>
              </div>

              {/* Live Gold & Silver Metal Rates Header Badges */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '5px 12px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="fa-solid fa-coins" style={{ color: '#d97706', fontSize: '0.85rem' }} />
                  <span style={{ fontSize: '0.75rem', color: '#78350f', fontWeight: 700 }}>Gold:</span>
                  <span style={{ fontSize: '0.82rem', color: '#b45309', fontWeight: 800 }}>₹{metalRates.gold_rate_per_gram.toLocaleString('en-IN')}/g</span>
                </div>

                <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '5px 12px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="fa-solid fa-shield-halved" style={{ color: '#475569', fontSize: '0.85rem' }} />
                  <span style={{ fontSize: '0.75rem', color: '#334155', fontWeight: 700 }}>Silver:</span>
                  <span style={{ fontSize: '0.82rem', color: '#0f172a', fontWeight: 800 }}>₹{metalRates.silver_rate_per_gram.toLocaleString('en-IN')}/g</span>
                </div>

                <button onClick={handleCloseModal} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '34px', height: '34px', cursor: 'pointer', fontSize: '1rem', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', marginLeft: '4px' }}>
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '1.75rem' }}>

              {/* ── SECTION 1 (FIRST): Pledged Asset Details & Live Valuation ── */}
              <div style={{ background: '#fffbeb', borderRadius: '18px', padding: '1.25rem', border: '1px solid #fde68a', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.85rem', marginBottom: '1.15rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '30px', height: '30px', borderRadius: '10px', background: '#fef3c7', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>
                      <i className="fa-solid fa-gem" />
                    </div>
                    <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#78350f', fontWeight: 800, letterSpacing: '-0.2px' }}>
                      1. Pledged Asset Details & Live Valuation
                    </h4>
                  </div>

                  {/* Custom Floating Calendar Popover */}
                  <div style={{ position: 'relative' }} ref={calendarDropdownRef}>
                    <div
                      onClick={() => setOpenCalendar(!openCalendar)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: '#ffffff',
                        padding: '6px 14px',
                        borderRadius: '12px',
                        border: openCalendar ? '1.5px solid #f59e0b' : '1px solid #fcd34d',
                        boxShadow: openCalendar ? '0 0 0 3px rgba(245, 158, 11, 0.2)' : '0 2px 8px rgba(245, 158, 11, 0.08)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        userSelect: 'none',
                      }}
                    >
                      <div style={{ width: '26px', height: '26px', borderRadius: '8px', background: '#fef3c7', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>
                        <i className="fa-solid fa-calendar-days" />
                      </div>
                      <span style={{ fontSize: '0.78rem', color: '#78350f', fontWeight: 800 }}>Date *</span>
                      <span style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: 700 }}>{form.loan_date}</span>
                      <i className="fa-solid fa-chevron-down" style={{ fontSize: '0.72rem', color: '#b45309', transform: openCalendar ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', marginLeft: '4px' }} />
                    </div>

                    {/* Custom Calendar Dropdown Card (Exact match for custom dropdown popover) */}
                    {openCalendar && (
                      <div style={{
                        position: 'absolute',
                        top: '110%',
                        right: 0,
                        width: '280px',
                        background: '#ffffff',
                        borderRadius: '16px',
                        border: '1.5px solid #f59e0b',
                        boxShadow: '0 14px 36px rgba(0, 0, 0, 0.16)',
                        padding: '1rem',
                        zIndex: 150,
                      }}>
                        {/* Month / Year Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                          <button
                            type="button"
                            onClick={() => setCalendarViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                            style={{ background: '#fef3c7', border: 'none', color: '#b45309', width: '28px', height: '28px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}
                          >
                            <i className="fa-solid fa-chevron-left" style={{ fontSize: '0.75rem' }} />
                          </button>

                          <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>
                            {calendarViewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                          </span>

                          <button
                            type="button"
                            onClick={() => setCalendarViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                            style={{ background: '#fef3c7', border: 'none', color: '#b45309', width: '28px', height: '28px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}
                          >
                            <i className="fa-solid fa-chevron-right" style={{ fontSize: '0.75rem' }} />
                          </button>
                        </div>

                        {/* Day Headers */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', marginBottom: '4px' }}>
                          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                            <span key={day} style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8' }}>{day}</span>
                          ))}
                        </div>

                        {/* Days Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                          {(() => {
                            const year = calendarViewDate.getFullYear();
                            const month = calendarViewDate.getMonth();
                            const firstDay = new Date(year, month, 1).getDay();
                            const daysInMonth = new Date(year, month + 1, 0).getDate();
                            const grid = [];

                            // Empty leading slots
                            for (let i = 0; i < firstDay; i++) {
                              grid.push(<div key={`blank-${i}`} />);
                            }

                            // Days
                            for (let day = 1; day <= daysInMonth; day++) {
                              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                              const isSelected = form.loan_date === dateStr;
                              const isToday = new Date().toISOString().split('T')[0] === dateStr;

                              grid.push(
                                <button
                                  key={day}
                                  type="button"
                                  onClick={() => {
                                    setForm(f => ({ ...f, loan_date: dateStr }));
                                    setOpenCalendar(false);
                                  }}
                                  style={{
                                    height: '32px',
                                    width: '100%',
                                    borderRadius: '8px',
                                    border: isToday && !isSelected ? '1px solid #f59e0b' : 'none',
                                    background: isSelected ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : isToday ? '#fffbeb' : 'transparent',
                                    color: isSelected ? '#ffffff' : isToday ? '#b45309' : '#1e293b',
                                    fontWeight: isSelected || isToday ? 800 : 500,
                                    fontSize: '0.8rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.15s',
                                  }}
                                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#fef3c7'; }}
                                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = isToday ? '#fffbeb' : 'transparent'; }}
                                >
                                  {day}
                                </button>
                              );
                            }
                            return grid;
                          })()}
                        </div>

                        {/* Today Quick Select */}
                        <div style={{ marginTop: '0.75rem', paddingTop: '0.65rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <button
                            type="button"
                            onClick={() => {
                              const todayStr = new Date().toISOString().split('T')[0];
                              setForm(f => ({ ...f, loan_date: todayStr }));
                              setCalendarViewDate(new Date());
                              setOpenCalendar(false);
                            }}
                            style={{ padding: '4px 10px', background: '#fef3c7', border: 'none', borderRadius: '6px', fontSize: '0.72rem', color: '#b45309', fontWeight: 800, cursor: 'pointer' }}
                          >
                            Set Today
                          </button>
                          <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Selected: <strong>{form.loan_date}</strong></span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.15rem' }}>
                  {/* Image Upload Area */}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}><i className="fa-solid fa-camera" style={{ color: '#b45309', marginRight: '4px' }} /> Pledged Item Photo</label>

                    {/* Hidden inputs */}
                    <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleImageChange(e.target.files[0])} />
                    <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleImageChange(e.target.files[0])} />

                    {imagePreview ? (
                      /* Preview Card */
                      <div style={{ background: '#ffffff', borderRadius: '14px', padding: '0.85rem 1.15rem', border: '1px solid #10b981', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.08)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                          <div style={{ position: 'relative', width: '56px', height: '56px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0, border: '1px solid #e2e8f0' }}>
                            <img src={imagePreview} alt="Item preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            {imageUploading && (
                              <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <i className="fa-solid fa-spinner fa-spin" style={{ color: '#6366f1' }} />
                              </div>
                            )}
                          </div>
                          <div>
                            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>Pledged Item Photo Attached</div>
                            {imageUploading ? (
                              <span style={{ fontSize: '0.72rem', color: '#6366f1', fontWeight: 600 }}><i className="fa-solid fa-spinner fa-spin" /> Uploading image...</span>
                            ) : (
                              <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 600 }}><i className="fa-solid fa-circle-check" /> Image attached</span>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => { setSelectedFile(null); setImagePreview(null); setForm(f => ({ ...f, item_image_url: '' })); }}
                          style={{ padding: '6px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px', transition: 'all 0.2s' }}
                        >
                          <i className="fa-solid fa-trash-can" /> Remove
                        </button>
                      </div>
                    ) : (
                      /* Drag & Drop Upload Zone */
                      <div
                        style={{ background: '#ffffff', borderRadius: '16px', border: '2px dashed #f59e0b', padding: '1.25rem 1rem', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', marginTop: '0.25rem' }}
                      >
                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#fef3c7', color: '#d97706', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.35rem', marginBottom: '0.5rem' }}>
                          <i className="fa-solid fa-cloud-arrow-up" />
                        </div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', marginBottom: '2px' }}>
                          Upload Pledged Item Photo
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '0.85rem' }}>
                          Supports JPEG, PNG, WebP · Max 5MB
                        </div>

                        <div style={{ display: 'flex', gap: '0.65rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            style={{ padding: '8px 16px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '0.78rem', color: '#334155', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
                          >
                            <i className="fa-solid fa-folder-open" style={{ color: '#6366f1' }} /> Browse Gallery
                          </button>
                          <button
                            type="button"
                            onClick={startWebcam}
                            style={{ padding: '8px 16px', background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', color: '#ffffff', border: 'none', borderRadius: '10px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 8px rgba(14, 165, 233, 0.3)' }}
                          >
                            <i className="fa-solid fa-camera" /> Live Camera
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Item Name */}
                  <div>
                    <label style={labelStyle}>Item Name *</label>
                    <input type="text" required placeholder="e.g. 22K Gold Bangle Set" value={form.item_name} onChange={e => setForm(f => ({ ...f, item_name: e.target.value }))} style={inputStyle} />
                  </div>

                  {/* Metal Type Selector */}
                  <div>
                    <label style={labelStyle}>Metal Type *</label>
                    <div style={{ display: 'flex', gap: '6px', background: '#ffffff', padding: '3px', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                      <button
                        type="button"
                        onClick={() => setForm(f => ({ ...f, item_metal_type: 'gold' }))}
                        style={{ flex: 1, padding: '7px', borderRadius: '8px', border: 'none', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', background: form.item_metal_type === 'gold' ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'transparent', color: form.item_metal_type === 'gold' ? '#ffffff' : '#64748b', transition: 'all 0.2s' }}
                      >
                        <i className="fa-solid fa-coins" /> Gold
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm(f => ({ ...f, item_metal_type: 'silver' }))}
                        style={{ flex: 1, padding: '7px', borderRadius: '8px', border: 'none', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', background: form.item_metal_type === 'silver' ? 'linear-gradient(135deg, #64748b 0%, #475569 100%)' : 'transparent', color: form.item_metal_type === 'silver' ? '#ffffff' : '#64748b', transition: 'all 0.2s' }}
                      >
                        <i className="fa-solid fa-shield-halved" /> Silver
                      </button>
                    </div>
                  </div>

                  {/* Weight */}
                  <div>
                    <label style={labelStyle}>Item Weight (Grams) *</label>
                    <input type="number" required step="0.001" min="0.001" placeholder="10.000" value={form.item_weight_grams} onChange={e => setForm(f => ({ ...f, item_weight_grams: e.target.value }))} onWheel={e => e.currentTarget.blur()} style={inputStyle} />
                  </div>

                  {/* Purity */}
                  <div>
                    <label style={labelStyle}>Item Purity (%) *</label>
                    <input type="number" required step="0.01" min="1" max="100" placeholder="70.00" value={form.item_purity_percent} onChange={e => setForm(f => ({ ...f, item_purity_percent: e.target.value }))} onWheel={e => e.currentTarget.blur()} style={inputStyle} />
                  </div>
                </div>

                {/* Live Asset Valuation Box */}
                {Number(form.item_weight_grams) > 0 && Number(form.item_purity_percent) > 0 && (
                  <div style={{ marginTop: '1.15rem', background: '#ffffff', borderRadius: '14px', padding: '1.15rem', border: '1px solid #fcd34d', boxShadow: '0 4px 14px rgba(245, 158, 11, 0.08)' }}>
                    <div style={{ fontSize: '0.7rem', color: '#b45309', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i className="fa-solid fa-calculator" style={{ color: '#d97706' }} /> Live Metal Asset Valuation Breakdown
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem' }}>
                      <div>
                        <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Pure Metal Weight</span>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '2px 0' }}>{pureWeight.toFixed(3)} grams</div>
                        <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{form.item_weight_grams}g × {form.item_purity_percent}%</span>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Current {form.item_metal_type === 'gold' ? 'Gold' : 'Silver'} Buy Rate</span>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '2px 0' }}>₹{ratePerGram.toLocaleString('en-IN')}/g</div>
                        <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Rate from DB</span>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.68rem', color: '#b45309', fontWeight: 700 }}>Total Calculated Asset Value</span>
                        <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#b45309', margin: '2px 0' }}>₹{itemTotalValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
                        <span style={{ fontSize: '0.68rem', color: '#b45309' }}>{pureWeight.toFixed(3)}g × ₹{ratePerGram}/g</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ── SECTION 2 (SECOND): Customer Profile & Financial Terms ── */}
              <div style={{ background: '#f8fafc', borderRadius: '18px', padding: '1.25rem', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.15rem' }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '10px', background: '#e0e7ff', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>
                    <i className="fa-solid fa-user-tie" />
                  </div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#0f172a', fontWeight: 800, letterSpacing: '-0.2px' }}>
                    2. Customer Profile & Financial Terms
                  </h4>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1.15rem' }}>
                  {/* Name */}
                  <div>
                    <label style={labelStyle}>First Name *</label>
                    <input type="text" required placeholder="Ramesh" value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} style={inputStyle} />
                  </div>
                  {/* Surname */}
                  <div>
                    <label style={labelStyle}>Surname *</label>
                    <input type="text" required placeholder="Patel" value={form.customer_surname} onChange={e => setForm(f => ({ ...f, customer_surname: e.target.value }))} style={inputStyle} />
                  </div>
                  {/* Phone */}
                  <div>
                    <label style={labelStyle}>Phone Number *</label>
                    <input type="tel" inputMode="numeric" pattern="[0-9]*" required placeholder="9876543210" maxLength={10} value={form.customer_phone} onChange={e => setForm(f => ({ ...f, customer_phone: e.target.value.replace(/\D/g, '') }))} style={inputStyle} />
                  </div>
                  {/* Address */}
                  <div>
                    <label style={labelStyle}>Address *</label>
                    <input type="text" required placeholder="Main Street, House No. 12, Hyderabad" value={form.customer_address} onChange={e => setForm(f => ({ ...f, customer_address: e.target.value }))} style={inputStyle} />
                  </div>
                  {/* Amount */}
                  <div>
                    <label style={labelStyle}>Loan Amount (Principal ₹) *</label>
                    <input type="number" required min="1" placeholder="50000" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} onWheel={e => e.currentTarget.blur()} style={{ ...inputStyle, fontWeight: 700, color: '#0f172a' }} />
                  </div>
                  {/* Rate (Custom Floating Dropdown matching user screenshot) */}
                  <div style={{ position: 'relative' }} ref={rateDropdownRef}>
                    <label style={labelStyle}>Rate of Interest (%) *</label>
                    <div
                      onClick={() => { setOpenRateSelect(!openRateSelect); setOpenTimelineSelect(false); }}
                      style={{
                        ...inputStyle,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        fontWeight: 600,
                        color: '#0f172a',
                        border: openRateSelect ? '1.5px solid #3b82f6' : '1px solid #cbd5e1',
                        boxShadow: openRateSelect ? '0 0 0 3px rgba(59, 130, 246, 0.15)' : 'none',
                        transition: 'all 0.2s',
                        userSelect: 'none',
                      }}
                    >
                      <span>{form.interest_rate_percent}% per month (₹{form.interest_rate_percent} for ₹100)</span>
                      <i className="fa-solid fa-chevron-down" style={{ fontSize: '0.75rem', color: '#6366f1', transform: openRateSelect ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                    </div>

                    {/* Floating Menu Popover (Exact UI matching user screenshot) */}
                    {openRateSelect && (
                      <div style={{
                        position: 'absolute',
                        top: '105%',
                        left: 0,
                        right: 0,
                        background: '#ffffff',
                        borderRadius: '12px',
                        border: '1.5px solid #3b82f6',
                        boxShadow: '0 12px 28px rgba(0, 0, 0, 0.12)',
                        padding: '6px',
                        zIndex: 100,
                        maxHeight: '220px',
                        overflowY: 'auto',
                      }}>
                        {INTEREST_RATES.map(r => {
                          const valStr = String(r);
                          const isSelected = String(form.interest_rate_percent) === valStr;
                          return (
                            <div
                              key={r}
                              onClick={() => {
                                setForm(f => ({ ...f, interest_rate_percent: valStr }));
                                setOpenRateSelect(false);
                              }}
                              style={{
                                padding: '8px 12px',
                                borderRadius: '8px',
                                fontSize: '0.84rem',
                                color: '#0f172a',
                                fontWeight: isSelected ? 700 : 500,
                                background: isSelected ? '#f1f5f9' : 'transparent',
                                cursor: 'pointer',
                                transition: 'background 0.15s',
                                marginBottom: '2px',
                              }}
                              onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f8fafc'; }}
                              onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                            >
                              {r}% per month (₹{r} for ₹100)
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Timeline (Custom Floating Dropdown matching user screenshot) */}
                  <div style={{ position: 'relative' }} ref={timelineDropdownRef}>
                    <label style={labelStyle}>Timeline (Months) *</label>
                    <div
                      onClick={() => { setOpenTimelineSelect(!openTimelineSelect); setOpenRateSelect(false); }}
                      style={{
                        ...inputStyle,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        fontWeight: 600,
                        color: '#0f172a',
                        border: openTimelineSelect ? '1.5px solid #3b82f6' : '1px solid #cbd5e1',
                        boxShadow: openTimelineSelect ? '0 0 0 3px rgba(59, 130, 246, 0.15)' : 'none',
                        transition: 'all 0.2s',
                        userSelect: 'none',
                      }}
                    >
                      <span>{form.timeline_months} {Number(form.timeline_months) === 1 ? 'Month Timeline' : 'Months Timeline'}</span>
                      <i className="fa-solid fa-chevron-down" style={{ fontSize: '0.75rem', color: '#6366f1', transform: openTimelineSelect ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                    </div>

                    {/* Floating Menu Popover (Exact UI matching user screenshot) */}
                    {openTimelineSelect && (
                      <div style={{
                        position: 'absolute',
                        top: '105%',
                        left: 0,
                        right: 0,
                        background: '#ffffff',
                        borderRadius: '12px',
                        border: '1.5px solid #3b82f6',
                        boxShadow: '0 12px 28px rgba(0, 0, 0, 0.12)',
                        padding: '6px',
                        zIndex: 100,
                        maxHeight: '220px',
                        overflowY: 'auto',
                      }}>
                        {TIMELINE_MONTHS.map(m => {
                          const valStr = String(m);
                          const isSelected = form.timeline_months === valStr;
                          return (
                            <div
                              key={m}
                              onClick={() => {
                                setForm(f => ({ ...f, timeline_months: valStr }));
                                setOpenTimelineSelect(false);
                              }}
                              style={{
                                padding: '8px 12px',
                                borderRadius: '8px',
                                fontSize: '0.84rem',
                                color: '#0f172a',
                                fontWeight: isSelected ? 700 : 500,
                                background: isSelected ? '#f1f5f9' : 'transparent',
                                cursor: 'pointer',
                                transition: 'background 0.15s',
                                marginBottom: '2px',
                              }}
                              onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f8fafc'; }}
                              onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                            >
                              {m} {m === 1 ? 'Month Timeline' : 'Months Timeline'}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Live Interest Breakdown Card */}
                {Number(form.amount) > 0 && (
                  <div style={{ marginTop: '1.15rem', background: '#ffffff', borderRadius: '14px', padding: '1.15rem', border: '1px solid #c4b5fd', boxShadow: '0 4px 14px rgba(99, 102, 241, 0.08)' }}>
                    <div style={{ fontSize: '0.7rem', color: '#4f46e5', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i className="fa-solid fa-chart-pie" style={{ color: '#6366f1' }} /> Live Monthly & Total Interest Summary
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                      <div>
                        <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Loan Amount</span>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '2px 0' }}>₹{Number(form.amount).toLocaleString('en-IN')}</div>
                        <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Principal Issued</span>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Monthly Interest</span>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#4f46e5', margin: '2px 0' }}>₹{monthlyInterest.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
                        <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>₹{form.amount} × {form.interest_rate_percent}% / mo</span>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Total Interest ({form.timeline_months} mo)</span>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#4f46e5', margin: '2px 0' }}>₹{totalInterest.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
                        <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>₹{monthlyInterest.toFixed(2)} × {form.timeline_months} mo</span>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.68rem', color: '#059669', fontWeight: 700 }}>Total Amount Payable</span>
                        <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#059669', margin: '2px 0' }}>₹{totalPayable.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
                        <span style={{ fontSize: '0.68rem', color: '#059669' }}>Principal + Accrued Interest</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Modal Action Footer ── */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.85rem', marginTop: '1.5rem', paddingTop: '1.15rem', borderTop: '1px solid #eaecf0' }}>
                <button type="button" onClick={handleCloseModal} style={{ padding: '11px 22px', background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 700, color: '#ffffff', fontSize: '0.85rem', boxShadow: '0 4px 14px rgba(239, 68, 68, 0.3)', transition: 'all 0.2s' }}>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || imageUploading}
                  style={{ padding: '11px 26px', background: submitting ? '#a5b4fc' : 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)', color: '#ffffff', border: 'none', borderRadius: '12px', fontWeight: 800, fontSize: '0.88rem', cursor: submitting ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)', transition: 'all 0.2s' }}
                >
                  {submitting ? <><i className="fa-solid fa-spinner fa-spin" /> Issuing Loan...</> : <><i className="fa-solid fa-check" /> Issue Pledge Loan Record</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Live Webcam Stream Modal Overlay ── */}

      {showWebcam && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#0f172a', borderRadius: '20px', padding: '1.25rem', width: '100%', maxWidth: '540px', boxShadow: '0 24px 64px rgba(0,0,0,0.5)', textAlign: 'center', border: '1px solid #334155' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
              <h4 style={{ margin: 0, color: '#f8fafc', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-camera" style={{ color: '#38bdf8' }} /> Camera Viewfinder
              </h4>
              <button type="button" onClick={stopWebcam} style={{ background: '#334155', border: 'none', color: '#94a3b8', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer' }}>
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            {/* Live Video Preview */}
            <div style={{ position: 'relative', width: '100%', background: '#000', borderRadius: '12px', overflow: 'hidden', minHeight: '260px' }}>
              <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%', maxHeight: '360px', objectFit: 'cover' }} />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '1rem' }}>
              <button
                type="button"
                onClick={stopWebcam}
                style={{ padding: '10px 20px', background: '#334155', color: '#f8fafc', border: 'none', borderRadius: '10px', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={captureWebcamPhoto}
                style={{ padding: '10px 24px', background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <i className="fa-solid fa-circle-dot" style={{ color: '#ef4444' }} /> Snap Photo & Upload
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── High-Resolution Item Photo Lightbox Modal Dialog ── */}
      {selectedLedgerImage && (
        <div
          onClick={() => setSelectedLedgerImage(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#ffffff', borderRadius: '24px', padding: '1.25rem', maxWidth: '580px', width: '100%', boxShadow: '0 24px 64px rgba(0,0,0,0.4)', position: 'relative', border: '1px solid #cbd5e1', textAlign: 'center' }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', paddingBottom: '0.65rem', borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <h4 style={{ margin: 0, color: '#0f172a', fontSize: '1.05rem', fontWeight: 800, textAlign: 'left' }}>
                  <i className="fa-solid fa-gem" style={{ color: '#d97706', marginRight: '6px' }} />
                  {selectedLedgerImage.title}
                </h4>
                <div style={{ fontSize: '0.75rem', color: '#64748b', textAlign: 'left', marginTop: '2px' }}>
                  {selectedLedgerImage.subtitle}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLedgerImage(null)}
                style={{ background: '#f1f5f9', border: 'none', color: '#64748b', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', transition: 'all 0.2s' }}
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            {/* High-Resolution Photo Display */}
            <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid #e2e8f0', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '260px', maxHeight: '440px' }}>
              <img
                src={selectedLedgerImage.url}
                alt={selectedLedgerImage.title}
                style={{ maxWidth: '100%', maxHeight: '440px', objectFit: 'contain', width: 'auto', height: 'auto' }}
              />
            </div>

            {/* Modal Action Footer */}
            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}><i className="fa-solid fa-shield-halved" /> Pledged Item Verification Photo</span>
              <button
                type="button"
                onClick={() => setSelectedLedgerImage(null)}
                style={{ padding: '8px 18px', background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Loan Settlement Confirmation Dialog Box ── */}
      {confirmCompleteRecord && (
        <div
          onClick={() => !completingLoan && setConfirmCompleteRecord(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(6px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#ffffff', borderRadius: '24px', padding: '1.5rem', maxWidth: '440px', width: '100%', boxShadow: '0 24px 64px rgba(0,0,0,0.3)', border: '1px solid #cbd5e1', textAlign: 'center', position: 'relative' }}
          >
            {/* Top-Right Cross Close Button */}
            <button
              type="button"
              onClick={() => !completingLoan && setConfirmCompleteRecord(null)}
              style={{ position: 'absolute', top: '14px', right: '14px', background: '#f1f5f9', border: 'none', color: '#64748b', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', transition: 'all 0.2s' }}
            >
              <i className="fa-solid fa-xmark" />
            </button>
            {/* Modal Icon & Header */}
            <div style={{ width: '54px', height: '54px', borderRadius: '16px', background: '#d1fae5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', margin: '0 auto 1rem auto' }}>
              <i className="fa-solid fa-circle-check" />
            </div>

            <h3 style={{ margin: '0 0 0.4rem 0', color: '#0f172a', fontSize: '1.15rem', fontWeight: 800 }}>
              Confirm Loan Settlement
            </h3>

            <p style={{ margin: '0 0 1rem 0', color: '#475569', fontSize: '0.82rem', lineHeight: 1.4 }}>
              Select the final settlement interest option for <strong style={{ color: '#0f172a' }}>{confirmCompleteRecord.customer_name} {confirmCompleteRecord.customer_surname}</strong> (<span style={{ color: '#6366f1' }}>{confirmCompleteRecord.item_name}</span>):
            </p>

            {/* Selectable Interest Options */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.15rem', textAlign: 'left' }}>
              {/* Option 1: Interest Till Today */}
              <div
                onClick={() => setSelectedInterestOption('till_today')}
                style={{
                  background: selectedInterestOption === 'till_today' ? '#ecfdf5' : '#ffffff',
                  border: selectedInterestOption === 'till_today' ? '2px solid #10b981' : '1px solid #cbd5e1',
                  borderRadius: '14px',
                  padding: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  position: 'relative',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: selectedInterestOption === 'till_today' ? '#047857' : '#64748b' }}>
                    Till Today (Daily)
                  </span>
                  <input
                    type="radio"
                    name="interestOption"
                    checked={selectedInterestOption === 'till_today'}
                    onChange={() => setSelectedInterestOption('till_today')}
                    style={{ accentColor: '#10b981', cursor: 'pointer' }}
                  />
                </div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: selectedInterestOption === 'till_today' ? '#047857' : '#0f172a' }}>
                  ₹{(confirmCompleteRecord.total_interest_till_today || 0).toLocaleString('en-IN')}
                </div>
                <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{confirmCompleteRecord.actual_timeline_till_date}</span>
              </div>

              {/* Option 2: Month-Wise Interest */}
              <div
                onClick={() => setSelectedInterestOption('month_wise')}
                style={{
                  background: selectedInterestOption === 'month_wise' ? '#e0e7ff' : '#ffffff',
                  border: selectedInterestOption === 'month_wise' ? '2px solid #6366f1' : '1px solid #cbd5e1',
                  borderRadius: '14px',
                  padding: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  position: 'relative',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: selectedInterestOption === 'month_wise' ? '#4338ca' : '#64748b' }}>
                    Month-Wise (Rounded)
                  </span>
                  <input
                    type="radio"
                    name="interestOption"
                    checked={selectedInterestOption === 'month_wise'}
                    onChange={() => setSelectedInterestOption('month_wise')}
                    style={{ accentColor: '#6366f1', cursor: 'pointer' }}
                  />
                </div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: selectedInterestOption === 'month_wise' ? '#4338ca' : '#0f172a' }}>
                  ₹{(confirmCompleteRecord.month_wise_interest || 0).toLocaleString('en-IN')}
                </div>
                <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{confirmCompleteRecord.month_wise_count || 1} Month{(confirmCompleteRecord.month_wise_count || 1) > 1 ? 's' : ''}</span>
              </div>
            </div>

            <div style={{ padding: '0.65rem 0.85rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#334155' }}>
              <span>Settlement Closing Date: <strong>{new Date().toISOString().split('T')[0]}</strong></span>
              <span>Final Interest: <strong style={{ color: '#059669' }}>₹{(selectedInterestOption === 'till_today' ? confirmCompleteRecord.total_interest_till_today : confirmCompleteRecord.month_wise_interest) || 0}</strong></span>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '1.25rem' }}>
              <button
                type="button"
                disabled={completingLoan}
                onClick={() => setConfirmCompleteRecord(null)}
                style={{ flex: 1, padding: '10px', background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '5px', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.25)' }}
              >
                <i className="fa-solid fa-xmark" /> Cancel
              </button>
              <button
                type="button"
                disabled={completingLoan}
                onClick={() => handleCompleteLoan(confirmCompleteRecord)}
                style={{ flex: 1, padding: '10px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }}
              >
                {completingLoan ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-check" />}
                Confirm Complete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


// ── Shared input styles ────────────────────────────────────────────────────
const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.75rem',
  fontWeight: 600,
  color: '#475569',
  marginBottom: '0.25rem',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.55rem 0.75rem',
  borderRadius: '8px',
  border: '1px solid #cbd5e1',
  fontSize: '0.875rem',
  outline: 'none',
  background: '#ffffff',
  boxSizing: 'border-box',
};

export default FinanceModule;
