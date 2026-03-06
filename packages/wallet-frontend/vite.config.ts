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
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-query': ['@tanstack/react-query', '@tanstack/react-table', '@tanstack/react-virtual'],
          'vendor-radix': [
            '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-label',
            '@radix-ui/react-popover', '@radix-ui/react-select', '@radix-ui/react-separator',
            '@radix-ui/react-slot', '@radix-ui/react-switch', '@radix-ui/react-tabs',
            '@radix-ui/react-toast', '@radix-ui/react-tooltip',
          ],
          'vendor-misc': ['zustand', 'axios', 'zod', 'react-hook-form', '@hookform/resolvers'],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8447',
        changeOrigin: true,
      },
      '/pg': {
        target: 'http://localhost:4001',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/pg/, ''),
      },
    },
  },
});
