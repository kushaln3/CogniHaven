import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'https://7k2k6kcj-8000.inc1.devtunnels.ms',
        changeOrigin: true,
      },
      '/telemetry-stream': {
        target: 'https://7k2k6kcj-8000.inc1.devtunnels.ms',
        changeOrigin: true,
      },
      '/enroll-session': {
        target: 'https://7k2k6kcj-8000.inc1.devtunnels.ms',
        changeOrigin: true,
      },
      '/pre-login-check': {
        target: 'https://7k2k6kcj-8000.inc1.devtunnels.ms',
        changeOrigin: true,
      },
      '/login': {
        target: 'https://7k2k6kcj-8000.inc1.devtunnels.ms',
        changeOrigin: true,
      },
      '/health': {
        target: 'https://7k2k6kcj-8000.inc1.devtunnels.ms',
        changeOrigin: true,
      }
    }
  }
})
