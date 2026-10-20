import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { sakuraApi } from './vite-plugin-api.js'

export default defineConfig({
  base: '/',
  plugins: [react(), sakuraApi()],
  server: {
    port: 5173,
    host: true,
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1600,
  },
})
