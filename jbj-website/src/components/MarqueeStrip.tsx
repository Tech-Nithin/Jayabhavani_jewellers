const words = [
  'Diamond Rings', 'Gold Necklaces', 'Pearl Earrings', 'Bridal Sets',
  'Emerald Pendants', 'Gold Bangles', 'Solitaire Rings', 'Ruby Necklaces',
];

export default function MarqueeStrip() {
  const doubled = [...words, ...words]; // duplicate for seamless loop
  return (
    <div className="marquee-strip">
      <div className="marquee-track">
        {doubled.map((word, i) => (
          <span key={i}>
            {word}
            <span className="marquee-dot"> ✦ </span>
          </span>
        ))}
      </div>
    </div>
  );
}
