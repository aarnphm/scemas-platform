import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  // tauri expects a fixed port in dev
  server: { port: 5173, strictPort: true },
  // tauri needs the dist output to be relative
  build: { outDir: 'dist', emptyOutDir: true },
})
