import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { loadSpec, convertPath, refName } from '../parse';

describe('convertPath', () => {
  it('converts OpenAPI {param} segments to :param', () => {
    expect(convertPath('/users/{id}')).toBe('/users/:id');
    expect(convertPath('/users/{userId}/posts/{postId}')).toBe('/users/:userId/posts/:postId');
  });

  it('leaves paths without params unchanged', () => {
    expect(convertPath('/products')).toBe('/products');
  });
});

describe('refName', () => {
  it('extracts the schema name from a $ref', () => {
    expect(refName('#/components/schemas/Product')).toBe('Product');
  });

  it('returns an empty string for an empty ref', () => {
    expect(refName('')).toBe('');
  });
});

describe('loadSpec', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eidos-gen-'));

  it('throws for a missing file', () => {
    expect(() => loadSpec(path.join(tmpDir, 'missing.json'))).toThrow('File not found');
  });

  it('loads a .json spec', () => {
    const file = path.join(tmpDir, 'spec.json');
    fs.writeFileSync(file, JSON.stringify({ openapi: '3.0.0', paths: {} }));
    expect(loadSpec(file)).toEqual({ openapi: '3.0.0', paths: {} });
  });

  it('loads a .yaml spec', () => {
    const file = path.join(tmpDir, 'spec.yaml');
    fs.writeFileSync(file, 'openapi: 3.0.0\npaths: {}\n');
    expect(loadSpec(file)).toEqual({ openapi: '3.0.0', paths: {} });
  });

  it('sniffs YAML when extension is unrecognized', () => {
    const file = path.join(tmpDir, 'spec.txt');
    fs.writeFileSync(file, 'openapi: 3.0.0\npaths: {}\n');
    expect(loadSpec(file)).toEqual({ openapi: '3.0.0', paths: {} });
  });
});
