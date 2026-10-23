import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@legalblocks/module-runtime': resolve(__dirname, '../../module-runtime/src/index.ts'),
    },
  },
  root: resolve(__dirname),
  server: { port: 5173 },
})