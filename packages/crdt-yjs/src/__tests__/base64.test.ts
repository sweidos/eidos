import { describe, it, expect } from 'vitest';
import { uint8ArrayToBase64, base64ToUint8Array } from '../base64.js';

describe('base64', () => {
  it('round-trips arbitrary bytes', () => {
    const bytes = new Uint8Array([0, 1, 2, 255, 128, 64, 17]);
    const encoded = uint8ArrayToBase64(bytes);
    expect(typeof encoded).toBe('string');
    expect(base64ToUint8Array(encoded)).toEqual(bytes);
  });

  it('round-trips an empty array', () => {
    const bytes = new Uint8Array([]);
    expect(base64ToUint8Array(uint8ArrayToBase64(bytes))).toEqual(bytes);
  });
});
