import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
      '/pg': {
        target: 'http://speedtest.param.network:8450',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/pg/, '/api'),
      },
    },
  },
});
