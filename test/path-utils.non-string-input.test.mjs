/**
 * BUG-NULL-006 Hypothesis: normalizePath() and related path functions crash
 * when called with non-string truthy values (e.g., a number or object).
 *
 * normalizePath(inputPath, preferredSep):
 *   if (!inputPath) return '';        // guards falsy
 *   const sep = preferredSep || (inputPath.includes('\\') ? ...)
 *
 * If inputPath is a truthy non-string (e.g., 42 or {}), then:
 * - inputPath.includes('\\') throws TypeError: inputPath.includes is not a function
 *
 * getPathSeparator(filePath) has the same issue:
 *   filePath.includes('\\')  // crashes if filePath is a non-string truthy value
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { normalizePath, getPathSeparator } from '../client/path-utils.mjs';

describe('BUG-NULL-006: normalizePath crashes on non-string truthy inputPath', () => {
  it('throws TypeError when inputPath is a number', () => {
    assert.doesNotThrow(() => {
      normalizePath(42);
    }, 'normalizePath(42) must not throw');
  });

  it('throws TypeError when inputPath is a plain object', () => {
    assert.doesNotThrow(() => {
      normalizePath({ path: '/foo/bar' });
    }, 'normalizePath({}) must not throw');
  });
});

describe('BUG-NULL-006: getPathSeparator crashes on non-string truthy filePath', () => {
  it('throws TypeError when filePath is a number', () => {
    assert.doesNotThrow(() => {
      getPathSeparator(42);
    }, 'getPathSeparator(42) must not throw');
  });

  it('throws TypeError when filePath is a plain object', () => {
    assert.doesNotThrow(() => {
      getPathSeparator({ path: '/foo/bar' });
    }, 'getPathSeparator({}) must not throw');
  });
});
