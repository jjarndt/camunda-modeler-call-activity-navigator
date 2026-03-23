/**
 * BUG-FINDER-API-005: isNewerVersion pre-release comparison edge cases.
 * cleanVersion strips everything after - or +, but isValidVersionStr
 * only checks the cleaned version. What about "1.0.0-beta" vs "1.0.0-alpha"?
 * extractPreRelease compares lexicographically which is wrong for
 * "1.0.0-beta.2" vs "1.0.0-beta.10" (lexicographic: "beta.10" < "beta.2")
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { isNewerVersion } from '../client/update-check.mjs';

describe('BUG-FINDER-API-005: isNewerVersion pre-release comparison', () => {

  it('beta.10 should be newer than beta.2 (semver numeric comparison)', () => {
    // Lexicographic: "beta.10" < "beta.2" (because "1" < "2")
    // But semantically beta.10 > beta.2
    const result = isNewerVersion('1.0.0-beta.2', '1.0.0-beta.10');
    assert.equal(result, true,
      'beta.10 should be considered newer than beta.2 (semver rules)');
  });

  it('rc.1 should be newer than beta.9', () => {
    // Lexicographic: "beta.9" < "rc.1" -> true. This one works by accident.
    const result = isNewerVersion('1.0.0-beta.9', '1.0.0-rc.1');
    assert.equal(result, true,
      'rc.1 should be newer than beta.9');
  });

  it('alpha should be older than beta', () => {
    const result = isNewerVersion('1.0.0-alpha', '1.0.0-beta');
    assert.equal(result, true,
      'beta should be newer than alpha');
  });
});
