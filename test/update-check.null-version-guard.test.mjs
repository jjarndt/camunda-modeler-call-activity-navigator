/**
 * BUG-NULL-001: isNewerVersion() throws TypeError when called with null/undefined
 *
 * stripPreRelease() in update-check.mjs calls version.replace(...) without
 * guarding against null/undefined. Any caller that passes a falsy version
 * string will receive an unhandled TypeError instead of a safe false return.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { isNewerVersion } from '../client/update-check.mjs';

describe('BUG-NULL-001: isNewerVersion does not guard against null/undefined', () => {
  it('throws TypeError when current version is null', () => {
    assert.doesNotThrow(() => {
      isNewerVersion(null, '1.0.0');
    }, 'isNewerVersion(null, "1.0.0") must not throw');
  });

  it('throws TypeError when current version is undefined', () => {
    assert.doesNotThrow(() => {
      isNewerVersion(undefined, '1.0.0');
    }, 'isNewerVersion(undefined, "1.0.0") must not throw');
  });

  it('throws TypeError when latest version is null', () => {
    assert.doesNotThrow(() => {
      isNewerVersion('1.0.0', null);
    }, 'isNewerVersion("1.0.0", null) must not throw');
  });

  it('throws TypeError when latest version is undefined', () => {
    assert.doesNotThrow(() => {
      isNewerVersion('1.0.0', undefined);
    }, 'isNewerVersion("1.0.0", undefined) must not throw');
  });

  it('returns false when both versions are null', () => {
    assert.doesNotThrow(() => {
      isNewerVersion(null, null);
    }, 'isNewerVersion(null, null) must not throw');
  });
});
