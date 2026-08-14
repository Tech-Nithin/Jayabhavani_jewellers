import React, { useState, useEffect, useRef } from 'react';
import { API_BASE } from '../config/apiConfig';
import { type Language } from '../utils/translations';
import { getWorkAssignmentTranslation } from './workAssignmentTranslations';
import { AddWorkerView } from './AddWorkerView';
import { WorkerTransactionsView } from './WorkerTransactionsView';
import { WorkerWorkHistoryView } from './WorkerWorkHistoryView';
import { convertImageToWebP } from '../utils/imageUtils';

export const WorkAssignmentModule: React.FC<{ globalSearch?: string; lang?: Language }> = ({
  lang = 'EN',
}) => {
  const t = getWorkAssignmentTranslation(lang);
  const [viewMode, setViewMode] = useState<'LIST' | 'ADD_WORKER' | 'WORK_HISTORY' | 'TRANSACTIONS'>('LIST');
  const [selectedWorker, setSelectedWorker] = useState<any | null>(null);
  const [workers, setWorkers] = useState<any[]>([]);
  const [previewWorkerPhoto, setPreviewWorkerPhoto] = useState<{ url?: string; name: string; id: string } | null>(null);

  // Worker Profile Editing State in Worker Management List
  const [editingWorker, setEditingWorker] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editSpecialization, setEditSpecialization] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editPhotoUrl, setEditPhotoUrl] = useState('');
  const [isSavingWorker, setIsSavingWorker] = useState(false);
  const profilePhotoInputRef = useRef<HTMLInputElement>(null);

  const handleStartEditWorker = (w: any) => {
    setEditingWorker(w);
    setEditName(w.name || '');
    setEditPhone(w.phone || '');
    setEditAddress(w.address || '');
    setEditSpecialization(w.specialization || '');
    setEditNotes(w.notes || '');
    setEditPhotoUrl(w.photo_url || '');
  };

  const handleProfilePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const webpUrl = await convertImageToWebP(file, { quality: 0.90 });
      setEditPhotoUrl(webpUrl);
    } catch (err) {
      console.error('Failed to convert worker profile photo to WebP:', err);
    }
  };

  const handleSaveWorkerProfile = async () => {
    if (!editingWorker || !editName.trim()) {
      alert('⚠️ Please enter worker name.');
      return;
    }
    setIsSavingWorker(true);
    try {
      const res = await fetch(`${API_BASE}/work-assignment/workers/${editingWorker.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          phone: editPhone,
          address: editAddress,
          specialization: editSpecialization,
          notes: editNotes,
          photo_url: editPhotoUrl,
        }),
      });

      const data = await res.json();
      if (data.success && data.worker) {
        const updated = data.worker;
        setWorkers((prev) => prev.map((w) => (w.id === updated.id ? { ...w, ...updated } : w)));
        setEditingWorker(null);
        alert(`✅ Worker profile updated for ${updated.name}!`);
      } else {
        alert(`❌ Failed to update worker profile: ${data.message || 'Unknown error'}`);
      }
    } catch (err: any) {
      alert(`❌ Error updating worker: ${err.message}`);
    } finally {
      setIsSavingWorker(false);
    }
  };

  // 1. Sync from URL query parameters
  useEffect(() => {
    const syncFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const v = params.get('view')?.toUpperCase();
      const wId = params.get('workerId');

      if (v === 'ADD_WORKER' || v === 'ADD-WORKER') {
        setViewMode('ADD_WORKER');
      } else if (v === 'WORK_HISTORY' || v === 'WORK-HISTORY') {
        setViewMode('WORK_HISTORY');
      } else if (v === 'TRANSACTIONS' || v === 'TRANSACTION-HISTORY') {
        setViewMode('TRANSACTIONS');
      } else {
        setViewMode('LIST');
      }

      if (wId) {
        if (wId.toUpperCase() === 'ALL') {
          setSelectedWorker({ id: 'ALL', name: 'All Workers' });
        } else if (workers.length > 0) {
          const found = workers.find((w) => w.id === wId);
          if (found) setSelectedWorker(found);
          else setSelectedWorker({ id: wId, name: wId });
        }
      }
    };

    syncFromUrl();
    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
  }, [workers]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const resWorkers = await fetch(`${API_BASE}/work-assignment/workers`);
      const dataWorkers = await resWorkers.json();

      if (dataWorkers.success && Array.isArray(dataWorkers.workers)) {
        setWorkers(dataWorkers.workers);
      }
    } catch (err) {
      console.error('Failed to fetch work assignment data:', err);
    }
  };

  const updateUrlView = (_tab: 'workers', mode: 'LIST' | 'ADD_WORKER' | 'WORK_HISTORY' | 'TRANSACTIONS', workerId?: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('module', 'work-assignment');
    if (mode === 'ADD_WORKER') url.searchParams.set('view', 'add-worker');
    else if (mode === 'WORK_HISTORY') url.searchParams.set('view', 'work-history');
    else if (mode === 'TRANSACTIONS') url.searchParams.set('view', 'transaction-history');
    else url.searchParams.set('view', 'workers');

    if (workerId) url.searchParams.set('workerId', workerId);
    else url.searchParams.delete('workerId');

    window.history.pushState({}, '', url.toString());
  };

  return (
    <div style={{ color: '#181310', fontFamily: "'Inter', 'Source Sans 3', 'DM Sans', sans-serif" }}>
      {/* ── SUB-SCREEN 1: ADD WORKER FORM ── */}
      {viewMode === 'ADD_WORKER' ? (
        <AddWorkerView
          onClose={() => {
            setViewMode('LIST');
            updateUrlView('workers', 'LIST');
          }}
          onWorkerAdded={() => fetchData()}
          lang={lang}
        />
      ) : viewMode === 'WORK_HISTORY' ? (
        /* ── SUB-SCREEN 2: WORKER WORK HISTORY ── */
        <WorkerWorkHistoryView
          worker={selectedWorker || { id: 'ALL', name: 'All Workers' }}
          onBack={() => {
            setViewMode('LIST');
            setSelectedWorker(null);
            updateUrlView('workers', 'LIST');
          }}
          lang={lang}
        />
      ) : viewMode === 'TRANSACTIONS' && selectedWorker ? (
        /* ── SUB-SCREEN 3: WORKER TRANSACTIONS (WhatsApp Chat UI) ── */
        <WorkerTransactionsView
          worker={selectedWorker}
          workers={workers}
          onSelectWorker={(w) => {
            setSelectedWorker(w);
            updateUrlView('workers', 'TRANSACTIONS', w.id);
          }}
          onBack={() => {
            setViewMode('LIST');
            setSelectedWorker(null);
            updateUrlView('workers', 'LIST');
          }}
          lang={lang}
        />
      ) : (
        /* ── SUB-SCREEN 4: WORKERS LIST & LEDGERS TAB ── */
        <div>
          {/* ── MAIN WORKER MANAGEMENT HEADER ── */}
          <div style={{ marginBottom: '1.25rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.5px' }}>
                {/* <i className="fa-solid fa-users-gears" style={{ color: '#d97706', marginRight: '10px' }}></i> */}
                {t.workAssignmentTitle}
              </h2>
              <p style={{ margin: '3px 0 0 0', color: '#64748b', fontSize: '0.78rem' }}>
                {t.workAssignmentSub}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.0rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              {t.workersTab} ({workers.length})
            </h3>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                onClick={() => {
                  setSelectedWorker({ id: 'ALL', name: 'All Workers', specialization: 'All Artisans & Craftsmen' });
                  setViewMode('WORK_HISTORY');
                  updateUrlView('workers', 'WORK_HISTORY', 'ALL');
                }}
                style={{
                  padding: '7px 14px',
                  background: '#f8fafc',
                  color: '#c79902ff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <i className="fa-solid fa-clipboard-list" style={{ color: '#c78202ff' }}></i>
                {t.workHistoryTab}
              </button>

              <button
                onClick={() => {
                  setViewMode('ADD_WORKER');
                  updateUrlView('workers', 'ADD_WORKER');
                }}
                style={{
                  padding: '7px 14px',
                  background: 'linear-gradient(135deg, #d99b26 0%, #b45309 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 12px rgba(180, 83, 9, 0.25)',
                }}
              >
                <i className="fa-solid fa-user-plus"></i> {t.addWorkerTab}
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
            {workers.map((w) => {
              const startCaseName = w.name ? w.name.toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase()) : '';
              const startCaseAddr = w.address ? w.address.toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase()) : '';
              const startCaseSpec = w.specialization ? w.specialization.toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase()) : '';
              const createdDateStr = w.created_at
                ? new Date(w.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                : '—';

              return (
                <div key={w.id} style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 4px 14px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    {/* Header: Photo / Avatar + Name + Status Badge */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                        {w.photo_url ? (
                          <img
                            src={w.photo_url}
                            alt={startCaseName}
                            onClick={() => setPreviewWorkerPhoto({ url: w.photo_url, name: startCaseName, id: w.id })}
                            title="Click to view enlarged photo"
                            style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #d97706', boxShadow: '0 3px 10px rgba(180, 83, 9, 0.2)', cursor: 'pointer' }}
                          />
                        ) : (
                          <div
                            onClick={() => setPreviewWorkerPhoto({ url: '', name: startCaseName, id: w.id })}
                            title="Click to view enlarged avatar"
                            style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.1rem', boxShadow: '0 3px 10px rgba(180, 83, 9, 0.3)', cursor: 'pointer' }}
                          >
                            {startCaseName.charAt(0)}
                          </div>
                        )}
                        <div>
                          <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>{startCaseName}</h4>
                          <span style={{ fontSize: '0.72rem', color: '#0284c7', fontWeight: 700, background: '#e0f2fe', padding: '2px 8px', borderRadius: '8px', display: 'inline-block', marginTop: '2px' }}>
                            ID: {w.id}
                          </span>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#15803d', background: '#dcfce7', border: '1px solid #86efac', borderRadius: '12px', padding: '3px 9px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        ● {w.status || 'ACTIVE'}
                      </span>
                    </div>

                    {/* Detailed Metadata Fields */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '0.85rem', fontSize: '0.78rem', color: '#475569' }}>
                      {/* Phone */}
                      {w.phone && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <i className="fa-solid fa-phone" style={{ color: '#0284c7', fontSize: '0.72rem', width: '16px' }}></i>
                          <span style={{ fontWeight: 600, color: '#0f172a' }}>{w.phone}</span>
                        </div>
                      )}

                      {/* Address */}
                      {startCaseAddr && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <i className="fa-solid fa-location-dot" style={{ color: '#dc2626', fontSize: '0.72rem', width: '16px' }}></i>
                          <span>{startCaseAddr}</span>
                        </div>
                      )}

                      {/* Specialization */}
                      {startCaseSpec && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <i className="fa-solid fa-screwdriver-wrench" style={{ color: '#d97706', fontSize: '0.72rem', width: '16px' }}></i>
                          <span>{startCaseSpec}</span>
                        </div>
                      )}

                      {/* Registered Date */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <i className="fa-solid fa-calendar-check" style={{ color: '#16a34a', fontSize: '0.72rem', width: '16px' }}></i>
                        <span style={{ color: '#64748b' }}>Registered: <strong style={{ color: '#334155' }}>{createdDateStr}</strong></span>
                      </div>

                      {/* Notes */}
                      {w.notes && (
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginTop: '2px', background: '#f8fafc', padding: '6px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                          <i className="fa-solid fa-note-sticky" style={{ color: '#8b5cf6', fontSize: '0.72rem', width: '16px', marginTop: '2px' }}></i>
                          <span style={{ fontSize: '0.72rem', color: '#475569', fontStyle: 'italic' }}>{w.notes}</span>
                        </div>
                      )}
                    </div>

                    {/* Order Stats Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', background: '#f8fafc', padding: '0.65rem', borderRadius: '10px', textAlign: 'center', marginBottom: '1rem', border: '1px solid #f1f5f9' }}>
                      <div>
                        <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700, display: 'block' }}>ASSIGNED</span>
                        <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{w.assigned_orders_count || 0}</strong>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.65rem', color: '#b45309', fontWeight: 700, display: 'block' }}>PENDING</span>
                        <strong style={{ fontSize: '0.95rem', color: '#d97706' }}>{w.pending_orders_count || 0}</strong>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.65rem', color: '#15803d', fontWeight: 700, display: 'block' }}>COMPLETED</span>
                        <strong style={{ fontSize: '0.95rem', color: '#16a34a' }}>{w.completed_orders_count || 0}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons: Edit Profile, Work History & Transactions */}
                  <div style={{ display: 'flex', gap: '0.4rem', paddingTop: '0.65rem', borderTop: '1px solid #f1f5f9' }}>
                    <button
                      onClick={() => handleStartEditWorker(w)}
                      style={{ padding: '7px 8px', borderRadius: '8px', border: '1px solid #d97706', background: '#fffbeb', color: '#b45309', fontSize: '0.74rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                      title="Edit worker details or change profile photo"
                    >
                      <i className="fa-solid fa-pen-to-square"></i> Edit
                    </button>

                    <button
                      onClick={() => {
                        setSelectedWorker(w);
                        setViewMode('WORK_HISTORY');
                        updateUrlView('workers', 'WORK_HISTORY', w.id);
                      }}
                      style={{ flex: 1, padding: '7px 8px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                    >
                      <i className="fa-solid fa-clipboard-list" style={{ color: '#0284c7' }}></i>
                      History
                    </button>

                    <button
                      onClick={() => {
                        setSelectedWorker(w);
                        setViewMode('TRANSACTIONS');
                        updateUrlView('workers', 'TRANSACTIONS', w.id);
                      }}
                      style={{ flex: 1, padding: '7px 8px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #075e54 0%, #128c7e 100%)', color: '#ffffff', fontSize: '0.74rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', boxShadow: '0 2px 8px rgba(7, 94, 84, 0.25)' }}
                    >
                      <i className="fa-solid fa-comments"></i>
                      Chat
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── ENLARGED PHOTO PREVIEW LIGHTBOX MODAL ── */}
      {previewWorkerPhoto && (
        <div
          onClick={() => setPreviewWorkerPhoto(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)',
            zIndex: 20000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', cursor: 'zoom-out'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff', borderRadius: '24px', padding: '1.75rem', maxWidth: '420px', width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', textAlign: 'center', position: 'relative'
            }}
          >
            <button
              onClick={() => setPreviewWorkerPhoto(null)}
              style={{
                position: 'absolute', top: '14px', right: '14px', background: '#f1f5f9', border: 'none',
                borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontSize: '1rem', color: '#64748b'
              }}
            >
              <i className="fa-solid fa-xmark" />
            </button>

            {previewWorkerPhoto.url ? (
              <img
                src={previewWorkerPhoto.url}
                alt={previewWorkerPhoto.name}
                style={{ width: '220px', height: '220px', borderRadius: '50%', objectFit: 'cover', margin: '0 auto 1rem auto', border: '4px solid #d97706', boxShadow: '0 8px 24px rgba(180,83,9,0.3)' }}
              />
            ) : (
              <div style={{ width: '160px', height: '160px', borderRadius: '50%', background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '4rem', margin: '0 auto 1rem auto', boxShadow: '0 8px 24px rgba(180,83,9,0.3)' }}>
                {previewWorkerPhoto.name.charAt(0)}
              </div>
            )}

            <h3 style={{ margin: '0 0 4px 0', fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>{previewWorkerPhoto.name}</h3>
            <span style={{ fontSize: '0.8rem', color: '#0284c7', fontWeight: 700, background: '#e0f2fe', padding: '3px 12px', borderRadius: '12px', display: 'inline-block' }}>
              Worker ID: {previewWorkerPhoto.id}
            </span>
          </div>
        </div>
      )}
      {/* ── WORKER PROFILE EDIT DIALOG MODAL ── */}
      {editingWorker && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#ffffff', borderRadius: '20px', maxWidth: '480px', width: '100%', padding: '1.5rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid #cbd5e1', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-user-pen" style={{ color: '#d97706' }}></i>
                Edit Worker Profile ({editingWorker.id})
              </h3>
              <button
                type="button"
                onClick={() => setEditingWorker(null)}
                style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Hidden Profile Photo Input Picker */}
            <input
              ref={profilePhotoInputRef}
              type="file"
              accept="image/*"
              onChange={handleProfilePhotoUpload}
              style={{ display: 'none' }}
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              {/* Profile Photo Picker Banner */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '0.75rem' }}>
                {editPhotoUrl ? (
                  <img
                    src={editPhotoUrl}
                    alt="Preview"
                    style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #d97706', flexShrink: 0 }}
                  />
                ) : (
                  <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.3rem', flexShrink: 0 }}>
                    {editName ? editName.charAt(0) : '?'}
                  </div>
                )}

                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
                    Profile Avatar / Photo
                  </label>
                  <button
                    type="button"
                    onClick={() => profilePhotoInputRef.current?.click()}
                    style={{ padding: '5px 12px', borderRadius: '6px', border: '1px solid #d97706', background: '#fef3c7', color: '#b45309', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <i className="fa-solid fa-camera"></i> Change / Upload Photo
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#475569', marginBottom: '3px' }}>
                  Worker Name *
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Worker Name..."
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#475569', marginBottom: '3px' }}>
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="Phone..."
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#475569', marginBottom: '3px' }}>
                    Specialization
                  </label>
                  <input
                    type="text"
                    value={editSpecialization}
                    onChange={(e) => setEditSpecialization(e.target.value)}
                    placeholder="Goldsmith Artisan..."
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#475569', marginBottom: '3px' }}>
                  Address
                </label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  placeholder="Address / Location..."
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#475569', marginBottom: '3px' }}>
                  Notes & Remarks
                </label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Add worker remarks..."
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setEditingWorker(null)}
                  style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f1f5f9', color: '#475569', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem' }}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={isSavingWorker}
                  onClick={handleSaveWorkerProfile}
                  style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)', color: '#ffffff', fontWeight: 800, cursor: 'pointer', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <i className="fa-solid fa-floppy-disk"></i> {isSavingWorker ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkAssignmentModule;
