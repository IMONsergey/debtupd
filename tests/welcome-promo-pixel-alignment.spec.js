import { test, expect } from '@playwright/test';

test.describe('WELCOME visible glyph alignment', () => {
  test.use({ deviceScaleFactor: 2 });

  async function inkMargins(page) {
    const screenshot = await page.locator('.welcome-discount__promo')
      .screenshot({ animations: 'disabled', scale: 'device' });
    return page.evaluate(async (imageBase64) => {
      const image = new Image();
      image.src = 'data:image/png;base64,' + imageBase64;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(image, 0, 0);
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      // Ignore corner brackets, background stars and the copy icon. Read only
      // the actual turquoise WELCOME glyphs in the central part of the band.
      const x1 = Math.round(canvas.width * .22);
      const x2 = Math.round(canvas.width * .77);
      const minimum = Math.max(8, Math.floor(canvas.width * .015));
      const rows = [];
      for (let y = 0; y < canvas.height; y++) {
        let matching = 0;
        for (let x = x1; x < x2; x++) {
          const offset = 4 * (y * canvas.width + x);
          const r = data[offset];
          const g = data[offset + 1];
          const b = data[offset + 2];
          if (r < 170 && g > 160 && b > 180 && g - r > 55) matching++;
        }
        if (matching >= minimum) rows.push(y);
      }
      if (rows.length < 10) throw Error('Cannot locate the visible WELCOME glyph pixels.');
      const first = rows[0];
      const last = rows.at(-1);
      const code = document.querySelector('.welcome-discount__code-text');
      return {
        top: first,
        bottom: canvas.height - 1 - last,
        inkHeight: last - first + 1,
        bandHeight: canvas.height,
        transform: getComputedStyle(code).transform,
        codeFont: getComputedStyle(code).fontFamily,
      };
    }, screenshot.toString('base64'));
  }

  test('all viewport widths have equal visible WELCOME top/bottom padding', async ({ page }) => {
    await page.setViewportSize({ width: 658, height: 900 });
    await page.clock.install({ time: new Date('2026-10-23T08:00:00+03:00') });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#site-preloader')).toHaveCount(0, { timeout: 30000 });
    await page.clock.fastForward(60_150);
    await expect(page.locator('.welcome-discount__promo')).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    for (const width of [320, 390, 420, 430, 439, 440, 450, 460, 475, 480, 500, 520, 540, 560, 575, 580, 590, 600, 658, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await page.waitForTimeout(120);
      const result = await inkMargins(page);
      console.log('PROMO_INK_MARGIN', width, result);
      expect(result.codeFont).toContain('Bebas Neue');
      // A zero-pixel transform was the production regression: the published
      // CSS accidentally differed from the intended source CSS.
      expect(result.transform).not.toMatch(/matrix\(1,\s*0,\s*0,\s*1,\s*0,\s*0\)/);
      expect(result.top).toBeGreaterThanOrEqual(3);
      expect(result.bottom).toBeGreaterThanOrEqual(3);
      expect(
        Math.abs(result.top - result.bottom),
        'Unequal visible letter padding at width ' + width + ': ' +
          result.top + 'px above / ' + result.bottom + 'px below'
      ).toBeLessThanOrEqual(4);
    }
  });

  test('normal motion preference also centers rendered letters, not just reduced-motion mode', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.setViewportSize({ width: 658, height: 900 });
    await page.clock.install({ time: new Date('2026-10-23T08:00:00+03:00') });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#site-preloader')).toHaveCount(0, { timeout: 30000 });
    await page.clock.fastForward(60_150);
    await expect(page.locator('.welcome-discount__promo')).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    // Capture the steady visible popup, not a 0.38-second scale-in transition.
    await page.clock.runFor(700);
    const imbalances = [];
    for (const width of [320, 390, 420, 440, 460, 500, 560, 600, 658, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await page.waitForTimeout(120);
      const result = await inkMargins(page);
      const animationState = await page.locator('.welcome-discount').evaluate(el => ({
        transform: getComputedStyle(el).transform,
        animations: el.getAnimations().map(a => ({ playState: a.playState, time: a.currentTime })),
      }));
      console.log('NORMAL_MOTION_INK', width, result.top, result.bottom, result.transform, animationState);
      if (Math.abs(result.top - result.bottom) > 4) {
        imbalances.push({ width, top: result.top, bottom: result.bottom });
      }
    }
    expect(imbalances, 'Visible letter asymmetries with normal motion').toEqual([]);
  });

});
