import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePath } from '../client/path-utils.mjs';

describe('normalizePath', () => {
  it('eliminates empty segments from triple separators', () => {
    assert.equal(normalizePath('/a///b////c', '/'), '/a/b/c');
    assert.equal(normalizePath('C:\\\\\\a\\\\b', '\\'), 'C:\\a\\b');
  });
});
