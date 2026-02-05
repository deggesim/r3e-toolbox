import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    chunkSizeWarningLimit: 3000,
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor chunks to improve caching
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['bootstrap', 'react-bootstrap'],
          'utils-vendor': ['zustand', 'fast-xml-parser', 'mathjs'],
        },
      },
    },
  },
})
