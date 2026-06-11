import { describe, it, expect } from 'vitest';
import { generate } from '../generate';
import type { OpenAPISpec } from '../types';

const SPEC: OpenAPISpec = {
  openapi: '3.0.0',
  info: { title: 'Shop API', version: '1.0.0' },
  paths: {
    '/products': {
      get: {
        operationId: 'listProducts',
        summary: 'List products',
        responses: {
          '200': {
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Product' } },
              },
            },
          },
        },
      },
      post: {
        operationId: 'createProduct',
        requestBody: {
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Product' } } },
        },
        responses: {
          '201': {
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Product' } },
            },
          },
        },
      },
    },
    '/products/{id}': {
      delete: {
        responses: { '204': {} },
      },
    },
  },
  components: {
    schemas: {
      Product: {
        type: 'object',
        description: 'A product in the catalog',
        required: ['id', 'name'],
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
        },
      },
      Status: { enum: ['active', 'inactive'] },
    },
  },
};

describe('generate', () => {
  const out = generate(SPEC, { offline: true, eidos: '@sweidos/eidos' });

  it('imports resource and action from the configured package', () => {
    expect(out).toContain(`import { resource, action } from '@sweidos/eidos'`);
  });

  it('generates an interface for object schemas with required/optional fields', () => {
    expect(out).toContain('export interface Product {');
    expect(out).toContain('id: number');
    expect(out).toContain('name: string');
    expect(out).toContain('tags?: string[]');
  });

  it('generates a type alias for enum schemas', () => {
    expect(out).toContain(`export type Status = "active" | "inactive"`);
  });

  it('generates a resource() for GET operations using the operationId', () => {
    expect(out).toContain(`export const listProducts = resource('/products', { offline: true })`);
  });

  it('generates an action() for POST with a typed request/response body', () => {
    expect(out).toContain('export const createProduct = action(');
    expect(out).toContain('async (payload: Product): Promise<Product> => {');
    expect(out).toContain(`method: 'POST'`);
    expect(out).toContain("headers: { 'Content-Type': 'application/json' }");
    expect(out).toContain('body: JSON.stringify(payload)');
    expect(out).toContain(`{ reliability: 'neverLose', name: 'createProduct' }`);
  });

  it('derives an identifier and converts {id} → :id for path-param operations without a body', () => {
    expect(out).toContain('export const deleteProducts = action(');
    expect(out).toContain('async (payload: { id: string }): Promise<void> => {');
    expect(out).toContain('`/products/${payload.id}`');
    expect(out).not.toMatch(/deleteProducts[\s\S]*?Content-Type/);
  });

  it('returns void for 204 responses without re-parsing JSON unless status differs', () => {
    expect(out).toContain('if (res.status !== 204) return res.json() as Promise<void>');
  });
});
