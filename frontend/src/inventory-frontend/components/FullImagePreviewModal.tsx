import React from 'react';

interface FullImagePreviewModalProps {
  imageUrl: string;
  title?: string;
  onClose: () => void;
}

export const FullImagePreviewModal: React.FC<FullImagePreviewModalProps> = ({
  imageUrl,
  title = 'Transaction Image',
  onClose,
}) => {
  if (!imageUrl) return null;

  const handleDownload = () => {
    try {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = `JBJ_${title.replace(/\s+/g, '_')}_${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error('Download failed:', e);
      window.open(imageUrl, '_blank');
    }
  };

  const handleShareWhatsApp = async () => {
    // 1. Try Native Web Share API (Mobile / Tablet devices)
    if (navigator.share) {
      try {
        // If image is data URL or http, attempt blob conversion if possible
        if (imageUrl.startsWith('data:image')) {
          const res = await fetch(imageUrl);
          const blob = await res.blob();
          const file = new File([blob], 'photo.png', { type: blob.type || 'image/png' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: title,
              text: `Jaya Bhavani Jewellers — ${title}`,
              files: [file],
            });
            return;
          }
        }
        await navigator.share({
          title: title,
          text: `Jaya Bhavani Jewellers — ${title}`,
          url: window.location.href,
        });
        return;
      } catch (err) {
        console.warn('Native share failed or cancelled:', err);
      }
    }

    // 2. Desktop Fallback: Trigger download & open WhatsApp Web
    handleDownload();
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`Jaya Bhavani Jewellers — ${title}`)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.92)',
        backdropFilter: 'blur(6px)',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        cursor: 'zoom-out',
      }}
    >
      <div
        style={{ position: 'relative', maxWidth: '92vw', maxHeight: '88vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Control Bar with Share, Download, and Close buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '10px', gap: '1rem' }}>
          <span style={{ color: '#ffffff', fontWeight: 700, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            📷 {title}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
            {/* Share / WhatsApp Button */}
            <button
              type="button"
              onClick={handleShareWhatsApp}
              style={{
                background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '0.80rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 12px rgba(37, 211, 102, 0.3)',
              }}
            >
              <i className="fa-brands fa-whatsapp" style={{ fontSize: '0.95rem' }}></i> Share / WhatsApp
            </button>

            {/* Download Image Button */}
            <button
              type="button"
              onClick={handleDownload}
              style={{
                background: '#ffffff',
                color: '#0f172a',
                border: 'none',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '0.80rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <i className="fa-solid fa-download" style={{ color: '#0284c7' }}></i> Download
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '8px',
                color: '#ffffff',
                width: '32px',
                height: '32px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1rem',
              }}
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>

        {/* Enlarged Image */}
        <img
          src={imageUrl}
          alt={title}
          style={{
            maxWidth: '90vw',
            maxHeight: '80vh',
            objectFit: 'contain',
            borderRadius: '12px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            cursor: 'default',
          }}
        />
      </div>
    </div>
  );
};
