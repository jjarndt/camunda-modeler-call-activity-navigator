/**
 * Bug-Finder-Logik-008: update-check isNewerVersion edge cases
 *
 * Test cases:
 * 1. Stable to stable: "1.0.0" -> "1.0.0" = false (same version)
 * 2. Pre-release to same stable: "1.0.0-beta" -> "1.0.0" = true (pre < stable)
 * 3. Stable to pre-release: "1.0.0" -> "1.0.0-beta" = false (stable > pre)
 *    BUT the code at line 62 only checks if current has pre-release and latest doesn't.
 *    It does NOT check the reverse (current stable, latest pre-release of SAME version).
 *    Line 62: hasPreRelease(current) && !hasPreRelease(latest) => true (upgrade)
 *    If current is stable and latest is pre-release (same version):
 *    Lines 54-59: version parts are equal, loop finishes without returning.
 *    Line 62: hasPreRelease("1.0.0") = false, so condition fails.
 *    Line 65: hasPreRelease("1.0.0") && hasPreRelease(...) = false.
 *    Line 71: return false. CORRECT - stable is not "older" than pre-release.
 *
 * 4. But what about: "1.0.0" -> "1.0.1-beta"?
 *    Version parts: 1.0.0 vs 1.0.1, l(1) > c(0) at index 2, return true. CORRECT.
 *
 * 5. What about versions with only 2 segments? "1.2" vs "1.2.1"?
 *    cleanVersion("1.2") passes isValidVersionStr: /^\d{1,10}(\.\d{1,10}){0,2}$/
 *    currentParts = [1, 2], latestParts = [1, 2, 1]
 *    i=0: 1 == 1. i=1: 2 == 2. i=2: l=1, c=0, 1 > 0 => true. CORRECT.
 *
 * 6. cleanVersion strips pre-release suffix AND build metadata.
 *    "1.0.0-beta+build123" -> cleanVersion removes "-beta+build123"
 *    Wait: line 14: `.replace(/[-+].*$/, '')`. This strips everything from the
 *    first '-' or '+'. So "1.0.0-beta" -> "1.0.0". CORRECT.
 *    But "1.0.0+build" -> "1.0.0". Also correct.
 *
 * 7. What about a version like "v1.0.0"? Line 13 strips the "v" prefix.
 *
 * 8. The interesting case: isNewerVersion with huge version numbers.
 *    isValidVersionStr allows up to 10 digits per segment.
 *    "9999999999.0.0" is valid. But Number("9999999999") = 9999999999 which fits
 *    in JS number. No overflow issue.
 *
 * Let me focus on a real subtle bug: hasPreRelease checks for '-' in the
 * version AFTER stripping 'v'. But cleanVersion uses replace(/[-+].*$/, '').
 * What about a version like "1.0.0-0"?
 * hasPreRelease("1.0.0-0") = true (has '-')
 * extractPreRelease("1.0.0-0") = "0"
 * If current = "1.0.0-0" and latest = "1.0.0-1":
 * cleanVersion both = "1.0.0". Loop: equal.
 * Line 65: both have pre-release.
 * lSuffix = "1", cSuffix = "0". "1" > "0" = true. Return true. CORRECT.
 *
 * What about: current = "1.0.0-9" and latest = "1.0.0-10"?
 * lSuffix = "10", cSuffix = "9". "10" > "9"? Lexicographic: "10" < "9"
 * because "1" < "9". So return false. BUG! "10" should be newer than "9"
 * but lexicographic comparison says otherwise.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isNewerVersion } from '../client/update-check.mjs';

describe('BUG-FINDER-LOGIK-008: isNewerVersion pre-release suffix comparison', () => {

  it('numeric pre-release suffix: 1.0.0-10 should be newer than 1.0.0-9', () => {
    const result = isNewerVersion('1.0.0-9', '1.0.0-10');
    assert.equal(result, true,
      'Pre-release 10 should be newer than 9, but lexicographic comparison fails');
  });

  it('numeric pre-release suffix: 1.0.0-2 should be newer than 1.0.0-1', () => {
    const result = isNewerVersion('1.0.0-1', '1.0.0-2');
    assert.equal(result, true, 'Single digit comparison should work');
  });

  it('alpha pre-release: 1.0.0-rc.1 should be newer than 1.0.0-beta.1', () => {
    // "rc.1" > "beta.1" lexicographically, so this should return true
    const result = isNewerVersion('1.0.0-beta.1', '1.0.0-rc.1');
    assert.equal(result, true);
  });

  it('pre-release to stable: stable is newer', () => {
    const result = isNewerVersion('1.0.0-beta', '1.0.0');
    assert.equal(result, true, 'Stable should be newer than pre-release of same version');
  });

  it('stable to pre-release of same version: not newer', () => {
    const result = isNewerVersion('1.0.0', '1.0.0-beta');
    assert.equal(result, false, 'Pre-release should not be newer than stable of same version');
  });

  it('same version same pre-release: not newer', () => {
    const result = isNewerVersion('1.0.0-beta', '1.0.0-beta');
    assert.equal(result, false);
  });
});
