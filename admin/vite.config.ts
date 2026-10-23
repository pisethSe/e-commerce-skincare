import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (
            id.includes('recharts') ||
            id.includes('victory-vendor') ||
            /node_modules[\\/]d3-/.test(id) ||
            id.includes('react-smooth')
          ) {
            return 'charts'
          }
          if (/node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'react'
          if (id.includes('react-router')) return 'router'
          if (/node_modules[\\/](framer-motion|motion-dom|motion-utils)[\\/]/.test(id)) return 'motion'
          return 'vendor'
        },
      },
    },
  },
  server: {
    port: 3001,
    proxy: { '/api': { target: 'http://localhost:5001', changeOrigin: true } },
  },
})
