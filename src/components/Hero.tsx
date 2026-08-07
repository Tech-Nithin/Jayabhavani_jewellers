import { useState, useEffect } from 'react';

const heroImages = [
  '/bride_1_with_flower.png',
  '/images/hero-jewel.jpg',
  '/images/collection-rings.jpg',
  '/images/collection-necklaces.jpg',
  '/images/collection-earrings.jpg',
  '/images/collection-bangles.jpg',
  '/Pearl_Gold_Choker.jpeg',
  '/Ruby_Drop_Necklace.jpg',
];

export default function Hero() {
  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [started, setStarted] = useState(false);

  // Wait for the 4.2s intro splash screen to complete before starting carousel
  useEffect(() => {
    const timer = setTimeout(() => {
      setStarted(true);
    }, 4200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!started || isPaused) return;

    const timer = setInterval(() => {
      setCurrentImgIndex((prev) => (prev + 1) % heroImages.length);
    }, 2000);

    return () => clearInterval(timer);
  }, [started, isPaused]);

  return (
    <section className="hero" id="hero">
      <div className="hero-bg">
        <div className="hero-gradient" />
      </div>

      {/* Content */}
      <div className="hero-content">
        <span className="hero-tag">✦ Timeless Artistry & Purity</span>
        <h1 className="hero-title">
          Timeless Ornaments<br />Crafted For <em>Golden</em> Hearts
        </h1>
        <p className="hero-subtitle">
          Where traditional Indian heritage meets modern elegance.<br />
          22K & 18K BIS Hallmarked Gold • Certified Natural Diamonds
        </p>
        <div className="hero-cta">
          <a href="#collections" className="btn btn-primary">Explore Collections →</a>
          <a href="#about" className="btn btn-ghost">Our Craftsmanship</a>
        </div>
        <div className="hero-stats">
          <div className="hero-stat">
            <span className="stat-num">50K+</span>
            <span className="stat-label">Happy Customers</span>
          </div>
          <div className="hero-divider" />
          <div className="hero-stat">
            <span className="stat-num">200+</span>
            <span className="stat-label">Unique Designs</span>
          </div>
          <div className="hero-divider" />
          <div className="hero-stat">
            <span className="stat-num">25 Yrs</span>
            <span className="stat-label">Of Excellence</span>
          </div>
        </div>
      </div>

      {/* Image Side */}
      <div className="hero-image-side">
        <div
          className="hero-img-frame"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onClick={() => setIsPaused((prev) => !prev)}
          title={isPaused ? "Paused " : "Click to pause"}
          style={{ cursor: 'pointer' }}
        >
          <img
            key={heroImages[currentImgIndex]}
            src={heroImages[currentImgIndex]}
            alt="Exquisite gold and diamond jewellery"
            className="hero-img"
            id="hero-img"
            onError={(e) => {
              const parent = (e.currentTarget as HTMLImageElement).parentElement;
              if (parent) {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
                if (!parent.querySelector('.hero-placeholder')) {
                  const ph = document.createElement('div');
                  ph.className = 'hero-placeholder';
                  ph.style.cssText =
                    'width:100%;height:100%;background:linear-gradient(135deg,#e8d5c0,#c8a888);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;';
                  ph.innerHTML =
                    '<span style="font-size:5rem;opacity:.35;">✦</span>' +
                    '<span style="font-family:Cormorant Garamond,serif;font-size:1.2rem;color:rgba(44,36,32,.5);letter-spacing:.1em;">Fine Jewellery</span>';
                  parent.appendChild(ph);
                }
              }
            }}
          />
          <div className="hero-img-badge">
            <span>✦</span>
            <span>Pure Gold</span>
          </div>
        </div>
        <div className="floating-tag ft1">
          <span className="ft-dot" />Diamond Certified
        </div>
        <div className="floating-tag ft2">
          <span className="ft-dot" />BIS Hallmarked
        </div>
      </div>
    </section>
  );
}
