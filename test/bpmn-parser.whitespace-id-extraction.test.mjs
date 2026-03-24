/**
 * BUG-API-009: extractProcessIds returns empty-string IDs
 *
 * The regex /id="([^"]+)"/g uses [^"]+ (one-or-more), so id="" won't match.
 * But what about id=" " (whitespace)?
 * And: what does ProcessIndex do if it receives a processId of '' or ' '?
 *
 * Also: what if two files declare the same process ID?
 * ProcessIndex should accumulate both - getLocations should return both.
 * This is documented behavior - but verify the count.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { extractProcessIds } from '../client/bpmn-parser.mjs';
import { ProcessIndex } from '../client/process-index.mjs';

describe('BUG-API-009: extractProcessIds edge cases with whitespace IDs', () => {

  it('does not extract empty id=""', () => {
    const content = '<bpmn:process id="" isExecutable="true"/>';
    const ids = extractProcessIds(content);
    assert.equal(ids.length, 0,
      'empty id="" should not be extracted (regex requires [^"]+)');
  });

  it('extracts whitespace id=" " as " " (whitespace is valid in regex)', () => {
    const content = '<bpmn:process id=" " isExecutable="true"/>';
    const ids = extractProcessIds(content);
    // [^"]+ matches " " (space is not a quote)
    // This produces a processId of " " which is unlikely valid in BPMN
    // ProcessIndex would then store " " as a process ID key
    assert.equal(ids.length, 0,
      'whitespace-only id should not be extracted as a valid process ID');
  });

  it('ProcessIndex.getLocations returns correct count when two files have same processId', () => {
    const index = new ProcessIndex();
    index.setFileIndex('/a.bpmn', ['sharedProcess']);
    index.setFileIndex('/b.bpmn', ['sharedProcess']);

    const locations = index.getLocations('sharedProcess');
    assert.equal(locations.length, 2,
      'getLocations should return both files for a shared process ID');
  });

});
