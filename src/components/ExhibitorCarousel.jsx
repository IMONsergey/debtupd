import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { assetUrl } from '../lib/assets.js';

const COPIES = [0, 1, 2];
const MARQUEE_SPEED = 48;
const SLIDE_DURATION = 420;
const RESUME_DELAY = 700;

const mod = (value, divisor) => ((value % divisor) + divisor) % divisor;
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

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
  const track = useRef(null);
  const marquee = useRef(null);
  const counterFrame = useRef(0);
  const slideFrame = useRef(0);
  const resumeTimer = useRef(0);
  const indexRef = useRef(0);
  const reducedMotion = useRef(false);
  const interaction = useRef({ focus: false, drag: false });
  const drag = useRef({ pointerId: null, x: 0, time: 0, moved: false });
  const metrics = useRef({
    start: 0,
    setWidth: 0,
    step: 1,
    pageSize: 1,
    pageCount: exhibitors.length,
    pageStarts: [0],
    duration: 1,
  });
  const [index, setIndex] = useState(0);
  const [pageCount, setPageCount] = useState(exhibitors.length);

  const logicalOffset = () => {
    const animation = marquee.current;
    const { duration, setWidth } = metrics.current;
    if (!animation || !duration || !setWidth) return 0;
    const time = Number(animation.currentTime) || 0;
    return (mod(time, duration) / duration) * setWidth;
  };

  const updateIndex = () => {
    const { step, pageSize, pageCount: totalPages } = metrics.current;
    if (!step || !pageSize || !totalPages) return;
    const cardIndex = Math.round(logicalOffset() / step) % exhibitors.length;
    const next = Math.min(totalPages - 1, Math.floor(cardIndex / pageSize));
    if (next !== indexRef.current) {
      indexRef.current = next;
      setIndex(next);
    }
  };

  const clearResume = () => {
    clearTimeout(resumeTimer.current);
    resumeTimer.current = 0;
  };

  const pause = () => {
    clearResume();
    marquee.current?.pause();
  };

  const resume = (delay = RESUME_DELAY) => {
    clearResume();
    if (reducedMotion.current || interaction.current.focus || interaction.current.drag) return;
    resumeTimer.current = setTimeout(() => marquee.current?.play(), delay);
  };

  const rebuildAnimation = () => {
    const node = viewport.current;
    const rail = track.current;
    if (!node || !rail || exhibitors.length < 1) return;

    const cards = [...rail.querySelectorAll('.exhibition-company')];
    const first = cards[exhibitors.length];
    const next = cards[exhibitors.length + 1];
    const third = cards[exhibitors.length * 2];
    if (!first || !third) return;

    const old = metrics.current;
    const oldOffset = logicalOffset();
    const oldProgress = old.step ? oldOffset / old.step : indexRef.current * old.pageSize;
    const start = first.offsetLeft;
    const setWidth = third.offsetLeft - start;
    const step = next ? next.offsetLeft - first.offsetLeft : first.offsetWidth;
    const gap = Math.max(0, step - first.offsetWidth);
    const pageSize = Math.max(1, Math.floor((node.clientWidth + gap + 1) / step));
    const totalPages = Math.max(1, Math.ceil(exhibitors.length / pageSize));
    const pageStarts = Array.from({ length: totalPages }, (_, i) => i * pageSize * step);
    const duration = (setWidth / MARQUEE_SPEED) * 1000;
    const nextOffset = mod(oldProgress * step, setWidth);

    marquee.current?.cancel();
    marquee.current = rail.animate(
      [
        { transform: `translate3d(${-start}px, 0, 0)` },
        { transform: `translate3d(${-(start + setWidth)}px, 0, 0)` },
      ],
      { duration, iterations: Infinity, easing: 'linear' },
    );
    metrics.current = {
      start,
      setWidth,
      step,
      pageSize,
      pageCount: totalPages,
      pageStarts,
      duration,
    };
    marquee.current.currentTime = duration + (nextOffset / setWidth) * duration;

    const nextIndex = Math.min(
      totalPages - 1,
      Math.floor(Math.round(nextOffset / step) / pageSize),
    );
    indexRef.current = nextIndex;
    setIndex(nextIndex);
    setPageCount(totalPages);

    if (reducedMotion.current || interaction.current.focus || interaction.current.drag) {
      marquee.current.pause();
    } else {
      marquee.current.play();
    }
  };

  useLayoutEffect(() => {
    const node = viewport.current;
    if (!node) return;
    const observer = new ResizeObserver(rebuildAnimation);
    observer.observe(node);
    rebuildAnimation();
    return () => observer.disconnect();
  }, [exhibitors.length]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncMotion = () => {
      reducedMotion.current = media.matches;
      if (media.matches) pause();
      else resume(0);
    };
    syncMotion();
    media.addEventListener?.('change', syncMotion);

    const watchCounter = () => {
      updateIndex();
      counterFrame.current = requestAnimationFrame(watchCounter);
    };
    counterFrame.current = requestAnimationFrame(watchCounter);

    return () => {
      cancelAnimationFrame(counterFrame.current);
      cancelAnimationFrame(slideFrame.current);
      clearResume();
      media.removeEventListener?.('change', syncMotion);
      marquee.current?.cancel();
      marquee.current = null;
    };
  }, [exhibitors.length]);

  const setAnimationTime = (time) => {
    if (!marquee.current) return;
    marquee.current.currentTime = time;
    updateIndex();
  };

  const tweenTo = (targetTime, nextIndex) => {
    const animation = marquee.current;
    if (!animation) return;
    pause();
    cancelAnimationFrame(slideFrame.current);
    const from = Number(animation.currentTime) || 0;
    const started = performance.now();
    indexRef.current = nextIndex;
    setIndex(nextIndex);

    if (reducedMotion.current) {
      setAnimationTime(targetTime);
      return;
    }

    const tick = (now) => {
      const t = Math.min(1, (now - started) / SLIDE_DURATION);
      setAnimationTime(from + (targetTime - from) * easeInOut(t));
      if (t < 1) {
        slideFrame.current = requestAnimationFrame(tick);
      } else {
        setAnimationTime(targetTime);
        resume();
      }
    };
    slideFrame.current = requestAnimationFrame(tick);
  };

  const move = (direction) => {
    const animation = marquee.current;
    const { pageStarts, pageCount: totalPages, duration } = metrics.current;
    if (!animation || !totalPages || !duration) return;

    const current = indexRef.current;
    const next = (current + direction + totalPages) % totalPages;
    const logicalTime = mod(Number(animation.currentTime) || 0, duration);
    const currentTime = duration + logicalTime;
    animation.currentTime = currentTime;
    let target = duration + (pageStarts[next] / metrics.current.setWidth) * duration;
    if (direction > 0 && target <= currentTime) target += duration;
    if (direction < 0 && target >= currentTime) target -= duration;
    tweenTo(target, next);
  };

  const handlePointerDown = (event) => {
    const animation = marquee.current;
    if (!animation) return;
    pause();
    if (event.target.closest('button')) {
      resume();
      return;
    }
    cancelAnimationFrame(slideFrame.current);
    interaction.current.drag = true;
    const duration = metrics.current.duration;
    const safeTime = duration + mod(Number(animation.currentTime) || 0, duration);
    animation.currentTime = safeTime;
    drag.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      time: safeTime,
      moved: false,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event) => {
    if (!interaction.current.drag || drag.current.pointerId !== event.pointerId) return;
    const dx = drag.current.x - event.clientX;
    if (Math.abs(dx) > 3) drag.current.moved = true;
    const millisecondsPerPixel = metrics.current.duration / metrics.current.setWidth;
    setAnimationTime(drag.current.time + dx * millisecondsPerPixel);
  };

  const finishDrag = (event) => {
    if (!interaction.current.drag || drag.current.pointerId !== event.pointerId) return;
    interaction.current.drag = false;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    updateIndex();
    resume();
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
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onWheel={() => {
          pause();
          resume(500);
        }}
        onFocusCapture={() => {
          interaction.current.focus = true;
          pause();
        }}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            interaction.current.focus = false;
            resume();
          }
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
        <div className="exhibition-company-track" ref={track}>
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
