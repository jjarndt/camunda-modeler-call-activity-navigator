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

test('getPathSeparator returns / for empty/null/undefined input', () => {
  assert.equal(getPathSeparator(''), '/');
  assert.equal(getPathSeparator(null), '/');
  assert.equal(getPathSeparator(undefined), '/');
});

test('normalizePath returns null/undefined unchanged for falsy input', () => {
  assert.equal(normalizePath(null, '/'), null);
  assert.equal(normalizePath(undefined, '/'), undefined);
  assert.equal(normalizePath('', '/'), '');
});

test('normalizePath handles double separators', () => {
  assert.equal(normalizePath('/a//b//c', '/'), '/a/b/c');
  assert.equal(normalizePath('C:\\a\\\\b\\\\c', '\\'), 'C:\\a\\b\\c');
});

test('normalizePath handles trailing separator', () => {
  assert.equal(normalizePath('/a/b/', '/'), '/a/b');
  assert.equal(normalizePath('C:\\a\\b\\', '\\'), 'C:\\a\\b');
});

test('normalizePath handles current-dir dots', () => {
  assert.equal(normalizePath('/a/./b/./c', '/'), '/a/b/c');
  assert.equal(normalizePath('C:\\a\\.\\b\\.\\c', '\\'), 'C:\\a\\b\\c');
});

test('normalizePath auto-detects backslash separator when no preferredSep given', () => {
  assert.equal(normalizePath('C:\\a\\b\\..\\c'), 'C:\\a\\c');
});

test('normalizePath with only current-dir dot returns empty for posix', () => {
  assert.equal(normalizePath('.', '/'), '');
});

test('normalizePath handles relative parent traversal', () => {
  assert.equal(normalizePath('a/b/../../c', '/'), 'c');
  assert.equal(normalizePath('a/../..', '/'), '..');
});

test('normalizePath handles deeply nested parent traversal at root', () => {
  assert.equal(normalizePath('/a/b/../../../c', '/'), '/c');
});

test('getPathSeparator detects backslash even in mixed paths', () => {
  assert.equal(getPathSeparator('C:\\Users/mixed/path'), '\\');
});
