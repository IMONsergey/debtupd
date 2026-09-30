import { VERT, FRAG } from './orbit-shaders.js';

// This optional decoration must never prevent the rest of the hero from mounting.
export function createOrbitRenderer(canvas) {
  let gl, program, buffer;
  const shaders = [];
  const dispose = () => {
    if (!gl || gl.isContextLost()) return;
    if (buffer) gl.deleteBuffer(buffer);
    if (program) gl.deleteProgram(program);
    shaders.forEach((shader) => gl.deleteShader(shader));
  };
  try {
    gl = canvas.getContext('webgl', {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'low-power',
    });
    if (!gl) return null;
    // WebGL 1 does not guarantee fragment highp. The noise hash is unsafe at mediump.
    const precision = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
    if (!precision || precision.precision < 16 || precision.rangeMax < 62) return null;
    const compile = (type, source) => {
      const shader = gl.createShader(type);
      if (!shader) throw new Error('Shader allocation failed');
      shaders.push(shader);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
        throw new Error('Shader compilation failed');
      return shader;
    };
    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    program = gl.createProgram();
    if (!program) throw new Error('Program allocation failed');
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Program linking failed');
    gl.useProgram(program);
    buffer = gl.createBuffer();
    if (!buffer) throw new Error('Buffer allocation failed');
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'aPos');
    if (position < 0) throw new Error('Position attribute unavailable');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const u = Object.fromEntries(
      ['uRes', 'uTime', 'uMouse', 'uHover', 'uHorizonY', 'uHorizonX', 'uHorizonR'].map((name) => [
        name,
        gl.getUniformLocation(program, name),
      ]),
    );
    let width = 0,
      height = 0;
    return {
      dispose,
      draw({ w, h, time, x, y, hover, geometry }, validate = false) {
        if (gl.isContextLost()) return false;
        const resized = width !== w || height !== h;
        if (resized) {
          width = canvas.width = w;
          height = canvas.height = h;
          gl.viewport(0, 0, w, h);
        }
        gl.uniform2f(u.uRes, w, h);
        gl.uniform1f(u.uTime, time);
        gl.uniform2f(u.uMouse, x, y);
        gl.uniform1f(u.uHover, hover);
        gl.uniform1f(u.uHorizonY, geometry.top);
        gl.uniform1f(u.uHorizonX, geometry.cx);
        gl.uniform1f(u.uHorizonR, geometry.radius);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        // Validate startup and framebuffer reallocations, not every animation frame.
        return !(validate || resized) || gl.getError() === gl.NO_ERROR;
      },
    };
  } catch {
    dispose();
    return null;
  }
}
