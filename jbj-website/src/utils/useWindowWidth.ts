import { useState, useEffect } from 'react';

/**
 * Returns the current viewport width, updated on resize.
 * Used to drive responsive inline-style decisions across Admin modules.
 */
export function useWindowWidth(): number {
  const [width, setWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 1280
  );

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return width;
}
