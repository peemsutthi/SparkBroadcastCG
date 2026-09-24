import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Built into app/cg and served by the relay under /cg/. The base is build-only
// so the dev server keeps answering bare / as output 1.
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/cg/' : '/',
  server: { port: 5174, host: true, fs: { allow: ['..'] } },
  build: { outDir: '../app/cg', emptyOutDir: true },
}))
