import { useEffect, useRef, useState } from 'react';
import { createOrbitRenderer } from './orbit-renderer.js';
export function OrbitGlow({ orbitRef }) {
  const canvasRef = useRef(null),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    const canvas = canvasRef.current,
      host = canvas?.parentElement;
    if (!canvas || !host) return;
    host.dataset.gl = 'fallback';
    delete canvas._orbitState;
    const renderer = createOrbitRenderer(canvas);
    if (!renderer) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const coarse = matchMedia('(pointer: coarse)');
    const modalBlocked = () => !!document.getElementById('page-content')?.inert;
    let frame = 0,
      visible = true,
      lost = false,
      failed = false,
      pageHidden = false,
      disposed = false,
      loading = !!document.getElementById('site-preloader'),
      w = 0,
      h = 0,
      time = 0,
      last = 0,
      lastDraw = 0;
    let x = 0.54,
      y = 0.3,
      tx = 0.54,
      ty = 0.3,
      hover = 0,
      targetHover = 0;
    let geometry = { cx: 0.54, top: 0.53, radius: 0.78 },
      bounds = { left: 0, top: 0, width: 1, height: 1 };
    const state = { draws: 0, time: 0, hover: 0, x, y, running: false };
    canvas._orbitState = state;
    const fallback = () => {
      failed = true;
      host.dataset.gl = 'fallback';
      cancelAnimationFrame(frame);
      frame = 0;
      state.running = false;
    };
    const draw = () => {
      if (disposed || lost || failed || !w) return;
      try {
        if (!renderer.draw({ w, h, time, x, y, hover, geometry }, !state.draws)) {
          fallback();
          return;
        }
        host.dataset.gl = 'ready';
        Object.assign(state, { draws: state.draws + 1, time, hover, x, y });
      } catch {
        fallback();
      }
    };
    const resize = () => {
      const box = host.getBoundingClientRect(),
        planet = orbitRef.current?.getBoundingClientRect();
      if (!box.width || !box.height) return;
      bounds = { left: box.left, top: box.top + scrollY, width: box.width, height: box.height };
      if (planet)
        geometry = {
          cx: (planet.left - box.left + planet.width / 2) / box.width,
          top: (planet.top - box.top) / box.height,
          radius: planet.width / 2 / box.width,
        };
      const budget = coarse.matches || box.width < 700 ? 90000 : 150000;
      const scale = Math.min(1, Math.sqrt(budget / (box.width * box.height)));
      w = Math.max(2, Math.round(box.width * scale));
      h = Math.max(2, Math.round(box.height * scale));
      canvas.dataset.centerX = String(geometry.cx);
      canvas.dataset.horizonY = String(geometry.top);
      canvas.dataset.radius = String(geometry.radius);
      draw();
    };
    const tick = (now) => {
      frame = 0;
      if (
        disposed ||
        lost ||
        failed ||
        pageHidden ||
        document.hidden ||
        !visible ||
        reduced.matches ||
        loading ||
        modalBlocked()
      ) {
        state.running = false;
        return;
      }
      const dt = Math.min(0.05, last ? (now - last) / 1000 : 1 / 60);
      last = now;
      time += dt;
      const ease = 1 - Math.exp(-dt * 9);
      x += (tx - x) * ease;
      y += (ty - y) * ease;
      hover += (targetHover - hover) * ease;
      // Bound GPU work even on 120/144 Hz screens; touch devices need no 60 fps hover.
      if (now - lastDraw >= (coarse.matches ? 1000 / 24 : 1000 / 30)) {
        draw();
        lastDraw = now;
      }
      if (failed) return;
      state.running = true;
      frame = requestAnimationFrame(tick);
    };
    const sync = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      last = lastDraw = 0;
      state.running = false;
      if (disposed || failed || lost || pageHidden || document.hidden) return;
      if (reduced.matches) draw();
      else if (visible && !loading && !modalBlocked()) frame = requestAnimationFrame(tick);
    };
    const ready = () => {
      loading = false;
      sync();
    };
    const move = (event) => {
      if (event.pointerType === 'touch' || coarse.matches || reduced.matches || !visible) return;
      if (
        event.clientY + scrollY < bounds.top ||
        event.clientY + scrollY > bounds.top + bounds.height
      ) {
        targetHover = 0;
        return;
      }
      tx = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
      ty = Math.min(1, Math.max(0, (event.clientY + scrollY - bounds.top) / bounds.height));
      targetHover = 1;
    };
    const leave = () => {
      targetHover = 0;
      tx = geometry.cx;
      ty = 0.3;
    };
    const contextLost = (event) => {
      event.preventDefault();
      lost = true;
      fallback();
    };
    const restored = () => setRevision((value) => value + 1);
    const hide = () => {
      pageHidden = true;
      leave();
      sync();
    };
    const show = () => {
      pageHidden = false;
      resize();
      sync();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    if (orbitRef.current) ro.observe(orbitRef.current);
    const io = new IntersectionObserver(
      (entries) => {
        visible = entries[0].isIntersecting;
        sync();
      },
      { threshold: 0 },
    );
    io.observe(host);
    const pointerHost = window;
    pointerHost?.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('pointerleave', leave);
    window.addEventListener('blur', leave);
    window.addEventListener('pagehide', hide);
    window.addEventListener('pageshow', show);
    window.addEventListener('resize', resize, { passive: true });
    canvas.addEventListener('webglcontextlost', contextLost);
    canvas.addEventListener('webglcontextrestored', restored);
    document.addEventListener('visibilitychange', sync);
    document.addEventListener('debt:dialog-change', sync);
    document.addEventListener('debt:preloader-closed', ready);
    reduced.addEventListener('change', sync);
    coarse.addEventListener('change', resize);
    resize();
    sync();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      ro.disconnect();
      io.disconnect();
      pointerHost?.removeEventListener('pointermove', move);
      document.removeEventListener('pointerleave', leave);
      window.removeEventListener('blur', leave);
      window.removeEventListener('pagehide', hide);
      window.removeEventListener('pageshow', show);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', sync);
      document.removeEventListener('debt:dialog-change', sync);
      document.removeEventListener('debt:preloader-closed', ready);
      reduced.removeEventListener('change', sync);
      coarse.removeEventListener('change', resize);
      canvas.removeEventListener('webglcontextlost', contextLost);
      canvas.removeEventListener('webglcontextrestored', restored);
      // A lost context already released these objects. Deleting them after restoration
      // contaminates the new context with INVALID_OPERATION on WebKit.
      if (!lost) renderer.dispose();
    };
  }, [orbitRef, revision]);
  return (
    <div className="hero-horizon" aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}
