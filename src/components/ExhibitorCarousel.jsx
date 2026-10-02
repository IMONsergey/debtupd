import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { assetUrl } from '../lib/assets.js';

const COPIES = [0, 1, 2];
const MARQUEE_SPEED = 48;

function ExhibitorCard({ item, copy, onSelect }) {
  const hiddenCopy = copy !== 1;
  return (
    <article
      className="exhibition-company glass corners"
      data-primary={hiddenCopy ? undefined : ''}
      aria-hidden={hiddenCopy || undefined}
    >
      <div className="exhibition-company__logo">
        <img
          src={assetUrl(item.logo)}
          alt={hiddenCopy ? '' : item.name}
          loading="lazy"
          decoding="async"
        />
      </div>
      <p>{item.description}</p>
      <div>
        {item.standNumbers.map((number) => (
          <button
            type="button"
            className="exhibition-company__stand"
            tabIndex={hiddenCopy ? -1 : undefined}
            aria-controls="exhibition-stand-detail"
            onClick={() => onSelect(number)}
            key={number}
          >
            Стенд №{number}
          </button>
        ))}
      </div>
    </article>
  );
}

export function ExhibitorCarousel({ exhibitors, onSelect }) {
  const viewport = useRef(null);
  const indexRef = useRef(0);
  const frame = useRef(0);
  const lastTime = useRef(0);
  const settle = useRef(0);
  const holdUntil = useRef(0);
  const metrics = useRef({
    start: 0,
    end: 0,
    setWidth: 0,
    step: 1,
    pageSize: 1,
    pageCount: exhibitors.length,
  });
  const interaction = useRef({ focus: false, drag: false });
  const reducedMotion = useRef(false);
  const [index, setIndex] = useState(0);
  const [pageCount, setPageCount] = useState(exhibitors.length);

  const updateIndex = () => {
    const node = viewport.current;
    const { start, setWidth, step, pageSize, pageCount: totalPages } = metrics.current;
    if (!node || !setWidth || !step || !totalPages) return;
    const offset = (((node.scrollLeft - start) % setWidth) + setWidth) % setWidth;
    const cardIndex = Math.round(offset / step) % exhibitors.length;
    const next = Math.min(totalPages - 1, Math.floor(cardIndex / pageSize));
    if (next !== indexRef.current) {
      indexRef.current = next;
      setIndex(next);
    }
  };

  const normalize = () => {
    const node = viewport.current;
    const { start, end, setWidth } = metrics.current;
    if (!node || !setWidth) return;
    if (node.scrollLeft < start) node.scrollLeft += setWidth;
    if (node.scrollLeft >= end) node.scrollLeft -= setWidth;
    updateIndex();
  };
  const measure = () => {
    const node = viewport.current;
    if (!node || exhibitors.length < 1) return;
    const cards = [...node.querySelectorAll('.exhibition-company')];
    const first = cards[exhibitors.length];
    const next = cards[exhibitors.length + 1];
    const third = cards[exhibitors.length * 2];
    if (!first || !third) return;
    const start = first.offsetLeft;
    const end = third.offsetLeft;
    const step = next ? next.offsetLeft - first.offsetLeft : first.offsetWidth;
    const gap = Math.max(0, step - first.offsetWidth);
    const pageSize = Math.max(1, Math.floor((node.clientWidth + gap + 1) / step));
    const totalPages = Math.max(1, Math.ceil(exhibitors.length / pageSize));
    metrics.current = {
      start,
      end,
      setWidth: end - start,
      step,
      pageSize,
      pageCount: totalPages,
    };
    const nextIndex = Math.min(indexRef.current, totalPages - 1);
    indexRef.current = nextIndex;
    setIndex(nextIndex);
    setPageCount(totalPages);
    node.scrollLeft = start + nextIndex * pageSize * step;
  };

  useLayoutEffect(() => {
    const node = viewport.current;
    if (!node) return;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    measure();
    return () => observer.disconnect();
  }, [exhibitors.length]);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncMotion = () => {
      reducedMotion.current = media.matches;
    };
    syncMotion();
    media.addEventListener?.('change', syncMotion);

    const tick = (time) => {
      const node = viewport.current;
      if (!lastTime.current) lastTime.current = time;
      const delta = Math.min(1000, time - lastTime.current);
      lastTime.current = time;
      const paused =
        reducedMotion.current ||
        interaction.current.focus ||
        interaction.current.drag ||
        time < holdUntil.current;
      if (node && !paused) {
        node.scrollLeft += (MARQUEE_SPEED * delta) / 1000;
        const { end, setWidth } = metrics.current;
        if (setWidth && node.scrollLeft >= end) node.scrollLeft -= setWidth;
        updateIndex();
      }
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame.current);
      clearTimeout(settle.current);
      media.removeEventListener?.('change', syncMotion);
      frame.current = 0;
      lastTime.current = 0;
    };
  }, [exhibitors.length]);

  const pauseFor = (ms = 1200) => {
    holdUntil.current = performance.now() + ms;
  };

  const move = (direction) => {
    const node = viewport.current;
    const { start, setWidth, step, pageSize, pageCount: totalPages } = metrics.current;
    if (!node || !setWidth || !step || !totalPages) return;
    pauseFor(1400);

    const current = indexRef.current;
    const nextPage = (current + direction + totalPages) % totalPages;
    const lastPageStart = (totalPages - 1) * pageSize * step;

    node.scrollLeft = start + current * pageSize * step;

    let target = start + nextPage * pageSize * step;
    if (direction > 0 && current === totalPages - 1) {
      target = start + setWidth;
    } else if (direction < 0 && current === 0) {
      target = start - setWidth + lastPageStart;
    }

    indexRef.current = nextPage;
    setIndex(nextPage);
    node.scrollTo({
      left: target,
      behavior: reducedMotion.current ? 'instant' : 'smooth',
    });
  };
  const handleScroll = () => {
    updateIndex();
    clearTimeout(settle.current);
    settle.current = setTimeout(() => {
      if (!interaction.current.drag) normalize();
    }, 180);
  };

  return (
    <div className="exhibition-exhibitor-carousel">
      <div className="exhibition-exhibitor-controls">
        <span aria-label={`Слайд ${index + 1} из ${pageCount}`}>
          {String(index + 1).padStart(2, '0')} <i>/ {String(pageCount).padStart(2, '0')}</i>
        </span>
        <div>
          <button
            type="button"
            className="ui-icon-button"
            aria-label="Предыдущий экспонент"
            onClick={() => move(-1)}
          >
            <ArrowLeft size={18} />
          </button>
          <button
            type="button"
            className="ui-icon-button"
            aria-label="Следующий экспонент"
            onClick={() => move(1)}
          >
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
      <div
        className="exhibition-company-marquee"
        ref={viewport}
        onScroll={handleScroll}
        onPointerDown={() => {
          interaction.current.drag = true;
        }}
        onPointerUp={() => {
          interaction.current.drag = false;
          pauseFor();
        }}
        onPointerCancel={() => {
          interaction.current.drag = false;
          pauseFor();
        }}
        onWheel={() => pauseFor()}
        onFocusCapture={() => {
          interaction.current.focus = true;
        }}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) interaction.current.focus = false;
        }}
        aria-label="Экспоненты форума"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault();
            move(event.key === 'ArrowLeft' ? -1 : 1);
          }
        }}
      >
        <div className="exhibition-company-track">
          {COPIES.flatMap((copy) =>
            exhibitors.map((item) => (
              <ExhibitorCard
                key={`${copy}-${item.id}`}
                item={item}
                copy={copy}
                onSelect={onSelect}
              />
            )),
          )}
        </div>
      </div>
    </div>
  );
}
