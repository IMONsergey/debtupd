import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
const label = process.env.QA_LABEL || 'current',
  base = process.env.QA_BASE_URL || 'http://127.0.0.1:5173/';
const output = process.env.QA_OUTPUT || 'test-results/runtime';
const dpr = Math.max(1, Math.min(3, Number(process.env.QA_DPR) || 1));
await fs.mkdir(output, { recursive: true });
const b = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
    : {},
);
const p = await b.newPage({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: dpr,
  reducedMotion: 'no-preference',
});
await p.addInitScript(() => sessionStorage.setItem('debt2026-early-booking-dismissed', '1'));
await p.route('https://kinescope.io/**', (r) =>
  r.fulfill({ contentType: 'text/html', body: '<body style="background:#001329"></body>' }),
);
await p.goto(base, { waitUntil: 'domcontentloaded' });
await p.waitForFunction(() => !document.getElementById('site-preloader'));
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(2000);
const cdp = await p.context().newCDPSession(p);
await cdp.send('Performance.enable');
const results = {
  label,
  base,
  browser: b.version(),
  viewport: `1440x900, DPR ${dpr}`,
  video: 'blocked for repeatable comparison',
  phases: [],
};
for (const [mode, duration] of [
  ['pointer', 6000],
  ['scroll', 12000],
]) {
  await p.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await p.waitForTimeout(500);
  const before = (await cdp.send('Performance.getMetrics')).metrics;
  const data = await p.evaluate(
    ({ mode, duration }) =>
      new Promise((resolve) => {
        const frames = [],
          tasks = [];
        const observer = new PerformanceObserver((list) =>
          tasks.push(
            ...list.getEntries().map((e) => ({ duration: e.duration, start: e.startTime })),
          ),
        );
        observer.observe({ type: 'longtask', buffered: false });
        let start = 0,
          last = 0;
        const target = document.querySelector('.hero');
        const tick = (now) => {
          if (!start) {
            start = now;
            last = now;
          } else {
            frames.push(now - last);
            last = now;
          }
          const elapsed = now - start,
            t = Math.min(1, elapsed / duration);
          if (mode === 'pointer') {
            const x = innerWidth * (0.5 + 0.43 * Math.sin(t * Math.PI * 4));
            const y = innerHeight * (0.46 + 0.27 * Math.cos(t * Math.PI * 3));
            target.dispatchEvent(
              new PointerEvent('pointermove', {
                bubbles: true,
                clientX: x,
                clientY: y,
                pointerType: 'mouse',
              }),
            );
          } else
            scrollTo({
              top: t * Math.min(16000, document.documentElement.scrollHeight - innerHeight),
              behavior: 'instant',
            });
          if (elapsed < duration) requestAnimationFrame(tick);
          else {
            observer.disconnect();
            const sorted = [...frames].sort((a, b) => a - b);
            resolve({
              mode,
              elapsed,
              frames: frames.length,
              medianMs: sorted[Math.floor(sorted.length * 0.5)],
              p95Ms: sorted[Math.floor(sorted.length * 0.95)],
              maxMs: Math.max(...frames),
              over33: frames.filter((x) => x > 34).length,
              over50: frames.filter((x) => x > 50).length,
              longTasks: tasks.length,
              longTaskMs: tasks.reduce((s, x) => s + x.duration, 0),
            });
          }
        };
        requestAnimationFrame(tick);
      }),
    { mode, duration },
  );
  const after = (await cdp.send('Performance.getMetrics')).metrics;
  const wanted = [
    'TaskDuration',
    'ScriptDuration',
    'RecalcStyleDuration',
    'LayoutDuration',
    'RecalcStyleCount',
    'LayoutCount',
  ];
  data.mainThread = Object.fromEntries(
    wanted.map((name) => [
      name,
      +(
        after.find((x) => x.name === name).value - before.find((x) => x.name === name).value
      ).toFixed(4),
    ]),
  );
  results.phases.push(data);
  console.log(label, JSON.stringify(data));
}
await p.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
await p.waitForTimeout(900);
await p.screenshot({ path: `${output}/${label}-hero.jpg`, quality: 88 });
await fs.writeFile(`${output}/${label}-benchmark.json`, JSON.stringify(results, null, 2));
await b.close();
