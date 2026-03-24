/**
 * Bug-Logik-011: normalizePath incorrectly converts relative drive paths to absolute.
 *
 * In Windows, "C:foo" is a path relative to the current directory on drive C:,
 * which is different from "C:\foo" (absolute path on drive C:).
 * normalizePath('C:foo', '\\') returns 'C:\\foo' (absolute), which changes
 * the semantics of the path.
 *
 * The function adds a separator between root and joined when hasRootSep=false
 * (line 78: return joined ? root + sep + joined : root), converting
 * a relative drive path into an absolute one.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePath } from '../client/path-utils.mjs';

describe('BUG-LOGIK-011: normalizePath turns relative drive path into absolute', () => {

  it('should preserve C:foo as relative (not turn into C:\\foo)', () => {
    const result = normalizePath('C:foo', '\\');
    // C:foo is relative to CWD on C:, NOT the same as C:\foo
    // The correct normalization should keep it as C:foo
    assert.equal(
      result,
      'C:foo',
      `Expected "C:foo" but got "${result}". Relative drive path was incorrectly made absolute.`
    );
  });

  it('should preserve C:dir\\file as relative (not turn into C:\\dir\\file)', () => {
    const result = normalizePath('C:dir\\file', '\\');
    assert.equal(
      result,
      'C:dir\\file',
      `Expected "C:dir\\file" but got "${result}". Relative drive path was incorrectly made absolute.`
    );
  });

  it('should keep C:\\foo as absolute (already has root sep)', () => {
    const result = normalizePath('C:\\foo', '\\');
    assert.equal(
      result,
      'C:\\foo',
      `Expected "C:\\foo" but got "${result}"`
    );
  });
});
