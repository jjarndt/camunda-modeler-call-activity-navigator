/**
 * BUG-API-027: normalizePath with Unix absolute path and Windows preferredSep
 * produces an inconsistent result: Unix root '/' with Windows separators.
 *
 * normalizePath('/foo/bar', '\\') returns '/foo\\bar' which mixes
 * a Unix root '/' with Windows-style backslash separators.
 *
 * API contract: normalizePath should produce a consistent path using
 * only one separator style throughout.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { normalizePath } from '../client/path-utils.mjs';

describe('BUG-API-027: normalizePath unix path with windows separator', () => {

  it('unix absolute path with backslash preferredSep produces mixed separators', () => {
    const result = normalizePath('/foo/bar', '\\');
    // The root is '/' but joined parts use '\\' => '/foo\\bar' is mixed
    // A consistent result would be either '/foo/bar' or '\\foo\\bar'
    const hasMixedSeparators = result.includes('/') && result.includes('\\');
    assert.equal(hasMixedSeparators, false,
      `normalizePath('/foo/bar', '\\\\') returned '${result}' which mixes / and \\\\ separators`);
  });

  it('unix absolute path with backslash sep does not start with /', () => {
    const result = normalizePath('/usr/local/bin', '\\');
    // If preferredSep is \\, the entire path should use \\ consistently
    // Starting with / while using \\ elsewhere is a contract violation
    const startsUnix = result.startsWith('/');
    const hasBackslash = result.includes('\\');
    const inconsistent = startsUnix && hasBackslash;
    assert.equal(inconsistent, false,
      `Result '${result}' has unix root but windows separators`);
  });
});
