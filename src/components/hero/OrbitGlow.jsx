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
// One low-resolution volumetric layer. No animation loop while offscreen or in another tab.
export function OrbitGlow({ orbitRef }) {
  const canvasRef = useRef(null),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    const canvas = canvasRef.current,
      host = canvas?.parentElement;
    if (!canvas || !host) return;
    const gl = canvas.getContext('webgl', {
      alpha: false,
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
      host.dataset.gl = 'fallback';
      return;
    }
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      host.dataset.gl = 'fallback';
      return;
    }
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const attribute = gl.getAttribLocation(program, 'aPos');
    gl.enableVertexAttribArray(attribute);
    gl.vertexAttribPointer(attribute, 2, gl.FLOAT, false, 0, 0);
    const names = [
      'uRes',
      'uTime',
      'uMouse',
      'uHover',
      'uBright',
      'uHorizonY',
      'uHorizonX',
      'uHorizonR',
      'uHaze',
      'uCoreSize',
      'uCoreHover',
      'uRimSpread',
      'uParallax',
      'uFit',
      'uBg',
      'uCore',
      'uMid',
      'uDeep',
    ];
    const u = Object.fromEntries(names.map((name) => [name, gl.getUniformLocation(program, name)]));
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0,
      visible = true,
      lost = false,
      disposed = false,
      w = 0,
      h = 0,
      time = 0,
      last = 0,
      lastDraw = 0;
    let x = 0,
      y = 0,
      tx = 0,
      ty = 0,
      hover = 0,
      targetHover = 0;
    let geometry = { cx: 0.54, top: 0.53, radius: 0.76 };
    const resize = () => {
      const hostBox = host.getBoundingClientRect(),
        planetBox = orbitRef.current?.getBoundingClientRect();
      if (!hostBox.width || !hostBox.height) return;
      if (planetBox)
        geometry = {
          cx: (planetBox.left - hostBox.left + planetBox.width / 2) / hostBox.width,
          top: (planetBox.top - hostBox.top) / hostBox.height,
          radius: planetBox.width / 2 / hostBox.width,
        };
      // Exact shared silhouette; deliberately NOT displaced by cursor parallax.
      const budget = hostBox.width < 700 ? 120000 : 210000;
      const scale = Math.min(1, Math.sqrt(budget / (hostBox.width * hostBox.height)));
      w = Math.max(2, Math.round(hostBox.width * scale));
      h = Math.max(2, Math.round(hostBox.height * scale));
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
    const draw = () => {
      if (disposed || lost || !w) return;
      gl.uniform2f(u.uRes, w, h);
      gl.uniform1f(u.uTime, time * 0.5);
      gl.uniform2f(u.uMouse, x, y);
      gl.uniform1f(u.uHover, hover);
      gl.uniform1f(u.uBright, 1.45);
      gl.uniform1f(u.uHorizonY, geometry.top);
      gl.uniform1f(u.uHorizonX, geometry.cx);
      gl.uniform1f(u.uHorizonR, geometry.radius);
      gl.uniform1f(u.uHaze, 3.3);
      gl.uniform1f(u.uCoreSize, 0.013);
      gl.uniform1f(u.uCoreHover, 0.024);
      gl.uniform1f(u.uRimSpread, 0.15);
      gl.uniform1f(u.uParallax, 1.1);
      gl.uniform1f(u.uFit, 0);
      gl.uniform3f(u.uBg, 3 / 255, 9 / 255, 27 / 255);
      gl.uniform3f(u.uCore, 0.62, 0.92, 1);
      gl.uniform3f(u.uMid, 0.1, 0.46, 0.94);
      gl.uniform3f(u.uDeep, 0.015, 0.085, 0.32);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      host.dataset.gl = 'ready';
    };
    const tick = (now) => {
      frame = 0;
      if (disposed || lost || document.hidden || !visible || reduced.matches) return;
      const dt = Math.min(0.05, last ? (now - last) / 1000 : 0);
      last = now;
      time += dt;
      const ease = 1 - Math.exp(-dt * 3.5);
      x += (tx - x) * ease;
      y += (ty - y) * ease;
      hover += (targetHover - hover) * ease;
      if (now - lastDraw >= 32) {
        draw();
        lastDraw = now;
      }
      frame = requestAnimationFrame(tick);
    };
    const sync = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      last = 0;
      if (reduced.matches) draw();
      else if (visible && !document.hidden && !lost) frame = requestAnimationFrame(tick);
    };
    const move = (e) => {
      if (e.pointerType === 'touch') return;
      const r = host.getBoundingClientRect();
      tx = (e.clientX - r.left) / r.width - 0.5;
      ty = (e.clientY - r.top) / r.height - 0.5;
      targetHover = 0.5;
    };
    const leave = () => {
      tx = ty = targetHover = 0;
    };
    const contextLost = (e) => {
      e.preventDefault();
      lost = true;
      host.dataset.gl = 'fallback';
      cancelAnimationFrame(frame);
    };
    const contextRestored = () => setRevision((value) => value + 1);
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
    const pointerHost = host.closest('.hero');
    pointerHost?.addEventListener('pointermove', move, { passive: true });
    pointerHost?.addEventListener('pointerleave', leave);
    canvas.addEventListener('webglcontextlost', contextLost);
    canvas.addEventListener('webglcontextrestored', contextRestored);
    document.addEventListener('visibilitychange', sync);
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
      reduced.removeEventListener('change', sync);
      canvas.removeEventListener('webglcontextlost', contextLost);
      canvas.removeEventListener('webglcontextrestored', contextRestored);
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
