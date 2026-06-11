import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

// Separate build for the @sweidos/eidos/push subpath export.
// Runs after the main build; emptyOutDir: false preserves dist/eidos.*.js.
export default defineConfig({
  plugins: [
    dts({
      include: ['src/push.ts'],
      entryRoot: 'src',
      outDir: 'dist',
      rollupTypes: false,
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/push.ts'),
      formats: ['es', 'cjs'],
      fileName: (format) => (format === 'es' ? 'push.js' : 'push.cjs'),
    },
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
      // @sweidos/eidos MUST be external so push.js shares the same module
      // instance as the host app's main bundle (sw-bridge module-level state).
      external: ['@sweidos/eidos'],
    },
    sourcemap: false,
    minify: false,
  },
});
