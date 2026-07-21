import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// Widget build — produces a single JS file that can be embedded on any website
export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL || 'http://localhost:3001')
  },
  build: {
    outDir: 'dist-widget',
    lib: {
      entry: resolve(__dirname, 'src/widget/Widget.jsx'),
      name: 'MashelengWidget',
      fileName: 'masheleng-widget',
      formats: ['iife']
    },
    rollupOptions: {
      external: [],
      output: {
        globals: {}
      }
    }
  }
});
