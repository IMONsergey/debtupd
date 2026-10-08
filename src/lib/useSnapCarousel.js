import { useCallback, useEffect, useRef, useState } from 'react';

// Shared scroll-snap hook: lock the counter while an arrow is animating.
export function useSnapCarousel(count, breakpoint = 899) {
  const trackRef = useRef(null);
  const targetRef = useRef(null);
  const releaseTimer = useRef(null);
  const activeRef = useRef(0);
  const [index, setIndex] = useState(0);

  const select = useCallback((next) => {
    activeRef.current = next;
    setIndex(next);
  }, []);

  const nearest = useCallback(() => {
    const node = trackRef.current;
    if (!node?.children.length) return 0;
    const max = node.scrollWidth - node.clientWidth;
    if (max <= 2) return 0;
    if (node.scrollLeft >= max - 2) return count - 1;
    const left = node.getBoundingClientRect().left;
    let best = 0;
    let distance = Infinity;
    Array.from(node.children).forEach((child, i) => {
      const delta = Math.abs(child.getBoundingClientRect().left - left);
      if (delta < distance) {
        distance = delta;
        best = i;
      }
    });
    return best;
  }, [count]);

  const release = useCallback(() => {
    clearTimeout(releaseTimer.current);
    releaseTimer.current = null;
    if (targetRef.current !== null) {
      select(targetRef.current);
      targetRef.current = null;
    } else {
      select(nearest());
    }
  }, [nearest, select]);

  const interrupt = useCallback(() => {
    targetRef.current = null;
    clearTimeout(releaseTimer.current);
  }, []);

  const scrollToIndex = useCallback((next) => {
    const node = trackRef.current;
    if (!node || next < 0 || next >= count) return;
    const child = node.children[next];
    if (!child) return;
    clearTimeout(releaseTimer.current);
    targetRef.current = next;
    select(next);
    const max = Math.max(0, node.scrollWidth - node.clientWidth);
    const x = next === count - 1 ? max
      : child.getBoundingClientRect().left - node.getBoundingClientRect().left + node.scrollLeft;
    const left = Math.max(0, Math.min(max, x));
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    node.scrollTo({ left, behavior: reduced ? 'instant' : 'smooth' });
    releaseTimer.current = setTimeout(release, 1000);
  }, [count, release, select]);

  const onScroll = useCallback(() => {
    if (targetRef.current === null) select(nearest());
  }, [nearest, select]);

  const onKeyDown = useCallback((event) => {
    if (!matchMedia('(max-width: ' + breakpoint + 'px)').matches) return;
    if (event.target !== event.currentTarget) return;
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? count - 1
      : Math.max(0, Math.min(count - 1, activeRef.current + (event.key === 'ArrowRight' ? 1 : -1)));
    scrollToIndex(next);
  }, [breakpoint, count, scrollToIndex]);

  useEffect(() => {
    const node = trackRef.current;
    if (!node) return undefined;
    const observer = new ResizeObserver(() => {
      targetRef.current = null;
      clearTimeout(releaseTimer.current);
      if (matchMedia('(max-width: ' + breakpoint + 'px)').matches) {
        select(nearest());
      } else {
        node.scrollTo({ left: 0, behavior: 'instant' });
        select(0);
      }
    });
    observer.observe(node);
    return () => {
      observer.disconnect();
      clearTimeout(releaseTimer.current);
    };
  }, [breakpoint, nearest, select]);

  return { trackRef, index, scrollToIndex, onScroll, onScrollEnd: release, onKeyDown, interrupt };
}
