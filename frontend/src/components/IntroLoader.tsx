import { useState, useEffect } from 'react';

export default function IntroLoader() {
  const [loading, setLoading] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Hold splash screen then start fade-out transition after 3.8s
    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
    }, 3800);

    // Unmount splash screen after fade-out finishes (4.2s total)
    const unmountTimer = setTimeout(() => {
      setLoading(false);
    }, 4200);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(unmountTimer);
    };
  }, []);

  if (!loading) return null;

  return (
    <div className={`intro-loader ${fadeOut ? 'fade-out' : ''}`}>
      {/* Ma Durga Background Image - Fades from 100% to 0% */}
      <img
        src="/white_ma_durga-rembg.png"
        alt="Ma Durga"
        className="durga-bg-img"
      />

      {/* Stamp / Slamming JB Logo */}
      <div className="stamp-logo-wrap">
        <img
          src="/JB_logo.png"
          alt="Jaya Bhavani Jewellers"
          className="stamp-logo-img"
        />
        <div className="stamp-brand-name">JAYA BHAVANI</div>
        <div className="stamp-brand-sub"> JEWELLERY</div>
      </div>
    </div>
  );
}
