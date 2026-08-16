import React from 'react';

interface WorkerProfileModalProps {
  worker: any;
  isEditingWorker: boolean;
  setIsEditingWorker: (v: boolean) => void;
  editName: string;
  setEditName: (v: string) => void;
  editPhone: string;
  setEditPhone: (v: string) => void;
  editAddress: string;
  setEditAddress: (v: string) => void;
  editSpecialization: string;
  setEditSpecialization: (v: string) => void;
  editNotes: string;
  setEditNotes: (v: string) => void;
  editPhotoUrl: string;
  isSavingWorker: boolean;
  profilePhotoInputRef: React.RefObject<HTMLInputElement | null>;
  onClose: () => void;
  onSave: () => void;
  onProfilePhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setPreviewImageData: (d: { url: string; title: string } | null) => void;
}

export const WorkerProfileModal: React.FC<WorkerProfileModalProps> = ({
  worker,
  isEditingWorker,
  setIsEditingWorker,
  editName,
  setEditName,
  editPhone,
  setEditPhone,
  editAddress,
  setEditAddress,
  editSpecialization,
  setEditSpecialization,
  editNotes,
  setEditNotes,
  editPhotoUrl,
  isSavingWorker,
  profilePhotoInputRef,
  onClose,
  onSave,
  onProfilePhotoUpload,
  setPreviewImageData,
}) => {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: '#ffffff', borderRadius: '20px', maxWidth: '480px', width: '100%', padding: '1.5rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid #cbd5e1', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fa-solid fa-id-card" style={{ color: '#d97706' }}></i>
            {isEditingWorker ? 'Edit Worker Profile' : 'Worker Profile Information'}
          </h3>
          <button
            type="button"
            onClick={onClose}
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
          onChange={onProfilePhotoUpload}
          style={{ display: 'none' }}
        />

        {!isEditingWorker ? (
          /* VIEW MODE */
          <>
            {/* Worker Avatar & Name Banner */}
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

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setIsEditingWorker(true)}
                style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)', color: '#ffffff', fontWeight: 800, cursor: 'pointer', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <i className="fa-solid fa-pen-to-square"></i> Edit Profile
              </button>

              <button
                type="button"
                onClick={onClose}
                style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f1f5f9', color: '#475569', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem' }}
              >
                Close
              </button>
            </div>
          </>
        ) : (
          /* EDIT FORM MODE */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            {/* Profile Photo Picker Banner */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.75rem' }}>
              {editPhotoUrl ? (
                <img
                  src={editPhotoUrl}
                  alt="Preview"
                  style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #0284c7', flexShrink: 0 }}
                />
              ) : (
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#cbd5e1', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.3rem', flexShrink: 0 }}>
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
                  style={{ padding: '5px 12px', borderRadius: '6px', border: '1px solid #0284c7', background: '#e0f2fe', color: '#0369a1', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
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
                onClick={() => setIsEditingWorker(false)}
                style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f1f5f9', color: '#475569', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem' }}
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isSavingWorker}
                onClick={onSave}
                style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #075e54 0%, #128c7e 100%)', color: '#ffffff', fontWeight: 800, cursor: 'pointer', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <i className="fa-solid fa-floppy-disk"></i> {isSavingWorker ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
