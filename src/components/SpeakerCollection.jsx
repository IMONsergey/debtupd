import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { assetUrl } from '../lib/assets.js';
import { ActionArrow } from './ActionArrow.jsx';
import { speakerPageStarts } from '../lib/speaker-pages.js';

// One roster: three-up desktop carousel, two-up tablet, one-up phone, or the full grid.
const AUTO_SPEED = 48; // Existing desktop continuous marquee (px / s).
const MOBILE_AUTO_SPEED = 24; // Slow, readable mobile marquee (px / s).
const MANUAL_PAUSE_MS = 5500; // Keep desktop auto motion away from manual smooth navigation.
const MOBILE_MANUAL_PAUSE_MS = 4200; // Allow touch momentum to settle.

export function SpeakerCollection({ speakers }) {
  const track = useRef(null),
    position = useRef(0),
    frame = useRef(0),
    target = useRef(null),
    settle = useRef(0),
    metrics = useRef([]),
    measuredGeometry = useRef(null),
    pages = useRef(speakerPageStarts(speakers.length, 1)),
    restoreScroll = useRef(null),
    auto = useRef({
      frame: 0,
      timer: 0,
      last: 0,
      lastCounter: 0,
      direction: 1,
      virtualLeft: null,
      visible: false,
      hovered: false,
      focused: false,
      pressing: false,
      resumeAt: 0,
      start: null,
      stop: null,
    });
  const [index, setIndex] = useState(0),
    [pageStarts, setPageStarts] = useState(pages.current),
    [expanded, setExpanded] = useState(false);
  const clamp = (value) => Math.max(0, Math.min(pages.current.length - 1, value));
  const measure = () => {
    const node = track.current;
    if (node) {
      const offsets = [...node.children].map(
        (card) => card.offsetLeft - node.firstElementChild.offsetLeft,
      );
      const gap = parseFloat(getComputedStyle(node).columnGap) || 0;
      const width = node.firstElementChild?.getBoundingClientRect().width || node.clientWidth;
      const size = Math.max(1, Math.floor((node.clientWidth + gap + 1) / (width + gap)));
      pages.current = speakerPageStarts(speakers.length, size);
      metrics.current = pages.current.map((start) => offsets[start]);
      setPageStarts(pages.current);
    }
  };
  const select = (next) => {
    position.current = next;
    setIndex(next);
  };
  const nearest = () =>
    metrics.current.reduce(
      (best, left, i, offsets) =>
        Math.abs(left - track.current.scrollLeft) <
        Math.abs(offsets[best] - track.current.scrollLeft)
          ? i
          : best,
      0,
    );
  const update = () => {
    // Autoplay owns the counter; skip scroll-settle timers on every animation frame.
    if (auto.current.frame && target.current === null) return;
    if (frame.current || expanded) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      if (target.current === null) select(clamp(nearest()));
      clearTimeout(settle.current);
      settle.current = setTimeout(() => {
        target.current = null;
        select(clamp(nearest()));
      }, 160);
    });
  };
  useEffect(() => {
    const node = track.current;
    const syncMeasurements = () => {
      if (!node.firstElementChild) return;
      // Mobile browsers trigger ResizeObserver during image/font loading and
      // viewport toolbar changes. Repositioning after height-only changes was
      // visibly interrupting native touch momentum and the ongoing animation.
      const geometry = {
        viewport: node.clientWidth,
        card: node.firstElementChild.getBoundingClientRect().width,
        gap: parseFloat(getComputedStyle(node).columnGap) || 0,
      };
      const previous = measuredGeometry.current;
      if (previous && Object.keys(geometry).every(
        (key) => Math.abs(geometry[key] - previous[key]) < .75,
      )) return;
      measuredGeometry.current = geometry;
      auto.current.virtualLeft = null;
      const speaker = pages.current[position.current] || 0;
      measure();
      clearTimeout(settle.current);
      target.current = null;
      if (expanded) {
        node.scrollTo({ left: 0, behavior: 'instant' });
        select(0);
      } else {
        const next = Math.max(0, pages.current.findLastIndex((start) => start <= speaker));
        select(next);
        // Reposition only for actual width / card-count changes.
        node.scrollTo({ left: metrics.current[next] || 0, behavior: 'instant' });
      }
    };
    measuredGeometry.current = null;
    const observer = new ResizeObserver(syncMeasurements);
    observer.observe(node);
    syncMeasurements();
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame.current);
      clearTimeout(settle.current);
      frame.current = 0;
    };
  }, [expanded, speakers.length]);
  // Native horizontal scrolling remains interactive; animate only while visible and unattended.
  // Reverse at the edges rather than jumping abruptly from the final speaker to the first.
  useEffect(() => {
    const node = track.current;
    const state = auto.current;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const compact = window.matchMedia('(max-width: 899px)');
    const stop = () => {
      cancelAnimationFrame(state.frame);
      clearTimeout(state.timer);
      state.frame = 0;
      state.timer = 0;
      state.last = 0;
      state.virtualLeft = null;
    };
    const canRun = () =>
      !expanded &&
      !motion.matches &&
      !document.hidden &&
      state.visible &&
      !state.hovered &&
      !state.focused &&
      !state.pressing &&
      node.scrollWidth > node.clientWidth + 2;

    const tick = (now) => {
      state.frame = 0;
      if (!canRun()) return;
      // Preserve continuous motion without teleporting after a throttled frame.
      // On iOS large scrollLeft writes clash with momentum; cap each mobile frame
      // to around two pixels even when a tab or compositor has been throttled.
      const mobile = compact.matches;
      const elapsed = state.last ? Math.min(mobile ? 80 : 500, now - state.last) : 0;
      state.last = now;
      const max = node.scrollWidth - node.clientWidth;
      const speed = mobile ? MOBILE_AUTO_SPEED : AUTO_SPEED;
      // Only mobile engines need a high-precision virtual offset. Desktop
      // retains its original unmodified scroll algorithm and manual controls.
      const realLeft = node.scrollLeft;
      if (mobile && (state.virtualLeft === null || Math.abs(realLeft - state.virtualLeft) > 3)) {
        state.virtualLeft = realLeft;
      }
      const from = mobile ? state.virtualLeft : realLeft;
      const next = from + (elapsed / 1000) * speed * state.direction;
      if (next >= max) {
        if (mobile) state.virtualLeft = max;
        node.scrollLeft = max;
        state.direction = -1;
      } else if (next <= 0) {
        if (mobile) state.virtualLeft = 0;
        node.scrollLeft = 0;
        state.direction = 1;
      } else {
        if (mobile) state.virtualLeft = next;
        node.scrollLeft = next;
      }
      if (now - state.lastCounter >= 160) {
        const current = clamp(nearest());
        if (current !== position.current) select(current);
        state.lastCounter = now;
      }
      state.frame = requestAnimationFrame(tick);
    };
    const start = () => {
      if (!canRun()) return;
      const wait = state.resumeAt - performance.now();
      if (wait > 0) {
        clearTimeout(state.timer);
        state.timer = setTimeout(() => {
          state.timer = 0;
          start();
        }, wait);
        return;
      }
      clearTimeout(state.timer);
      state.timer = 0;
      // The same uninterrupted marquee operates on every viewport. Mobile
      // only changes the velocity; it no longer waits 3.2 seconds, jumps by a
      // card, or locks the carousel while the user is swiping it.
      if (state.frame) return;
      state.last = 0;
      state.frame = requestAnimationFrame(tick);
    };
    state.start = start;
    state.stop = stop;

    const observer = new IntersectionObserver(
      ([entry]) => {
        state.visible = entry.isIntersecting;
        if (state.visible) start();
        else stop();
      },
      compact.matches
        ? { threshold: 0.02, rootMargin: '80px 0px 80px 0px' }
        : { threshold: 0.12 },
    );
    observer.observe(node);
    // The pointer may be released outside the carousel after a drag.
    const releasePointer = () => {
      if (!state.pressing) return;
      state.pressing = false;
      state.resumeAt = performance.now() +
        (compact.matches ? MOBILE_MANUAL_PAUSE_MS : MANUAL_PAUSE_MS);
      stop();
      start();
    };
    window.addEventListener('pointerup', releasePointer);
    window.addEventListener('pointercancel', releasePointer);
    const sync = () => {
      stop();
      if (!document.hidden && !motion.matches) start();
    };
    document.addEventListener('visibilitychange', sync);
    motion.addEventListener?.('change', sync);
    compact.addEventListener?.('change', sync);
    return () => {
      observer.disconnect();
      window.removeEventListener('pointerup', releasePointer);
      window.removeEventListener('pointercancel', releasePointer);
      document.removeEventListener('visibilitychange', sync);
      motion.removeEventListener?.('change', sync);
      compact.removeEventListener?.('change', sync);
      stop();
      state.start = null;
      state.stop = null;
    };
  }, [expanded, speakers.length]);

  const postponeAutoplay = (duration = matchMedia('(max-width: 899px)').matches
    ? MOBILE_MANUAL_PAUSE_MS : MANUAL_PAUSE_MS) => {
    const state = auto.current;
    state.resumeAt = performance.now() + duration;
    state.stop?.();
    state.start?.();
  };

  useLayoutEffect(() => {
    if (restoreScroll.current === null) return;
    const top = track.current.getBoundingClientRect().top + scrollY - 80;
    const y = expanded ? restoreScroll.current : Math.min(restoreScroll.current, top);
    track.current.focus({ preventScroll: true });
    window.scrollTo({ top: Math.max(0, y), behavior: 'instant' });
    restoreScroll.current = null;
  }, [expanded]);
  const moveTo = (value) => {
    postponeAutoplay();
    const next = clamp(value);
    target.current = next;
    select(next);
    track.current.scrollTo({
      left: metrics.current[next] || 0,
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    });
  };
  const interrupt = () => {
    target.current = null;
    clearTimeout(settle.current);
    postponeAutoplay();
  };
  return (
    <div className={`speaker-collection${expanded ? ' is-expanded' : ''}`}>
      <div className="speakers-controls">
        <span aria-live="polite">
          {String(index + 1).padStart(2, '0')} <i>/ {String(pageStarts.length).padStart(2, '0')}</i>
        </span>
        <div>
          <button
            type="button"
            className="ui-icon-button"
            aria-label="Предыдущий слайд"
            onClick={() => moveTo(position.current - 1)}
            disabled={index === 0}
          >
            <ArrowLeft size={18} />
          </button>
          <button
            type="button"
            className="ui-icon-button"
            aria-label="Следующий слайд"
            onClick={() => moveTo(position.current + 1)}
            disabled={index === pageStarts.length - 1}
          >
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
      <div
        className="speakers-grid"
        ref={track}
        onScroll={update}
        onPointerEnter={(event) => {
          if (event.pointerType === 'mouse' &&
              matchMedia('(hover: hover) and (pointer: fine)').matches) {
            auto.current.hovered = true;
            auto.current.stop?.();
          }
        }}
        onPointerLeave={(event) => {
          if (event.pointerType === 'mouse' &&
              matchMedia('(hover: hover) and (pointer: fine)').matches) {
            auto.current.hovered = false;
            auto.current.start?.();
          }
        }}
        onPointerDown={() => {
          auto.current.pressing = true;
          interrupt();
        }}
        onPointerUp={() => {
          auto.current.pressing = false;
          postponeAutoplay();
        }}
        onPointerCancel={() => {
          auto.current.pressing = false;
          postponeAutoplay();
        }}
        onWheel={interrupt}
        onFocusCapture={(event) => {
          // On iOS tapping a focusable scroll container can leave it focused
          // indefinitely. Pause only for keyboard focus-visible, not touch.
          if (!auto.current.pressing && event.target.matches(':focus-visible')) {
            auto.current.focused = true;
            auto.current.stop?.();
          }
        }}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            auto.current.focused = false;
            auto.current.start?.();
          }
        }}
        aria-label="Спикеры форума"
        tabIndex={0}
        onKeyDown={(event) => {
          if (expanded) return;
          if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
            event.preventDefault();
            moveTo(
              event.key === 'Home'
                ? 0
                : event.key === 'End'
                  ? pages.current.length - 1
                  : position.current + (event.key === 'ArrowRight' ? 1 : -1),
            );
          }
        }}
      >
        {speakers.map((speaker, i) => (
          <article
            className="speaker"
            key={speaker.id || speaker.name}
            data-slide-start={pageStarts.includes(i) ? '' : undefined}
            aria-label={`${i + 1} из ${speakers.length}: ${speaker.name}`}
          >
            <div className="speaker-portrait">
              <img
                src={speaker.photo || (speaker.image
                  ? assetUrl('assets/figma/' + speaker.image.replace(/\.png$/i, '.webp'))
                  : assetUrl('assets/figma/speaker-hd-01.webp'))}
                width="1071"
                height="876"
                alt={speaker.name}
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="speaker-info">
              <img
                className="speaker-card-lines"
                src={assetUrl('assets/figma/card-lines.svg')}
                width="198"
                height="193"
                alt=""
                aria-hidden="true"
                loading="lazy"
              />
              <h3>
                {speaker.name.split(' ').map((part, j) => (
                  <span key={j}>{part}</span>
                ))}
              </h3>
              <p>{speaker.role.replaceAll('\u2028', ' ')}</p>
            </div>
          </article>
        ))}
      </div>
      <button
        type="button"
        className="button speaker-view-toggle"
        aria-expanded={expanded}
        onClick={() => {
          interrupt();
          restoreScroll.current = scrollY;
          select(0);
          setExpanded(!expanded);
        }}
      >
        <span className="button-label">
          {expanded ? 'Скрыть всех спикеров' : 'Показать всех спикеров'}
        </span>
        <ActionArrow />
      </button>
    </div>
  );
}
