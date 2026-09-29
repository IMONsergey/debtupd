import { useEffect } from 'react';
import { initAnalytics } from './forms.js';

export function useExperienceMotion() {
  useEffect(() => {
    initAnalytics();
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    let observer,
      frame = 0,
      spot = null,
      point = { x: 50, y: 25 };
    const animations = new Set(),
      seen = new WeakSet();
    const disabled = () =>
      mq.matches || document.documentElement.classList.contains('motion-paused');
    const update = () => {
      observer?.disconnect();
      animations.forEach((animation) => animation.cancel());
      animations.clear();
      if (disabled()) return;
      observer = new IntersectionObserver(
        (entries) =>
          entries.forEach((entry) => {
            if (!entry.isIntersecting || seen.has(entry.target)) return;
            seen.add(entry.target);
            observer.unobserve(entry.target);
            // No hidden pre-animation state: failed/disabled JS can never leave content invisible.
            const delay = (Number(entry.target.dataset.motionOrder || 0) % 3) * 45;
            const animation = entry.target.animate(
              [
                { opacity: 0.45, translate: '0 14px' },
                { opacity: 1, translate: '0 0' },
              ],
              { duration: 760, delay, easing: 'cubic-bezier(.16,1,.3,1)' },
            );
            animations.add(animation);
            animation.finished.catch(() => {}).finally(() => animations.delete(animation));
          }),
        { threshold: 0.04, rootMargin: '0px 0px 35px 0px' },
      );
      document
        .querySelectorAll(
          '.section-title,.about-copy,.about-photo,.stat,.participant-card,.service-photo,.service-copy,.topic-card,.speaker,.organizer-card,.tariff,.corporate-offer,.corporate-form,.sponsor-panel,.contact-grid',
        )
        .forEach((node, index) => {
          node.dataset.motionOrder = String(index);
          observer.observe(node);
        });
    };
    const render = () => {
      frame = 0;
      if (!spot) return;
      spot.style.setProperty('--light-x', `${point.x}%`);
      spot.style.setProperty('--light-y', `${point.y}%`);
    };
    const pointer = (e) => {
      if (disabled() || e.pointerType === 'touch') return;
      const card = e.target.closest('.tariff,.discount');
      if (!card) {
        spot = null;
        return;
      }
      spot = card;
      const rect = card.getBoundingClientRect();
      point = {
        x: ((e.clientX - rect.left) / rect.width) * 100,
        y: ((e.clientY - rect.top) / rect.height) * 100,
      };
      if (!frame) frame = requestAnimationFrame(render);
    };
    update();
    mq.addEventListener('change', update);
    window.addEventListener('debt-motion-change', update);
    document.addEventListener('pointermove', pointer, { passive: true });
    return () => {
      observer?.disconnect();
      cancelAnimationFrame(frame);
      animations.forEach((a) => a.cancel());
      mq.removeEventListener('change', update);
      window.removeEventListener('debt-motion-change', update);
      document.removeEventListener('pointermove', pointer);
    };
  }, []);
}
