import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { getPathSeparator, normalizePath } from '../client/path-utils.mjs';

describe('getPathSeparator', () => {
  test('returns backslash for windows drive paths', () => {
    assert.equal(getPathSeparator('C:\\Users\\me\\file.bpmn'), '\\');
  });

  test('returns forward slash for posix paths', () => {
    assert.equal(getPathSeparator('/Users/me/file.bpmn'), '/');
  });

  test('detects backslash even in mixed-separator paths', () => {
    assert.equal(getPathSeparator('C:\\Users/mixed/path'), '\\');
  });

  test('defaults to forward slash for empty string', () => {
    assert.equal(getPathSeparator(''), '/');
  });

  test('defaults to forward slash for null', () => {
    assert.equal(getPathSeparator(null), '/');
  });

  test('defaults to forward slash for undefined', () => {
    assert.equal(getPathSeparator(undefined), '/');
  });
});

describe('normalizePath', () => {
  describe('posix', () => {
    test('resolves parent traversal in absolute path', () => {
      assert.equal(normalizePath('/a/b/../c', '/'), '/a/c');
    });

    test('removes current-dir dots and double slashes', () => {
      assert.equal(normalizePath('/a/./b//c', '/'), '/a/b/c');
    });

    test('resolves parent traversal in relative path', () => {
      assert.equal(normalizePath('a/b/../c', '/'), 'a/c');
    });

    test('collapses double separators', () => {
      assert.equal(normalizePath('/a//b//c', '/'), '/a/b/c');
    });

    test('strips trailing separator', () => {
      assert.equal(normalizePath('/a/b/', '/'), '/a/b');
    });

    test('removes current-dir dots throughout the path', () => {
      assert.equal(normalizePath('/a/./b/./c', '/'), '/a/b/c');
    });

    test('reduces a single current-dir dot to dot', () => {
      assert.equal(normalizePath('.', '/'), '.');
    });

    test('resolves relative parent traversal to sibling', () => {
      assert.equal(normalizePath('a/b/../../c', '/'), 'c');
    });

    test('preserves leading .. when traversal exceeds relative depth', () => {
      assert.equal(normalizePath('a/../..', '/'), '..');
    });

    test('clamps parent traversal at root', () => {
      assert.equal(normalizePath('/a/b/../../../c', '/'), '/c');
    });
  });

  describe('windows', () => {
    test('resolves parent traversal in drive path', () => {
      assert.equal(normalizePath('C:\\a\\b\\..\\c', '\\'), 'C:\\a\\c');
    });

    test('preserves bare drive root', () => {
      assert.equal(normalizePath('C:\\', '\\'), 'C:\\');
    });

    test('clamps parent traversal at drive root', () => {
      assert.equal(normalizePath('C:\\a\\..\\..\\b', '\\'), 'C:\\b');
    });

    test('resolves parent traversal in UNC path', () => {
      assert.equal(normalizePath('\\\\server\\share\\a\\..\\b', '\\'), '\\\\server\\share\\b');
    });

    test('collapses double backslashes in drive path', () => {
      assert.equal(normalizePath('C:\\a\\\\b\\\\c', '\\'), 'C:\\a\\b\\c');
    });

    test('strips trailing backslash', () => {
      assert.equal(normalizePath('C:\\a\\b\\', '\\'), 'C:\\a\\b');
    });

    test('removes current-dir dots throughout the path', () => {
      assert.equal(normalizePath('C:\\a\\.\\b\\.\\c', '\\'), 'C:\\a\\b\\c');
    });

    test('auto-detects backslash separator when none is provided', () => {
      assert.equal(normalizePath('C:\\a\\b\\..\\c'), 'C:\\a\\c');
    });
  });

  describe('edge cases', () => {
    test('returns empty string for null', () => {
      assert.equal(normalizePath(null, '/'), '');
    });

    test('returns empty string for undefined', () => {
      assert.equal(normalizePath(undefined, '/'), '');
    });

    test('returns empty string unchanged', () => {
      assert.equal(normalizePath('', '/'), '');
    });
  });
});
