import { useEffect } from 'react';
import { initAnalytics } from './forms.js';

export function useExperienceMotion() {
  useEffect(() => {
    initAnalytics();
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let revealObserver,
      disposed = false,
      activeLoads = 0;
    const queue = [],
      queued = new WeakSet(),
      targets = [];
    // Decode just ahead of the viewport, at most two assets at a time.
    // This avoids a burst of decoder/raster work when a whole section first becomes visible.
    const drain = () => {
      if (disposed) return;
      while (activeLoads < 2 && queue.length) {
        const img = queue.shift();
        activeLoads++;
        img.loading = 'eager';
        img.decoding = 'async';
        const loaded = img.complete
          ? Promise.resolve()
          : new Promise((resolve) => {
              img.addEventListener('load', resolve, { once: true });
              img.addEventListener('error', resolve, { once: true });
            });
        loaded
          .then(() => img.decode().catch(() => {}))
          .finally(() => {
            activeLoads--;
            img.dataset.decoded = 'true';
            drain();
          });
      }
    };
    const warmObserver = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          warmObserver.unobserve(entry.target);
          if (!queued.has(entry.target)) {
            queued.add(entry.target);
            queue.push(entry.target);
            drain();
          }
        }),
      { rootMargin: '1600px 0px', threshold: 0 },
    );
    document
      .querySelectorAll('main img[loading="lazy"]')
      .forEach((img) => warmObserver.observe(img));
    const start = () => {
      revealObserver?.disconnect();
      if (reduced.matches) {
        targets.forEach((node) => node.removeAttribute('data-reveal'));
        return;
      }
      revealObserver = new IntersectionObserver(
        (entries) =>
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.dataset.reveal = 'shown';
            revealObserver.unobserve(entry.target);
          }),
        { rootMargin: '0px 0px -20px 0px', threshold: 0 },
      );
      if (!targets.length)
        targets.push(
          ...document.querySelectorAll(
            '.section-title,.tariffs-title,.about-copy,.about-photo,.stat,.participant-card,.service-photo,.service-copy,.topic-card,.speaker,.audience-card,.organizer-card,.tariff,.corporate,.sponsor-panel,.partner-card,.contact-grid,.discount,.speakers-note-wrap,.other-conferences-carousel,.venue-map',
          ),
        );
      targets.forEach((node) => {
        // Short, bounded group rhythm: no long queues before copy becomes readable.
        const group = node.parentElement;
        const staggered = group?.matches(
          '.stats-grid,.topics-grid,.audience-grid,.partners-grid,.tariff-grid,.discounts',
        );
        const index = staggered ? [...group.children].indexOf(node) % 4 : 0;
        node.style.setProperty('--reveal-delay', `${index * 65}ms`);
        // Initial hidden state is set only while a node is still offscreen. Never reset a visible card.
        if (node.dataset.reveal === 'shown') return;
        if (node.getBoundingClientRect().top < innerHeight) {
          node.dataset.reveal = 'shown';
          return;
        }
        node.dataset.reveal = 'waiting';
        revealObserver.observe(node);
      });
    };
    const revealTarget = (event) => {
      if (event.key === 'Tab')
        requestAnimationFrame(() =>
          document.activeElement
            ?.closest('[data-reveal="waiting"]')
            ?.setAttribute('data-reveal', 'shown'),
        );
    };
    if (!document.getElementById('site-preloader')) start();
    document.addEventListener('debt:preloader-closed', start);
    reduced.addEventListener('change', start);
    document.addEventListener('keyup', revealTarget);
    return () => {
      disposed = true;
      queue.length = 0;
      warmObserver.disconnect();
      revealObserver?.disconnect();
      targets.forEach((node) => {
        node.removeAttribute('data-reveal');
        node.style.removeProperty('--reveal-delay');
      });
      document.removeEventListener('debt:preloader-closed', start);
      reduced.removeEventListener('change', start);
      document.removeEventListener('keyup', revealTarget);
    };
  }, []);
}
