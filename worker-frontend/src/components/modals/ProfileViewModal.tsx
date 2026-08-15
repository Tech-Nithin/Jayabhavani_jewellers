import React from 'react';
import { WorkerProfile } from '../../types/worker';
import { downloadImageAsJpeg } from '../../utils/imageUtils';

interface Props {
  worker: WorkerProfile | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileViewModal: React.FC<Props> = ({ worker, isOpen, onClose }) => {
  if (!isOpen || !worker) return null;

  const photoUrl = worker.photo_url || '/JB_logo.png';

  const handleDownloadPhoto = () => {
    downloadImageAsJpeg(photoUrl, `${worker.name.replace(/\s+/g, '_')}_profile.jpeg`);
  };

  return (
    <div className="wa-modal-overlay" onClick={onClose}>
      <div className="wa-profile-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="wa-modal-close-btn pos-right" onClick={onClose}>
          <i className="fa-solid fa-xmark" />
        </button>

        <div className="wa-profile-avatar-box">
          <img src={photoUrl} alt={worker.name} className="wa-profile-avatar-large" />
        </div>

        <h3 className="wa-profile-name">{worker.name}</h3>
        <p className="wa-profile-role">{worker.specialization || 'Jewelry Goldsmith & Crafting'}</p>

        <div className="wa-profile-details">
          <div className="wa-profile-row"><span>Worker ID:</span> <strong>{worker.id || 'WRK-101'}</strong></div>
          <div className="wa-profile-row"><span>Worker Name:</span> <strong>{worker.name}</strong></div>
          {worker.phone && <div className="wa-profile-row"><span>Phone Number:</span> <strong>{worker.phone}</strong></div>}
          {worker.address && <div className="wa-profile-row"><span>Address:</span> <strong>{worker.address}</strong></div>}
          <div className="wa-profile-row"><span>Specialization:</span> <strong>{worker.specialization || 'Jewelry Goldsmith & Crafting'}</strong></div>
          {worker.notes && <div className="wa-profile-row"><span>Admin Notes / Passcode:</span> <strong>{worker.notes}</strong></div>}
          <div className="wa-profile-row"><span>Status:</span> <strong style={{ color: '#15803d' }}>{worker.status || 'ACTIVE & VERIFIED'}</strong></div>
          {worker.created_at && (
            <div className="wa-profile-row">
              <span>Registered Date:</span> <strong>{new Date(worker.created_at).toLocaleDateString()}</strong>
            </div>
          )}
        </div>

        <div className="wa-profile-actions">
          <button type="button" className="wa-btn-secondary" onClick={handleDownloadPhoto}>
            <i className="fa-solid fa-download" /> Download Photo (JPEG)
          </button>
        </div>
      </div>
    </div>
  );
};
