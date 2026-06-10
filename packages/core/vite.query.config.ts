import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

// Separate build for the @sweidos/eidos/query subpath export.
// Runs after the main build; emptyOutDir: false preserves dist/eidos.*.js.
export default defineConfig({
  plugins: [
    dts({
      include: ['src/query.ts'],
      entryRoot: 'src',
      outDir: 'dist',
      rollupTypes: false,
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/query.ts'),
      formats: ['es', 'cjs'],
      fileName: (format) => (format === 'es' ? 'query.js' : 'query.cjs'),
    },
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
      // @sweidos/eidos MUST be external so query.js shares the same module
      // instance as the host app's main bundle — required for the
      // setQueryInvalidator bridge (shared module-level state).
      external: ['@tanstack/react-query', 'react', '@sweidos/eidos'],
    },
    sourcemap: false,
    minify: false,
  },
});
