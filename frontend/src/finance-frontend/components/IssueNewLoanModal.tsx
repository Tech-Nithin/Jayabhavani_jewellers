import React, { useState, useEffect, useRef } from 'react';
import { API_BASE } from '../../config/apiConfig';
import type { LoanRecord, MetalRates } from '../types';
import { INTEREST_RATES, TIMELINE_MONTHS } from '../types';
import { getFinanceTranslation, type Language } from '../financeTranslations';

interface IssueNewLoanModalProps {
  isOpen: boolean;
  editingRecord: LoanRecord | null;
  metalRates: MetalRates;
  lang?: Language;
  onClose: () => void;
  onSaveSuccess: () => void;
}

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
  item_deduction_name: '',
  item_deduction_weight: '',
  item_purity_percent: '',
  item_metal_type: 'gold' as 'gold' | 'silver' | 'cash',
  item_image_url: '',
};

export const IssueNewLoanModal: React.FC<IssueNewLoanModalProps> = ({
  isOpen,
  editingRecord,
  metalRates,
  lang = 'EN',
  onClose,
  onSaveSuccess,
}) => {
  const t = getFinanceTranslation(lang);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Custom Dropdown Popover States
  const [openRateSelect, setOpenRateSelect] = useState(false);
  const [openTimelineSelect, setOpenTimelineSelect] = useState(false);
  const [openCalendar, setOpenCalendar] = useState(false);
  const [calendarViewDate, setCalendarViewDate] = useState<Date>(new Date());
  const rateDropdownRef = useRef<HTMLDivElement>(null);
  const timelineDropdownRef = useRef<HTMLDivElement>(null);
  const calendarDropdownRef = useRef<HTMLDivElement>(null);

  // Live Webcam Modal State
  const [showWebcam, setShowWebcam] = useState(false);
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const [cameraFacingMode, setCameraFacingMode] = useState<'environment' | 'user'>('environment');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Click & focus outside to close custom dropdown popovers
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
    const handleFocusOutside = (e: FocusEvent) => {
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
    document.addEventListener('focusin', handleFocusOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('focusin', handleFocusOutside);
    };
  }, []);

  // Sync form state when modal opens or editingRecord changes
  useEffect(() => {
    if (isOpen) {
      if (editingRecord) {
        setForm({
          loan_date: editingRecord.loan_date || new Date().toISOString().split('T')[0],
          customer_name: editingRecord.customer_name || '',
          customer_surname: editingRecord.customer_surname || '',
          customer_phone: editingRecord.customer_phone || '',
          customer_address: editingRecord.customer_address || '',
          amount: String(editingRecord.amount || ''),
          interest_rate_percent: String(editingRecord.interest_rate_percent || '3'),
          timeline_months: String(editingRecord.timeline_months || '3'),
          item_name: editingRecord.item_name || '',
          item_weight_grams: String(editingRecord.item_weight_grams || ''),
          item_deduction_name: editingRecord.item_deduction_name || '',
          item_deduction_weight: String(editingRecord.item_deduction_weight_grams ?? editingRecord.item_deduction_weight ?? ''),
          item_purity_percent: String(editingRecord.item_purity_percent || ''),
          item_metal_type: (editingRecord.item_metal_type as 'gold' | 'silver' | 'cash') || 'gold',
          item_image_url: editingRecord.item_image_url || '',
        });
        setImagePreview(editingRecord.item_image_url || null);
      } else {
        setForm(emptyForm);
        setImagePreview(null);
        setSelectedFile(null);
      }
    }
  }, [isOpen, editingRecord]);

  const startWebcam = async (facing: 'environment' | 'user' = cameraFacingMode) => {
    setCameraFacingMode(facing);
    if (webcamStream) {
      webcamStream.getTracks().forEach((track) => track.stop());
      setWebcamStream(null);
    }
    setShowWebcam(true);
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } },
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }
      setWebcamStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch((err) => console.warn('Video play error:', err));
        };
      }
    } catch {
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

  const handleImageChange = (file: File) => {
    if (!file) return;
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  // Derived calculations
  const ratePerGram = form.item_metal_type === 'gold' ? metalRates.gold_rate_per_gram : metalRates.silver_rate_per_gram;
  const grossWeight = Number(form.item_weight_grams || 0);
  const deductionWeight = Number(form.item_deduction_weight || 0);
  const pureWeight = Math.max(0, (grossWeight - deductionWeight) * (Number(form.item_purity_percent || 0) / 100));
  const itemTotalValue = pureWeight * ratePerGram;
  const monthlyInterest = Number(form.amount) * (Number(form.interest_rate_percent) / 100);
  const totalInterest = monthlyInterest * Number(form.timeline_months);
  const totalPayable = Number(form.amount) + totalInterest;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isCash = form.item_metal_type === 'cash';

    if (!form.customer_name || !form.customer_surname || !form.customer_phone || !form.amount || !form.customer_address) {
      alert('Please fill all required customer and loan amount fields.');
      return;
    }
    if (!isCash && (!form.item_name || !form.item_weight_grams || !form.item_purity_percent)) {
      alert('Please fill all required item details.');
      return;
    }
    setSubmitting(true);
    try {
      let finalImageUrl = form.item_image_url;

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
        customer_id: undefined,
        item_name: isCash ? (form.item_name || 'Cash') : form.item_name,
        item_weight_grams: isCash ? 0 : Number(form.item_weight_grams),
        item_deduction_name: isCash ? '' : (form.item_deduction_name || ''),
        item_deduction_weight: isCash ? 0 : Number(form.item_deduction_weight || 0),
        item_deduction_weight_grams: isCash ? 0 : Number(form.item_deduction_weight || 0),
        item_purity_percent: isCash ? 0 : Number(form.item_purity_percent),
        amount: Number(form.amount),
        interest_rate_percent: Number(form.interest_rate_percent),
        timeline_months: Number(form.timeline_months),
        item_metal_rate_per_gram: isCash ? 0 : (ratePerGram || 0),
        item_image_url: finalImageUrl || null,
      };

      const res = await fetch(`${API_BASE}/finance/debt/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        onSaveSuccess();
      } else {
        alert('Failed to create loan: ' + data.message);
      }
    } catch {
      alert('Server error, please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    const isCash = form.item_metal_type === 'cash';
    setSubmitting(true);
    try {
      let finalImageUrl = form.item_image_url;
      if (selectedFile) {
        setImageUploading(true);
        const formData = new FormData();
        formData.append('image', selectedFile);
        const uploadRes = await fetch(`${API_BASE}/finance/upload-image`, { method: 'POST', body: formData });
        const uploadData = await uploadRes.json();
        if (!uploadData.success) {
          alert('Image upload failed: ' + uploadData.message);
          setSubmitting(false); setImageUploading(false); return;
        }
        finalImageUrl = uploadData.url;
        setImageUploading(false);
      }
      const payload = {
        customer_id: editingRecord.customer_id || undefined,
        loan_date: form.loan_date,
        customer_name: form.customer_name,
        customer_surname: form.customer_surname,
        customer_phone: form.customer_phone,
        customer_address: form.customer_address,
        amount: Number(form.amount),
        interest_rate_percent: Number(form.interest_rate_percent),
        timeline_months: Number(form.timeline_months),
        item_name: isCash ? 'Cash' : form.item_name,
        item_weight_grams: isCash ? 0 : Number(form.item_weight_grams),
        item_deduction_name: isCash ? '' : (form.item_deduction_name || ''),
        item_deduction_weight_grams: isCash ? 0 : Number(form.item_deduction_weight || 0),
        item_purity_percent: isCash ? 0 : Number(form.item_purity_percent),
        item_metal_type: form.item_metal_type,
        item_metal_rate_per_gram: isCash ? 0 : (ratePerGram || 0),
        item_image_url: finalImageUrl || undefined,
      };
      const res = await fetch(`${API_BASE}/finance/debt/${editingRecord.id}/update`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        onSaveSuccess();
      } else {
        alert('Failed to update: ' + data.message);
      }
    } catch {
      alert('Server error updating loan.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(6px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: '#ffffff', borderRadius: '24px', width: '100%', maxWidth: '860px', maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(15,23,42,0.25)', border: '1px solid #eaecf0' }}>

        {/* ── Modal Header ── */}
        <div style={{ padding: '1.25rem 1.75rem', borderBottom: '1px solid #eaecf0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#ffffff', zIndex: 10, borderRadius: '24px 24px 0 0', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: editingRecord ? '#fef3c7' : '#e0e7ff', padding: '2px 10px', borderRadius: '20px', fontSize: '0.68rem', color: editingRecord ? '#92400e' : '#4338ca', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
              <i className={editingRecord ? 'fa-solid fa-pen-to-square' : 'fa-solid fa-scale-balanced'} /> {editingRecord ? t.editLoanBadge : t.girviProcessingBadge}
            </div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a', fontWeight: 800, letterSpacing: '-0.3px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className={editingRecord ? 'fa-solid fa-pen-to-square' : 'fa-solid fa-hand-holding-dollar'} style={{ color: editingRecord ? '#d97706' : '#6366f1' }} />
              {editingRecord ? t.editLoanModalTitle : t.issueLoanModalTitle}
            </h3>
          </div>

          {/* Live Gold & Silver Metal Rates Header Badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '5px 12px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="fa-solid fa-coins" style={{ color: '#d97706', fontSize: '0.85rem' }} />
              <span style={{ fontSize: '0.75rem', color: '#78350f', fontWeight: 700 }}>{t.goldRateLabel}</span>
              <span style={{ fontSize: '0.82rem', color: '#b45309', fontWeight: 800 }}>₹{metalRates.gold_rate_per_gram.toLocaleString('en-IN')}/g</span>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '5px 12px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="fa-solid fa-shield-halved" style={{ color: '#475569', fontSize: '0.85rem' }} />
              <span style={{ fontSize: '0.75rem', color: '#334155', fontWeight: 700 }}>{t.silverRateLabel}</span>
              <span style={{ fontSize: '0.82rem', color: '#0f172a', fontWeight: 800 }}>₹{metalRates.silver_rate_per_gram.toLocaleString('en-IN')}/g</span>
            </div>

            <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '34px', height: '34px', cursor: 'pointer', fontSize: '1rem', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', marginLeft: '4px' }}>
              <i className="fa-solid fa-xmark" />
            </button>
          </div>
        </div>

        <form onSubmit={editingRecord ? handleUpdateRecord : handleSubmit} style={{ padding: '1.75rem' }}>

          {/* ── SECTION 1 (FIRST): Pledged Asset Details & Live Valuation ── */}
          <div style={{ background: '#fffbeb', borderRadius: '18px', padding: '1.25rem', border: '1px solid #fde68a', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.85rem', marginBottom: '1.15rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: '10px', background: '#fef3c7', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>
                  <i className="fa-solid fa-gem" />
                </div>
                <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#78350f', fontWeight: 800, letterSpacing: '-0.2px' }}>
                  {t.assetDetailsSection}
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

                {/* Custom Calendar Dropdown Card */}
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
                    zIndex: 155,
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
                <label style={labelStyle}><i className="fa-solid fa-camera" style={{ color: '#b45309', marginRight: '4px' }} /> {t.pledgedItemPhotoLabel}</label>

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
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>{t.pledgedItemPhotoLabel}</div>
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
                  /* Drag & Drop Zone */
                  <div
                    style={{ background: '#ffffff', borderRadius: '16px', border: '2px dashed #f59e0b', padding: '1.25rem 1rem', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', marginTop: '0.25rem' }}
                  >
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#fef3c7', color: '#d97706', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.35rem', marginBottom: '0.5rem' }}>
                      <i className="fa-solid fa-cloud-arrow-up" />
                    </div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', marginBottom: '2px' }}>
                      {t.uploadPhotoPrompt}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '0.85rem' }}>
                      {t.supportsPhotoText}
                    </div>

                    <div style={{ display: 'flex', gap: '0.65rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        style={{ padding: '8px 16px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '0.78rem', color: '#334155', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
                      >
                        <i className="fa-solid fa-folder-open" style={{ color: '#6366f1' }} /> {t.browseGalleryBtn}
                      </button>
                      <button
                        type="button"
                        onClick={() => startWebcam('environment')}
                        style={{ padding: '8px 14px', background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', color: '#ffffff', border: 'none', borderRadius: '10px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 8px rgba(14, 165, 233, 0.3)' }}
                      >
                        <i className="fa-solid fa-camera" /> Back Camera
                      </button>
                      <button
                        type="button"
                        onClick={() => startWebcam('user')}
                        style={{ padding: '8px 14px', background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', color: '#ffffff', border: 'none', borderRadius: '10px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 8px rgba(139, 92, 246, 0.3)' }}
                      >
                        <i className="fa-solid fa-camera-rotate" /> Front Camera
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Type Selector */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>{t.typeLabel}</label>
                <div style={{ display: 'flex', gap: '6px', background: '#ffffff', padding: '3px', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, item_metal_type: 'gold' }))}
                    style={{ flex: 1, padding: '7px', borderRadius: '8px', border: 'none', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', background: form.item_metal_type === 'gold' ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'transparent', color: form.item_metal_type === 'gold' ? '#ffffff' : '#64748b', transition: 'all 0.2s' }}
                  >
                    <i className="fa-solid fa-coins" /> {t.goldCategory}
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, item_metal_type: 'silver' }))}
                    style={{ flex: 1, padding: '7px', borderRadius: '8px', border: 'none', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', background: form.item_metal_type === 'silver' ? 'linear-gradient(135deg, #64748b 0%, #475569 100%)' : 'transparent', color: form.item_metal_type === 'silver' ? '#ffffff' : '#64748b', transition: 'all 0.2s' }}
                  >
                    <i className="fa-solid fa-shield-halved" /> {t.silverCategory}
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({
                      ...f,
                      item_metal_type: 'cash',
                      item_name: f.item_name || 'Cash',
                      item_weight_grams: f.item_weight_grams || '0',
                      item_purity_percent: f.item_purity_percent || '100'
                    }))}
                    style={{ flex: 1, padding: '7px', borderRadius: '8px', border: 'none', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', background: form.item_metal_type === 'cash' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'transparent', color: form.item_metal_type === 'cash' ? '#ffffff' : '#64748b', transition: 'all 0.2s' }}
                  >
                    <i className="fa-solid fa-money-bill-wave" /> {t.cashCategory}
                  </button>
                </div>
              </div>

              {form.item_metal_type !== 'cash' && (
                <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
                  {/* Row 1: Item Name & Item Weight */}
                  <div style={{ display: 'flex', gap: '1.15rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <label style={labelStyle}>{t.itemNameLabel}</label>
                      <input type="text" required placeholder={t.itemNamePlaceholder} value={form.item_name} onChange={e => setForm(f => ({ ...f, item_name: capitalizeWords(e.target.value) }))} style={textInputStyle} />
                    </div>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <label style={labelStyle}>{t.itemWeightLabel}</label>
                      <input type="number" required step="0.001" min="0.001" placeholder="10.000" value={form.item_weight_grams} onChange={e => setForm(f => ({ ...f, item_weight_grams: e.target.value }))} onWheel={e => e.currentTarget.blur()} style={inputStyle} />
                    </div>
                  </div>

                  {/* Row 2: Item Deduction Name & Item Deduction Weight */}
                  <div style={{ display: 'flex', gap: '1.15rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <label style={labelStyle}>{t.itemDeductionNameLabel}</label>
                      <input type="text" placeholder={t.itemDeductionPlaceholder} value={form.item_deduction_name} onChange={e => setForm(f => ({ ...f, item_deduction_name: capitalizeWords(e.target.value) }))} style={textInputStyle} />
                    </div>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <label style={labelStyle}>{t.itemDeductionWeightLabel}</label>
                      <input type="number" step="0.001" min="0" placeholder="0.000" value={form.item_deduction_weight} onChange={e => setForm(f => ({ ...f, item_deduction_weight: e.target.value }))} onWheel={e => e.currentTarget.blur()} style={inputStyle} />
                    </div>
                  </div>

                  {/* Row 3: Item Purity & Total Pure Metal Weight */}
                  <div style={{ display: 'flex', gap: '1.15rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <label style={labelStyle}>{t.touchPurityLabel}</label>
                      <input type="number" required step="0.01" min="1" max="100" placeholder="70.00" value={form.item_purity_percent} onChange={e => setForm(f => ({ ...f, item_purity_percent: e.target.value }))} onWheel={e => e.currentTarget.blur()} style={inputStyle} />
                    </div>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <label style={labelStyle}>{t.pureMetalWeightLabel} ({form.item_metal_type === 'silver' ? (lang === 'TE' || lang === 'te' ? 'వెండి' : 'Silver') : (lang === 'TE' || lang === 'te' ? 'బంగారం' : 'Gold')})</label>
                      <input
                        type="text"
                        disabled
                        value={Number(form.item_weight_grams) > 0 && Number(form.item_purity_percent) > 0 ? pureWeight.toFixed(3) : '0.000'}
                        style={{ ...inputStyle, background: '#f8fafc', color: '#64748b', fontWeight: 700, border: '1px solid #cbd5e1' }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Live Asset Valuation Box */}
            {form.item_metal_type !== 'cash' && Number(form.item_weight_grams) > 0 && Number(form.item_purity_percent) > 0 && (
              <div style={{ marginTop: '1.15rem', background: '#ffffff', borderRadius: '14px', padding: '1.15rem', border: '1px solid #fcd34d', boxShadow: '0 4px 14px rgba(245, 158, 11, 0.08)' }}>
                <div style={{ fontSize: '0.7rem', color: '#b45309', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="fa-solid fa-calculator" style={{ color: '#d97706' }} /> Live Metal Asset Valuation Breakdown
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem' }}>
                  <div>
                    <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Pure Metal Weight</span>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '2px 0' }}>{pureWeight.toFixed(3)} grams</div>
                    <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                      {deductionWeight > 0 ? `(${form.item_weight_grams}g - ${form.item_deduction_weight}g) × ${form.item_purity_percent}%` : `${form.item_weight_grams}g × ${form.item_purity_percent}%`}
                    </span>
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
                {Number(form.amount) > 0 && itemTotalValue > 0 && Number(form.amount) > itemTotalValue && (
                  <div style={{ marginTop: '0.85rem', paddingTop: '0.65rem', borderTop: '1px solid #fde68a', color: '#dc2626', fontSize: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: '0.85rem' }} />
                    <span>Warning: Entered Loan Amount (₹{Number(form.amount).toLocaleString('en-IN')}) exceeds Total Asset Value (₹{itemTotalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })})</span>
                  </div>
                )}
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
                {t.customerSection}
              </h4>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1.15rem' }}>
              {/* Name */}
              <div>
                <label style={labelStyle}>{t.firstNameLabel}</label>
                <input type="text" required placeholder={t.firstNamePlaceholder} value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: capitalizeWords(e.target.value) }))} style={textInputStyle} />
              </div>
              {/* Surname */}
              <div>
                <label style={labelStyle}>{t.surnameLabel}</label>
                <input type="text" required placeholder={t.surnamePlaceholder} value={form.customer_surname} onChange={e => setForm(f => ({ ...f, customer_surname: capitalizeWords(e.target.value) }))} style={textInputStyle} />
              </div>
              {/* Phone */}
              <div>
                <label style={labelStyle}>{t.phoneLabel}</label>
                <input type="tel" inputMode="numeric" pattern="[0-9]*" required placeholder={t.phonePlaceholder} maxLength={10} value={form.customer_phone} onChange={e => setForm(f => ({ ...f, customer_phone: e.target.value.replace(/\D/g, '') }))} style={inputStyle} />
              </div>
              {/* Address */}
              <div>
                <label style={labelStyle}>{t.villageAddressLabel}</label>
                <input type="text" required placeholder={t.villageAddressPlaceholder} value={form.customer_address} onChange={e => setForm(f => ({ ...f, customer_address: capitalizeWords(e.target.value) }))} style={textInputStyle} />
              </div>
              {/* Amount */}
              <div>
                <label style={labelStyle}>{t.principalAmountLabel}</label>
                <input type="number" required min="1" placeholder={t.principalPlaceholder} value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} onWheel={e => e.currentTarget.blur()} style={{ ...inputStyle, fontWeight: 700, color: (form.item_metal_type as string) !== 'cash' && Number(form.amount) > 0 && itemTotalValue > 0 && Number(form.amount) > itemTotalValue ? '#dc2626' : '#0f172a', borderColor: (form.item_metal_type as string) !== 'cash' && Number(form.amount) > 0 && itemTotalValue > 0 && Number(form.amount) > itemTotalValue ? '#ef4444' : '#cbd5e1' }} />
                {(form.item_metal_type as string) !== 'cash' && Number(form.amount) > 0 && itemTotalValue > 0 && Number(form.amount) > itemTotalValue && (
                  <span style={{ marginTop: '4px', padding: '3px 8px', borderRadius: '6px', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: '0.68rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <i className="fa-solid fa-triangle-exclamation" /> Loan amount exceeded
                  </span>
                )}
              </div>
              {/* Rate */}
              <div style={{ position: 'relative' }} ref={rateDropdownRef}>
                <label style={labelStyle}>{t.interestRateLabel}</label>
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
                  <span>{(lang === 'TE' || lang === 'te') ? `నెలకూ ${form.interest_rate_percent}% (₹100 కి ₹${form.interest_rate_percent} వడ్డీ)` : `${form.interest_rate_percent}% per month (₹${form.interest_rate_percent} for ₹100)`}</span>
                  <i className="fa-solid fa-chevron-down" style={{ fontSize: '0.75rem', color: '#6366f1', transform: openRateSelect ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                </div>

                {/* Floating Menu Popover */}
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
                          {(lang === 'TE' || lang === 'te') ? `నెలకూ ${r}% (₹100 కి ₹${r} వడ్డీ)` : `${r}% per month (₹${r} for ₹100)`}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Timeline */}
              <div style={{ position: 'relative' }} ref={timelineDropdownRef}>
                <label style={labelStyle}>{t.timelineMonthsLabel}</label>
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
                  <span>{form.timeline_months} {(lang === 'TE' || lang === 'te') ? (Number(form.timeline_months) === 1 ? t.monthTimelineUnit : t.monthsTimelineUnit) : (Number(form.timeline_months) === 1 ? t.monthTimelineUnit : t.monthsTimelineUnit)}</span>
                  <i className="fa-solid fa-chevron-down" style={{ fontSize: '0.75rem', color: '#6366f1', transform: openTimelineSelect ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                </div>

                {/* Floating Menu Popover */}
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
                          {m} {(lang === 'TE' || lang === 'te') ? (m === 1 ? t.monthTimelineUnit : t.monthsTimelineUnit) : (m === 1 ? t.monthTimelineUnit : t.monthsTimelineUnit)}
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
            <button type="button" onClick={onClose} style={{ padding: '11px 22px', background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 700, color: '#ffffff', fontSize: '0.85rem', boxShadow: '0 4px 14px rgba(239, 68, 68, 0.3)', transition: 'all 0.2s' }}>
              {t.cancelBtn}
            </button>
            <button
              type="submit"
              disabled={submitting || imageUploading}
              style={{ padding: '11px 26px', background: submitting ? '#a5b4fc' : 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)', color: '#ffffff', border: 'none', borderRadius: '12px', fontWeight: 800, fontSize: '0.88rem', cursor: submitting ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)', transition: 'all 0.2s' }}
            >
              {submitting ? <><i className="fa-solid fa-spinner fa-spin" /> {t.processingLoanBtn}</> : <><i className="fa-solid fa-check" /> {editingRecord ? t.updateLoanBtn : t.saveLoanBtn}</>}
            </button>
          </div>
        </form>
      </div>

      {/* ── Live Webcam Stream Modal Overlay ── */}
      {showWebcam && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#0f172a', borderRadius: '20px', padding: '1.25rem', width: '100%', maxWidth: '540px', boxShadow: '0 24px 64px rgba(0,0,0,0.5)', textAlign: 'center', border: '1px solid #334155' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
              <h4 style={{ margin: 0, color: '#f8fafc', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-camera" style={{ color: '#38bdf8' }} /> Camera Viewfinder
              </h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* Front / Back switch buttons */}
                <div style={{ display: 'flex', gap: '4px', background: '#1e293b', padding: '3px', borderRadius: '8px' }}>
                  <button
                    type="button"
                    onClick={() => startWebcam('environment')}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '6px',
                      border: 'none',
                      background: cameraFacingMode === 'environment' ? '#0ea5e9' : 'transparent',
                      color: cameraFacingMode === 'environment' ? '#fff' : '#94a3b8',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <i className="fa-solid fa-camera" /> Back
                  </button>
                  <button
                    type="button"
                    onClick={() => startWebcam('user')}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '6px',
                      border: 'none',
                      background: cameraFacingMode === 'user' ? '#0ea5e9' : 'transparent',
                      color: cameraFacingMode === 'user' ? '#fff' : '#94a3b8',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <i className="fa-solid fa-camera-rotate" /> Front
                  </button>
                </div>
                <button type="button" onClick={stopWebcam} style={{ background: '#334155', border: 'none', color: '#94a3b8', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer' }}>
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>
            </div>

            {/* Live Video Preview with Callback Ref and Autoplay support */}
            <div style={{ position: 'relative', width: '100%', background: '#000', borderRadius: '12px', overflow: 'hidden', minHeight: '260px' }}>
              <video
                ref={(el) => {
                  (videoRef as any).current = el;
                  if (el && webcamStream && el.srcObject !== webcamStream) {
                    el.srcObject = webcamStream;
                    el.onloadedmetadata = () => {
                      el.play().catch((err) => console.warn('Video play error:', err));
                    };
                  }
                }}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%',
                  height: '100%',
                  maxHeight: '360px',
                  objectFit: 'cover',
                  transform: cameraFacingMode === 'user' ? 'scaleX(-1)' : 'none',
                }}
              />
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
    </div>
  );
};

// Shared Styles & Utils
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

const textInputStyle: React.CSSProperties = {
  ...inputStyle,
  textTransform: 'capitalize',
};

const capitalizeWords = (str: string) => str.replace(/\b\w/g, char => char.toUpperCase());
