import { defineConfig } from 'vite';
import { resolve } from 'path';

// Builds the `eidos` CLI binary (dist/cli.js). Node-only, no framework deps —
// uses only built-in `node:*` modules so it never pulls into client bundles.
export default defineConfig({
  build: {
    target: 'node18',
    lib: {
      entry: resolve(__dirname, 'src/cli.ts'),
      formats: ['es'],
      fileName: () => 'cli.js',
    },
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
      external: [/^node:/],
      // Package.json sets sideEffects:false; without this the CLI entry
      // (no exports, runs for its side effects) gets tree-shaken to nothing.
      treeshake: { moduleSideEffects: true },
      output: {
        banner: '#!/usr/bin/env node',
      },
    },
    sourcemap: false,
    minify: false,
  },
});
