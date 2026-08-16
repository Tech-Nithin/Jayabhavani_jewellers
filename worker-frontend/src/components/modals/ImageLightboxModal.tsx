import React from 'react';
import { downloadImageAsJpeg } from '../../utils/imageUtils';

interface Props {
  imageUrl: string | null;
  onClose: () => void;
}

export const ImageLightboxModal: React.FC<Props> = ({ imageUrl, onClose }) => {
  if (!imageUrl) return null;

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    downloadImageAsJpeg(imageUrl, `jbj_worker_image_${Date.now()}.jpeg`);
  };

  return (
    <div className="wa-modal-overlay" onClick={onClose}>
      <div className="wa-lightbox-content" onClick={(e) => e.stopPropagation()}>
        <div className="wa-lightbox-toolbar">
          <button
            type="button"
            className="wa-download-btn"
            onClick={handleDownload}
            title="Download image as JPEG"
          >
            <i className="fa-solid fa-download" /> Download JPEG
          </button>
          <button
            type="button"
            className="wa-modal-close-btn"
            onClick={onClose}
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <div className="wa-lightbox-img-wrapper">
          <img src={imageUrl} alt="Enlarged view" className="wa-lightbox-img" />
        </div>
      </div>
    </div>
  );
};
