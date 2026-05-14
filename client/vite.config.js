import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'

export default defineConfig({
  plugins: [
    react(),
    legacy({ targets: ['ios >= 13', 'safari >= 13'] }),
  ],
  server: {
    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
})
