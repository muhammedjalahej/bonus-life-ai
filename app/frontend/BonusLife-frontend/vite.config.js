import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => ({
  plugins: [
    react({
      // Disable fast-refresh HMR in test mode to prevent Vitest/jsdom conflicts
      fastRefresh: mode !== 'test',
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/__tests__/setup.js',
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true
      },
      '/health': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true
      }
    }
  }
}))
