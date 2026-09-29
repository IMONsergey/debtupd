import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';

function stars(seed, count) {
  let n = seed;
  const random = () => {
    n = (n * 1664525 + 1013904223) >>> 0;
    return n / 4294967296;
  };
  return Array.from({ length: count }, () => {
    const x = (random() * 120).toFixed(2),
      y = (random() * 140).toFixed(2);
    const radius = (random() * 0.6).toFixed(2),
      alpha = (0.18 + random() * 0.52).toFixed(2);
    return `${x}vw ${y}vh 0 ${radius}px rgba(176,214,255,${alpha})`;
  }).join(',');
}
const fields = [stars(2026, 90), stars(13011, 58), stars(4431, 30)];

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
  const [paused, setPaused] = useState(() => {
    try {
      return localStorage.getItem('debt-motion') === 'paused';
    } catch {
      return false;
    }
  });
  const [reduced, setReduced] = useState(
    () => matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(mq.matches);
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  useEffect(() => {
    const disabled = paused || reduced;
    document.documentElement.classList.toggle('motion-paused', disabled);
    try {
      localStorage.setItem('debt-motion', paused ? 'paused' : 'enabled');
    } catch {}
    window.dispatchEvent(new Event('debt-motion-change'));
    if (disabled) return;
    const element = ref.current;
    let frame = 0,
      active = true,
      height = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    let x = 0,
      y = 0,
      s = 0,
      tx = 0,
      ty = 0,
      ts = 0;
    const render = () => {
      frame = 0;
      if (!active) return;
      x += (tx - x) * 0.075;
      y += (ty - y) * 0.075;
      s += (ts - s) * 0.11;
      element.style.setProperty('--space-x', `${x.toFixed(2)}px`);
      element.style.setProperty('--space-y', `${y.toFixed(2)}px`);
      element.style.setProperty('--space-scroll', `${s.toFixed(2)}px`);
      if (Math.abs(tx - x) + Math.abs(ty - y) + Math.abs(ts - s) > 0.12)
        frame = requestAnimationFrame(render);
    };
    const schedule = () => {
      if (active && !frame) frame = requestAnimationFrame(render);
    };
    const pointer = (e) => {
      if (e.pointerType === 'touch') return;
      tx = (e.clientX / innerWidth - 0.5) * 24;
      ty = (e.clientY / innerHeight - 0.5) * 18;
      schedule();
    };
    const scroll = () => {
      ts = Math.max(0, Math.min(1, scrollY / height)) * 140;
      schedule();
    };
    const resize = () => {
      height = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      scroll();
    };
    const leave = () => {
      tx = 0;
      ty = 0;
      schedule();
    };
    const visibility = () => {
      active = !document.hidden;
      element.classList.toggle('is-sleeping', !active);
      document.documentElement.classList.toggle('motion-sleeping', !active);
      if (active) schedule();
      else {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    };
    const observer = new ResizeObserver(resize);
    observer.observe(document.body);
    addEventListener('pointermove', pointer, { passive: true });
    addEventListener('scroll', scroll, { passive: true });
    addEventListener('resize', resize);
    document.addEventListener('pointerleave', leave);
    document.addEventListener('visibilitychange', visibility);
    resize();
    visibility();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      removeEventListener('pointermove', pointer);
      removeEventListener('scroll', scroll);
      removeEventListener('resize', resize);
      document.removeEventListener('pointerleave', leave);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [paused, reduced]);
  return (
    <>
      <div className="cosmos" ref={ref} aria-hidden="true">
        <div className="cosmos__nebula" />
        {fields.map((field, index) => (
          <div className={`cosmos__depth cosmos__depth--${index}`} key={index}>
            <i className="cosmos__stars" style={{ '--star-points': field }} />
          </div>
        ))}
      </div>
      {!reduced && (
        <button
          className="motion-toggle ui-icon-button"
          type="button"
          aria-label={paused ? 'Включить анимацию' : 'Приостановить анимацию'}
          title={paused ? 'Включить анимацию' : 'Приостановить анимацию'}
          aria-pressed={paused}
          onClick={() => setPaused(!paused)}
        >
          {paused ? <Play size={16} /> : <Pause size={16} />}
        </button>
      )}
    </>
  );
}
