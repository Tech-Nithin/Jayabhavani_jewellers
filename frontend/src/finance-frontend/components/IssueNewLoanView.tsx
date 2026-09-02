import React, { useState, useEffect, useRef } from 'react';
import { API_BASE } from '../../config/apiConfig';
import type { LoanRecord, MetalRates } from '../types';
import { INTEREST_RATES, TIMELINE_MONTHS } from '../types';
import type { Language } from '../financeTranslations';
import { FinanceReceiptView } from './FinanceReceiptView';
import { CreatablePresetSelect } from '../../billing-frontend/components/modes/modeUtils';
import { convertImageToWebPBlob } from '../../utils/imageUtils';

interface IssueNewLoanViewProps {
  editingRecord: LoanRecord | null;
  metalRates: MetalRates;
  lang?: Language;
  onBack: () => void;
  onSaveSuccess: () => void;
}

const DEDUCTION_PRESETS = ['Stones', 'Kalla / Wax', 'Enamel', 'Thread / Dori', 'Beads / Pearls', 'Other'];

const getSavedDeductionPresets = (): string[] => {
  try {
    const saved = localStorage.getItem('jbj_billing_presets');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed?.deduction_name && Array.isArray(parsed.deduction_name) && parsed.deduction_name.length > 0) {
        return Array.from(new Set([...DEDUCTION_PRESETS, ...parsed.deduction_name]));
      }
      if (parsed?.deductions && Array.isArray(parsed.deductions) && parsed.deductions.length > 0) {
        return Array.from(new Set([...DEDUCTION_PRESETS, ...parsed.deductions]));
      }
    }
  } catch { }
  return DEDUCTION_PRESETS;
};

const toStartCase = (str: string) => {
  return str.replace(/\b\w/g, char => char.toUpperCase());
};

const emptyForm = {
  loan_date: new Date().toISOString().split('T')[0],
  customer_name: '',
  customer_phone: '',
  customer_address: '',
  amount: '',
  interest_rate_percent: '1.5',
  timeline_months: '3',
  item_name: '',
  item_weight_grams: '',
  item_deduction_name: 'Stones',
  item_deduction_weight: '',
  item_purity_percent: '91.6',
  item_metal_type: 'GOLD' as 'GOLD' | 'SILVER' | 'CASH',
  item_image_url: '',
};

export const IssueNewLoanView: React.FC<IssueNewLoanViewProps> = ({
  editingRecord,
  metalRates,
  lang = 'EN',
  onBack,
  onSaveSuccess,
}) => {
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageConverting, setImageConverting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [convertedWebpFile, setConvertedWebpFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [deductionPresets, setDeductionPresets] = useState<string[]>(getSavedDeductionPresets);

  // Fetch presets dynamically from billing_presets table (matching BillingModule)
  useEffect(() => {
    const fetchPresets = async () => {
      try {
        const res = await fetch(`${API_BASE}/billing/presets`);
        const data = await res.json();
        if (data.success && data.presets) {
          const fetched = data.presets.deduction_name || data.presets.deductions;
          if (Array.isArray(fetched) && fetched.length > 0) {
            const merged = Array.from(new Set([...DEDUCTION_PRESETS, ...fetched]));
            setDeductionPresets(merged);
          }
        }
      } catch (err) {
        console.warn('Unable to fetch billing_presets from backend, using default presets:', err);
      }
    };
    fetchPresets();
  }, []);

  const handleAddNewPreset = async (presetName: string) => {
    if (!presetName.trim()) return;
    const cleanName = presetName.trim();
    const cleanCat = 'deduction_name';

    setDeductionPresets((prev) => {
      if (!prev.includes(cleanName)) {
        const next = [...prev, cleanName];
        try {
          const saved = localStorage.getItem('jbj_billing_presets');
          const parsed = saved ? JSON.parse(saved) : {};
          parsed[cleanCat] = next;
          localStorage.setItem('jbj_billing_presets', JSON.stringify(parsed));
        } catch { }
        return next;
      }
      return prev;
    });

    try {
      await fetch(`${API_BASE}/billing/presets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preset_name: cleanName, category_name: cleanCat }),
      });
    } catch (err) {
      console.warn('Save preset error:', err);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Live Webcam States
  const [showWebcam, setShowWebcam] = useState(false);
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const [cameraFacingMode, setCameraFacingMode] = useState<'environment' | 'user'>('environment');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Populate form if editing
  useEffect(() => {
    if (editingRecord) {
      const isCash = (editingRecord.debt_category || editingRecord.item_metal_type || '').toUpperCase() === 'CASH';
      const fullName = `${editingRecord.customer_name || ''} ${editingRecord.customer_surname || ''}`.trim();
      setForm({
        loan_date: editingRecord.debt_date || editingRecord.loan_date || new Date().toISOString().split('T')[0],
        customer_name: toStartCase(fullName),
        customer_phone: editingRecord.customer_phone || '',
        customer_address: toStartCase(editingRecord.customer_address || ''),
        amount: String(editingRecord.customer_debt_money ?? editingRecord.current_principal ?? editingRecord.amount ?? ''),
        interest_rate_percent: String(editingRecord.interest_rate_percent || '1.5'),
        timeline_months: String(editingRecord.timeline_months || '3'),
        item_name: toStartCase(editingRecord.item_name || ''),
        item_weight_grams: isCash ? '0' : String(editingRecord.item_weight ?? editingRecord.item_weight_grams ?? ''),
        item_deduction_name: editingRecord.item_deduction_name || 'Stones',
        item_deduction_weight: isCash ? '0' : String(editingRecord.item_deduction_weight ?? editingRecord.item_deduction_weight_grams ?? '0'),
        item_purity_percent: isCash ? '0' : String(editingRecord.touch ?? editingRecord.item_purity_percent ?? '91.6'),
        item_metal_type: (editingRecord.debt_category || editingRecord.item_metal_type || 'GOLD').toUpperCase() as any,
        item_image_url: editingRecord.item_image_url || '',
      });
      if (editingRecord.item_image_url) setImagePreview(editingRecord.item_image_url);
    }
  }, [editingRecord]);

  // Derived asset calculations
  const isCash = form.item_metal_type === 'CASH';
  const grossWt = isCash ? 0 : Number(form.item_weight_grams) || 0;
  const dedWt = isCash ? 0 : Number(form.item_deduction_weight) || 0;
  const netWt = Math.max(0, grossWt - dedWt);
  const purityPct = isCash ? 0 : Number(form.item_purity_percent) || 0;
  const pureWt = Number(((netWt * purityPct) / 100).toFixed(3));

  const ratePerGram = isCash
    ? 0
    : form.item_metal_type === 'SILVER'
      ? Number(metalRates.silver_rate_per_gram || 250)
      : Number(metalRates.gold_rate_per_gram || 15000);

  const liveItemValue = isCash ? 0 : Math.round(pureWt * ratePerGram);

  // Local In-Memory WebP Conversion on Image Pick / Photo Capture
  const processImageToWebP = async (file: File) => {
    setImageConverting(true);
    try {
      // Convert to WebP in browser memory
      const webpFile = await convertImageToWebPBlob(file, { quality: 0.90 });
      setConvertedWebpFile(webpFile);
      setImagePreview(URL.createObjectURL(webpFile));
    } catch (err) {
      console.warn('⚠️ Local WebP conversion error:', err);
      setConvertedWebpFile(file);
      setImagePreview(URL.createObjectURL(file));
    } finally {
      setImageConverting(false);
    }
  };

  // File & Camera handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      processImageToWebP(file);
    }
  };

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
          video: {
            facingMode: { ideal: facing },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch {
        // Fallback to generic video stream if facingMode constraint fails (e.g. desktop webcam)
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      setWebcamStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch((err) => console.warn('Video play warning:', err));
        };
      }
    } catch (err) {
      console.error('Camera access error:', err);
      alert('Unable to access camera. Please check camera permissions in your browser or device settings.');
      setShowWebcam(false);
    }
  };

  const stopWebcam = () => {
    if (webcamStream) {
      webcamStream.getTracks().forEach((track) => track.stop());
      setWebcamStream(null);
    }
    setShowWebcam(false);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = canvasRef.current || document.createElement('canvas');
    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, w, h);
      canvas.toBlob((blob) => {
        if (blob) {
          const capturedFile = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
          setSelectedFile(capturedFile);
          stopWebcam();
          processImageToWebP(capturedFile);
        }
      }, 'image/jpeg', 0.90);
    }
  };

  // Submit form handler — Cloudinary upload happens HERE when clicking "Approve & Issue Loan"
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const missing: string[] = [];
    if (!form.customer_name.trim()) missing.push('Customer Name');
    if (!form.customer_phone.trim() || form.customer_phone.trim().length !== 10) {
      missing.push('Phone Number (Must be exactly 10 digits)');
    }
    if (!form.customer_address.trim()) missing.push('Address');

    if (!isCash) {
      if (!form.item_name.trim()) missing.push('Ornament Name');
      if (!form.item_weight_grams || Number(form.item_weight_grams) <= 0) missing.push('Item Weight (Gross Wt g)');
      if (!form.item_purity_percent || Number(form.item_purity_percent) <= 0) missing.push('Touch / Purity Percentage (%)');
    }

    if (!form.amount || Number(form.amount) <= 0) missing.push('Principal Loan Amount');
    if (!form.interest_rate_percent || Number(form.interest_rate_percent) <= 0) missing.push('Interest Rate %');
    if (!form.timeline_months || Number(form.timeline_months) <= 0) missing.push('Timeline (Months)');
    if (!form.loan_date.trim()) missing.push('Loan Date');

    if (missing.length > 0) {
      alert(`⚠️ Cannot submit loan record! Please fill in all required fields:\n\n• ${missing.join('\n• ')}`);
      return;
    }

    if (imageConverting) {
      alert('⏳ Image is still converting to WebP... Please wait a moment.');
      return;
    }

    setSubmitting(true);
    if (!isCash && form.item_deduction_name) {
      handleAddNewPreset(form.item_deduction_name);
    }
    try {
      let finalImageUrl = form.item_image_url;
      const fileToUpload = convertedWebpFile || selectedFile;
      if (fileToUpload) {
        setImageUploading(true);
        const formData = new FormData();
        formData.append('image', fileToUpload, fileToUpload.name);

        const uploadRes = await fetch(`${API_BASE}/finance/upload-image`, { method: 'POST', body: formData });
        const uploadData = await uploadRes.json();
        if (!uploadData.success) {
          alert('Image upload failed: ' + (uploadData.message || 'Cloudinary upload error'));
          setSubmitting(false);
          setImageUploading(false);
          return;
        }
        finalImageUrl = uploadData.url;
        setImageUploading(false);
      }
      const payload = {
        customer_id: editingRecord?.customer_id || undefined,
        customer_name: toStartCase(form.customer_name.trim()),
        customer_phone: form.customer_phone.trim(),
        customer_address: toStartCase(form.customer_address.trim()),
        debt_category: form.item_metal_type,
        item_metal_type: form.item_metal_type,
        item_name: isCash ? 'Cash' : toStartCase(form.item_name.trim() || 'Ornament'),
        item_weight: grossWt,
        item_weight_grams: grossWt,
        item_deduction_name: isCash ? '' : form.item_deduction_name,
        item_deduction_weight: dedWt,
        item_deduction_weight_grams: dedWt,
        touch: purityPct,
        item_purity_percent: purityPct,
        pure_metal_weight: pureWt,
        metal_value_per_gram: ratePerGram,
        total_value_of_item: liveItemValue,
        item_image_url: finalImageUrl || null,
        customer_debt_money: Number(form.amount),
        amount: Number(form.amount),
        interest_rate_percent: Number(form.interest_rate_percent),
        timeline_months: Number(form.timeline_months),
        debt_date: form.loan_date,
        loan_date: form.loan_date,
      };

      const endpoint = editingRecord
        ? `${API_BASE}/finance/${editingRecord.finance_uuid || editingRecord.id}/update`
        : `${API_BASE}/finance/create`;

      const method = editingRecord ? 'PATCH' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        alert(editingRecord ? '✅ Loan Record Updated Successfully!' : '✅ New Pledge Loan Issued Successfully!');
        onSaveSuccess();
      } else {
        alert('Error saving loan: ' + data.message);
      }
    } catch {
      alert('Server error saving loan record.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-dashboard-root" style={{ color: '#181310', fontFamily: "'Inter', 'Source Sans 3', 'DM Sans', sans-serif" }}>

      {/* ── Title & Top Action Bar ── */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'nowrap', gap: '0.5rem' }}>
          <h2 className="admin-page-title" style={{ fontFamily: "'Inter', 'Source Sans 3', 'DM Sans', sans-serif", fontSize: '1.35rem', color: '#181310', fontWeight: 800, margin: 0, letterSpacing: '-0.5px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fa-solid fa-hand-holding-dollar" style={{ color: '#4f46e5' }}></i>
            {editingRecord ? `Editing Loan: ${editingRecord.customer_name}` : 'Issue New Girvi Loan'}
          </h2>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginLeft: 'auto', flexShrink: 0 }}>
            <button
              type="button"
              onClick={onBack}
              style={{
                padding: '7px 14px',
                background: '#181310',
                color: '#ffffff',
                border: '1px solid #3d2f25',
                borderRadius: '6px',
                fontWeight: 700,
                fontSize: '0.80rem',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(24, 19, 16, 0.15)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
              }}
            >
              <i className="fa-solid fa-arrow-left" style={{ fontSize: '0.74rem' }}></i> {lang === 'TE' ? 'వెనుకకు' : 'Back to Ledger'}
            </button>

            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', color: '#b45309', fontWeight: 700 }}>
              🥇 Gold: ₹{metalRates.gold_rate_per_gram.toLocaleString('en-IN')}/g
            </div>
            <div style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', color: '#475569', fontWeight: 700 }}>
              🥈 Silver: ₹{metalRates.silver_rate_per_gram.toLocaleString('en-IN')}/g
            </div>
          </div>
        </div>

        <p style={{ margin: '2px 0 0 0', color: '#786a5e', fontSize: '0.76rem' }}>
          Enter customer details, pledged ornament weights & purity, and set financial terms.
        </p>
      </div>

      {/* ── POS Grid Container ── */}
      <div className="pos-grid-container">

        {/* LEFT GRID (70%): MULTI-SECTION FINANCE POS FORM */}
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '1.25rem', border: '1px solid #eaecf0', boxShadow: '0 6px 20px rgba(0,0,0,0.02)' }}>

          {/* Mode Pill Selector (Gold / Silver / Cash) */}
          <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.15rem', background: '#f8fafc', padding: '6px', borderRadius: '14px', border: '1px solid #cbd5e1' }}>
            {(['GOLD', 'SILVER', 'CASH'] as const).map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setForm({ ...form, item_metal_type: cat })}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: form.item_metal_type === cat ? (cat === 'GOLD' ? '#d97706' : cat === 'SILVER' ? '#475569' : '#059669') : 'transparent',
                  color: form.item_metal_type === cat ? '#ffffff' : '#64748b',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                  boxShadow: form.item_metal_type === cat ? '0 3px 10px rgba(0,0,0,0.15)' : 'none',
                  transition: 'all 0.15s',
                }}
              >
                {cat === 'GOLD' ? '🥇 Gold Loan' : cat === 'SILVER' ? '🥈 Silver Loan' : '💵 Cash Loan'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>

            {/* ════════════════════════════════════════════════════════════════
                SECTION 1: CUSTOMER DETAILS (All 3 fields in 1 single row)
                ════════════════════════════════════════════════════════════════ */}
            <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '1rem', marginBottom: '1.15rem' }}>
              <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0f172a', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <i className="fa-solid fa-user" style={{ color: '#4f46e5' }}></i> 1. Customer Details
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.85rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Konda"
                    value={form.customer_name}
                    onChange={e => setForm({ ...form, customer_name: toStartCase(e.target.value) })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none', background: '#fff', boxSizing: 'border-box', textTransform: 'capitalize' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="e.g. 9876543210"
                    value={form.customer_phone}
                    onChange={e => setForm({ ...form, customer_phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: form.customer_phone && form.customer_phone.length < 10 ? '1.5px solid #ef4444' : '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
                  />
                  {form.customer_phone.length > 0 && form.customer_phone.length < 10 && (
                    <div style={{ color: '#ef4444', fontSize: '0.68rem', fontWeight: 700, marginTop: '3px' }}>
                      ⚠️ Please fill 10 numbers ({form.customer_phone.length}/10)
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                    Address *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Main Bazaar, Suryapet"
                    value={form.customer_address}
                    onChange={e => setForm({ ...form, customer_address: toStartCase(e.target.value) })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none', background: '#fff', boxSizing: 'border-box', textTransform: 'capitalize' }}
                  />
                </div>
              </div>
            </div>

            {/* ════════════════════════════════════════════════════════════════
                SECTION 2: PLEDGED ASSET DETAILS & LIVE VALUATION
                Row 1: Ornament Name | Item Weight (Gross Wt g)
                Row 2: Deduction Name (Dropdown Preset 50%) & Deduction Weight (g 50%) | Net Metal Weight (g)
                Row 3: Touch / Purity (%) | Pure Metal Weight (g)
                ════════════════════════════════════════════════════════════════ */}
            <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '1rem', marginBottom: '1.15rem' }}>
              <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0f172a', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="fa-solid fa-gem" style={{ color: '#d97706' }}></i> 2. Pledged Asset Details
                </div>
                {!isCash && (
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#b45309', background: '#fffbeb', border: '1px solid #fde68a', padding: '2px 8px', borderRadius: '6px' }}>
                    Rate: ₹{ratePerGram.toLocaleString('en-IN')}/g
                  </span>
                )}
              </div>

              {!isCash && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.85rem', marginBottom: '0.85rem' }}>

                  {/* ── ROW 1 ── */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                      Ornament Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 22K Gold Bangle Set"
                      value={form.item_name}
                      onChange={e => setForm({ ...form, item_name: toStartCase(e.target.value) })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none', background: '#fff', boxSizing: 'border-box', textTransform: 'capitalize' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                      Item Weight (Gross Wt g) *
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      required
                      placeholder="18.500"
                      value={form.item_weight_grams}
                      onWheel={(e) => (e.target as HTMLElement).blur()}
                      onChange={e => setForm({ ...form, item_weight_grams: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
                    />
                  </div>

                  {/* ── ROW 2 (50% - 50% split for Deduction Name & Deduction Weight) ── */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                      Deduction Name & Weight (g)
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                      <CreatablePresetSelect
                        value={form.item_deduction_name ?? ''}
                        onChange={(val) => setForm({ ...form, item_deduction_name: toStartCase(val) })}
                        options={deductionPresets}
                        placeholder="Deduction Name"
                        categoryName="deduction_name"
                        onAddNewPreset={(name) => handleAddNewPreset(name)}
                        style={{ fontSize: '0.78rem', padding: '6px 8px', fontWeight: 600 }}
                      />
                      <input
                        type="number"
                        step="0.001"
                        placeholder="0.00"
                        value={form.item_deduction_weight}
                        onWheel={(e) => (e.target as HTMLElement).blur()}
                        onChange={e => setForm({ ...form, item_deduction_weight: e.target.value })}
                        style={{ width: '100%', padding: '8px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.78rem', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#1e40af', marginBottom: '4px' }}>
                      Only Metal Weight (Net Wt g)
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={`${netWt.toFixed(3)} g`}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1.5px solid #93c5fd', fontSize: '0.88rem', fontWeight: 800, color: '#1e40af', background: '#eff6ff', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>

                  {/* ── ROW 3 ── */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                      Touch / Purity Percentage (%) *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      placeholder="91.6"
                      value={form.item_purity_percent}
                      onWheel={(e) => (e.target as HTMLElement).blur()}
                      onChange={e => setForm({ ...form, item_purity_percent: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#b45309', marginBottom: '4px' }}>
                      Pure Metal Weight (Pure Wt g)
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={`${pureWt.toFixed(3)} g`}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1.5px solid #fde68a', fontSize: '0.88rem', fontWeight: 800, color: '#b45309', background: '#fffbeb', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              )}

              {/* Photo Upload & In-Line Item Value Badge */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginTop: '0.5rem' }}>

                <button
                  type="button"
                  onClick={() => startWebcam('environment')}
                  style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #818cf8', background: '#eef2ff', color: '#4338ca', fontWeight: 700, fontSize: '0.76rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <i className="fa-solid fa-camera" style={{ color: '#4338ca' }} /> Back Camera
                </button>
                <button
                  type="button"
                  onClick={() => startWebcam('user')}
                  style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #c084fc', background: '#faf5ff', color: '#7e22ce', fontWeight: 700, fontSize: '0.76rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <i className="fa-solid fa-camera-rotate" style={{ color: '#7e22ce' }} /> Front Camera
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontWeight: 700, fontSize: '0.76rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <i className="fa-solid fa-arrow-up-from-bracket" style={{ color: '#64748b' }} /> Upload Photo
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} style={{ display: 'none' }} />
                {imageConverting && (
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#d97706', background: '#fffbeb', padding: '4px 10px', borderRadius: '6px', border: '1px solid #fde68a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className="fa-solid fa-spinner fa-spin"></i> Converting image to WebP...
                  </div>
                )}
                {imageUploading && (
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#4f46e5', background: '#eef2ff', padding: '4px 10px', borderRadius: '6px', border: '1px solid #c7d2fe', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className="fa-solid fa-spinner fa-spin"></i>
                  </div>
                )}
                {imagePreview && (
                  <div style={{ position: 'relative' }}>
                    <img src={imagePreview} alt="Preview" style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover', border: imageConverting ? '2px solid #eab308' : '2px solid #10b981' }} />
                    <button type="button" onClick={() => { setSelectedFile(null); setConvertedWebpFile(null); setImagePreview(null); setForm({ ...form, item_image_url: '' }); }} style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#ef4444', color: '#fff', border: 'none', width: '18px', height: '18px', borderRadius: '50%', cursor: 'pointer', fontSize: '0.65rem', fontWeight: 800 }}>✕</button>
                  </div>
                )}

                {/* Live Item Value Badge inside the image upload line */}
                {!isCash && (
                  <div style={{ marginLeft: 'auto', background: '#fffbeb', border: '1.5px solid #fde68a', padding: '6px 14px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 900, color: '#78350f', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.7rem', color: '#92400e', fontWeight: 700, textTransform: 'uppercase' }}>Item Value:</span>
                    <span>₹{liveItemValue.toLocaleString('en-IN')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* ════════════════════════════════════════════════════════════════
                SECTION 3: LOAN FINANCIAL TERMS (2 fields per row)
                ════════════════════════════════════════════════════════════════ */}
            <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '1rem', marginBottom: '1.15rem' }}>
              <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0f172a', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <i className="fa-solid fa-coins" style={{ color: '#10b981' }}></i> 3. Loan Financial Terms
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.85rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                    Principal Amount Disbursed (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 30000"
                    value={form.amount}
                    onWheel={(e) => (e.target as HTMLElement).blur()}
                    onChange={e => setForm({ ...form, amount: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: !isCash && liveItemValue > 0 && Number(form.amount || 0) > liveItemValue ? '2px solid #ef4444' : '1.5px solid #10b981',
                      fontSize: '0.95rem',
                      fontWeight: 800,
                      color: !isCash && liveItemValue > 0 && Number(form.amount || 0) > liveItemValue ? '#b91c1c' : '#064e3b',
                      outline: 'none',
                      background: !isCash && liveItemValue > 0 && Number(form.amount || 0) > liveItemValue ? '#fef2f2' : '#fff',
                      boxSizing: 'border-box',
                    }}
                  />
                  {!isCash && liveItemValue > 0 && Number(form.amount || 0) > liveItemValue && (
                    <div style={{ color: '#dc2626', fontSize: '0.7rem', fontWeight: 800, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      ⚠️ Amount exceeding item value (Max: ₹{liveItemValue.toLocaleString('en-IN')})
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                    Interest Rate (%) *
                  </label>
                  <select
                    value={form.interest_rate_percent}
                    onChange={e => setForm({ ...form, interest_rate_percent: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', outline: 'none', background: '#fff' }}
                  >
                    {INTEREST_RATES.map(r => (
                      <option key={r} value={r}>{r}% / mo (₹{Math.round((Number(form.amount || 0) * r) / 100).toLocaleString('en-IN')})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                    Timeline (Months) *
                  </label>
                  <select
                    value={form.timeline_months}
                    onChange={e => setForm({ ...form, timeline_months: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', outline: 'none', background: '#fff' }}
                  >
                    {TIMELINE_MONTHS.map(m => (
                      <option key={m} value={m}>{m} Month{m > 1 ? 's' : ''}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                    Loan Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={form.loan_date}
                    onChange={e => setForm({ ...form, loan_date: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontWeight: 700, outline: 'none', background: '#fff', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
              <button
                type="button"
                onClick={onBack}
                style={{ padding: '8px 18px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontWeight: 700, fontSize: '0.80rem', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || imageUploading}
                style={{ padding: '8px 24px', borderRadius: '6px', border: 'none', background: editingRecord ? 'linear-gradient(135deg, #d97706 0%, #b45309 100%)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#ffffff', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(16,185,129,0.25)' }}
              >
                {submitting ? 'Saving...' : editingRecord ? 'Update Record' : 'Approve & Issue Loan'}
              </button>
            </div>
          </form>
        </div>

        {/* RIGHT GRID (30%): REAL-TIME FINANCE RECEIPT PREVIEW */}
        <div style={{ position: 'sticky', top: '1rem' }}>
          <FinanceReceiptView
            data={{
              customer_name: form.customer_name,
              customer_phone: form.customer_phone,
              customer_address: form.customer_address,
              item_metal_type: form.item_metal_type,
              item_name: form.item_name,
              item_weight_grams: grossWt,
              item_deduction_name: form.item_deduction_name,
              item_deduction_weight: dedWt,
              item_purity_percent: purityPct,
              pure_metal_weight: pureWt,
              metal_value_per_gram: ratePerGram,
              total_value_of_item: liveItemValue,
              item_image_url: imagePreview || undefined,
              amount: Number(form.amount || 0),
              interest_rate_percent: Number(form.interest_rate_percent || 1.5),
              timeline_months: Number(form.timeline_months || 3),
              loan_date: form.loan_date,
              loan_id: editingRecord?.finance_uuid || editingRecord?.id,
            }}
            compact
          />
        </div>
      </div>

      {/* Live Webcam Modal with Camera Switcher & Reliable Callback Ref */}
      {showWebcam && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#fff', borderRadius: '20px', padding: '1.25rem', maxWidth: '640px', width: '100%', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-video" style={{ color: '#4f46e5' }} /> Live Camera Capture
              </h4>
              {/* Front / Back Camera Switch Toggle */}
              <div style={{ display: 'flex', gap: '6px', background: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
                <button
                  type="button"
                  onClick={() => startWebcam('environment')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    background: cameraFacingMode === 'environment' ? '#4f46e5' : 'transparent',
                    color: cameraFacingMode === 'environment' ? '#fff' : '#64748b',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <i className="fa-solid fa-camera" /> Back
                </button>
                <button
                  type="button"
                  onClick={() => startWebcam('user')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    background: cameraFacingMode === 'user' ? '#4f46e5' : 'transparent',
                    color: cameraFacingMode === 'user' ? '#fff' : '#64748b',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <i className="fa-solid fa-camera-rotate" /> Front
                </button>
              </div>
            </div>

            <div style={{ position: 'relative', width: '100%', borderRadius: '12px', overflow: 'hidden', background: '#000' }}>
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
                  maxHeight: '55vh',
                  display: 'block',
                  borderRadius: '12px',
                  background: '#000',
                  objectFit: 'cover',
                  transform: cameraFacingMode === 'user' ? 'scaleX(-1)' : 'none',
                }}
              />
            </div>
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.25rem' }}>
              <button
                type="button"
                onClick={stopWebcam}
                style={{ padding: '9px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={capturePhoto}
                style={{ padding: '9px 24px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)', color: '#fff', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.35)' }}
              >
                <i className="fa-solid fa-circle-dot" /> Take Photo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
