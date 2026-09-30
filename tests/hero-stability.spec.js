import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('debt2026-early-booking-dismissed', '1'));
  await page.route('https://kinescope.io/**', (route) => route.abort());
});

async function ready(page) {
  await page.goto('/');
  await expect(page.locator('#site-preloader')).toHaveCount(0, { timeout: 12000 });
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('.hero-universe')).toBeVisible();
}

async function graphicsAvailable(page, browserName) {
  const mode = await page.locator('.hero-horizon').getAttribute('data-gl');
  // The dedicated Chromium project uses SwiftShader, so these tests cannot silently skip
  // all shader coverage on a CI machine without a physical GPU.
  if (browserName === 'chromium') expect(mode).toBe('ready');
  if (mode === 'fallback') {
    await expect(page.locator('.hero-horizon canvas')).toBeHidden();
    return false;
  }
  return true;
}

test('Atmosphere stays transparent away from the rim through phone rotation and desktop resize', async ({
  page,
  browserName,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, options) {
      return original.call(
        this,
        type,
        type === 'webgl' ? { ...options, preserveDrawingBuffer: true } : options,
      );
    };
  });
  await ready(page);
  const available = await graphicsAvailable(page, browserName);
  for (const [width, height] of [
    [320, 568],
    [390, 844],
    [844, 390],
    [1440, 900],
    [2560, 1440],
  ]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(200);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    if (width === 390 || width === 1440)
      await page.screenshot({ path: testInfo.outputPath(`hero-${width}.png`) });
    if (!available) continue;
    const pixels = await page.locator('.hero-horizon canvas').evaluate((canvas) => {
      const gl = canvas.getContext('webgl');
      const { width: w, height: h } = canvas;
      const rgba = new Uint8Array(w * h * 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, rgba);
      const cx = Number(canvas.dataset.centerX),
        top = Number(canvas.dataset.horizonY),
        radius = Number(canvas.dataset.radius);
      let lit = 0,
        escaped = 0,
        maxDistantAlpha = 0;
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          const alpha = rgba[(y * w + x) * 4 + 3];
          const d =
            Math.hypot((x + 0.5) / w - cx, ((1 - (y + 0.5) / h - top) * h) / w - radius) - radius;
          if (alpha > 0) lit++;
          if (d > 0.38 || d < -3 / w) escaped += alpha > 0 ? 1 : 0;
          if (d > 0.18) maxDistantAlpha = Math.max(maxDistantAlpha, alpha);
        }
      return { lit, escaped, maxDistantAlpha, error: gl.getError(), pixels: w * h };
    });
    expect(pixels.error).toBe(0);
    expect(pixels.lit).toBeGreaterThan(10);
    expect(pixels.escaped).toBe(0);
    expect(pixels.maxDistantAlpha).toBeLessThan(60);
    expect(pixels.pixels).toBeLessThan(151000);
  }
});

for (const failure of ['unavailable', 'throws', 'precision', 'compile', 'draw']) {
  test(`A ${failure} graphics failure leaves the hero and its actions usable`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript((failure) => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...args) {
        if (type !== 'webgl') return original.call(this, type, ...args);
        if (failure === 'unavailable') return null;
        if (failure === 'throws') throw new Error('Simulated blocked graphics');
        const gl = original.call(this, type, ...args);
        if (gl && failure === 'precision')
          gl.getShaderPrecisionFormat = () => ({ precision: 0, rangeMax: 0 });
        if (gl && failure === 'compile') gl.getShaderParameter = () => false;
        if (gl && failure === 'draw')
          gl.drawArrays = () => {
            throw new Error('Simulated graphics failure');
          };
        return gl;
      };
    }, failure);
    await page.setViewportSize({ width: 390, height: 844 });
    await ready(page);
    await expect(page.locator('.hero-horizon')).toHaveAttribute('data-gl', 'fallback');
    await expect(page.locator('.hero-horizon canvas')).toBeHidden();
    expect(
      await page
        .locator('.hero-horizon')
        .evaluate((node) => getComputedStyle(node, '::before').opacity),
    ).toBe('1');
    await page.locator('.hero-actions .hero-stand').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test('Losing and restoring WebGL replaces the framebuffer and resumes cleanly', async ({
  page,
  browserName,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await ready(page);
  if (!(await graphicsAvailable(page, browserName))) return;
  const canvas = page.locator('.hero-horizon canvas');
  const supported = await canvas.evaluate((node) => {
    window.__loseOrbit = node.getContext('webgl').getExtension('WEBGL_lose_context');
    return !!window.__loseOrbit;
  });
  if (browserName === 'chromium') expect(supported).toBe(true);
  if (!supported) return;
  for (let attempt = 0; attempt < 2; attempt++) {
    await page.evaluate(() => window.__loseOrbit.loseContext());
    await expect(page.locator('.hero-horizon')).toHaveAttribute('data-gl', 'fallback');
    await expect(canvas).toBeHidden();
    expect(await canvas.evaluate((node) => node._orbitState.running)).toBe(false);
    await page.waitForTimeout(150);
    await page.evaluate(() => window.__loseOrbit.restoreContext());
    await expect
      .poll(() =>
        canvas.evaluate((node) => ({
          mode: node.parentElement.dataset.gl,
          contextLost: node.getContext('webgl').isContextLost(),
        })),
      )
      .toEqual({ mode: 'ready', contextLost: false });
    await expect.poll(() => canvas.evaluate((node) => node._orbitState.running)).toBe(true);
  }
});

test('Animation suspends offscreen, on page hide and reduced motion, then resumes within its frame budget', async ({
  page,
  browserName,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await ready(page);
  if (!(await graphicsAvailable(page, browserName))) return;
  const canvas = page.locator('.hero-horizon canvas');
  await expect.poll(() => canvas.evaluate((node) => node._orbitState.running)).toBe(true);
  await page.evaluate(() => scrollTo({ top: 3000, behavior: 'instant' }));
  await expect.poll(() => canvas.evaluate((node) => node._orbitState.running)).toBe(false);
  const count = await canvas.evaluate((node) => node._orbitState.draws);
  await page.waitForTimeout(250);
  expect(await canvas.evaluate((node) => node._orbitState.draws)).toBe(count);
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await expect.poll(() => canvas.evaluate((node) => node._orbitState.running)).toBe(true);
  await page.evaluate(() =>
    dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })),
  );
  await expect.poll(() => canvas.evaluate((node) => node._orbitState.running)).toBe(false);
  await page.evaluate(() =>
    dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })),
  );
  await expect.poll(() => canvas.evaluate((node) => node._orbitState.running)).toBe(true);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(() => canvas.evaluate((node) => node._orbitState.running)).toBe(false);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect.poll(() => canvas.evaluate((node) => node._orbitState.running)).toBe(true);
  const rate = await canvas.evaluate(async (node) => {
    const before = node._orbitState.draws,
      start = performance.now();
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return (node._orbitState.draws - before) / ((performance.now() - start) / 1000);
  });
  expect(rate).toBeGreaterThan(0);
  expect(rate).toBeLessThan(33);
});
