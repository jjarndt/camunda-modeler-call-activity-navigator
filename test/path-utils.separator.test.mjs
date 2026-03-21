import test from 'node:test';
import assert from 'node:assert/strict';

import { getPathSeparator } from '../client/path-utils.mjs';

test('getPathSeparator handles various edge cases', () => {
  assert.equal(getPathSeparator('file.bpmn'), '/');
  assert.equal(getPathSeparator('\\\\server\\share'), '\\');
  assert.equal(getPathSeparator('C:\\'), '\\');
  assert.equal(getPathSeparator('/'), '/');
  assert.equal(getPathSeparator('a/b\\c'), '\\');
});
