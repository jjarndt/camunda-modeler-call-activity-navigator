/**
 * BUG-API-NEW-001: searchInKnownFiles has case-sensitivity inconsistency.
 *
 * The self-exclusion filter (line 98) uses pathsEqualIgnoreCase() to skip
 * the current file. But the break condition (line 113) uses strict === to
 * check if a candidate has the process. If a file is indexed under a
 * different case (e.g., "C:/Proj/File.bpmn" vs "C:/proj/file.bpmn"),
 * the break comparison will fail, causing the loop to continue unnecessarily.
 *
 * More importantly: the post-loop filter on line 118 uses pathsEqualIgnoreCase
 * to exclude the current file from results. But the BREAK on line 113 uses
 * strict === comparison with the normalizedFilePath.
 *
 * Concrete scenario:
 * - Current file: "/proj/Current.bpmn" (mixed case)
 * - Known files: ["/proj/current.bpmn"] (lowercase)
 * - Both contain processId "MyProcess"
 * - Filter on line 98: pathsEqualIgnoreCase(normalize("/proj/current.bpmn"), normalize("/proj/Current.bpmn"))
 *   => "/proj/current.bpmn".toLowerCase() === "/proj/current.bpmn".toLowerCase() => true
 *   => current.bpmn is filtered OUT from candidates (correct)
 *
 * But what about the reverse? currentFilePath in lowercase, knownFile in mixed case?
 * The filter excludes based on case-insensitive, but the result filter (line 118)
 * also uses pathsEqualIgnoreCase. The real question is: can we get an incorrect
 * result from the case-insensitive filtering?
 *
 * Actually, the REAL inconsistency is between the self-exclusion (case-insensitive)
 * and the break condition (case-sensitive). If a file is pre-indexed with a
 * different case than the candidate path, the break won't fire and the search
 * will continue indexing more files unnecessarily.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { NavigatorSearch } from '../client/navigator-search.mjs';
import { ProcessIndex } from '../client/process-index.mjs';

const BPMN = id => `<bpmn:process id="${id}" isExecutable="true"/>`;

describe('BUG-API-NEW-001: searchInKnownFiles break condition case-sensitivity mismatch', () => {

  it('break condition uses === but index stores normalized paths - pre-indexed file with different case', async () => {
    const index = new ProcessIndex();
    const readCalls = [];
    const search = new NavigatorSearch({
      fileSystem: {
        readFile: async (path) => {
          readCalls.push(path);
          return { contents: BPMN('MyProcess') };
        }
      },
      index
    });

    // Pre-index a file with DIFFERENT case than what appears in knownFiles
    // ProcessIndex normalizes to forward slash but does NOT change case
    index.setFileIndex('/proj/Target.bpmn', ['MyProcess']);

    // Now search with the same file in knownFiles but lowercase
    const result = await search.searchInKnownFiles(
      'MyProcess',
      '/proj/current.bpmn',
      ['/proj/target.bpmn', '/proj/distant/other.bpmn']
    );

    // The break condition (line 113) checks:
    //   found.some(loc => loc.path === normalizedFilePath)
    // where normalizedFilePath = normalizePath('/proj/target.bpmn', '/') = '/proj/target.bpmn'
    // But the index has the path as '/proj/Target.bpmn' (different case)
    // So loc.path === normalizedFilePath => '/proj/Target.bpmn' === '/proj/target.bpmn' => false!
    // The break doesn't fire, so the search continues to index other.bpmn unnecessarily.
    //
    // However, the file IS found in getLocations because processId lookup works.
    // The result should still be correct - but the search does unnecessary I/O.

    // Check: did it re-index target.bpmn even though it was already pre-indexed?
    // isFileIndexed('/proj/target.bpmn') checks normalizePath('/proj/target.bpmn', '/') = '/proj/target.bpmn'
    // But index has '/proj/Target.bpmn' - different key!
    // So isFileIndexed returns false, and it re-indexes the file!

    // This means the file gets re-read and re-indexed, overwriting the existing entry.
    // The pre-indexed 'Target.bpmn' entry is NOT removed (different key),
    // creating a DUPLICATE entry in the index!
    const locations = index.getLocations('MyProcess');

    // BUG: There should be only 1 location for target.bpmn, but due to case mismatch
    // both '/proj/Target.bpmn' and '/proj/target.bpmn' are stored as separate entries
    assert.strictEqual(locations.length, 1,
      'Should have exactly 1 location for target file, not duplicates due to case mismatch');
  });
});
