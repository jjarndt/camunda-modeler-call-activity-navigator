/**
 * Bug-Logik-003: isNewerVersion treats non-numeric version segments as 0
 * via NaN || 0 fallback, which can produce incorrect comparison results.
 *
 * If a version string contains a non-numeric segment (e.g., "1.x.0"),
 * that segment is coerced to 0 via Number("x") = NaN and NaN || 0 = 0.
 * This means "1.x.0" (current) vs "1.1.0" (latest) → reports "update available"
 * even though the current version is indeterminate.
 *
 * More critically: isNewerVersion('', '1.0.0') returns true (always update)
 * because Number('') = 0 for the only element, but the split/map produces [NaN]
 * for '' -> [''].map(Number) -> [NaN] -> [NaN||0] = [0].
 * Wait - ''.split('.') = [''] -> [''].map(Number) = [NaN].
 * Then loop i=0: latestParts[0]=1 > (NaN||0)=0 -> true.
 * So an empty current version ALWAYS triggers an update.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isNewerVersion } from '../client/update-check.mjs';

describe('BUG-LOGIK-003: isNewerVersion NaN coercion produces wrong results', () => {

  it('empty current version string incorrectly reports any release as newer', () => {
    // If __PLUGIN_VERSION__ is empty/unset, every version check triggers a false update
    // Expected: false (or throw) - cannot determine if newer without valid current version
    // Actual: true (because NaN||0 = 0, and 1 > 0)
    const result = isNewerVersion('', '1.0.0');
    assert.equal(
      result,
      false,
      `isNewerVersion('', '1.0.0') should return false for invalid current version, got ${result}`
    );
  });

  it('non-numeric current segment is silently coerced to 0, making newer versions appear newer', () => {
    // "1.x.0" as current: 'x' becomes NaN||0 = 0
    // "1.1.0" as latest: 1 > 0 -> reports update available
    // A non-numeric segment should arguably NOT compare as less-than a numeric one
    const result = isNewerVersion('1.x.0', '1.1.0');
    assert.equal(
      result,
      false,
      `isNewerVersion('1.x.0', '1.1.0') should return false for malformed current version, got ${result}`
    );
  });

});
