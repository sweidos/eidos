import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import { resolve } from 'path'

// Build for the @sweidos/eidos/sveltekit subpath.
// Provides initEidosSvelteKit() — an onMount-compatible helper that keeps
// Eidos init client-side only.
export default defineConfig({
  resolve: {
    alias: {
      '@sweidos/eidos': resolve(__dirname, 'src/index.ts'),
    },
  },
  plugins: [
    dts({
      include: ['src/sveltekit.ts'],
      entryRoot: 'src',
      outDir: 'dist',
      rollupTypes: false,
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/sveltekit.ts'),
      formats: ['es'],
      fileName: () => 'sveltekit.js',
    },
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
      external: ['@sweidos/eidos'],
    },
    sourcemap: false,
    minify: false,
  },
})
