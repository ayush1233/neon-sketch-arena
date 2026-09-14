import { useEffect, useRef } from 'react';

// Game-style pixel confetti with physics
// Fires pixel squares with gravity, rotation, and screen flash

const COLORS = ['#a855f7', '#06b6d4', '#ec4899', '#10b981', '#ffd700', '#ff3333', '#55ff55'];

export default function Confetti({ trigger }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!trigger) return;

    const container = containerRef.current;
    const pieces = [];

    for (let i = 0; i < 100; i++) {
      const el = document.createElement('div');
      el.className = 'confetti-piece';
      el.style.left = `${Math.random() * 100}vw`;
      el.style.top = `-10px`;
      el.style.backgroundColor = COLORS[Math.floor(Math.random() * COLORS.length)];

      // pixel sizes — integer values for crisp rendering
      const size = Math.floor(Math.random() * 6 + 4);
      const isRect = Math.random() > 0.5;
      el.style.width = `${size}px`;
      el.style.height = `${isRect ? size * 2 : size}px`;
      el.style.borderRadius = '0'; // pixel squares!

      const duration = Math.random() * 2 + 1.5;
      el.style.animationDuration = `${duration}s`;
      el.style.animationDelay = `${Math.random() * 0.5}s`;

      // add a slight horizontal drift via custom property
      el.style.setProperty('--drift', `${(Math.random() - 0.5) * 100}px`);

      container.appendChild(el);
      pieces.push(el);
    }

    const cleanup = setTimeout(() => {
      pieces.forEach(p => p.remove());
    }, 4500);

    return () => {
      clearTimeout(cleanup);
      pieces.forEach(p => p.remove());
    };
  }, [trigger]);

  return <div ref={containerRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999 }} />;
}
