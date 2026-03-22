/**
 * BUG-NULL-014 Hypothesis: NavigatorSearch constructor does not validate
 * its dependencies (fileSystem, index). When fileSystem is null or undefined,
 * calling indexFile() will throw a TypeError from "Cannot read properties of
 * null/undefined (reading 'readFile')". This TypeError is intentionally
 * re-thrown by indexFile's catch clause.
 *
 * However, searchInKnownFiles does NOT catch this TypeError - it propagates
 * unhandled to the caller. The caller in index.js (_searchInKnownFiles) also
 * has no try-catch. So a null fileSystem causes the entire search operation
 * to crash with an unhandled TypeError instead of gracefully returning null.
 *
 * Expected: searchInKnownFiles should catch TypeError from indexFile and
 * return null gracefully (or at least not propagate unhandled TypeErrors
 * from internal dependencies).
 *
 * BUT: per the current design, TypeError IS intentionally re-thrown from
 * indexFile to signal programming errors. So this test checks if the
 * constructor at minimum warns about null/undefined dependencies.
 *
 * Actually, the real question is: should NavigatorSearch.constructor guard
 * against null fileSystem and throw a clear error at construction time rather
 * than a confusing TypeError later?
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { NavigatorSearch } from '../client/navigator-search.mjs';
import { ProcessIndex } from '../client/process-index.mjs';

describe('BUG-NULL-014: NavigatorSearch constructor null dependency guards', () => {

  it('constructing NavigatorSearch with null fileSystem should throw TypeError at construction time', () => {
    // Currently no guard - TypeError only surfaces much later during indexFile
    // Expected: constructor should validate inputs early
    assert.throws(
      () => new NavigatorSearch({ fileSystem: null, index: new ProcessIndex() }),
      TypeError,
      'Navigator must reject null fileSystem at construction time, not silently accept it'
    );
  });

  it('constructing NavigatorSearch with null index should throw TypeError at construction time', () => {
    assert.throws(
      () => new NavigatorSearch({ fileSystem: { readFile: async () => ({}) }, index: null }),
      TypeError,
      'Navigator must reject null index at construction time, not silently accept it'
    );
  });

  it('constructing NavigatorSearch with undefined fileSystem should throw TypeError at construction time', () => {
    assert.throws(
      () => new NavigatorSearch({ fileSystem: undefined, index: new ProcessIndex() }),
      TypeError,
      'Navigator must reject undefined fileSystem at construction time'
    );
  });
});
