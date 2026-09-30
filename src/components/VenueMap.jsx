import { useEffect, useRef } from 'react';

// Load the supplied constructor only as the visitor approaches the contacts.
export function VenueMap() {
  const container = useRef(null);
  useEffect(() => {
    const node = container.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.charset = 'utf-8';
        script.async = true;
        script.src =
          'https://api-maps.yandex.ru/services/constructor/1.0/js/?um=constructor%3A52a9d2646032d6a4d9fd24c728170d34263bb82f9cffa08410d01d5bbb60d7ab&width=100%25&height=100%25&lang=ru_RU&scroll=true';
        node.appendChild(script);
      },
      { rootMargin: '400px' },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      node.replaceChildren();
    };
  }, []);
  return (
    <div
      className="venue-map-canvas"
      ref={container}
      role="region"
      aria-label="Интерактивная карта места проведения DEBT TECH 2026"
    />
  );
}
