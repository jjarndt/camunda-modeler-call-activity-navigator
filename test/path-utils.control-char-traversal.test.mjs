/**
 * SEC-NEW-009: Control character stripping in normalizePath creates path traversal
 *
 * normalizePath (path-utils.mjs) calls stripControlChars() BEFORE path
 * normalization. stripControlChars removes \x00-\x1f and \x7f. This means
 * a path segment like ".\x01." (dot + control char + dot) becomes ".."
 * (dot-dot) AFTER stripping, which is then interpreted as a parent
 * directory traversal.
 *
 * Attack vector: An attacker provides a path containing ".\x01." which
 * looks like a normal directory name "." + some char + "." but after
 * control char stripping becomes ".." enabling directory traversal.
 *
 * This is a classic sanitization-order vulnerability: the sanitization
 * (strip control chars) happens before the security check (resolve "..")
 * and the sanitization itself creates the dangerous pattern.
 *
 * CWE-22: Improper Limitation of a Pathname to a Restricted Directory
 * CWE-180: Incorrect Behavior Order: Validate Before Canonicalize
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePath } from '../client/path-utils.mjs';

describe('SEC-NEW-009: Control char stripping creates path traversal', () => {

  it('control char \\x01 between dots creates ".." traversal', () => {
    // ".\x01." after stripping becomes ".."
    const path = '/safe/dir/.\x01./etc/passwd';
    const result = normalizePath(path, '/');

    // After stripping \x01: /safe/dir/../etc/passwd -> /safe/etc/passwd
    if (result === '/safe/etc/passwd') {
      assert.fail(
        `Control character stripping creates path traversal! ` +
        `Input: /safe/dir/.\\x01./etc/passwd -> Output: ${result}. ` +
        'stripControlChars turns ".<\\x01>." into ".." BEFORE path normalization, ' +
        'enabling directory escape (CWE-22, CWE-180).'
      );
    }
  });

  it('control char \\x02 between dots creates ".." traversal', () => {
    const path = '/a/.\x02./b';
    const result = normalizePath(path, '/');

    if (result === '/b') {
      assert.fail(
        `".<\\x02>." became ".." after stripping: /a/.<\\x02>./b -> ${result}`
      );
    }
  });

  it('DEL char \\x7f between dots creates ".." traversal', () => {
    const path = '/a/.\x7f./b';
    const result = normalizePath(path, '/');

    if (result === '/b') {
      assert.fail(
        `".<\\x7f>." became ".." after stripping: /a/.<\\x7f>./b -> ${result}`
      );
    }
  });

  it('newline \\x0a between dots creates ".." traversal', () => {
    const path = '/a/.\x0a./b';
    const result = normalizePath(path, '/');

    if (result === '/b') {
      assert.fail(
        `".<\\x0a>." became ".." after stripping: /a/.<\\x0a>./b -> ${result}`
      );
    }
  });

  it('carriage return \\x0d between dots creates ".." traversal', () => {
    const path = '/a/.\x0d./b';
    const result = normalizePath(path, '/');

    if (result === '/b') {
      assert.fail(
        `".<\\x0d>." became ".." after stripping: /a/.<\\x0d>./b -> ${result}`
      );
    }
  });

  it('tab \\x09 between dots creates ".." traversal', () => {
    const path = '/a/.\x09./b';
    const result = normalizePath(path, '/');

    if (result === '/b') {
      assert.fail(
        `".<\\x09>." became ".." after stripping: /a/.<\\x09>./b -> ${result}`
      );
    }
  });

  it('multiple control chars enable multi-level traversal', () => {
    // Two levels of "..<control>." for double traversal
    const path = '/a/b/c/.\x01./.\x01./etc/passwd';
    const result = normalizePath(path, '/');

    // After stripping: /a/b/c/../../etc/passwd -> /a/etc/passwd
    if (result === '/a/etc/passwd') {
      assert.fail(
        `Multi-level traversal via control chars: ` +
        `/a/b/c/.<\\x01>./.<\\x01>./etc/passwd -> ${result}`
      );
    }
  });

  it('Windows path with control char traversal', () => {
    const path = 'C:\\safe\\dir\\.\x01.\\windows\\system32';
    const result = normalizePath(path, '\\');

    // After stripping: C:\safe\dir\..\windows\system32 -> C:\safe\windows\system32
    if (result === 'C:\\safe\\windows\\system32') {
      assert.fail(
        `Windows control char traversal: ` +
        `C:\\safe\\dir\\.<\\x01>.\\windows\\system32 -> ${result}`
      );
    }
  });

  it('URL-encoded separators are NOT decoded (safe)', () => {
    const path = '/safe/dir/%2F..%2F..%2Fetc%2Fpasswd';
    const result = normalizePath(path, '/');
    // %2F is NOT decoded - this is safe behavior
    assert.ok(!result.includes('etc/passwd'),
      `URL-encoded separators should NOT be decoded, got: ${result}`);
  });
});
