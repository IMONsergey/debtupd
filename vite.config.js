import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { typographyBabel, typographyJson } from './scripts/typography.mjs';
export default defineConfig({
  plugins: [typographyJson(), react({ babel: { plugins: [typographyBabel] } })],
  base: process.env.VITE_BASE_PATH || '/',
  server: {
    host: '0.0.0.0',
    allowedHosts: ['terminal.local'],
    proxy: {
      '/api/lead': {
        target: process.env.FORMS_PROXY_TARGET || 'http://127.0.0.1:32027',
        changeOrigin: true,
      },
    },
  },
  build: { target: 'es2022' },
});
