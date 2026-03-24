import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { isNewerVersion } from '../client/update-check.mjs';

// ---------------------------------------------------------------------------
// Pre-release version comparison
// ---------------------------------------------------------------------------

describe('isNewerVersion - pre-release', () => {

  // -- pre-release ordering -------------------------------------------------

  describe('pre-release ordering', () => {
    it('beta is newer than alpha (same base version)', () => {
      assert.equal(isNewerVersion('1.0.0-alpha', '1.0.0-beta'), true);
    });

    it('rc.2 is newer than rc.1 (same base version)', () => {
      assert.equal(isNewerVersion('2.0.0-rc.1', '2.0.0-rc.2'), true);
    });

    it('same version same pre-release is not newer', () => {
      assert.equal(isNewerVersion('1.0.0-beta', '1.0.0-beta'), false);
    });

    it('compares pre-release suffixes when both have same base version', () => {
      assert.equal(isNewerVersion('1.2.3-rc.1', '1.2.3-rc.2'), true);
    });
  });

  // -- pre-release suffix comparison ----------------------------------------

  describe('pre-release suffix comparison', () => {
    it('numeric pre-release 10 is newer than 9 (not lexicographic)', () => {
      assert.equal(isNewerVersion('1.0.0-9', '1.0.0-10'), true);
    });

    it('single-digit numeric comparison works', () => {
      assert.equal(isNewerVersion('1.0.0-1', '1.0.0-2'), true);
    });

    it('rc.1 is newer than beta.1 (lexicographic on prefix)', () => {
      assert.equal(isNewerVersion('1.0.0-beta.1', '1.0.0-rc.1'), true);
    });

    it('rc.1 is newer than beta.9', () => {
      assert.equal(isNewerVersion('1.0.0-beta.9', '1.0.0-rc.1'), true);
    });
  });

  // -- pre-release to release -----------------------------------------------

  describe('pre-release to release upgrade', () => {
    it('stable 1.0.0 is newer than 1.0.0-beta.1', () => {
      assert.equal(isNewerVersion('1.0.0-beta.1', '1.0.0'), true);
    });

    it('stable 2.0.0 is newer than 2.0.0-rc.1', () => {
      assert.equal(isNewerVersion('2.0.0-rc.1', '2.0.0'), true);
    });

    it('stable 1.1.0 is newer than 1.1.0-alpha', () => {
      assert.equal(isNewerVersion('1.1.0-alpha', '1.1.0'), true);
    });

    it('stable 1.0.0 is newer than 1.0.0-beta', () => {
      assert.strictEqual(isNewerVersion('1.0.0-beta', '1.0.0'), true);
    });

    it('stable 1.0.0 is newer than 1.0.0-rc.1', () => {
      assert.strictEqual(isNewerVersion('1.0.0-rc.1', '1.0.0'), true);
    });

    it('pre-release with different major is detected correctly', () => {
      assert.strictEqual(isNewerVersion('1.9.0', '2.0.0-alpha'), true);
    });
  });

  // -- stable newer than pre-release ----------------------------------------

  describe('stable vs pre-release of same version', () => {
    it('stable is not newer when compared against pre-release of higher version', () => {
      // 1.2.3-beta.1 vs 1.2.4 -> true (different base version)
      assert.equal(isNewerVersion('1.2.3-beta.1', '1.2.4'), true);
    });

    it('pre-release of same version is not newer than stable', () => {
      assert.equal(isNewerVersion('1.0.0', '1.0.0-beta'), false);
    });
  });

  // -- lexicographic numeric pre-release comparison -------------------------

  describe('lexicographic pre-release numeric comparison', () => {
    it('rc.10 is newer than rc.2 (numeric, not lexicographic)', () => {
      assert.equal(isNewerVersion('1.0.0-rc.2', '1.0.0-rc.10'), true);
    });

    it('alpha.10 is newer than alpha.2', () => {
      assert.equal(isNewerVersion('1.0.0-alpha.2', '1.0.0-alpha.10'), true);
    });

    it('beta.10 is newer than beta.9', () => {
      assert.equal(isNewerVersion('2.0.0-beta.9', '2.0.0-beta.10'), true);
    });

    it('beta.10 is newer than beta.2 (semver numeric comparison)', () => {
      assert.equal(isNewerVersion('1.0.0-beta.2', '1.0.0-beta.10'), true);
    });
  });

  // -- semver numeric pre-release edge cases --------------------------------

  describe('semver numeric pre-release edge cases', () => {
    it('alpha should be older than beta', () => {
      assert.equal(isNewerVersion('1.0.0-alpha', '1.0.0-beta'), true);
    });
  });
});
