import { useState, type FormEvent } from 'react';

export default function Newsletter() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) return;
    setSubmitted(true);
  };

  return (
    <section className="newsletter-section">
      <div className="newsletter-inner">
        <div className="newsletter-text">
          <span className="section-tag" style={{ color: 'rgba(255,255,255,0.7)' }}>
            Stay Connected
          </span>
          <h2 className="newsletter-title">Join the Jaya Bhavani Circle</h2>
          <p className="newsletter-desc">
            Be the first to discover new collections, exclusive offers, and jewellery care tips.
          </p>
        </div>

        <form className="newsletter-form" id="newsletter-form" onSubmit={handleSubmit} noValidate>
          {!submitted ? (
            <>
              <div className="newsletter-input-wrap">
                <input
                  type="email"
                  id="newsletter-email"
                  className="newsletter-input"
                  placeholder="Your email address"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
                <button type="submit" className="btn btn-gold" id="newsletter-submit">
                  Subscribe
                </button>
              </div>
              <span className="newsletter-note">No spam. Unsubscribe anytime.</span>
            </>
          ) : (
            <span className="newsletter-success show" id="newsletter-success">
              ✓ Thank you for subscribing!
            </span>
          )}
        </form>
      </div>
    </section>
  );
}
