import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePath } from '../client/path-utils.mjs';

describe('normalizePath UNC paths', () => {

  it('handles UNC paths with parent traversal', () => {
    assert.equal(
      normalizePath('\\\\server\\share\\a\\b\\..\\c', '\\'),
      '\\\\server\\share\\a\\c'
    );

    assert.equal(
      normalizePath('\\\\server\\share\\..', '\\'),
      '\\\\server\\share\\'
    );
  });
});
