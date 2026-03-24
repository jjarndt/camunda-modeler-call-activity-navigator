/**
 * BUG-API-NEW-008: NavigatorSearch.getLocations returns mutable copies that
 * can diverge from the index state.
 *
 * getLocations delegates to ProcessIndex.getLocations which returns copies
 * via map+spread. So modifying returned locations doesn't affect the index.
 * That's correct.
 *
 * BUT: NavigatorSearch.getLocations is a public API that returns the result
 * of this._index.getLocations(processId). The processId parameter is used
 * as-is (no validation, no trimming). If the caller passes a processId
 * with leading/trailing whitespace, the Map lookup fails silently.
 *
 * This is inconsistent with ProcessIndex.setFileIndex which stores the
 * processId from extractProcessIds (which trims the id value on line 71
 * of bpmn-parser.mjs). So the index always has trimmed IDs.
 *
 * If a caller of getLocations passes " myProcess " (with spaces), the
 * lookup fails even though "myProcess" exists in the index.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { NavigatorSearch } from '../client/navigator-search.mjs';
import { ProcessIndex } from '../client/process-index.mjs';

describe('BUG-API-NEW-008: getLocations does not trim processId', () => {

  it('getLocations with whitespace-padded processId returns empty array', () => {
    const index = new ProcessIndex();
    index.setFileIndex('/file.bpmn', ['myProcess']);

    const search = new NavigatorSearch({
      fileSystem: { readFile: async () => ({ contents: '' }) },
      index
    });

    // Caller uses processId with whitespace (e.g., from user input)
    const result = search.getLocations('  myProcess  ');

    // BUG: returns [] because Map.get('  myProcess  ') !== Map.get('myProcess')
    assert.strictEqual(result.length, 1,
      'getLocations should trim processId before lookup');
  });

  it('searchInKnownFiles with whitespace-padded processId finds nothing', async () => {
    const index = new ProcessIndex();
    const search = new NavigatorSearch({
      fileSystem: {
        readFile: async () => ({
          contents: '<bpmn:process id="myProcess" isExecutable="true"/>'
        })
      },
      index
    });

    const result = await search.searchInKnownFiles(
      '  myProcess  ',  // whitespace-padded
      '/proj/current.bpmn',
      ['/proj/target.bpmn']
    );

    // The index stores "myProcess" (trimmed by extractProcessIds).
    // But searchInKnownFiles passes "  myProcess  " to getLocations.
    // getLocations uses Map.get("  myProcess  ") which returns undefined.
    assert.strictEqual(result, '/proj/target.bpmn',
      'searchInKnownFiles should handle whitespace-padded processId');
  });
});
