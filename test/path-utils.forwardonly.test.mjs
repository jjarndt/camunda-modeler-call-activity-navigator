import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { getPathSeparator } from '../client/path-utils.mjs';

describe('getPathSeparator - forward slash detection', () => {
  it('always returns forward slash for paths without backslash', () => {
    assert.equal(getPathSeparator('/home/user/file.bpmn'), '/');
    assert.equal(getPathSeparator('relative/path/file.bpmn'), '/');
    assert.equal(getPathSeparator('file.bpmn'), '/');
    assert.equal(getPathSeparator('http://example.com/path'), '/');
    assert.equal(getPathSeparator('C:/Windows/posix/style'), '/');
  });
});
