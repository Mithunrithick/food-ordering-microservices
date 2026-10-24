import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    proxy: {
      '/api/menu': { target: 'http://127.0.0.1:3002', changeOrigin: true },
      '/api/orders': { target: 'http://127.0.0.1:3004', changeOrigin: true }
    }
  }
});