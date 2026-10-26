import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const menuServiceUrl = process.env.MENU_SERVICE_URL || 'http://127.0.0.1:3002';
const orderServiceUrl = process.env.ORDER_SERVICE_URL || 'http://127.0.0.1:3004';
const apiProxy = {
  '/api/menu': { target: menuServiceUrl, changeOrigin: true },
  '/api/orders': { target: orderServiceUrl, changeOrigin: true }
};

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    proxy: apiProxy
  },
  preview: {
    host: '0.0.0.0',
    proxy: apiProxy
  }
});
