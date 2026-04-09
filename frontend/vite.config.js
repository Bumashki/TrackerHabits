import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Должен совпадать с портом uvicorn (см. deploy/systemd). Можно переопределить: VITE_API_PROXY_TARGET
const apiTarget = process.env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8000'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
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
