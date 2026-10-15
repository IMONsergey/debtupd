import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('debt2026-early-booking-dismissed', '1'));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('https://kinescope.io/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<html></html>' }),
  );
});

for (const width of [320, 390, 1280, 1440]) {
  test(
    'FinCifra highlighted menu link navigates correctly at ' + width + 'px',
    async ({ page }) => {
      await page.setViewportSize({ width, height: width === 1280 ? 720 : 900 });
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto('/#about-forum', { waitUntil: 'domcontentloaded' });
      await page.locator('#site-preloader').waitFor({ state: 'detached', timeout: 25000 });

      const menu =
        width < 1181
          ? page.locator('.space-navigation--mobile')
          : page.locator('.fixed-menu .space-navigation');
      if (width < 1181) {
        await menu.getByRole('button', { name: 'Открыть меню' }).click();
      }

      const destinations = await menu
        .locator('.space-route__stop')
        .evaluateAll((nodes) => nodes.map((node) => node.dataset.routeId));
      const index = destinations.indexOf('fincifra-seminar');
      expect(index).toBeGreaterThan(0);
      expect(destinations[index - 1]).toBe('topics');
      expect(destinations[index + 1]).toBe('speakers');

      const link = menu.locator('.space-route__stop[data-route-id="fincifra-seminar"]');
      await expect(link).toHaveText('ФИНЦИФРА-2026');
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute('href', '#fincifra-seminar');
      await expect(link).toHaveClass(/space-route__stop--featured/);
      // The menu label must remain identical to ordinary destinations.
      // Only the planet is emerald, with no badge/box behind the text.
      const decoration = await link.evaluate((element) => {
        const label = element.querySelector('.space-route__label');
        const planet = element.querySelector('.space-planet');
        const ordinary = element.previousElementSibling.querySelector('.space-route__label');
        const visual = (node) => {
          const s = getComputedStyle(node);
          return {
            background: s.backgroundImage,
            border: s.borderTopWidth,
            weight: s.fontWeight,
            padding: s.padding,
          };
        };
        return {
          label: visual(label),
          ordinary: visual(ordinary),
          planet: getComputedStyle(planet).backgroundImage,
        };
      });
      expect(decoration.label).toEqual(decoration.ordinary);
      expect(decoration.label.background).toBe('none');
      expect(decoration.label.border).toBe('0px');
      expect(decoration.planet).toContain('rgb(63, 242, 166)');

      await link.click();
      await expect(page).toHaveURL(/#fincifra-seminar$/);
      await expect(page.locator('.fincifra-seminar__session')).toHaveText(
        'Малая сцена, Сессии 2 и 3',
      );
      await expect(link).toHaveAttribute('aria-current', 'location');
      if (width < 1181) {
        await expect(menu.getByRole('button', { name: 'Открыть меню' })).toBeVisible();
      }

      await page
        .locator('#fincifra-seminar')
        .getByRole('button', { name: 'Зарегистрироваться' })
        .click();
      const modal = page.locator('.form-dialog[data-tariff-id="fincifra"]');
      await expect(modal).toBeVisible();
      await expect(modal.locator('[name="participants_count"]')).toHaveAttribute('max', '2');
      expect(errors).toEqual([]);
    },
  );
}
