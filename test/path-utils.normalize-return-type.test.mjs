/**
 * BUG-API-007: normalizePath return type inconsistency
 *
 * normalizePath(null, '/') returns null (not a string)
 * normalizePath(undefined, '/') returns undefined (not a string)
 *
 * The function signature implies it always returns a string (normalized path),
 * but for falsy inputs it returns the original value unchanged - a different type.
 *
 * This causes ProcessIndex.isIndexed(null) to call Map.has(null) which works
 * coincidentally, but ProcessIndex.removeFile(null) would also call
 * normalizePath(null, '/') and then Map.get(null) - also working by accident.
 *
 * The return type contract is broken: public API says string in, string out,
 * but null in -> null out.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { normalizePath } from '../client/path-utils.mjs';

describe('BUG-API-007: normalizePath return type contract', () => {

  it('normalizePath(null) returns null, not a string', () => {
    const result = normalizePath(null, '/');
    // Documents the actual (broken) behavior: null is returned, not a string
    assert.equal(typeof result, 'string',
      'normalizePath(null) should return a string, not null');
  });

  it('normalizePath(undefined) returns undefined, not a string', () => {
    const result = normalizePath(undefined, '/');
    assert.equal(typeof result, 'string',
      'normalizePath(undefined) should return a string, not undefined');
  });

  it('normalizePath(0) returns 0, not a string', () => {
    const result = normalizePath(0, '/');
    assert.equal(typeof result, 'string',
      'normalizePath(0) should return a string');
  });

});
