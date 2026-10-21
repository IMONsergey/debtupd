import { test, expect } from '@playwright/test';

for (const width of [390, 1440]) {
  test('art-director programme visual QA at ' + width + 'px', async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route('https://kinescope.io/**', (route) =>
      route.fulfill({ contentType: 'text/html', body: '<html></html>' }),
    );
    await page.goto('/#programme', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#site-preloader')).toHaveCount(0, { timeout: 20000 });
    await page.evaluate(() => document.fonts.ready);
    const section = page.locator('#programme');
    await section.scrollIntoViewIfNeeded();
    await section.screenshot({
      path: 'test-results/editorial-visual/programme-' + width + '-collapsed.png',
      animations: 'disabled',
    });
    await section.locator('[data-session-id="session-1"] .forum-programme__session-toggle').click();
    await section.screenshot({
      path: 'test-results/editorial-visual/programme-' + width + '-open.png',
      animations: 'disabled',
    });
    const bounds = await section.evaluate((node) => {
      const heading = node.querySelector('h2');
      const kind = node.querySelector('.forum-programme__session-kind');
      const announcement = node.querySelector('.forum-programme__invited');
      const rect = (element) => element.getBoundingClientRect();
      return {
        pageOverflow: document.documentElement.scrollWidth - innerWidth,
        headingRight: rect(heading).right,
        kindFont: parseFloat(getComputedStyle(kind).fontSize),
        announcementFont: parseFloat(getComputedStyle(announcement).fontSize),
      };
    });
    expect(bounds.pageOverflow).toBeLessThanOrEqual(2);
    expect(bounds.headingRight).toBeLessThanOrEqual(width + 2);
    expect(bounds.kindFont).toBeGreaterThanOrEqual(11);
    expect(bounds.announcementFont).toBeGreaterThanOrEqual(13);
  });
}
