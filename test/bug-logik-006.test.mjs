/**
 * Bug-Logik-006: normalizePath returns empty string for '.' input.
 *
 * The path '.' (current directory) should normalize to '.' but the function
 * strips '.' parts and returns '' because there's no root and no remaining segments.
 * An empty string is semantically wrong -- it represents "nothing" rather than "current dir".
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePath } from '../client/path-utils.mjs';

describe('BUG-LOGIK-006: normalizePath returns empty string for current-dir path', () => {

  it('should return "." for input "."', () => {
    const result = normalizePath('.');
    assert.equal(result, '.', `Expected "." but got "${result}"`);
  });

  it('should return "." for input "./"', () => {
    const result = normalizePath('./');
    assert.equal(result, '.', `Expected "." but got "${result}"`);
  });

  it('should return "." for input "./."', () => {
    const result = normalizePath('./.');
    assert.equal(result, '.', `Expected "." but got "${result}"`);
  });
});
