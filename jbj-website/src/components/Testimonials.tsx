import { useState, useEffect } from 'react';
import { testimonials } from '../data/products';

const GOOGLE_MAPS_URL = "https://www.google.com/maps/place/JAYA+BHAVANI+JEWELLERS/@18.1036387,78.850412,17z/data=!3m1!4b1!4m6!3m5!1s0x3bcced5d77d63781:0x157a2e60f8b1d25c!8m2!3d18.1036387!4d78.8529869!16s%2Fg%2F11tfhpc4rj?entry=ttu&g_ep=EgoyMDI2MDgwMy4wIKXMDSoASAFQAw%3D%3D";
const GOOGLE_MAPS_EMBED = "https://maps.google.com/maps?q=18.1036387,78.8529869&z=17&output=embed";

export default function Testimonials() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const t = testimonials[current];

  return (
    <section className="section testimonials-section">
      <div className="container">
        <div className="section-header">
          <span className="section-tag">Customer Love</span>
          <h2 className="section-title">What Our Customers Say & Visit Us</h2>
        </div>

        <div className="testimonials-grid">
          {/* Left Grid: Customer Reviews */}
          <div className="testimonials-left">
            <div className="testimonials-track" id="testimonials-track">
              <div className="testimonial-slide active" id={`t-slide-${current}`} key={t.id}>
                <div className="testimonial-card">
                  <div className="stars">★★★★★</div>
                  <p className="testimonial-text">{t.text}</p>
                  <div className="testimonial-author">
                    <div className="author-avatar">{t.avatar}</div>
                    <div>
                      <span className="author-name">{t.name}</span>
                      <span className="author-location">{t.location}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="testimonial-dots" id="testimonial-dots">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  className={`t-dot${i === current ? ' active' : ''}`}
                  data-slide={i}
                  aria-label={`Testimonial ${i + 1}`}
                  onClick={() => setCurrent(i)}
                />
              ))}
            </div>
          </div>

          {/* Right Grid: Google Maps Section */}
          <div className="testimonials-right">
            <div className="map-card">
              <div className="map-header">
                <div className="map-title-wrap">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <span className="map-title">JAYA BHAVANI JEWELLERS</span>
                </div>
                <a
                  href={GOOGLE_MAPS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="map-open-link"
                >
                  Open in Maps ↗
                </a>
              </div>

              <a
                href={GOOGLE_MAPS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="map-iframe-container"
                title="Click to open exact store location in Google Maps"
              >
                <iframe
                  title="Jaya Bhavani Jewellers Google Maps Location"
                  src={GOOGLE_MAPS_EMBED}
                  width="100%"
                  height="100%"
                  style={{ border: 0, pointerEvents: 'none' }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
                <div className="map-hover-overlay">
                  <span>📍 Click to open exact store location on Google Maps</span>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
