import { copyFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import type { Plugin, ViteDevServer } from 'vite';

export interface EidosPluginOptions {
  /**
   * Destination path for the service worker, relative to the project root.
   * @default 'public/eidos-sw.js'
   */
  swDest?: string;
}

/**
 * Vite plugin for Eidos.
 *
 * Automatically copies `eidos-sw.js` from the installed package into your
 * `public/` directory on every build and dev-server start, so the service
 * worker is always in sync with the installed package version.
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import { eidos } from '@sweidos/eidos/vite'
 * import { defineConfig } from 'vite'
 *
 * export default defineConfig({
 *   plugins: [eidos()],
 * })
 * ```
 */
export function eidos(options?: EidosPluginOptions): Plugin {
  const swDest = options?.swDest ?? 'public/eidos-sw.js';

  function copySW(root: string): void {
    const src = resolve(root, 'node_modules/@sweidos/eidos/dist/eidos-sw.js');

    if (!existsSync(src)) {
      console.warn(
        '[eidos-vite] Could not locate eidos-sw.js in node_modules. ' +
          'Make sure @sweidos/eidos is installed.',
      );
      return;
    }

    const dest = resolve(root, swDest);
    const destDir = dirname(dest);
    if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });

    copyFileSync(src, dest);
    console.log(`[eidos-vite] eidos-sw.js → ${swDest} ✓`);
  }

  return {
    name: 'eidos',
    buildStart() {
      copySW(process.cwd());
    },
    configureServer(server: ViteDevServer) {
      copySW(server.config.root);
    },
  };
}
