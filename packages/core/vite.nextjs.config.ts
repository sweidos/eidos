import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

// Build for the @sweidos/eidos/nextjs subpath.
// Adds 'use client' banner so Next.js App Router treats the module as a
// Client Component boundary — hooks and EidosProvider work without a wrapper.
export default defineConfig({
  resolve: {
    alias: {
      '@sweidos/eidos': resolve(__dirname, 'src/index.ts'),
    },
  },
  plugins: [
    dts({
      include: ['src/nextjs.ts'],
      entryRoot: 'src',
      outDir: 'dist',
      rollupTypes: false,
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/nextjs.ts'),
      formats: ['es'],
      fileName: () => 'nextjs.js',
    },
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime', '@sweidos/eidos'],
      output: {
        banner: "'use client';",
      },
    },
    sourcemap: false,
    minify: false,
  },
});
