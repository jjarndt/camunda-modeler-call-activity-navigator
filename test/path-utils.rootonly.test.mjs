import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePath } from '../client/path-utils.mjs';

describe('normalizePath', () => {
  it('handles root-only paths', () => {
    assert.equal(normalizePath('/', '/'), '/');
    assert.equal(normalizePath('C:\\', '\\'), 'C:\\');
    assert.equal(normalizePath('//', '/'), '/');
  });
});
