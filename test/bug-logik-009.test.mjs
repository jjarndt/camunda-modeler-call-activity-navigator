/**
 * Bug-Logik-009: isNewerVersion incorrectly treats pre-release as equal to release.
 *
 * stripPreRelease removes everything after - or +, so both "1.0.0-beta.1"
 * and "1.0.0" become "1.0.0". isNewerVersion('1.0.0-beta.1', '1.0.0')
 * returns false, but semantically 1.0.0 IS newer than 1.0.0-beta.1.
 *
 * Per SemVer spec (semver.org #11): "When major, minor, and patch are equal,
 * a pre-release version has lower precedence than a normal version."
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isNewerVersion } from '../client/update-check.mjs';

describe('BUG-LOGIK-009: isNewerVersion fails for pre-release to release upgrade', () => {

  it('should report 1.0.0 as newer than 1.0.0-beta.1', () => {
    const result = isNewerVersion('1.0.0-beta.1', '1.0.0');
    assert.equal(
      result,
      true,
      'Expected 1.0.0 to be newer than 1.0.0-beta.1, but got false'
    );
  });

  it('should report 2.0.0 as newer than 2.0.0-rc.1', () => {
    const result = isNewerVersion('2.0.0-rc.1', '2.0.0');
    assert.equal(
      result,
      true,
      'Expected 2.0.0 to be newer than 2.0.0-rc.1, but got false'
    );
  });

  it('should report 1.1.0 as newer than 1.1.0-alpha', () => {
    const result = isNewerVersion('1.1.0-alpha', '1.1.0');
    assert.equal(
      result,
      true,
      'Expected 1.1.0 to be newer than 1.1.0-alpha, but got false'
    );
  });
});
