import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('debt2026-early-booking-dismissed', '1'));
  await page.route('**/api/lead', route => route.abort());
  await page.route('https://kinescope.io/**', route => route.fulfill({ body: '<body></body>', contentType: 'text/html' }));
});

test('Three partner additions preserve order, names, descriptions, websites, and image assets', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(page.locator('#site-preloader')).toHaveCount(0, { timeout: 12000 });
  const section = page.locator('#partners');
  const leading = section.locator(':scope > .sponsor-panel');
  await expect(leading).toHaveCount(2);
  await expect(leading.nth(0)).toContainText('DEBTPRICE');
  const mig = leading.nth(1);
  await expect(mig).toContainText('МФК «МигКредит»');
  await expect(mig).toContainText('Генеральный партнер');
  await expect(mig).toContainText('Installment Loan, PDL и POS');
  await expect(mig).toContainText('финансовая экосистема');
  await expect(mig.locator('a.featured-partner-logo')).toHaveAttribute('href', 'https://migcredit.ru/');
  await expect(section.locator('.conference-partners-list > article')).toHaveCount(11);
  const autosled = section.locator('.sponsor-panel--partner').filter({hasText:'ООО «Автослед ЕМ групп»'});
  await expect(autosled).toContainText('более 60 регионов');
  await expect(autosled.locator('a')).toHaveAttribute('href', 'https://autosledrf.ru/');
  const storm = section.locator('.sponsor-panel--partner').filter({hasText:'ПКО «А.Сторм»'});
  await expect(storm).toContainText('Storm Finder');
  await expect(storm).toContainText('Нейро-ACT');
  await expect(storm.locator('a')).toHaveAttribute('href','https://storm-security.ru/');
  await mig.scrollIntoViewIfNeeded();
  for (const logo of [mig.locator('.featured-partner-logo img'), autosled.locator('.conference-partner-logo img'), storm.locator('.conference-partner-logo img')]) {
    await logo.scrollIntoViewIfNeeded();
    await expect.poll(() => logo.evaluate(img => img.complete && img.naturalWidth > 0), {timeout:10000}).toBe(true);
  }
  const a = await leading.nth(0).boundingBox(), b = await mig.boundingBox(), c = await section.locator('.conference-partners-carousel').boundingBox();
  expect(b.y).toBeGreaterThanOrEqual(a.y + a.height - 2);
  expect(c.y).toBeGreaterThanOrEqual(b.y + b.height - 2);
});

for (const width of [390, 768, 1440]) {
  test('Featured partner remains legible and page has no horizontal overflow at ' + width + 'px', async ({ page }) => {
    await page.setViewportSize({width,height:900});
    await page.goto('/');
    await expect(page.locator('#site-preloader')).toHaveCount(0,{timeout:12000});
    await page.evaluate(() => document.fonts.ready);
    const section=page.locator('#partners'), mig=section.locator('.sponsor-panel--featured-partner');
    await mig.scrollIntoViewIfNeeded();
    await expect(mig.getByRole('heading',{name:'МФК «МигКредит»'})).toBeVisible();
    await expect(mig.getByText('Генеральный партнер')).toBeVisible();
    const check=await page.evaluate(() => ({
      viewport:window.innerWidth,
      doc:document.documentElement.scrollWidth,
      body:document.body.scrollWidth
    }));
    expect(check.doc).toBeLessThanOrEqual(check.viewport + 2);
    expect(check.body).toBeLessThanOrEqual(check.viewport + 2);
    await section.screenshot({path:'test-results/partners-20261014-' + width + '.png'});
  });
}
