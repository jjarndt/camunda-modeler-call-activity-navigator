import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { getPathSeparator, normalizePath } from '../client/path-utils.mjs';

describe('getPathSeparator', () => {
  it('returns backslash for windows drive paths', () => {
    assert.equal(getPathSeparator('C:\\Users\\me\\file.bpmn'), '\\');
  });

  it('returns forward slash for posix paths', () => {
    assert.equal(getPathSeparator('/Users/me/file.bpmn'), '/');
  });

  it('detects backslash even in mixed-separator paths', () => {
    assert.equal(getPathSeparator('C:\\Users/mixed/path'), '\\');
  });

  it('defaults to forward slash for empty string', () => {
    assert.equal(getPathSeparator(''), '/');
  });

  it('defaults to forward slash for null', () => {
    assert.equal(getPathSeparator(null), '/');
  });

  it('defaults to forward slash for undefined', () => {
    assert.equal(getPathSeparator(undefined), '/');
  });
});

describe('normalizePath', () => {
  describe('posix', () => {
    it('resolves parent traversal in absolute path', () => {
      assert.equal(normalizePath('/a/b/../c', '/'), '/a/c');
    });

    it('removes current-dir dots and double slashes', () => {
      assert.equal(normalizePath('/a/./b//c', '/'), '/a/b/c');
    });

    it('resolves parent traversal in relative path', () => {
      assert.equal(normalizePath('a/b/../c', '/'), 'a/c');
    });

    it('collapses double separators', () => {
      assert.equal(normalizePath('/a//b//c', '/'), '/a/b/c');
    });

    it('strips trailing separator', () => {
      assert.equal(normalizePath('/a/b/', '/'), '/a/b');
    });

    it('removes current-dir dots throughout the path', () => {
      assert.equal(normalizePath('/a/./b/./c', '/'), '/a/b/c');
    });

    it('reduces a single current-dir dot to dot', () => {
      assert.equal(normalizePath('.', '/'), '.');
    });

    it('resolves relative parent traversal to sibling', () => {
      assert.equal(normalizePath('a/b/../../c', '/'), 'c');
    });

    it('preserves leading .. when traversal exceeds relative depth', () => {
      assert.equal(normalizePath('a/../..', '/'), '..');
    });

    it('clamps parent traversal at root', () => {
      assert.equal(normalizePath('/a/b/../../../c', '/'), '/c');
    });
  });

  describe('windows', () => {
    it('resolves parent traversal in drive path', () => {
      assert.equal(normalizePath('C:\\a\\b\\..\\c', '\\'), 'C:\\a\\c');
    });

    it('preserves bare drive root', () => {
      assert.equal(normalizePath('C:\\', '\\'), 'C:\\');
    });

    it('clamps parent traversal at drive root', () => {
      assert.equal(normalizePath('C:\\a\\..\\..\\b', '\\'), 'C:\\b');
    });

    it('resolves parent traversal in UNC path', () => {
      assert.equal(normalizePath('\\\\server\\share\\a\\..\\b', '\\'), '\\\\server\\share\\b');
    });

    it('collapses double backslashes in drive path', () => {
      assert.equal(normalizePath('C:\\a\\\\b\\\\c', '\\'), 'C:\\a\\b\\c');
    });

    it('strips trailing backslash', () => {
      assert.equal(normalizePath('C:\\a\\b\\', '\\'), 'C:\\a\\b');
    });

    it('removes current-dir dots throughout the path', () => {
      assert.equal(normalizePath('C:\\a\\.\\b\\.\\c', '\\'), 'C:\\a\\b\\c');
    });

    it('auto-detects backslash separator when none is provided', () => {
      assert.equal(normalizePath('C:\\a\\b\\..\\c'), 'C:\\a\\c');
    });
  });

  describe('edge cases', () => {
    it('returns empty string for null', () => {
      assert.equal(normalizePath(null, '/'), '');
    });

    it('returns empty string for undefined', () => {
      assert.equal(normalizePath(undefined, '/'), '');
    });

    it('returns empty string unchanged', () => {
      assert.equal(normalizePath('', '/'), '');
    });
  });
});
