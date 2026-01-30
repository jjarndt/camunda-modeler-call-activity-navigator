import test from 'node:test';
import assert from 'node:assert/strict';

import { getPathSeparator, normalizePath } from '../client/path-utils.mjs';

test('getPathSeparator detects windows paths', () => {
  assert.equal(getPathSeparator('C:\\Users\\me\\file.bpmn'), '\\');
  assert.equal(getPathSeparator('/Users/me/file.bpmn'), '/');
});

test('normalizePath handles posix absolute paths', () => {
  assert.equal(normalizePath('/a/b/../c', '/'), '/a/c');
  assert.equal(normalizePath('/a/./b//c', '/'), '/a/b/c');
});

test('normalizePath handles posix relative paths', () => {
  assert.equal(normalizePath('a/b/../c', '/'), 'a/c');
});

test('normalizePath handles windows drive paths', () => {
  assert.equal(normalizePath('C:\\a\\b\\..\\c', '\\'), 'C:\\a\\c');
  assert.equal(normalizePath('C:\\', '\\'), 'C:\\');
  assert.equal(normalizePath('C:\\a\\..\\..\\b', '\\'), 'C:\\b');
});

test('normalizePath handles UNC paths', () => {
  assert.equal(normalizePath('\\\\server\\share\\a\\..\\b', '\\'), '\\\\server\\share\\b');
});
