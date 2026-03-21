import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePath } from '../client/path-utils.mjs';

describe('normalizePath', () => {
  it('handles purely relative paths without any root', () => {
    assert.equal(normalizePath('a/b/c', '/'), 'a/b/c');
    assert.equal(normalizePath('../a/b', '/'), '../a/b');
    assert.equal(normalizePath('../../a', '/'), '../../a');
    assert.equal(normalizePath('./a/./b', '/'), 'a/b');
    assert.equal(normalizePath('a', '/'), 'a');
  });
});
