import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    target: 'es2020',
    lib: {
      entry: resolve(__dirname, 'src/sw.ts'),
      formats: ['es'],
      fileName: () => 'vardi-sw.js',
    },
    outDir: resolve(__dirname, '../../apps/playground/public'),
    rollupOptions: { external: [] },
    minify: false,
    sourcemap: false,
  },
})
