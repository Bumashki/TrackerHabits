import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Должен совпадать с портом uvicorn (см. deploy/systemd). Можно переопределить: VITE_API_PROXY_TARGET
const apiTarget = process.env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8000'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    // Запросы через Nginx с другим Host (напр. habits.forwardnet.ru)
    allowedHosts: [
      'habits.forwardnet.ru',
      'localhost',
      '127.0.0.1',
      '194.67.66.112',
    ],
    proxy: {
      '/api': { target: apiTarget, changeOrigin: true },
    },
  },
  preview: {
    proxy: {
      '/api': { target: apiTarget, changeOrigin: true },
    },
  },
})
