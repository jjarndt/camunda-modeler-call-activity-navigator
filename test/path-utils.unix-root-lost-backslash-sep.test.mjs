/**
 * Bug-Logik-014: normalizePath('/', '\\') returns '.' instead of preserving
 * the root path.
 *
 * When a Unix root path '/' is normalized with Windows separator '\\',
 * the code path falls through all branches:
 * - extractRoot detects root='/' with hasRootSep=true
 * - Zeile 76: root='/' && root !== '/' -> false (skipped)
 * - Zeile 84: isWindows=true -> return joined || '.' = '' || '.' = '.'
 *
 * The root '/' is silently lost. This could occur when files from
 * mixed OS environments are processed (e.g., WSL paths in Windows).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePath } from '../client/path-utils.mjs';

describe('BUG-LOGIK-014: normalizePath loses Unix root when preferredSep is backslash', () => {

  it('should preserve root for "/" with Windows separator', () => {
    const result = normalizePath('/', '\\');
    // The root should not disappear - '/' or '\\' would both be acceptable
    assert.notEqual(
      result,
      '.',
      `normalizePath('/', '\\\\') returned '.' - the root path was lost`
    );
  });

  it('should preserve path segments for "/foo/bar" with Windows separator', () => {
    const result = normalizePath('/foo/bar', '\\');
    // Should be something like \foo\bar or /foo/bar, not just 'foo\\bar' (no root)
    assert.ok(
      result.startsWith('/') || result.startsWith('\\'),
      `normalizePath('/foo/bar', '\\\\') returned "${result}" - lost the root prefix`
    );
  });
});
