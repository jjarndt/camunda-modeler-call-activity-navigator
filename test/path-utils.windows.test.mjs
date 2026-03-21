import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePath } from '../client/path-utils.mjs';

describe('normalizePath', () => {
  it('handles Windows relative path without drive letter', () => {
    assert.equal(normalizePath('a\\b\\..\\c', '\\'), 'a\\c');
    assert.equal(normalizePath('a\\.\\b\\\\c', '\\'), 'a\\b\\c');
    assert.equal(normalizePath('a\\b\\c\\..\\..', '\\'), 'a');
  });
});
