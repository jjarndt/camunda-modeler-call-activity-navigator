import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePath } from '../client/path-utils.mjs';

describe('normalizePath', () => {
  it('handles Windows drive-relative path (no backslash after colon)', () => {
    assert.equal(normalizePath('C:a\\b', '\\'), 'C:a\\b');
    assert.equal(normalizePath('C:', '\\'), 'C:');
  });
});
