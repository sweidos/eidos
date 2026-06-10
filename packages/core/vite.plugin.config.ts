import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

// Separate build for the @sweidos/eidos/vite subpath export.
// Runs after the main build; emptyOutDir: false preserves dist/eidos.*.js.
export default defineConfig({
  plugins: [
    dts({
      include: ['src/vite.ts'],
      entryRoot: 'src',
      outDir: 'dist',
      rollupTypes: false,
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/vite.ts'),
      formats: ['es', 'cjs'],
      fileName: (format) => (format === 'es' ? 'vite.js' : 'vite.cjs.js'),
    },
    outDir: 'dist',
    emptyOutDir: false, // preserve main build output
    rollupOptions: {
      external: ['vite', 'fs', 'path', 'url', 'node:fs', 'node:path', 'node:url'],
    },
    sourcemap: false,
    minify: false,
  },
});
