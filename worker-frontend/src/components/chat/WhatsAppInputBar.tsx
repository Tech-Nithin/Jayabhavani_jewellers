import React, { useRef, useState } from 'react';
import { ReplyMessageData, TransactionCategory } from '../../types/worker';
import { NewTransactionModal } from '../modals/NewTransactionModal';

interface Props {
  replyTo: ReplyMessageData | null;
  onClearReply: () => void;
  onSendMessage: (notes: string, photos: File[]) => Promise<void>;
  onOpenSpecModal?: () => void;
  isSending: boolean;
}

const toSentenceCase = (str?: string | null): string => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export const WhatsAppInputBar: React.FC<Props> = ({
  replyTo,
  onClearReply,
  onSendMessage,
  onOpenSpecModal,
  isSending,
}) => {
  const [text, setText] = useState('');
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);

  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setPhotoFiles((prev) => [...prev, ...files]);
    const newPreviews = files.map((file) => URL.createObjectURL(file));
    setPhotoPreviews((prev) => [...prev, ...newPreviews]);
    setShowAttachMenu(false);
  };

  const removePhoto = (idx: number) => {
    setPhotoFiles((prev) => prev.filter((_, i) => i !== idx));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() && photoFiles.length === 0) return;

    const currentText = toSentenceCase(text.trim());
    const currentFiles = [...photoFiles];

    setText('');
    setPhotoFiles([]);
    setPhotoPreviews([]);
    setShowAttachMenu(false);

    try {
      await onSendMessage(currentText, currentFiles);
    } catch (err) {
      // restore text on failure
      setText(currentText);
      setPhotoFiles(currentFiles);
    }
  };

  const handleCameraClick = async () => {
    setShowAttachMenu(false);
    try {
      setIsCameraModalOpen(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      mediaStreamRef.current = stream;
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      console.warn('Webcam stream unavailable, falling back to camera file input:', err);
      setIsCameraModalOpen(false);
      if (cameraInputRef.current) {
        cameraInputRef.current.removeAttribute('multiple');
        cameraInputRef.current.setAttribute('accept', 'image/*');
        cameraInputRef.current.setAttribute('capture', 'environment');
        cameraInputRef.current.click();
      }
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setIsCameraModalOpen(false);
  };

  const captureSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
          setPhotoFiles((prev) => [...prev, file]);
          setPhotoPreviews((prev) => [...prev, URL.createObjectURL(file)]);
        }
      }, 'image/jpeg', 0.9);
    }
    stopCamera();
  };

  const handleGalleryClick = () => {
    setShowAttachMenu(false);
    if (galleryInputRef.current) {
      galleryInputRef.current.removeAttribute('capture');
      galleryInputRef.current.setAttribute('accept', 'image/*');
      galleryInputRef.current.setAttribute('multiple', 'multiple');
      galleryInputRef.current.click();
    }
  };

  return (
    <footer className="wa-input-footer">
      {/* Quoted reply banner */}
      {replyTo && (
        <div className="wa-input-reply-banner">
          <div className="wa-reply-border" />
          <div className="wa-reply-content">
            <div className="wa-reply-title">Replying to {replyTo.senderName}</div>
            <div className="wa-reply-text">{replyTo.notes}</div>
          </div>
          <button type="button" className="wa-reply-close-btn" onClick={onClearReply}>
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
      )}

      {/* Photo attachments preview strip */}
      {photoPreviews.length > 0 && (
        <div className="wa-preview-strip">
          {photoPreviews.map((src, idx) => (
            <div key={idx} className="wa-preview-item">
              <img src={src} alt="Preview" className="wa-preview-img" />
              <button type="button" className="wa-preview-remove" onClick={() => removePhoto(idx)}>
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input controls form */}
      <form onSubmit={handleSubmit} className="wa-input-form" style={{ position: 'relative' }}>
        {/* Hidden Input for Gallery Pick */}
        <input
          type="file"
          accept="image/*"
          multiple
          ref={galleryInputRef}
          onChange={handlePhotoSelect}
          style={{ display: 'none' }}
        />

        {/* Hidden Input for Camera Capture */}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          ref={cameraInputRef}
          onChange={handlePhotoSelect}
          style={{ display: 'none' }}
        />

        {/* 1. Text Message Input Field FIRST */}
        <input
          type="text"
          placeholder="Type message to Admin..."
          value={text}
          autoCapitalize="sentences"
          onChange={(e) => setText(toSentenceCase(e.target.value))}
          className="wa-text-input"
        />

        {/* 2. Attachment Paperclip Button & Popover SECOND */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setShowAttachMenu(!showAttachMenu)}
            className="wa-icon-btn"
            title="Attach options"
          >
            <i className="fa-solid fa-paperclip" />
          </button>

          {showAttachMenu && (
            <div className="wa-attach-popover" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="wa-attach-item"
                style={{ color: '#b45309', borderBottom: '1px solid #f1f5f9' }}
                onClick={() => {
                  setShowAttachMenu(false);
                  if (onOpenSpecModal) onOpenSpecModal();
                }}
              >
                <i className="fa-solid fa-calculator" style={{ color: '#d97706' }} /> Gold / Silver / Cash Specs
              </button>
              <button
                type="button"
                className="wa-attach-item"
                onClick={handleCameraClick}
              >
                <i className="fa-solid fa-camera" /> Camera (Take Photo)
              </button>
              <button
                type="button"
                className="wa-attach-item"
                onClick={handleGalleryClick}
              >
                <i className="fa-solid fa-image" /> Gallery (Choose Photos)
              </button>
            </div>
          )}
        </div>

        {/* 3. Send Button THIRD */}
        <button
          type="submit"
          disabled={isSending || (!text.trim() && photoFiles.length === 0)}
          className="wa-send-btn"
        >
          {isSending ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-paper-plane" />}
        </button>
      </form>

      {/* Camera Live Viewfinder Modal */}
      {isCameraModalOpen && (
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
                <i className="fa-solid fa-camera" style={{ color: '#0284c7', marginRight: '6px' }} /> Take Photo
              </h3>
              <button
                type="button"
                onClick={stopCamera}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', color: '#64748b', cursor: 'pointer' }}
              >
                <i className="fa-solid fa-xmark" />
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
                type="button"
                onClick={stopCamera}
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
                Cancel
              </button>
              <button
                type="button"
                onClick={captureSnapshot}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
                }}
              >
                <i className="fa-solid fa-circle" style={{ color: '#ef4444', marginRight: '4px' }} /> Capture Photo
              </button>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
};
