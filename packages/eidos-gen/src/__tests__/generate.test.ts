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

describe('generate — schema edge cases', () => {
  const SCHEMA_SPEC: OpenAPISpec = {
    openapi: '3.0.0',
    info: { title: 'Edge API', version: '1.0.0' },
    paths: {
      '/widgets/{id}': {
        put: {
          requestBody: {
            content: { 'text/plain': { schema: { $ref: '#/components/schemas/Widget' } } },
          },
          responses: {
            '200': {
              content: { 'text/plain': { schema: { $ref: '#/components/schemas/Widget' } } },
            },
          },
        },
      },
    },
    components: {
      schemas: {
        Widget: {
          type: 'object',
          properties: {
            meta: { type: 'object', additionalProperties: { type: 'string' } },
            extra: { type: 'object' },
            kind: { allOf: [{ $ref: '#/components/schemas/Status' }, { type: 'string' }] },
            owner: { oneOf: [{ type: 'string' }, { type: 'integer' }] },
          },
        },
        Status: { enum: ['on', 'off'] },
      },
    },
  };

  const out = generate(SCHEMA_SPEC, { offline: false, eidos: '@sweidos/eidos' });

  it('renders additionalProperties as Record<string, T>', () => {
    expect(out).toContain('meta?: Record<string, string>');
  });

  it('renders a bare object schema as Record<string, unknown>', () => {
    expect(out).toContain('extra?: Record<string, unknown>');
  });

  it('renders allOf as an intersection type', () => {
    expect(out).toContain('kind?: Status & string');
  });

  it('renders oneOf as a union type', () => {
    expect(out).toContain('owner?: string | number');
  });

  it('derives an identifier for PUT without an operationId', () => {
    expect(out).toContain('export const updateWidgets = action(');
  });

  it('falls back to the first content type when application/json is absent', () => {
    expect(out).toContain('async (payload: { id: string } & Widget): Promise<Widget> => {');
  });
});
