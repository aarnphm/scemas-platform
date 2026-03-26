import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  server: { port: 5173, strictPort: true },
  build: {
    chunkSizeWarningLimit: 1100,
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('maplibre-gl') || id.includes('react-map-gl')) return 'maplibre'
          if (id.includes('recharts') || id.includes('d3-')) return 'charts'
        },
      },
    },
  },
})
