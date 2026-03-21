import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePath } from '../client/path-utils.mjs';

describe('normalizePath with forced posix separator on Windows-style input', () => {
  it('should normalize backslashes to forward slashes when sep is forced to /', () => {
    const result = normalizePath('C:\\Users\\me\\file', '/');
    assert.equal(result, 'C:/Users/me/file');
  });
});
