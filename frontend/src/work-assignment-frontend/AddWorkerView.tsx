import React, { useState } from 'react';
import { API_BASE } from '../config/apiConfig';
import { translations, type Language } from '../utils/translations';

interface AddWorkerViewProps {
  open?: boolean;
  initialName?: string;
  onClose: () => void;
  onWorkerAdded?: (worker: any) => void;
  lang?: Language;
}

export const AddWorkerView: React.FC<AddWorkerViewProps> = ({
  open = true,
  initialName = '',
  onClose,
  onWorkerAdded,
  lang = 'EN',
}) => {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [specialization, setSpecialization] = useState('Gold Antique Haramu & Stone Setting');
  const [photoUrl, setPhotoUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!open) return null;

  const toStartCase = (str: string) => {
    return str
      .toLowerCase()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter worker / artisan name.');
      return;
    }

    const cleanName = toStartCase(name.trim());
    const cleanAddress = toStartCase(address.trim());
    const cleanSpecialization = toStartCase(specialization.trim());
    const cleanNotes = toStartCase(notes.trim());

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/work-assignment/workers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          phone: phone.trim(),
          address: cleanAddress,
          specialization: cleanSpecialization,
          photo_url: photoUrl.trim(),
          notes: cleanNotes,
        }),
      });

      const data = await res.json();
      if (data.success && data.worker) {
        alert(`Worker registered successfully! Worker ID: ${data.worker.id}`);
        if (onWorkerAdded) onWorkerAdded(data.worker);
        onClose();
      } else {
        alert('Failed to register worker: ' + (data.message || 'Error'));
      }
    } catch (err) {
      console.error('Error adding worker:', err);
      alert('Network error registering worker.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(5px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: '#ffffff', borderRadius: '20px', maxWidth: '480px', width: '100%', padding: '1.75rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)', border: '1px solid #cbd5e1' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
          <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fa-solid fa-user-plus" style={{ color: '#059669' }}></i>
            {translations[lang]?.newWorkerInfoTitle || 'Add New Worker Information'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '1.2rem', cursor: 'pointer' }}
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.85rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
                Worker Name <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Raju Goldsmith"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
                Phone Number <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="tel"
                maxLength={10}
                placeholder="e.g. 9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '0.85rem' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
              Worker Craft Specialization / Role
            </label>
            <input
              type="text"
              list="worker-specialization-options-view"
              placeholder="e.g. Gold Casting, Stone Setting, Polishing..."
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
              style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid #059669', background: '#ecfdf5', fontWeight: 700, color: '#065f46', fontSize: '0.82rem' }}
            />
            <datalist id="worker-specialization-options-view">
              <option value="Gold Antique Haramu & Stone Setting" />
              <option value="Silver Vaddanam & Heavy Ornaments" />
              <option value="Lightweight Chains & Laser Engraving" />
              <option value="Diamond Setting & Fine Polishing" />
              <option value="General Jewelry Crafting & Repairs" />
            </datalist>
          </div>

          <div style={{ marginBottom: '0.85rem' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
              Worker Address
            </label>
            <input
              type="text"
              placeholder="e.g. Siddipet, Main Market Street"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
            />
          </div>

          <div style={{ marginBottom: '0.85rem' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
              Worker Image / Photo
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {photoUrl ? (
                <img src={photoUrl} alt="Preview" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #059669' }} />
              ) : (
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#e2e8f0', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>
                  <i className="fa-solid fa-camera"></i>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setPhotoUrl(reader.result as string);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                style={{ fontSize: '0.75rem' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
              Worker Notes
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Available weekdays, 10 years experience"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', resize: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', color: '#ffffff', fontWeight: 800, cursor: 'pointer', fontSize: '0.8rem', boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)' }}
            >
              {isSubmitting ? 'Saving Worker...' : 'Save & Select Worker'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddWorkerView;
