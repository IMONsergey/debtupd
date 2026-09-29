import { useEffect, useRef } from 'react';

function stars(seed, count) {
  let n = seed;
  const random = () => {
    n = (n * 1664525 + 1013904223) >>> 0;
    return n / 4294967296;
  };
  return Array.from(
    { length: count },
    () =>
      `${(random() * 130).toFixed(2)}vw ${(random() * 145).toFixed(2)}vh 0 ${(random() * 0.7).toFixed(2)}px rgba(181,221,255,${(0.23 + random() * 0.55).toFixed(2)})`,
  ).join(',');
}
const fields = [stars(2026, 130), stars(113, 68), stars(447, 34)];
export function StarField({ className = '' }) {
  return (
    <div className={`star-field ${className}`} data-star-field aria-hidden="true">
      {fields.map((field, index) => (
        <div className={`star-field__depth star-field__depth--${index}`} key={index}>
          <i className="cosmos__stars" style={{ '--star-points': field }} />
        </div>
      ))}
    </div>
  );
}
export function MenuAtmosphere() {
  return (
    <div className="menu-atmosphere" aria-hidden="true">
      {[0.5, 1, 2, 4, 8, 16].map((blur, index) => (
        <span
          key={blur}
          style={{
            '--blur': `${blur}px`,
            '--opaque': `${Math.max(0, 59 - index * 11)}%`,
            '--clear': `${96 - index * 10}%`,
          }}
        />
      ))}
      <div className="menu-atmosphere__tint" />
    </div>
  );
}
export function Cosmos() {
  const ref = useRef(null);
  useEffect(() => {
    // Remove the old stored manual pause. Motion preferences are now system-controlled only.
    document.documentElement.classList.remove('motion-paused');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const layers = [...document.querySelectorAll('[data-star-field]')];
    let frame = 0,
      x = 0,
      y = 0,
      s = 0,
      tx = 0,
      ty = 0,
      ts = 0,
      last = 0,
      height = 1;
    const tick = (now) => {
      frame = 0;
      if (document.hidden || reduced.matches) return;
      const dt = Math.min(0.05, last ? (now - last) / 1000 : 1 / 60);
      last = now;
      const ease = 1 - Math.exp(-dt * 4);
      x += (tx - x) * ease;
      y += (ty - y) * ease;
      s += (ts - s) * ease;
      for (const layer of layers) {
        layer.style.setProperty('--space-x', `${x.toFixed(2)}px`);
        layer.style.setProperty('--space-y', `${y.toFixed(2)}px`);
        layer.style.setProperty('--space-scroll', `${s.toFixed(2)}px`);
      }
      if (Math.abs(tx - x) + Math.abs(ty - y) + Math.abs(ts - s) > 0.08)
        frame = requestAnimationFrame(tick);
    };
    const schedule = () => {
      if (!frame && !reduced.matches && !document.hidden) {
        last = 0;
        frame = requestAnimationFrame(tick);
      }
    };
    const pointer = (e) => {
      if (e.pointerType === 'touch') return;
      tx = (e.clientX / innerWidth - 0.5) * 46;
      ty = (e.clientY / innerHeight - 0.5) * 30;
      schedule();
    };
    const scroll = () => {
      ts = Math.min(1, Math.max(0, scrollY / height)) * 240;
      schedule();
    };
    const resize = () => {
      height = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      scroll();
    };
    const leave = () => {
      tx = ty = 0;
      schedule();
    };
    const visibility = () => {
      document.documentElement.classList.toggle('motion-sleeping', document.hidden);
      if (document.hidden) {
        cancelAnimationFrame(frame);
        frame = 0;
      } else schedule();
    };
    const preference = () => {
      if (reduced.matches) {
        cancelAnimationFrame(frame);
        frame = 0;
      } else schedule();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(document.body);
    window.addEventListener('pointermove', pointer, { passive: true });
    window.addEventListener('scroll', scroll, { passive: true });
    window.addEventListener('resize', resize);
    document.addEventListener('pointerleave', leave);
    document.addEventListener('visibilitychange', visibility);
    reduced.addEventListener('change', preference);
    resize();
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      window.removeEventListener('pointermove', pointer);
      window.removeEventListener('scroll', scroll);
      window.removeEventListener('resize', resize);
      document.removeEventListener('pointerleave', leave);
      document.removeEventListener('visibilitychange', visibility);
      reduced.removeEventListener('change', preference);
    };
  }, []);
  return (
    <div className="cosmos" ref={ref} aria-hidden="true">
      <div className="cosmos__nebula" />
      <StarField />
    </div>
  );
}
