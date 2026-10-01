import { useLayoutEffect, useRef, useState } from 'react';

// A fitted, bounded map. Gestures and buttons share the same camera; SVG stays untouched.
export function useExhibitionMap(floor) {
  const viewport = useRef(null);
  const canvas = useRef(null);
  const camera = useRef({ x: 0, y: 0, scale: 1 });
  const size = useRef({ width: 1, height: 1, vw: 1, vh: 1 });
  const pointers = useRef(new Map());
  const gesture = useRef(null);
  const moved = useRef(false);
  const frame = useRef(0);
  const [zoom, setZoom] = useState(1);
  const reduced = useRef(false);

  function clamp(next) {
    const s = size.current;
    const scale = Math.max(1, Math.min(4, next.scale));
    const bound = (value, map, view) =>
      map <= view ? (view - map) / 2 : Math.max(view - map, Math.min(0, value));
    return {
      scale,
      x: bound(next.x, s.width * scale, s.vw),
      y: bound(next.y, s.height * scale, s.vh),
    };
  }
  function paint(next) {
    camera.current = next;
    if (canvas.current) {
      canvas.current.style.transform = `translate3d(${next.x}px, ${next.y}px, 0) scale(${next.scale})`;
      canvas.current.style.setProperty('--map-scale', next.scale);
    }
  }
  function move(next, smooth = true) {
    cancelAnimationFrame(frame.current);
    const target = clamp(next);
    setZoom(target.scale);
    if (!smooth || reduced.current) {
      paint(target);
      return;
    }
    const start = { ...camera.current };
    const time = performance.now();
    function animate(now) {
      const t = Math.min(1, (now - time) / 240);
      const ease = 1 - Math.pow(1 - t, 3);
      paint({
        x: start.x + (target.x - start.x) * ease,
        y: start.y + (target.y - start.y) * ease,
        scale: start.scale + (target.scale - start.scale) * ease,
      });
      if (t < 1) frame.current = requestAnimationFrame(animate);
    }
    frame.current = requestAnimationFrame(animate);
  }
  function reset() {
    move({ x: 0, y: 0, scale: 1 });
  }
  function changeZoom(scale, anchor) {
    const s = size.current;
    const point = anchor || { x: s.vw / 2, y: s.vh / 2 };
    const old = camera.current;
    const nextScale = Math.max(1, Math.min(4, scale));
    const ratio = nextScale / old.scale;
    move({
      scale: nextScale,
      x: point.x - (point.x - old.x) * ratio,
      y: point.y - (point.y - old.y) * ratio,
    });
  }
  function locate(stand) {
    const s = size.current;
    const scale = s.vw < 600 ? 4 : 2.5;
    move({
      scale,
      x: s.vw / 2 - ((stand.x + stand.width / 2) / floor.width) * s.width * scale,
      y: s.vh / 2 - ((stand.y + stand.height / 2) / floor.height) * s.height * scale,
    });
  }
  useLayoutEffect(() => {
    const node = viewport.current;
    reduced.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function resize() {
      const vw = node.clientWidth,
        vh = node.clientHeight;
      const width = Math.min(vw, (vh * floor.width) / floor.height);
      size.current = { vw, vh, width, height: (width * floor.height) / floor.width };
      canvas.current.style.width = `${width}px`;
      canvas.current.style.height = `${size.current.height}px`;
      move({ x: 0, y: 0, scale: 1 }, false);
    }
    const observer = new ResizeObserver(resize);
    observer.observe(node);
    resize();
    function wheel(event) {
      event.preventDefault();
      const rect = node.getBoundingClientRect();
      changeZoom(camera.current.scale * Math.exp(-event.deltaY * 0.002), {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });
    }
    node.addEventListener('wheel', wheel, { passive: false });
    return () => {
      observer.disconnect();
      node.removeEventListener('wheel', wheel);
      cancelAnimationFrame(frame.current);
      pointers.current.clear();
      gesture.current = null;
    };
  }, [floor.id]);

  function snapshot() {
    const points = [...pointers.current.values()];
    const center =
      points.length === 2
        ? { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 }
        : points[0];
    const distance =
      points.length === 2 ? Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y) : 0;
    gesture.current = center ? { center, distance, camera: { ...camera.current } } : null;
  }
  function pointerDown(event) {
    if (event.button !== 0) return;
    cancelAnimationFrame(frame.current);
    const rect = viewport.current.getBoundingClientRect();
    pointers.current.set(event.pointerId, {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
    if (pointers.current.size === 1) moved.current = false;
    // Capture on the hit target so a tap still activates a stand.
    try {
      event.target.setPointerCapture(event.pointerId);
    } catch (error) {
      if (error.name !== 'NotFoundError') throw error;
    }
    snapshot();
  }
  function pointerMove(event) {
    if (!pointers.current.has(event.pointerId)) return;
    const rect = viewport.current.getBoundingClientRect();
    pointers.current.set(event.pointerId, {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
    const points = [...pointers.current.values()];
    const start = gesture.current;
    if (!start) return;
    const center =
      points.length === 2
        ? { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 }
        : points[0];
    if (Math.hypot(center.x - start.center.x, center.y - start.center.y) > 5 || points.length === 2)
      moved.current = true;
    if (!moved.current) return;
    const distance =
      points.length === 2 ? Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y) : 0;
    const scale = Math.max(
      1,
      Math.min(
        4,
        start.distance ? (start.camera.scale * distance) / start.distance : start.camera.scale,
      ),
    );
    const ratio = scale / start.camera.scale;
    move(
      {
        scale,
        x: center.x - (start.center.x - start.camera.x) * ratio,
        y: center.y - (start.center.y - start.camera.y) * ratio,
      },
      false,
    );
  }
  function pointerUp(event) {
    pointers.current.delete(event.pointerId);
    snapshot();
  }
  function keyDown(event) {
    if (event.target !== viewport.current) return;
    const old = camera.current;
    const actions = {
      ArrowLeft: { ...old, x: old.x + 60 },
      ArrowRight: { ...old, x: old.x - 60 },
      ArrowUp: { ...old, y: old.y + 60 },
      ArrowDown: { ...old, y: old.y - 60 },
    };
    if (actions[event.key]) {
      event.preventDefault();
      move(actions[event.key]);
    }
    if (['+', '=', '-', 'Home'].includes(event.key)) {
      event.preventDefault();
      if (event.key === 'Home') reset();
      else changeZoom(old.scale + (event.key === '-' ? -0.5 : 0.5));
    }
  }
  return {
    viewport,
    canvas,
    zoom,
    changeZoom,
    locate,
    reset,
    handlers: {
      onPointerDown: pointerDown,
      onPointerMove: pointerMove,
      onPointerUp: pointerUp,
      onPointerCancel: pointerUp,
      onLostPointerCapture: pointerUp,
      onKeyDown: keyDown,
      onClickCapture: (event) => {
        if (moved.current && event.detail !== 0) {
          event.stopPropagation();
          moved.current = false;
        }
      },
    },
  };
}
