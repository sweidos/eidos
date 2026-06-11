import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import type { Plugin } from 'vite';
import type { ServerResponse, IncomingMessage } from 'http';
import { PRODUCTS } from '../../api/_data/products';
import { generateOrderHistory } from '../../api/_data/orders';

// ── Mock API plugin ────────────────────────────────────────────────────────────
// Serves fake endpoints so the demo works without a real backend.
// The SW will intercept and cache GET /api/products.

function mockApiPlugin(): Plugin {
  return {
    name: 'eidos-mock-api',
    configureServer(server) {
      server.middlewares.use('/api/products', (_req: IncomingMessage, res: ServerResponse) => {
        // Slight artificial delay to make caching visible
        setTimeout(() => {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-store');
          res.end(JSON.stringify(PRODUCTS));
        }, 300);
      });

      server.middlewares.use(
        '/api/orders-history',
        (_req: IncomingMessage, res: ServerResponse) => {
          // Longer delay (600ms) makes cache-first benefit obvious
          setTimeout(() => {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Cache-Control', 'no-store');
            res.end(JSON.stringify(generateOrderHistory()));
          }, 600);
        },
      );

      server.middlewares.use('/api/orders', (req: IncomingMessage, res: ServerResponse) => {
        if (req.method !== 'POST') return;
        let body = '';
        req.on('data', (chunk: Buffer) => {
          body += chunk.toString();
        });
        req.on('end', () => {
          setTimeout(() => {
            const order = {
              id: `ORD-${Date.now().toString(36).toUpperCase()}`,
              status: 'confirmed',
              items: JSON.parse(body || '{}'),
              createdAt: new Date().toISOString(),
            };
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(order));
          }, 400);
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), mockApiPlugin()],
  resolve: {
    alias: {
      // During dev: resolve 'eidos' directly to TypeScript source for hot-reload
      '@sweidos/eidos/devtools': resolve(__dirname, '../../packages/core/src/react/Devtools.tsx'),
      '@sweidos/eidos/query': resolve(__dirname, '../../packages/core/src/query.ts'),
      '@sweidos/eidos': resolve(__dirname, '../../packages/core/src/index.ts'),
    },
    // Force one React copy — prevents "invalid hook call" when core/src imports
    // from packages/core/node_modules/react vs the playground's root React.
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: Number(process.env.PORT) || 3000,
    open: false,
  },
});
