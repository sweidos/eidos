import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import type { Plugin } from 'vite'
import type { ServerResponse, IncomingMessage } from 'http'

// ── Mock API plugin ────────────────────────────────────────────────────────────
// Serves fake endpoints so the demo works without a real backend.
// The SW will intercept and cache GET /api/products.

const PRODUCTS = [
  { id: 1, name: 'Wireless Headphones', price: 79.99, category: 'Audio', stock: 42 },
  { id: 2, name: 'Mechanical Keyboard', price: 149.99, category: 'Input', stock: 17 },
  { id: 3, name: 'USB-C Hub (7-in-1)', price: 49.99, category: 'Connectivity', stock: 89 },
  { id: 4, name: 'Webcam 4K', price: 129.99, category: 'Video', stock: 5 },
  { id: 5, name: 'Desk Mat XL', price: 34.99, category: 'Accessories', stock: 200 },
]

function mockApiPlugin(): Plugin {
  return {
    name: 'eidos-mock-api',
    configureServer(server) {
      server.middlewares.use(
        '/api/products',
        (_req: IncomingMessage, res: ServerResponse) => {
          // Slight artificial delay to make caching visible
          setTimeout(() => {
            res.setHeader('Content-Type', 'application/json')
            res.setHeader('Cache-Control', 'no-store')
            res.end(JSON.stringify(PRODUCTS))
          }, 300)
        },
      )

      server.middlewares.use('/api/orders', (req: IncomingMessage, res: ServerResponse) => {
        if (req.method !== 'POST') return
        let body = ''
        req.on('data', (chunk: Buffer) => { body += chunk.toString() })
        req.on('end', () => {
          setTimeout(() => {
            const order = {
              id: `ORD-${Date.now().toString(36).toUpperCase()}`,
              status: 'confirmed',
              items: JSON.parse(body || '{}'),
              createdAt: new Date().toISOString(),
            }
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(order))
          }, 400)
        })
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), mockApiPlugin()],
  resolve: {
    alias: {
      // During dev: resolve 'eidos' directly to TypeScript source for hot-reload
      '@eidos/core': resolve(__dirname, '../../packages/core/src/index.ts'),
    },
  },
  server: {
    port: 3000,
    open: false,
  },
})
