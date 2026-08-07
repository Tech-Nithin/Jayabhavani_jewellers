import { useState } from 'react';

const videos = ['/video1.mp4', '/video2.mp4'];

export default function AboutSection() {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);

  const handleVideoEnded = () => {
    setCurrentVideoIndex((prev) => (prev + 1) % videos.length);
  };

  return (
    <section className="section about-section" id="about">
      <div className="about-container">
        {/* Image / Video Side */}
        <div className="about-image-side">
          <div className="about-img-wrap reveal">
            <video
              key={videos[currentVideoIndex]}
              src={videos[currentVideoIndex]}
              autoPlay
              muted
              playsInline
              onEnded={handleVideoEnded}
              className="about-img"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
          <div className="about-accent-card">
            <span className="accent-num">1966</span>
            <span className="accent-text">Founded with a passion for perfection</span>
          </div>
        </div>

        {/* Content */}
        <div className="about-content">
          <span className="section-tag">Our Story</span>
          <h2 className="section-title">
            Crafted With Heart,<br />Worn With Pride
          </h2>
          <p className="about-text">
            For over 25 years, Jaya Bhavani has been synonymous with exceptional jewellery craftsmanship.
            Every piece that leaves our atelier carries the soul of our master artisans — shaped by tradition, refined by innovation.
          </p>
          <p className="about-text">
            We source only the finest gold, diamonds, and precious gemstones, ensuring each jewel meets the highest standards of purity and beauty.
          </p>

          <div className="about-pillars">
            {[
              { icon: '⬡', title: 'Pure Materials', desc: '22K & 18K BIS certified gold' },
              { icon: '◈', title: 'Expert Craftsmanship', desc: 'Master artisans with 20+ years' },
              { icon: '✦', title: 'Timeless Design', desc: 'Inspired by heritage & modernity' },
            ].map((p) => (
              <div className="pillar" key={p.title}>
                <span className="pillar-icon">{p.icon}</span>
                <div>
                  <span className="pillar-title">{p.title}</span>
                  <span className="pillar-desc">{p.desc}</span>
                </div>
              </div>
            ))}
          </div>

          <a href="#" className="btn btn-primary">Learn More About Us</a>
        </div>
      </div>
    </section>
  );
}
