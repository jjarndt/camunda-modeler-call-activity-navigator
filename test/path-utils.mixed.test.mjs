import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePath } from '../client/path-utils.mjs';

describe('normalizePath', () => {
  it('normalizes mixed forward and backslashes', () => {
    assert.equal(
      normalizePath('C:\\Users/mixed\\path/file', '\\'),
      'C:\\Users\\mixed\\path\\file'
    );
    assert.equal(
      normalizePath('/unix/path\\with\\backslash', '/'),
      '/unix/path/with/backslash'
    );
  });
});
