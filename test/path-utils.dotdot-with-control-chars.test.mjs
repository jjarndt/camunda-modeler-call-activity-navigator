/**
 * Bug-Finder-Logik-001: path-utils normalizePath with ".." containing control characters
 *
 * The rawPart === '..' check is intentional security behavior:
 * Control characters injected into ".." segments are silently dropped
 * to prevent path traversal attacks via control char injection.
 * See SEC-NEW-009 for the security rationale.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePath } from '../client/path-utils.mjs';

describe('BUG-FINDER-LOGIK-001: ".." with control characters - security behavior', () => {

  it('normalizePath silently drops ".." with control chars (security feature)', () => {
    // "..\x00" is NOT treated as ".." - this prevents control char traversal attacks
    const result = normalizePath('/a/b/..\x00', '/');
    assert.equal(result, '/a/b',
      'Control-char-injected ".." should be silently dropped (security)');
  });

  it('clean ".." without control chars works correctly (baseline)', () => {
    const result = normalizePath('/a/b/..', '/');
    assert.equal(result, '/a', 'Baseline: clean ".." should navigate up');
  });
});
