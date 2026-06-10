import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

// Resolve @sweidos/eidos to local source so Vitest can run tests that import
// subpath files (query.ts, testing.ts) without a prior build step.
const localSelf = resolve(__dirname, 'src/index.ts');

export default defineConfig({
  resolve: {
    alias: {
      // Self-referencing alias for subpath modules (query.ts, testing.ts).
      // Only matters during `vitest` — build configs each declare their own externals.
      '@sweidos/eidos': localSelf,
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    typecheck: { tsconfig: './tsconfig.test.json' },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/__tests__/**', 'src/react/**'],
    },
  },
  plugins: [
    react(),
    dts({
      include: ['src'],
      exclude: ['src/**/*.test.*', 'src/vite.ts', 'src/query.ts', 'src/testing.ts'],
      rollupTypes: true,
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'Eidos',
      // Must explicitly restrict to 'es' — Vite defaults to ['es','umd'] and
      // UMD is incompatible with preserveModules (no code-splitting support).
      formats: ['es'],
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime'],
      output: {
        // ── ESM — preserveModules so consumers can tree-shake React ──────────
        // Vue / Svelte / vanilla consumers importing `resource()` or
        // `eidosStore` only pull in the modules they need; the react/
        // sub-tree is never included in their bundle.
        format: 'es',
        dir: 'dist',
        preserveModules: true,
        preserveModulesRoot: 'src',
        entryFileNames: '[name].js',
        chunkFileNames: '[name]-[hash].js',
        // Vite lib mode defaults inlineDynamicImports:true which is
        // incompatible with preserveModules — must override.
        inlineDynamicImports: false,
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react/jsx-runtime': 'ReactJsxRuntime',
        },
      },
    },
    sourcemap: true,
    minify: 'esbuild',
  },
});
