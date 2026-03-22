/**
 * BUG-NULL-007 Hypothesis: ProcessIndex stores undefined/null processId entries
 * when setFileIndex is called with an array containing falsy values.
 *
 * In process-index.mjs:
 *   const uniqueProcessIds = new Set(processIds || []);
 *   for (const processId of uniqueProcessIds) {
 *     // processId could be undefined/null from the input array
 *     this._locationsByProcess.set(processId, existing);
 *   }
 *
 * There is no filtering of falsy processId values. A Set([undefined, null, ''])
 * will contain those values. getLocations(undefined) would then return locations
 * for the undefined key, polluting the index.
 *
 * The impact: getLocations(undefined) returns non-empty array even though no
 * real process with id undefined exists.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { ProcessIndex } from '../client/process-index.mjs';

describe('BUG-NULL-007: ProcessIndex.setFileIndex stores falsy processId keys', () => {
  it('stores undefined as a processId key when array contains undefined', () => {
    const index = new ProcessIndex();
    index.setFileIndex('/foo/bar.bpmn', [undefined, null, '', 'validId']);

    // undefined and null should NOT be stored as valid processIds
    const undefinedLocations = index.getLocations(undefined);
    assert.equal(undefinedLocations.length, 0,
      'getLocations(undefined) should return empty array, not index entries for undefined key');
  });

  it('stores null as a processId key when array contains null', () => {
    const index = new ProcessIndex();
    index.setFileIndex('/foo/bar.bpmn', [null]);

    const nullLocations = index.getLocations(null);
    assert.equal(nullLocations.length, 0,
      'getLocations(null) should return empty array, not index entries for null key');
  });

  it('stores empty string as a processId key when array contains empty string', () => {
    const index = new ProcessIndex();
    index.setFileIndex('/foo/bar.bpmn', ['', 'realId']);

    const emptyLocations = index.getLocations('');
    assert.equal(emptyLocations.length, 0,
      'getLocations("") should return empty array, not index entries for empty string key');
  });
});
