import { defineConfig } from '@playwright/test';
import base from './playwright.config.js';

const chromium = {
  browserName: 'chromium',
  launchOptions: {
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
    ],
  },
};
export default defineConfig({
  ...base,
  testMatch: ['hero-stability.spec.js', 'cosmic-motion.spec.js'],
  testIgnore: [],
  projects: [
    { name: 'chromium', use: chromium },
    {
      name: 'chromium-mobile',
      use: {
        ...chromium,
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
      },
    },
    { name: 'firefox', use: { browserName: 'firefox', launchOptions: {} } },
    { name: 'webkit', use: { browserName: 'webkit', launchOptions: {} } },
    {
      name: 'webkit-mobile',
      use: {
        browserName: 'webkit',
        launchOptions: {},
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
});
