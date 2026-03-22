/**
 * Bug-Logik-NEW-009: normalizePath inconsistency for UNC root with trailing slash.
 *
 * normalizePath("//server/share/") returns "//server/share/" (trailing slash)
 * but normalizePath("//server/share") returns "//server/share" (no trailing slash).
 *
 * For non-UNC paths, trailing slashes are consistently stripped:
 *   normalizePath("/foo/") = "/foo"
 *   normalizePath("/foo") = "/foo"
 *
 * The root cause: when a UNC path like "//server/share/" is parsed,
 * extractWindowsRoot extracts root="//server/share" and rest="/", which
 * consumeRootSep turns into hasRootSep=true with rest="". Then in normalizePath,
 * the branch `if (hasRootSep)` returns `normalizedRoot + sep` = "//server/share/".
 * But for "//server/share" (no trailing slash), hasRootSep=false, so it returns
 * just normalizedRoot = "//server/share".
 *
 * Impact: ProcessIndex normalizes paths with normalizePath('/'), so
 * "//server/share/" and "//server/share" become different keys, causing
 * the same network location to appear as two separate entries in the index.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePath } from '../client/path-utils.mjs';

describe('BUG-LOGIK-NEW-009: UNC root trailing slash inconsistency', () => {

  it('normalizePath should produce same result for UNC root with and without trailing slash (forward)', () => {
    const withSlash = normalizePath('//server/share/', '/');
    const withoutSlash = normalizePath('//server/share', '/');

    assert.strictEqual(withSlash, withoutSlash,
      `UNC root with trailing slash "${withSlash}" differs from without "${withoutSlash}". ` +
      'ProcessIndex would treat these as different files.');
  });

  it('normalizePath should produce same result for UNC root with and without trailing slash (backslash)', () => {
    const withSlash = normalizePath('\\\\server\\share\\', '\\');
    const withoutSlash = normalizePath('\\\\server\\share', '\\');

    assert.strictEqual(withSlash, withoutSlash,
      `UNC root with trailing backslash "${withSlash}" differs from without "${withoutSlash}". ` +
      'ProcessIndex would treat these as different files.');
  });

  it('demonstrates the practical impact: ProcessIndex deduplication fails for UNC roots', () => {
    // When the same UNC share is referenced with and without trailing slash,
    // normalizePath produces different strings, which means setFileIndex
    // would create separate entries
    const path1 = normalizePath('//server/share/', '/');
    const path2 = normalizePath('//server/share', '/');

    // These represent the same network location but normalize differently
    assert.strictEqual(path1, path2,
      `"${path1}" !== "${path2}": same UNC share normalizes to different strings`);
  });
});
