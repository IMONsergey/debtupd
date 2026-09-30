import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { assetUrl } from '../lib/assets.js';
import { ActionArrow } from './ActionArrow.jsx';
import { speakerPageStarts } from '../lib/speaker-pages.js';

// One roster: three-up desktop carousel, two-up tablet, one-up phone, or the full grid.
export function SpeakerCollection({ speakers }) {
  const track = useRef(null),
    position = useRef(0),
    frame = useRef(0),
    target = useRef(null),
    settle = useRef(0),
    metrics = useRef([]),
    pages = useRef(speakerPageStarts(speakers.length, 1)),
    restoreScroll = useRef(null);
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
    const observer = new ResizeObserver(() => {
      const speaker = pages.current[position.current] || 0;
      measure();
      clearTimeout(settle.current);
      target.current = null;
      if (expanded) {
        node.scrollTo({ left: 0, behavior: 'instant' });
        select(0);
      } else {
        const next = Math.max(
          0,
          pages.current.findLastIndex((start) => start <= speaker),
        );
        select(next);
        node.scrollTo({ left: metrics.current[next] || 0, behavior: 'instant' });
      }
    });
    observer.observe(node);
    measure();
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame.current);
      clearTimeout(settle.current);
      frame.current = 0;
    };
  }, [expanded, speakers.length]);
  useLayoutEffect(() => {
    if (restoreScroll.current === null) return;
    const top = track.current.getBoundingClientRect().top + scrollY - 80;
    const y = expanded ? restoreScroll.current : Math.min(restoreScroll.current, top);
    track.current.focus({ preventScroll: true });
    window.scrollTo({ top: Math.max(0, y), behavior: 'instant' });
    restoreScroll.current = null;
  }, [expanded]);
  const moveTo = (value) => {
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
        onPointerDown={interrupt}
        onWheel={interrupt}
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
            key={speaker.name}
            data-slide-start={pageStarts.includes(i) ? '' : undefined}
            aria-label={`${i + 1} из ${speakers.length}: ${speaker.name}`}
          >
            <div className="speaker-portrait">
              <img
                src={assetUrl('assets/figma/' + speaker.image.replace('.png', '.webp'))}
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
