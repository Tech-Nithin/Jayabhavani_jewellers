import React, { useEffect, useState } from 'react';
import { API_BASE } from '../config/apiConfig';
import { CURRENT_APP_VERSION_CODE, CURRENT_APP_VERSION_NAME } from '../utils/appVersion';

interface VersionInfo {
  latestVersionCode: number;
  latestVersionName: string;
  apkDownloadUrl: string;
  releaseNotes?: string;
  forceUpdate?: boolean;
}

export const AppUpdateModal: React.FC = () => {
  const [updateInfo, setUpdateInfo] = useState<VersionInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const checkVersion = async () => {
      try {
        const res = await fetch(`${API_BASE}/work-assignment/app-version?app=ADMIN`);
        if (!res.ok) return;
        const data = await res.json();
        if (isMounted && data.success && data.latestVersionCode > CURRENT_APP_VERSION_CODE) {
          setUpdateInfo(data);
        }
      } catch (err) {
        console.warn('App version check notice:', err);
      }
    };

    checkVersion();
    return () => { isMounted = false; };
  }, []);

  if (!updateInfo || dismissed) return null;

  const handleUpdate = () => {
    if (updateInfo.apkDownloadUrl) {
      window.open(updateInfo.apkDownloadUrl, '_system');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        animation: 'fadeIn 0.25s ease-out',
      }}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, #1f1915 0%, #110d0b 100%)',
          border: '1px solid #d97706',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '400px',
          padding: '1.5rem',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6), 0 0 25px rgba(217, 119, 6, 0.25)',
          color: '#ffffff',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: '54px',
            height: '54px',
            borderRadius: '50%',
            background: 'rgba(217, 119, 6, 0.15)',
            border: '2px solid #d97706',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem',
            color: '#fbbf24',
            fontSize: '1.5rem',
          }}
        >
          <i className="fa-solid fa-cloud-arrow-down"></i>
        </div>

        <h3 style={{ margin: '0 0 0.4rem', fontSize: '1.2rem', fontWeight: 800, color: '#fffefb' }}>
          Update Available!
        </h3>
        <p style={{ margin: '0 0 1rem', fontSize: '0.82rem', color: '#c59b27', fontWeight: 700 }}>
          Version {updateInfo.latestVersionName} (Current: v{CURRENT_APP_VERSION_NAME})
        </p>

        {updateInfo.releaseNotes && (
          <div
            style={{
              background: '#2b2019',
              border: '1px solid #3d2f25',
              borderRadius: '10px',
              padding: '0.75rem',
              fontSize: '0.78rem',
              color: '#d4c7b8',
              marginBottom: '1.25rem',
              textAlign: 'left',
            }}
          >
            <strong style={{ color: '#fbbf24', display: 'block', marginBottom: '4px' }}>
              What's New:
            </strong>
            {updateInfo.releaseNotes}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {!updateInfo.forceUpdate && (
            <button
              type="button"
              onClick={() => setDismissed(true)}
              style={{
                flex: 1,
                padding: '0.65rem',
                borderRadius: '10px',
                border: '1px solid #3d2f25',
                background: '#2b2019',
                color: '#a39284',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
              }}
            >
              Later
            </button>
          )}

          <button
            type="button"
            onClick={handleUpdate}
            style={{
              flex: 1.5,
              padding: '0.65rem',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #d99b26 0%, #b45309 100%)',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '0.84rem',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(180, 83, 9, 0.4)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <i className="fa-solid fa-download"></i> Update Now
          </button>
        </div>
      </div>
    </div>
  );
};
