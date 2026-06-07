import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  },
  server: {
    port: 3000,
    open: true,
    proxy: {
      // Forward /api requests to vercel dev server during local development
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
});

