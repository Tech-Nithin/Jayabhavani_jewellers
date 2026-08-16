const trustItems = [
  {
    id: 'trust-quality',
    title: 'Certified Quality',
    desc: 'BIS & IGI Certified',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    id: 'trust-shipping',
    title: 'Free Delivery',
    desc: 'On orders above ₹5,000',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="1" y="3" width="15" height="13" />
        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    ),
  },
  {
    id: 'trust-purity',
    title: 'Purity Guaranteed',
    desc: '100% Hallmarked Jewellery',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="8" r="7" />
        <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
      </svg>
    ),
  },
  {
    id: 'trust-support',
    title: 'Expert Support',
    desc: 'jewellery guidance',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
];

export default function TrustStrip() {
  return (
    <section className="trust-strip">
      {trustItems.map(item => (
        <div className="trust-item reveal" key={item.id} id={item.id}>
          <div className="trust-icon">{item.icon}</div>
          <div>
            <span className="trust-title">{item.title}</span>
            <span className="trust-desc">{item.desc}</span>
          </div>
        </div>
      ))}
    </section>
  );
}
