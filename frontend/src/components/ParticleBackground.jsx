import { useEffect, useRef } from 'react';

// 21st.dev-inspired particle background with game pixel aesthetic
// Features: pixel squares, constellation lines, mouse-reactive push
export default function ParticleBackground() {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    let animId;
    const particles = [];
    const PARTICLE_COUNT = 50;
    const CONNECTION_DIST = 120;
    const MOUSE_PUSH_DIST = 100;

    const colors = [
      { h: 270, s: 85, l: 65 }, // purple
      { h: 195, s: 85, l: 55 }, // cyan
      { h: 320, s: 85, l: 60 }, // pink
      { h: 45, s: 95, l: 55 },  // gold
    ];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // track mouse for reactive push
    const onMouse = (e) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', onMouse);

    // spawn particles as pixel squares
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const c = colors[Math.floor(Math.random() * colors.length)];
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        size: Math.random() * 3 + 2, // pixel square size
        dx: (Math.random() - 0.5) * 0.5,
        dy: (Math.random() - 0.5) * 0.5,
        // original velocity for restoring after push
        baseDx: 0,
        baseDy: 0,
        color: c,
        opacity: Math.random() * 0.5 + 0.15,
      });
      particles[particles.length - 1].baseDx = particles[particles.length - 1].dx;
      particles[particles.length - 1].baseDy = particles[particles.length - 1].dy;
    }

    let lastTime = performance.now();

    const draw = (now) => {
      const dt = Math.min((now - lastTime) / 16.67, 3); // delta time, cap at 3x
      lastTime = now;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const mouse = mouseRef.current;

      // update and draw particles
      for (const p of particles) {
        // mouse push
        const mdx = p.x - mouse.x;
        const mdy = p.y - mouse.y;
        const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
        if (mdist < MOUSE_PUSH_DIST && mdist > 0) {
          const force = (MOUSE_PUSH_DIST - mdist) / MOUSE_PUSH_DIST * 0.8;
          p.dx += (mdx / mdist) * force * dt;
          p.dy += (mdy / mdist) * force * dt;
        }

        // dampen back to base velocity
        p.dx += (p.baseDx - p.dx) * 0.02 * dt;
        p.dy += (p.baseDy - p.dy) * 0.02 * dt;

        p.x += p.dx * dt;
        p.y += p.dy * dt;

        // wrap around
        if (p.x < -10) p.x = canvas.width + 10;
        if (p.x > canvas.width + 10) p.x = -10;
        if (p.y < -10) p.y = canvas.height + 10;
        if (p.y > canvas.height + 10) p.y = -10;

        // draw pixel square
        ctx.fillStyle = `hsla(${p.color.h}, ${p.color.s}%, ${p.color.l}%, ${p.opacity})`;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
      }

      // draw constellation lines
      ctx.lineWidth = 1;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECTION_DIST) {
            const alpha = (1 - dist / CONNECTION_DIST) * 0.15;
            ctx.strokeStyle = `hsla(${a.color.h}, 60%, 60%, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(Math.round(a.x + a.size / 2), Math.round(a.y + a.size / 2));
            ctx.lineTo(Math.round(b.x + b.size / 2), Math.round(b.y + b.size / 2));
            ctx.stroke();
          }
        }
      }

      animId = requestAnimationFrame(draw);
    };
    animId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouse);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
        opacity: 0.7,
        imageRendering: 'pixelated',
      }}
    />
  );
}
