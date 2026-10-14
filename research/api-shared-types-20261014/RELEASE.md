# API shared fixture typings — Release evidence

**PR:** https://github.com/sweidos/eidos/pull/115 (squash-merged)
**Deploy:** https://github.com/sweidos/eidos/actions/runs/38525989776 — **success**
**npm:** `@sweidos/eidos@2.5.1` (unchanged)
**Publish scope:** out of scope

## Post-merge verification

| Check                                             | Result   |
| ------------------------------------------------- | -------- |
| Deploy Playground annotations for `./shared/*.js` | **gone** |
| `GET /api/products`                               | 200      |
| `GET /api/products/1`                             | 200      |
| `GET /api/orders-history`                         | 200      |
