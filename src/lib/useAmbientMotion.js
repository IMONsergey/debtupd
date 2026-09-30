import { useEffect } from 'react';

// Only visible decoration is allowed to loop. No extra scroll listener or animation loop.
export function useAmbientMotion() {
  useEffect(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const nodes = [
      ...document.querySelectorAll(
        '.about-satellite,.services-satellite,.speakers-rocket,.audience-art,' +
          '.tariff-astronaut,.tariff-planet,.sponsor-planet,.partners-satellite,' +
          '.speakers-note-art img,.flight-banner img:first-of-type,.section-glow,' +
          '.forum-ticker,.countdown-caption i,.footer-scene',
      ),
    ];
    const visible = new Set();
    let pageHidden = false;
    const sync = () => {
      const stopped =
        pageHidden ||
        document.hidden ||
        reduced.matches ||
        !!document.getElementById('page-content')?.inert ||
        !!document.getElementById('site-preloader');
      nodes.forEach((node) => {
        node.dataset.ambient = !stopped && visible.has(node) ? 'active' : 'paused';
      });
    };
    nodes.forEach((node) => {
      node.dataset.ambient = 'paused';
    });
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(({ target, isIntersecting }) => {
          if (isIntersecting) visible.add(target);
          else visible.delete(target);
        });
        sync();
      },
      { threshold: 0 },
    );
    nodes.forEach((node) => observer.observe(node));
    const hide = () => {
      pageHidden = true;
      sync();
    };
    const show = () => {
      pageHidden = false;
      sync();
    };
    document.addEventListener('visibilitychange', sync);
    document.addEventListener('debt:dialog-change', sync);
    document.addEventListener('debt:preloader-closed', sync);
    window.addEventListener('pagehide', hide);
    window.addEventListener('pageshow', show);
    reduced.addEventListener('change', sync);
    sync();
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', sync);
      document.removeEventListener('debt:dialog-change', sync);
      document.removeEventListener('debt:preloader-closed', sync);
      window.removeEventListener('pagehide', hide);
      window.removeEventListener('pageshow', show);
      reduced.removeEventListener('change', sync);
      nodes.forEach((node) => node.removeAttribute('data-ambient'));
    };
  }, []);
}
