import React, { useState, useEffect } from 'react';

interface PwaInstallBannerProps {
  mode?: 'banner' | 'menu';
}

export const PwaInstallBanner: React.FC<PwaInstallBannerProps> = ({ mode = 'banner' }) => {
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showInfoMsg, setShowInfoMsg] = useState('');

  useEffect(() => {
    // Check if user is on iOS (iPhone/iPad)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const iosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(iosDevice);
  }, []);

  const ADMIN_APK_URL = 'https://wdlbeiqwbwnjywpqcfbq.supabase.co/storage/v1/object/public/apks/JayaBhavaniAdmin.apk';
  const WORKER_APK_URL = 'https://wdlbeiqwbwnjywpqcfbq.supabase.co/storage/v1/object/public/apks/JayaBhavaniWorker.apk';
  const WEBSITE_URL = 'https://jayabhavanijewellers.vercel.app/';

  const downloadApk = (url: string, filename: string, appName: string) => {
    setShowInfoMsg('');
    if (isIOS) {
      setShowIOSGuide((prev) => !prev);
      return;
    }
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowInfoMsg(`⚡ Downloading ${appName}...`);
  };

  const handleInstallClick = () => {
    downloadApk(ADMIN_APK_URL, 'JayaBhavaniAdmin.apk', 'Admin App APK');
  };

  if (mode === 'menu') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: '0.6rem 0' }}>
        {/* 1. Install Admin App Button */}
        <button
          type="button"
          onClick={() => downloadApk(ADMIN_APK_URL, 'JayaBhavaniAdmin.apk', 'Admin App APK')}
          style={{
            width: '100%',
            padding: '8px 10px',
            borderRadius: '8px',
            border: '1px solid #b45309',
            background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
            color: '#ffffff',
            fontWeight: 800,
            fontSize: '0.76rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            boxShadow: '0 3px 8px rgba(180, 83, 9, 0.35)',
            transition: 'all 0.15s ease',
          }}
          title="Download & Install Admin Application APK"
        >
          <img
            src="/JB_logo.png"
            alt="JBJ Logo"
            style={{ width: '18px', height: '18px', borderRadius: '50%', objectFit: 'cover', background: '#fff' }}
          />
          <span>Install Admin App</span>
        </button>

        {/* 2. Install Worker App Button */}
        <button
          type="button"
          onClick={() => downloadApk(WORKER_APK_URL, 'JayaBhavaniWorker.apk', 'Worker App APK')}
          style={{
            width: '100%',
            padding: '8px 10px',
            borderRadius: '8px',
            border: '1px solid #d97706',
            background: 'linear-gradient(135deg, #b45309 0%, #78350f 100%)',
            color: '#ffffff',
            fontWeight: 800,
            fontSize: '0.76rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            boxShadow: '0 3px 8px rgba(120, 53, 15, 0.35)',
            transition: 'all 0.15s ease',
          }}
          title="Download & Install Worker Application APK"
        >
          <span style={{ fontSize: '0.9rem' }}>🔨</span>
          <span>Install Worker App</span>
        </button>

        {/* 3. JBJ Website Link (Opens in New Tab) */}
        <a
          href={WEBSITE_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            width: '100%',
            padding: '8px 10px',
            borderRadius: '8px',
            border: '1px solid #374151',
            background: '#1f2937',
            color: '#fbbf24',
            fontWeight: 700,
            fontSize: '0.76rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            textDecoration: 'none',
            boxSizing: 'border-box',
            transition: 'all 0.15s ease',
          }}
          title="Open Jaya Bhavani Jewellers Website in new tab"
        >
          <span style={{ fontSize: '0.9rem' }}>🌐</span>
          <span>Visit JBJ Website</span>
        </a>

        {showInfoMsg && (
          <p style={{ margin: '4px 0 0 0', fontSize: '0.7rem', color: '#fbbf24', textAlign: 'center', lineHeight: '1.2' }}>
            {showInfoMsg}
          </p>
        )}

        {/* iOS Guide inside Menu */}
        {showIOSGuide && (
          <div
            style={{
              marginTop: '6px',
              background: '#2b2019',
              borderRadius: '8px',
              border: '1px solid #3d2f25',
              padding: '0.65rem',
              fontSize: '0.72rem',
              color: '#fffefb',
            }}
          >
            <div style={{ fontWeight: 800, color: '#fbbf24', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <i className="fa-brands fa-apple" /> Install on iPhone / iPad:
            </div>
            <ol style={{ margin: 0, paddingLeft: '1rem', lineHeight: '1.35', color: '#d1d5db' }}>
              <li>Tap <strong>Share</strong> <i className="fa-solid fa-arrow-up-from-bracket" /> in Safari.</li>
              <li>Tap <strong>Add to Home Screen</strong> <i className="fa-regular fa-square-plus" />.</li>
            </ol>
          </div>
        )}
      </div>
    );
  }

  // Default banner mode
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={handleInstallClick}
        style={{
          background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
          color: '#ffffff',
          border: '1px solid #b45309',
          borderRadius: '10px',
          padding: '0.45rem 0.85rem',
          fontSize: '0.78rem',
          fontWeight: 800,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 4px 12px rgba(217, 119, 6, 0.3)',
          transition: 'transform 0.15s ease, boxShadow 0.15s ease',
        }}
        title="Install Jayabhavani Jewellers application"
      >
        <img
          src="/JB_logo.png"
          alt="JBJ Logo"
          style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover', background: '#fff' }}
        />
        <span>Install JBJ App</span>
        <i className="fa-solid fa-download" style={{ fontSize: '0.8rem' }} />
      </button>

      {showIOSGuide && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '270px',
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
            padding: '0.85rem',
            zIndex: 1000,
            fontSize: '0.78rem',
            color: '#1e293b',
          }}
        >
          <div style={{ fontWeight: 800, color: '#d97706', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="fa-brands fa-apple" /> Install on iPhone / iPad:
          </div>
          <ol style={{ margin: 0, paddingLeft: '1.1rem', lineHeight: '1.4', fontWeight: 500 }}>
            <li>Tap the <strong>Share</strong> button <i className="fa-solid fa-arrow-up-from-bracket" /> in Safari.</li>
            <li>Scroll down & tap <strong>Add to Home Screen</strong> <i className="fa-regular fa-square-plus" />.</li>
            <li>Tap <strong>Add</strong> at top right.</li>
          </ol>
        </div>
      )}
    </div>
  );
};
