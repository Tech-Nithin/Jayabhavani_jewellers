// ── Utility: format price as Indian Rupee ─────────────
export function formatPrice(amount: number): string {
  return '₹' + amount.toLocaleString('en-IN');
}

// ── Utility: scroll reveal with IntersectionObserver ──
export function setupReveal(): void {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            (entry.target as HTMLElement).classList.add('visible');
          }, i * 80);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 }
  );
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}
