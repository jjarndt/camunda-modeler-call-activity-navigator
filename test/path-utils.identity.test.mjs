import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePath } from '../client/path-utils.mjs';

describe('normalizePath', () => {
  it('returns already-clean paths unchanged', () => {
    assert.equal(normalizePath('/usr/local/bin', '/'), '/usr/local/bin');
    assert.equal(normalizePath('C:\\Windows\\System32', '\\'), 'C:\\Windows\\System32');
    assert.equal(normalizePath('relative/path/here', '/'), 'relative/path/here');
    assert.equal(normalizePath('file.txt', '/'), 'file.txt');
  });
});
