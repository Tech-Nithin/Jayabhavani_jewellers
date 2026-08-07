import { useState } from 'react';

interface AnnouncementBarProps {
  message?: string;
}

export default function AnnouncementBar({
  message = '✦ Free shipping on orders above ₹1,00,000 \u00a0|\u00a0 ✦ BIS Hallmarked Gold \u00a0|\u00a0 ✦ Certified Diamonds',
}: AnnouncementBarProps) {
  const [visible, setVisible] = useState(
    !sessionStorage.getItem('jaya_bhavani_ann_closed')
  );

  const handleClose = () => {
    setVisible(false);
    sessionStorage.setItem('jaya_bhavani_ann_closed', '1');
  };

  if (!visible) return null;

  return (
    <div className="announcement-bar" id="announcement-bar">
      <p>{message}</p>
      <button
        className="close-announcement"
        id="close-announcement"
        aria-label="Close announcement"
        onClick={handleClose}
      >
        ✕
      </button>
    </div>
  );
}
