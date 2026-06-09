import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dts from 'vite-plugin-dts'
import { resolve } from 'path'

// Build for the @sweidos/eidos/devtools subpath.
// Adds 'use client' banner — required for Next.js App Router.
export default defineConfig({
  resolve: {
    alias: {
      '@sweidos/eidos': resolve(__dirname, 'src/index.ts'),
    },
  },
  plugins: [
    react(),
    dts({
      include: ['src/devtools.ts', 'src/react/Devtools.tsx'],
      entryRoot: 'src',
      outDir: 'dist',
      rollupTypes: false,
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/devtools.ts'),
      formats: ['es'],
      fileName: () => 'devtools.js',
    },
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime', '@sweidos/eidos'],
      output: {
        banner: "'use client';",
        globals: {
          react: 'React',
          'react/jsx-runtime': 'ReactJsxRuntime',
        },
      },
    },
    sourcemap: false,
    minify: false,
  },
})
