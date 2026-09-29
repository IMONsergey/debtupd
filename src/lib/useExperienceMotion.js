import { useEffect } from 'react';
import { initAnalytics } from './forms.js';
export function useExperienceMotion() {
  useEffect(() => {
    initAnalytics();
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let observer,
      frame = 0,
      card = null,
      point = { x: 50, y: 25 };
    const running = new Set();
    const start = () => {
      observer?.disconnect();
      running.forEach((animation) => animation.finish());
      running.clear();
      if (reduced.matches) return;
      observer = new IntersectionObserver(
        (entries) =>
          entries.forEach((entry) => {
            if (!entry.isIntersecting || entry.target.dataset.arrived) return;
            entry.target.dataset.arrived = 'true';
            observer.unobserve(entry.target);
            // No opacity reset, no parent/child cascade: one small translation, once per grid.
            const animation = entry.target.animate(
              [{ transform: 'translate3d(0,9px,0)' }, { transform: 'translate3d(0,0,0)' }],
              { duration: 850, easing: 'cubic-bezier(.22,1,.36,1)' },
            );
            running.add(animation);
            animation.finished.catch(() => {}).finally(() => running.delete(animation));
          }),
        { threshold: 0.025, rootMargin: '0px 0px 30px 0px' },
      );
      document
        .querySelectorAll(
          '.about-grid,.stats-grid,.service-grid,.topics-grid,.speakers-grid,.organizer-grid,.tariff-grid,.sponsor-panel',
        )
        .forEach((node) => {
          if (node.getBoundingClientRect().top < innerHeight) {
            node.dataset.arrived = 'true';
            return;
          }
          if (!node.dataset.arrived) observer.observe(node);
        });
    };
    const render = () => {
      frame = 0;
      if (card) {
        card.style.setProperty('--light-x', `${point.x}%`);
        card.style.setProperty('--light-y', `${point.y}%`);
      }
    };
    const pointer = (event) => {
      if (reduced.matches || event.pointerType === 'touch') return;
      card = event.target.closest('.tariff,.discount');
      if (!card) return;
      const r = card.getBoundingClientRect();
      point = {
        x: ((event.clientX - r.left) / r.width) * 100,
        y: ((event.clientY - r.top) / r.height) * 100,
      };
      if (!frame) frame = requestAnimationFrame(render);
    };
    if (!document.getElementById('site-preloader')) start();
    document.addEventListener('debt:preloader-closed', start);
    reduced.addEventListener('change', start);
    document.addEventListener('pointermove', pointer, { passive: true });
    return () => {
      observer?.disconnect();
      cancelAnimationFrame(frame);
      running.forEach((animation) => animation.finish());
      document.removeEventListener('debt:preloader-closed', start);
      reduced.removeEventListener('change', start);
      document.removeEventListener('pointermove', pointer);
    };
  }, []);
}
