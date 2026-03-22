/**
 * SEC-015: Version string injection in update-check.mjs
 *
 * isNewerVersion and cleanVersion process version strings that come
 * from the GitHub API response (data.tag_name). If an attacker controls
 * the API response (MITM), they could inject crafted version strings.
 *
 * Test vectors:
 * - Extremely long version strings (DoS)
 * - Version strings with special characters
 * - Version strings designed to cause incorrect comparisons
 * - Regex in cleanVersion/isValidVersionStr
 *
 * CWE-20: Improper Input Validation
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isNewerVersion, isSafeUrl } from '../client/update-check.mjs';

describe('SEC-015: Version string injection', () => {

  it('extremely long version string does not cause DoS', () => {
    const longVersion = '1.' + '9'.repeat(100_000);

    const start = Date.now();
    const result = isNewerVersion('1.0.0', longVersion);
    const elapsed = Date.now() - start;

    assert.ok(elapsed < 100, `Long version string took ${elapsed}ms`);
    // Long version should be rejected by isValidVersionStr
    assert.strictEqual(result, false, 'Invalid long version should return false');
  });

  it('version with many dots does not cause issues', () => {
    const manyDots = '1.2.3.4.5.6.7.8.9.10';

    const start = Date.now();
    const result = isNewerVersion('1.0.0', manyDots);
    const elapsed = Date.now() - start;

    assert.ok(elapsed < 50, `Many-dots version took ${elapsed}ms`);
    assert.strictEqual(result, false, 'Too many segments should be rejected');
  });

  it('ReDoS in cleanVersion regex', () => {
    // cleanVersion uses: .replace(/^v/, '').replace(/[-+].*$/, '')
    // The second regex /[-+].*$/ uses .* which is greedy but anchored to $
    // This should be linear, but test with adversarial input
    const adversarial = 'v' + '-'.repeat(100_000);

    const start = Date.now();
    const result = isNewerVersion('1.0.0', adversarial);
    const elapsed = Date.now() - start;

    assert.ok(elapsed < 100, `cleanVersion with 100k dashes took ${elapsed}ms`);
  });

  it('ReDoS in isValidVersionStr regex', () => {
    // isValidVersionStr: /^\d+(\.\d+){0,2}$/
    // This could backtrack on inputs like "1.2.3.4.5..." where digits and dots repeat
    // but the quantifier {0,2} limits to max 3 groups, so backtracking should be bounded.
    const adversarial = ('1.').repeat(50_000) + '2';

    const start = Date.now();
    const result = isNewerVersion('1.0.0', adversarial);
    const elapsed = Date.now() - start;

    assert.ok(elapsed < 100,
      `isValidVersionStr with 50k dot-segments took ${elapsed}ms - potential ReDoS`);
  });

  it('version string with newlines/special chars', () => {
    const crafted = '99.99.99\n<script>alert(1)</script>';
    const result = isNewerVersion('1.0.0', crafted);
    // cleanVersion should strip everything after the special char
    assert.strictEqual(result, false,
      'Version with special chars should be rejected');
  });

  it('negative version numbers', () => {
    const result = isNewerVersion('1.0.0', '-1.0.0');
    assert.strictEqual(result, false, 'Negative version should be rejected');
  });

  it('version with leading zeros', () => {
    // "01.00.00" - leading zeros could cause octal interpretation
    const result = isNewerVersion('1.0.0', '01.00.00');
    // Should be treated as 1.0.0, not as a newer version
    assert.strictEqual(result, false,
      'Leading zeros should not create false "newer" result');
  });

  it('NaN version parts', () => {
    const result = isNewerVersion('1.0.0', 'NaN.NaN.NaN');
    assert.strictEqual(result, false, 'NaN versions should be rejected');
  });

  it('Infinity version', () => {
    const result = isNewerVersion('1.0.0', 'Infinity.0.0');
    assert.strictEqual(result, false, 'Infinity version should be rejected');
  });
});
