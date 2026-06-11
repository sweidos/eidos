import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

interface ReactSubpathOptions {
  dtsInclude: string[];
  entry: string;
  fileName: string;
  /** Extra externals beyond react / react/jsx-runtime / @sweidos/eidos. */
  external?: string[];
  banner?: string;
}

/** Shared config for the React-based @sweidos/eidos/* subpath builds. */
export function reactSubpathConfig({
  dtsInclude,
  entry,
  fileName,
  external = [],
  banner,
}: ReactSubpathOptions) {
  return defineConfig({
    resolve: {
      alias: {
        '@sweidos/eidos': resolve(__dirname, 'src/index.ts'),
      },
    },
    plugins: [
      react(),
      dts({
        include: dtsInclude,
        entryRoot: 'src',
        outDir: 'dist',
        rollupTypes: false,
      }),
    ],
    build: {
      lib: {
        entry: resolve(__dirname, entry),
        formats: ['es'],
        fileName: () => fileName,
      },
      outDir: 'dist',
      emptyOutDir: false,
      rollupOptions: {
        external: ['react', 'react/jsx-runtime', '@sweidos/eidos', ...external],
        output: {
          ...(banner ? { banner } : {}),
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
}
