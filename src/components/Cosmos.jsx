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
      {[2, 5, 10].map((blur, index) => (
        <span
          key={blur}
          style={{
            '--blur': `${blur}px`,
            '--opaque': `${Math.max(0, 58 - index * 25)}%`,
            '--clear': `${96 - index * 23}%`,
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
    document.documentElement.classList.remove('motion-paused');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const modalBlocked = () => !!document.getElementById('page-content')?.inert;
    const fields = [...document.querySelectorAll('[data-star-field]')].map((node) => ({
      node,
      visible: true,
      layers: [...node.querySelectorAll('.star-field__depth')],
    }));
    const state = { x: 0, y: 0, scroll: 0, running: false };
    ref.current._starState = state;
    let frame = 0,
      x = 0,
      y = 0,
      s = 0,
      tx = 0,
      ty = 0,
      ts = 0,
      last = 0,
      height = 1;
    const factors = [0.35, 0.65, 1],
      depth = [0.18, 0.37, 0.6];
    const paint = () => {
      for (const field of fields)
        if (field.visible)
          field.layers.forEach((layer, index) => {
            // Direct transforms do not invalidate inherited custom properties through the field.
            layer.style.transform = `translate3d(${(x * factors[index]).toFixed(2)}px,${(y * factors[index] - s * depth[index]).toFixed(2)}px,0)`;
          });
      Object.assign(state, { x, y, scroll: s });
    };
    const tick = (now) => {
      frame = 0;
      if (document.hidden || reduced.matches || modalBlocked()) {
        state.running = false;
        return;
      }
      const dt = Math.min(0.05, last ? (now - last) / 1000 : 1 / 60);
      last = now;
      const ease = 1 - Math.exp(-dt * 5);
      x += (tx - x) * ease;
      y += (ty - y) * ease;
      s += (ts - s) * ease;
      paint();
      const moving = Math.abs(tx - x) + Math.abs(ty - y) + Math.abs(ts - s) > 0.1;
      state.running = moving;
      if (moving) frame = requestAnimationFrame(tick);
    };
    const schedule = () => {
      if (!frame && !reduced.matches && !document.hidden && !modalBlocked()) {
        last = 0;
        frame = requestAnimationFrame(tick);
      }
    };
    const pointer = (event) => {
      if (event.pointerType === 'touch') return;
      tx = (event.clientX / innerWidth - 0.5) * 64;
      ty = (event.clientY / innerHeight - 0.5) * 42;
      schedule();
    };
    const scroll = () => {
      ts = Math.min(1, Math.max(0, scrollY / height)) * 280;
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
        state.running = false;
      } else schedule();
    };
    const preference = () => {
      if (reduced.matches) {
        cancelAnimationFrame(frame);
        frame = 0;
        state.running = false;
        fields.forEach((field) =>
          field.layers.forEach((layer) => (layer.style.transform = 'none')),
        );
      } else schedule();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(document.body);
    const io = new IntersectionObserver((entries) =>
      entries.forEach((entry) => {
        const field = fields.find((item) => item.node === entry.target);
        if (field) {
          field.visible = entry.isIntersecting;
          field.node.classList.toggle('is-dormant', !field.visible);
          if (field.visible) paint();
        }
      }),
    );
    fields.forEach((field) => io.observe(field.node));
    addEventListener('pointermove', pointer, { passive: true });
    addEventListener('scroll', scroll, { passive: true });
    addEventListener('resize', resize);
    document.addEventListener('pointerleave', leave);
    document.addEventListener('visibilitychange', visibility);
    document.addEventListener('debt:dialog-change', schedule);
    reduced.addEventListener('change', preference);
    resize();
    visibility();
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      io.disconnect();
      removeEventListener('pointermove', pointer);
      removeEventListener('scroll', scroll);
      removeEventListener('resize', resize);
      document.removeEventListener('pointerleave', leave);
      document.removeEventListener('visibilitychange', visibility);
      document.removeEventListener('debt:dialog-change', schedule);
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
