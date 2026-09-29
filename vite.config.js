import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { typographyBabel, typographyJson } from './scripts/typography.mjs';
export default defineConfig({
  plugins: [typographyJson(), react({ babel: { plugins: [typographyBabel] } })],
  base: process.env.VITE_BASE_PATH || '/',
  server: {
    host: '0.0.0.0',
    proxy: { '/api/lead': { target: 'https://www.debt-tech.ru', changeOrigin: true } },
  },
  build: { target: 'es2022' },
});
