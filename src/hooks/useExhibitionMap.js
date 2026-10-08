import { useLayoutEffect, useRef, useState } from 'react';

// A fitted, bounded map. Buttons control zoom; dragging pans the untouched SVG.
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
      // Render SVG at its actual display size to retain vector sharpness at every zoom.
      canvas.current.style.width = `${size.current.width * next.scale}px`;
      canvas.current.style.height = `${size.current.height * next.scale}px`;
      canvas.current.style.transform = `translate(${next.x}px, ${next.y}px)`;
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
    return () => {
      observer.disconnect();
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
    gesture.current = center ? { center, camera: { ...camera.current } } : null;
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
    move(
      {
        scale: start.camera.scale,
        x: start.camera.x + center.x - start.center.x,
        y: start.camera.y + center.y - start.center.y,
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
  }
  return {
    viewport,
    canvas,
    zoom,
    changeZoom,
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
