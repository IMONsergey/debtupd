import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
const out = process.env.QA_OUTPUT || 'test-results/experience-screens';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
    : {},
);
for (const [width, height] of [
  [320, 568],
  [390, 844],
  [600, 900],
  [768, 1024],
  [1024, 768],
  [1181, 768],
  [1440, 900],
  [1920, 1080],
  [2560, 1440],
]) {
  const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
  await page.route('**/api/lead', (route) => route.abort());
  await page.goto(process.env.QA_BASE_URL || 'http://127.0.0.1:5173/', {
    waitUntil: 'networkidle',
  });
  await page.evaluate(async () => {
    await document.fonts.ready;
    document.querySelectorAll('img').forEach((img) => (img.loading = 'eager'));
    await Promise.all([...document.images].map((img) => img.decode().catch(() => {})));
  });
  const report = await page.evaluate(() => {
    const rect = (s) => document.querySelector(s).getBoundingClientRect();
    const hero = rect('.hero'),
      ticker = rect('main>.ticker'),
      offer = rect('.corporate-offer'),
      form = rect('.corporate-form');
    return {
      width: innerWidth,
      height: innerHeight,
      hero: hero.height,
      tickerTop: ticker.top,
      corporateBottomDelta: Math.abs(offer.bottom - form.bottom),
      corporateTopDelta: Math.abs(offer.top - form.top),
      overflow: document.documentElement.scrollWidth > innerWidth,
    };
  });
  console.log(JSON.stringify(report));
  for (const selector of [
    '.hero',
    '.participant-tabs',
    '.speakers-note-wrap',
    '.speaker',
    '.corporate',
    '.organizer-heading',
    '.tariff-grid',
    '.other-conferences-carousel',
  ]) {
    const item = page.locator(selector).first();
    await item.evaluate((node) =>
      scrollTo({ top: node.getBoundingClientRect().top + scrollY - 50, behavior: 'instant' }),
    );
    await page.waitForTimeout(70);
    await page.screenshot({
      path: `${out}/${width}-${selector.replaceAll('.', '').replaceAll(' ', '')}.jpg`,
      quality: 85,
    });
  }
  await page.close();
}
await browser.close();
