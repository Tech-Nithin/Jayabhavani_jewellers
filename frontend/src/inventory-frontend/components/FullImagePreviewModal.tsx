import React from 'react';

interface FullImagePreviewModalProps {
  imageUrl: string;
  title?: string;
  onClose: () => void;
}

/**
 * Converts any WebP / image URL into a high-quality binary JPEG File
 * Ensures WhatsApp renders shared media as inline photos instead of documents.
 */
const convertUrlToJpegFile = async (url: string, fileName: string): Promise<File> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context failed'));
        return;
      }
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const jpegFile = new File([blob], `${fileName}.jpg`, { type: 'image/jpeg' });
            resolve(jpegFile);
          } else {
            reject(new Error('Blob conversion failed'));
          }
        },
        'image/jpeg',
        0.92
      );
    };
    img.onerror = () => reject(new Error('Failed to load image for JPEG conversion'));
    img.src = url;
  });
};

export const FullImagePreviewModal: React.FC<FullImagePreviewModalProps> = ({
  imageUrl,
  title = 'Transaction Image',
  onClose,
}) => {
  if (!imageUrl) return null;

  const handleDownload = async () => {
    try {
      const sanitizedTitle = title.replace(/\s+/g, '_');
      const jpegFile = await convertUrlToJpegFile(imageUrl, `JBJ_${sanitizedTitle}_${Date.now()}`);
      const downloadUrl = URL.createObjectURL(jpegFile);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = jpegFile.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
    } catch (e) {
      console.error('JPEG download fallback:', e);
      window.open(imageUrl, '_blank');
    }
  };

  const handleShareWhatsApp = async () => {
    try {
      // Convert stored WebP image to pure JPEG file for WhatsApp native photo sharing
      const jpegFile = await convertUrlToJpegFile(imageUrl, `jbj_photo_${Date.now()}`);

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [jpegFile] })) {
        await navigator.share({
          files: [jpegFile], // 👈 Pure JPEG image photo (WhatsApp renders as camera photo!)
        });
        return;
      }
    } catch (err: any) {
      console.warn('File share notice:', err.message || err);
    }

    // Desktop Fallback: Download JPEG photo file directly
    handleDownload();
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
              <i className="fa-solid fa-download" style={{ color: '#0284c7' }}></i> Download (JPEG)
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
