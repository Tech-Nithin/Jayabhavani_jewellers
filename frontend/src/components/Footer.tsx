const shopLinks = ['Rings', 'Necklaces', 'Earrings', 'Bangles', 'Bridal Sets', 'New Arrivals'];
const careLinks = ['Size Guide', 'Jewellery Care', 'Returns & Exchange', 'Shipping Policy', 'Track Your Order', 'Contact Us'];
const aboutLinks = ['Our Story', 'Certifications', 'Store Locator', 'Press & Media', 'Careers', 'Blog'];

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-top">
        {/* Brand */}
        <div className="footer-brand">
          <span className="footer-logo">JAYA BHAVANI</span>
          <p className="footer-tagline"> Jewellery since 1966</p>
          <div className="footer-socials">
            {/* Instagram */}
            <a href="#" className="social-link" aria-label="Instagram">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
            </a>
            {/* Facebook */}
            <a href="#" className="social-link" aria-label="Facebook">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
              </svg>
            </a>
            {/* YouTube */}
            <a href="#" className="social-link" aria-label="YouTube">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-1.96C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.4 19.54C5.12 20 12 20 12 20s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" />
                <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" />
              </svg>
            </a>
          </div>
        </div>

        {/* Links */}
        <div className="footer-links-group">
          <h4 className="footer-group-title">Shop</h4>
          {shopLinks.map(l => <a key={l} href="#" className="footer-link">{l}</a>)}
        </div>
        <div className="footer-links-group">
          <h4 className="footer-group-title">Customer Care</h4>
          {careLinks.map(l => <a key={l} href="#" className="footer-link">{l}</a>)}
        </div>
        <div className="footer-links-group">
          <h4 className="footer-group-title">About Jaya Bhavani</h4>
          {aboutLinks.map(l => <a key={l} href="#" className="footer-link">{l}</a>)}
        </div>
      </div>

      <div className="footer-bottom">
        <p className="footer-copy">© 2025 Jaya Bhavani  Jewellery. All rights reserved.</p>
        <div className="footer-legal">
          <a href="#" className="footer-legal-link">Privacy Policy</a>
          <a href="#" className="footer-legal-link">Terms of Service</a>
          <a href="#" className="footer-legal-link">Sitemap</a>
        </div>
      </div>
    </footer>
  );
}
