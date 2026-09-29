import { useEffect, useMemo, useRef, useState } from 'react';
import { assetUrl } from '../lib/assets.js';

// Native archive cards and scroll-snap carousel from debt-tech.ru.
export function OtherConferencesSection({ archive }) {
  const items = archive?.items ?? [];
  const loopItems = useMemo(() => {
    if (!items.length) return [];

    return Array.from({ length: 3 }, (_, copyIndex) =>
      items.map((item, sourceIndex) => ({
        ...item,
        copyIndex,
        sourceIndex,
        virtualKey: `conference-${copyIndex}-${sourceIndex}`,
      })),
    ).flat();
  }, [items]);
  const viewportRef = useRef(null);
  const cardRefs = useRef([]);
  const recenterTimerRef = useRef(null);
  const isRecenteringRef = useRef(false);
  const metricsRef = useRef({ centers: [], width: 0 });
  const scrollFrameRef = useRef(0);
  const requestedIndexRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(items.length);

  function centerCardInstantly(index) {
    const viewport = viewportRef.current;
    const card = cardRefs.current[index];
    if (!viewport || !card) return;

    isRecenteringRef.current = true;
    viewport.classList.add('is-recentering');
    viewport.scrollLeft = card.offsetLeft - (viewport.clientWidth - card.offsetWidth) / 2;
    setActiveIndex(index);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        viewport.classList.remove('is-recentering');
        isRecenteringRef.current = false;
      });
    });
  }

  useEffect(() => {
    if (!items.length) return undefined;

    const frame = requestAnimationFrame(() => {
      centerCardInstantly(items.length);
    });

    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(scrollFrameRef.current);
      window.clearTimeout(recenterTimerRef.current);
    };
  }, [items.length]);

  const activeIndexRef = useRef(activeIndex);
  activeIndexRef.current = activeIndex;
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return undefined;
    const observer = new ResizeObserver(() => {
      metricsRef.current = {
        centers: cardRefs.current.map((card) =>
          card ? card.offsetLeft + card.offsetWidth / 2 : 0,
        ),
        width: viewport.clientWidth,
      };
      centerCardInstantly(activeIndexRef.current);
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  if (!archive || items.length === 0) return null;

  function selectCard(index) {
    let nextIndex = index;
    if (nextIndex < 0) nextIndex = items.length * 2 - 1;
    if (nextIndex >= loopItems.length) nextIndex = items.length;
    const viewport = viewportRef.current;
    const card = cardRefs.current[nextIndex];
    if (!viewport || !card) return;

    requestedIndexRef.current = nextIndex;
    activeIndexRef.current = nextIndex;
    setActiveIndex(nextIndex);
    viewport.scrollTo({
      left: card.offsetLeft - (viewport.clientWidth - card.offsetWidth) / 2,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
  }

  function handleScroll() {
    if (scrollFrameRef.current) return;
    scrollFrameRef.current = requestAnimationFrame(() => {
      scrollFrameRef.current = 0;
      const viewport = viewportRef.current;
      if (!viewport || isRecenteringRef.current) return;
      const center = viewport.scrollLeft + metricsRef.current.width / 2;
      const nearest = metricsRef.current.centers.reduce(
        (best, value, index, centers) =>
          Math.abs(value - center) < Math.abs(centers[best] - center) ? index : best,
        0,
      );
      if (requestedIndexRef.current === null && nearest !== activeIndexRef.current) {
        activeIndexRef.current = nearest;
        setActiveIndex(nearest);
      }
      window.clearTimeout(recenterTimerRef.current);
      recenterTimerRef.current = window.setTimeout(() => {
        requestedIndexRef.current = null;
        activeIndexRef.current = nearest;
        setActiveIndex(nearest);
        if (nearest >= items.length && nearest < items.length * 2) return;
        const sourceIndex = ((nearest % items.length) + items.length) % items.length;
        centerCardInstantly(items.length + sourceIndex);
      }, 180);
    });
  }

  return (
    <section
      className="section conferences other-conferences-section"
      id="other-conferences"
      aria-labelledby="other-conferences-title"
    >
      <div className="conference-heading">
        <h2 className="section-title" id="other-conferences-title">
          {archive.title}
        </h2>
        <span>{archive.range}</span>
      </div>

      <div className="other-conferences-carousel">
        <div
          className="other-conferences-carousel__viewport"
          ref={viewportRef}
          tabIndex="0"
          role="region"
          aria-label="Архив конференций"
          onScroll={handleScroll}
          onPointerDown={() => {
            requestedIndexRef.current = null;
          }}
          onWheel={() => {
            requestedIndexRef.current = null;
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft') {
              event.preventDefault();
              selectCard(activeIndexRef.current - 1);
            }
            if (event.key === 'ArrowRight') {
              event.preventDefault();
              selectCard(activeIndexRef.current + 1);
            }
          }}
        >
          <div className="other-conferences-carousel__track">
            {loopItems.map((item, index) => (
              <a
                className={'conference-link-card' + (index === activeIndex ? ' is-active' : '')}
                href={item.href}
                target="_blank"
                rel="noreferrer"
                key={item.virtualKey}
                ref={(node) => {
                  cardRefs.current[index] = node;
                }}
                onFocus={() => selectCard(index)}
                tabIndex={item.copyIndex === 1 ? 0 : -1}
              >
                <img src={item.image} alt="" loading="lazy" decoding="async" />
                <span className="conference-link-card__shade" aria-hidden="true" />
                <span className="conference-link-card__title">
                  {(item.titleLines ?? [item.title]).map((line) => (
                    <span key={line}>{line}</span>
                  ))}
                </span>
                <strong className="conference-link-card__year">{item.year}</strong>
                <span className="conference-link-card__arrow" aria-hidden="true">
                  <img src={assetUrl('assets/icons/arrow-up.svg')} alt="" />
                </span>
              </a>
            ))}
          </div>
        </div>

        <button
          className="other-conferences-carousel__control other-conferences-carousel__control--previous"
          type="button"
          aria-label="Предыдущая конференция"
          onClick={() => selectCard(activeIndexRef.current - 1)}
        >
          <img
            className="other-conferences-carousel__control-icon other-conferences-carousel__control-icon--previous"
            src={assetUrl('assets/icons/arrow-up.svg')}
            alt=""
            aria-hidden="true"
          />
        </button>
        <button
          className="other-conferences-carousel__control other-conferences-carousel__control--next"
          type="button"
          aria-label="Следующая конференция"
          onClick={() => selectCard(activeIndexRef.current + 1)}
        >
          <img
            className="other-conferences-carousel__control-icon other-conferences-carousel__control-icon--next"
            src={assetUrl('assets/icons/arrow-up.svg')}
            alt=""
            aria-hidden="true"
          />
        </button>
      </div>
    </section>
  );
}
