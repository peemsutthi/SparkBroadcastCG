import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Built into app/control and served by the relay at /. assetsDir is renamed
// because /assets/ on the relay is the show's art, not this bundle.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, fs: { allow: ['..'] } },
  build: { outDir: '../app/control', emptyOutDir: true, assetsDir: 'ui' },
})
