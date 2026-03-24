/**
 * BUG-API-001: normalizePath returns inputPath unchanged for falsy values,
 * including non-null falsy values like '' (empty string) or 0.
 * ProcessIndex.isIndexed('') calls normalizePath('', '/') which returns ''
 * (falsy) unchanged - Map.has('') could accidentally match '' keys.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { normalizePath } from '../client/path-utils.mjs';
import { ProcessIndex } from '../client/process-index.mjs';

describe('BUG-API-001: normalizePath falsy passthrough', () => {

  it('normalizePath("") returns "" unchanged (falsy passthrough)', () => {
    const result = normalizePath('', '/');
    // The function returns inputPath as-is for falsy, so '' is returned
    assert.equal(result, '', 'empty string is returned unchanged');
  });

  it('ProcessIndex.isIndexed("") returns false for empty string', () => {
    const index = new ProcessIndex();
    index.setFileIndex('/some/file.bpmn', ['myProcess']);
    // isIndexed('') should return false - no file was indexed under ''
    const result = index.isIndexed('');
    assert.equal(result, false,
      'isIndexed("") must return false, not accidentally find an empty-string key');
  });

  it('ProcessIndex.isIndexed("") returns false even after setFileIndex("", ...) call', () => {
    const index = new ProcessIndex();
    // If '' passes through normalizePath unchanged, then Map.has('') could
    // return true after setFileIndex('', [...])
    index.setFileIndex('', ['someProcess']);
    // This is the problematic case - '' should arguably be rejected/ignored
    // but if not, isIndexed('') should consistently return what was stored
    const result = index.isIndexed('');
    // normalizePath('', '/') returns '' so setFileIndex stores under '' key
    // isIndexed('') also normalizes to '' - so this actually returns true
    // This is a contract inconsistency: an empty path is a valid index key
    assert.equal(result, false,
      'isIndexed("") must return false - empty string is not a valid file path');
  });

});
