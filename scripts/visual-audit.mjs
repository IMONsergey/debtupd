import { chromium, firefox, webkit } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

// Read-only browser audit: lead requests are intercepted, never sent to the organiser.
const baseURL = process.env.QA_BASE_URL || 'http://127.0.0.1:5173/';
const output = path.resolve(process.env.QA_OUTPUT || 'test-results/visual-audit');
const engines = (process.env.QA_BROWSERS || 'chromium,firefox,webkit').split(',');
const widths = (
  process.env.QA_WIDTHS ||
  '320,360,390,430,599,600,699,700,767,768,849,850,899,900,1024,1180,1181,1280,1366,1440,1600,1920,2048,2560'
)
  .split(',')
  .map(Number);
const screenshotWidths = new Set(
  (process.env.QA_SCREENSHOTS || '').split(',').filter(Boolean).map(Number),
);
const browsers = { chromium, firefox, webkit };
await fs.mkdir(output, { recursive: true });
const results = [];
for (const engine of engines) {
  let browser;
  try {
    browser = await browsers[engine].launch({
      ...(process.env['PLAYWRIGHT_' + engine.toUpperCase() + '_EXECUTABLE_PATH']
        ? { executablePath: process.env['PLAYWRIGHT_' + engine.toUpperCase() + '_EXECUTABLE_PATH'] }
        : {}),
    });
    const page = await browser.newPage({ reducedMotion: 'reduce', deviceScaleFactor: 1 });
    await page.route('**/api/lead', (route) => route.abort('blockedbyclient'));
    let errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    for (const width of widths) {
      errors = [];
      await page.setViewportSize({ width, height: 960 });
      await page.goto(baseURL, { waitUntil: 'networkidle', timeout: 30000 });
      await page.evaluate(async () => {
        await document.fonts.ready;
        document.querySelectorAll('img').forEach((img) => {
          img.loading = 'eager';
        });
        await Promise.all([...document.images].map((img) => img.decode().catch(() => {})));
      });
      const layout = await page.evaluate(() => {
        const visible = (element) => element.getBoundingClientRect().width > 0;
        const label = (element) => ({
          class: element.className,
          text: element.textContent.trim().slice(0, 80),
        });
        const horizontal = [
          ...document.querySelectorAll('h2,h3,.button,.speaker,.organizer-card,.participant-card'),
        ]
          .filter((element) => visible(element) && element.scrollWidth > element.clientWidth + 2)
          .map(label);
        const vertical = [
          ...document.querySelectorAll(
            '.organizer-card,.service-copy,.speaker-info,.tariff,.topic-card,.about-copy',
          ),
        ]
          .filter((element) => visible(element) && element.scrollHeight > element.clientHeight + 3)
          .map(label);
        const broken = [...document.images]
          .filter((img) => !img.complete || !img.naturalWidth)
          .map((img) => img.getAttribute('src'));
        const distorted = [...document.images]
          .filter(
            (img) =>
              visible(img) &&
              img.naturalWidth &&
              getComputedStyle(img).objectFit === 'fill' &&
              Math.abs(
                img.offsetWidth / img.offsetHeight / (img.naturalWidth / img.naturalHeight) - 1,
              ) > 0.025,
          )
          .map((img) => img.getAttribute('src'));
        const astronaut = document.querySelector('.tariff-astronaut').getBoundingClientRect();
        const heading = document.querySelector('.tariffs-heading').getBoundingClientRect();
        return {
          overflow: document.documentElement.scrollWidth > innerWidth,
          horizontal,
          vertical,
          broken,
          distorted,
          astronautTop: Math.round((astronaut.top - heading.top) * 100) / 100,
          eagerVideoFrames: document.querySelectorAll('.desktop-sidebar-video iframe').length,
          sectionCount: document.querySelectorAll('main > .section').length,
          height: document.documentElement.scrollHeight,
        };
      });
      const record = {
        engine,
        browserVersion: browser.version(),
        width,
        ...layout,
        errors: [...errors],
      };
      record.passed =
        !layout.overflow &&
        !layout.horizontal.length &&
        !layout.vertical.length &&
        !layout.broken.length &&
        !layout.distorted.length &&
        !errors.length &&
        layout.astronautTop >= -2 &&
        layout.eagerVideoFrames === 0;
      if (screenshotWidths.has(width)) {
        for (const id of [
          'top',
          'about-forum',
          'participants',
          'services',
          'topics',
          'speakers',
          'audience',
          'organizer',
          'tariffs',
          'corporate-packages',
          'other-conferences',
          'partners',
          'information-partners',
          'contacts',
        ]) {
          const element = page.locator('#' + id);
          if (!(await element.count())) continue;
          await element.evaluate((node) =>
            scrollTo({ top: node.getBoundingClientRect().top + scrollY - 50, behavior: 'instant' }),
          );
          await page.waitForTimeout(80);
          await page.screenshot({
            path: path.join(output, `${engine}-${width}-${id}.jpg`),
            quality: 82,
          });
        }
      }
      results.push(record);
      await fs.writeFile(
        path.join(output, 'results.json'),
        JSON.stringify({ baseURL, results }, null, 2),
      );
      console.log(
        `${record.passed ? 'PASS' : 'FAIL'} ${engine} ${width}px${record.passed ? '' : ' ' + JSON.stringify(record)}`,
      );
    }
    await page.close();
  } catch (error) {
    results.push({ engine, passed: false, error: error.message });
    console.error(engine, error.message);
  } finally {
    await browser?.close();
  }
}
await fs.writeFile(
  path.join(output, 'results.json'),
  JSON.stringify({ baseURL, results }, null, 2),
);
const failures = results.filter((result) => !result.passed);
console.log(
  `Browser geometry audit: ${results.length - failures.length}/${results.length} passed. Results: ${output}`,
);
if (failures.length) process.exitCode = 1;
