import { useEffect, useRef, useState } from 'react';
import { VERT, FRAG } from './orbit-shaders.js';
function compile(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}
export function OrbitGlow({ orbitRef }) {
  const canvasRef = useRef(null),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    const canvas = canvasRef.current,
      host = canvas?.parentElement;
    if (!canvas || !host) return;
    const gl = canvas.getContext('webgl', {
      alpha: true,
      premultipliedAlpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'low-power',
    });
    if (!gl) {
      host.dataset.gl = 'fallback';
      return;
    }
    const vs = compile(gl, gl.VERTEX_SHADER, VERT),
      fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) {
      if (vs) gl.deleteShader(vs);
      if (fs) gl.deleteShader(fs);
      host.dataset.gl = 'fallback';
      return;
    }
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      host.dataset.gl = 'fallback';
      return;
    }
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'aPos');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const u = Object.fromEntries(
      ['uRes', 'uTime', 'uMouse', 'uHover', 'uHorizonY', 'uHorizonX', 'uHorizonR'].map((name) => [
        name,
        gl.getUniformLocation(program, name),
      ]),
    );
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const modalBlocked = () => !!document.getElementById('page-content')?.inert;
    let frame = 0,
      visible = true,
      lost = false,
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
    const draw = () => {
      if (disposed || lost || !w) return;
      gl.uniform2f(u.uRes, w, h);
      gl.uniform1f(u.uTime, time);
      gl.uniform2f(u.uMouse, x, y);
      gl.uniform1f(u.uHover, hover);
      gl.uniform1f(u.uHorizonY, geometry.top);
      gl.uniform1f(u.uHorizonX, geometry.cx);
      gl.uniform1f(u.uHorizonR, geometry.radius);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (host.dataset.gl !== 'ready') host.dataset.gl = 'ready';
      Object.assign(state, { draws: state.draws + 1, time, hover, x, y });
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
      const budget = box.width < 700 ? 90000 : 150000;
      const scale = Math.min(1, Math.sqrt(budget / (box.width * box.height)));
      w = Math.max(2, Math.round(box.width * scale));
      h = Math.max(2, Math.round(box.height * scale));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
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
      // Active pointer = up to display refresh; ambient drift = 30 fps. No expensive 3D sampling.
      if (now - lastDraw >= (hover > 0.05 ? 15 : 32)) {
        draw();
        lastDraw = now;
      }
      state.running = true;
      frame = requestAnimationFrame(tick);
    };
    const sync = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      last = 0;
      state.running = false;
      if (reduced.matches) draw();
      else if (visible && !document.hidden && !lost && !loading && !modalBlocked())
        frame = requestAnimationFrame(tick);
    };
    const ready = () => {
      loading = false;
      sync();
    };
    const move = (event) => {
      if (event.pointerType === 'touch' || !visible) return;
      if (
        event.clientY + scrollY < bounds.top ||
        event.clientY + scrollY > bounds.top + bounds.height
      ) {
        targetHover = 0;
        return;
      }
      tx = (event.clientX - bounds.left) / bounds.width;
      ty = (event.clientY + scrollY - bounds.top) / bounds.height;
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
      host.dataset.gl = 'fallback';
      cancelAnimationFrame(frame);
      state.running = false;
    };
    const restored = () => setRevision((value) => value + 1);
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
    pointerHost?.addEventListener('pointerleave', leave);
    canvas.addEventListener('webglcontextlost', contextLost);
    canvas.addEventListener('webglcontextrestored', restored);
    document.addEventListener('visibilitychange', sync);
    document.addEventListener('debt:dialog-change', sync);
    document.addEventListener('debt:preloader-closed', ready);
    reduced.addEventListener('change', sync);
    resize();
    sync();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      ro.disconnect();
      io.disconnect();
      pointerHost?.removeEventListener('pointermove', move);
      pointerHost?.removeEventListener('pointerleave', leave);
      document.removeEventListener('visibilitychange', sync);
      document.removeEventListener('debt:dialog-change', sync);
      document.removeEventListener('debt:preloader-closed', ready);
      reduced.removeEventListener('change', sync);
      canvas.removeEventListener('webglcontextlost', contextLost);
      canvas.removeEventListener('webglcontextrestored', restored);
      if (!lost) {
        gl.deleteBuffer(buffer);
        gl.deleteProgram(program);
        gl.deleteShader(vs);
        gl.deleteShader(fs);
      }
    };
  }, [orbitRef, revision]);
  return (
    <div className="hero-horizon" aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}
