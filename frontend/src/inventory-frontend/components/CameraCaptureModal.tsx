import React from 'react';
import type { Language } from '../../utils/translations';
import { translations } from '../../utils/translations';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: () => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  lang?: Language;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  videoRef,
  lang = 'EN',
}) => {
  const t = translations[lang] || translations.EN;
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(4px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '20px',
          maxWidth: '480px',
          width: '100%',
          padding: '1.25rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
          textAlign: 'center',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
            <i className="fa-solid fa-camera" style={{ color: '#d97706', marginRight: '6px' }}></i> {t.capturePhotoTitle}
          </h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '1.2rem', color: '#64748b', cursor: 'pointer' }}
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div style={{ position: 'relative', width: '100%', height: '280px', background: '#0f172a', borderRadius: '14px', overflow: 'hidden', marginBottom: '1.25rem' }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              background: '#f8fafc',
              color: '#475569',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            {t.cancelBtn}
          </button>
          <button
            onClick={onCapture}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #d99b26 0%, #b45309 100%)',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '0.85rem',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(180, 83, 9, 0.3)',
            }}
          >
            <i className="fa-solid fa-circle" style={{ color: '#ef4444', marginRight: '4px' }}></i> {t.capturePhotoBtn}
          </button>
        </div>
      </div>
    </div>
  );
};
