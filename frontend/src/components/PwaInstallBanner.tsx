import React, { useState, useEffect } from 'react';

interface PwaInstallBannerProps {
  mode?: 'banner' | 'menu';
}

export const PwaInstallBanner: React.FC<PwaInstallBannerProps> = ({ mode = 'banner' }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showInfoMsg, setShowInfoMsg] = useState('');

  useEffect(() => {
    // Check if app is running in standalone mode (already installed)
    if (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone) {
      setIsInstalled(true);
    }

    // Check if user is on iOS (iPhone/iPad)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const iosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(iosDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    setShowInfoMsg('');
    const activePrompt = deferredPrompt || (window as any).deferredPwaPrompt;
    if (activePrompt) {
      activePrompt.prompt();
      const { outcome } = await activePrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
      (window as any).deferredPwaPrompt = null;
    } else if (isIOS) {
      setShowIOSGuide((prev) => !prev);
    } else if (isInstalled) {
      setShowInfoMsg('Jaya Bhavani Jewellers is already installed on this device!');
    } else {
      // Fallback for browsers where install prompt was already triggered or browser menu offers install
      setShowInfoMsg('Tap your browser menu (⋮ or ⚙) and select "Install App" or "Add to Home Screen".');
    }
  };

  if (mode === 'menu') {
    return (
      <div style={{ margin: '0.6rem 0' }}>
        <button
          type="button"
          onClick={handleInstallClick}
          style={{
            width: '100%',
            padding: '9px 12px',
            borderRadius: '8px',
            border: '1px solid #b45309',
            background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
            color: '#ffffff',
            fontWeight: 800,
            fontSize: '0.78rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 3px 10px rgba(180, 83, 9, 0.35)',
            transition: 'all 0.15s ease',
          }}
          title="Download & Install Jayabhavani Jewellers application"
        >
          <img
            src="/JB_logo.png"
            alt="JBJ Logo"
            style={{ padding: '1px', width: '22px', height: '22px', borderRadius: '10%', objectFit: 'cover', background: '#fff' }}
          />
          <span>{isInstalled ? 'JBJ App Installed' : 'Install JBJ App'}</span>
          {/* <i className="fa-solid fa-download" style={{ fontSize: '0.8rem' }} /> */}
        </button>

        {showInfoMsg && (
          <p style={{ margin: '6px 0 0 0', fontSize: '0.7rem', color: '#fbbf24', textAlign: 'center', lineHeight: '1.2' }}>
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
  if (isInstalled) return null;
  if (!deferredPrompt && !isIOS) return null;

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
