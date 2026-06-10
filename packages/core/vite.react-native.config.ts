import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

// Build for the @sweidos/eidos/react-native subpath.
// @sweidos/eidos is external — both the main bundle and this subpath share the
// same store singleton at runtime (no duplicate state).
export default defineConfig({
  resolve: {
    alias: {
      '@sweidos/eidos': resolve(__dirname, 'src/index.ts'),
    },
  },
  plugins: [
    react(),
    dts({
      include: ['src/react-native.ts', 'src/react/ProviderRN.tsx', 'src/runtime-rn.ts'],
      entryRoot: 'src',
      outDir: 'dist',
      rollupTypes: false,
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/react-native.ts'),
      formats: ['es'],
      fileName: () => 'react-native.js',
    },
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
      external: ['react', 'react/jsx-runtime', '@sweidos/eidos'],
      output: {
        globals: {
          react: 'React',
          'react/jsx-runtime': 'ReactJsxRuntime',
        },
      },
    },
    sourcemap: false,
    minify: false,
  },
});
