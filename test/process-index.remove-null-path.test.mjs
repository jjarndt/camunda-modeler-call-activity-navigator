/**
 * BUG-API-008: NavigatorSearch.isFileIndexed and invalidateFile do NOT normalize
 * paths themselves - they delegate to ProcessIndex which normalizes.
 * But NavigatorSearch.indexFile also delegates to ProcessIndex.setFileIndex which normalizes.
 *
 * The question: is isFileIndexed consistent with indexFile when called with
 * the same path but different separators?
 *
 * NavigatorSearch.isFileIndexed('/a/b.bpmn') -> ProcessIndex.isIndexed('/a/b.bpmn')
 *   -> normalizePath('/a/b.bpmn', '/') = '/a/b.bpmn' -> Map.has('/a/b.bpmn')
 *
 * After indexFile('C:\\a\\b.bpmn'):
 *   -> ProcessIndex.setFileIndex('C:\\a\\b.bpmn', [...])
 *   -> normalizePath('C:\\a\\b.bpmn', '/') = 'C:/a/b.bpmn'
 *   -> stored under 'C:/a/b.bpmn'
 *
 * Then isFileIndexed('C:\\a\\b.bpmn'):
 *   -> ProcessIndex.isIndexed('C:\\a\\b.bpmn')
 *   -> normalizePath('C:\\a\\b.bpmn', '/') = 'C:/a/b.bpmn'
 *   -> Map.has('C:/a/b.bpmn') = true  -- CORRECT
 *
 * Then invalidateFile('C:\\a\\b.bpmn'):
 *   -> ProcessIndex.removeFile('C:\\a\\b.bpmn')
 *   -> normalizePath('C:\\a\\b.bpmn', '/') = 'C:/a/b.bpmn'
 *   -> removes 'C:/a/b.bpmn' -- CORRECT
 *
 * Seem consistent. But: NavigatorSearch.getLocations(processId) calls
 * ProcessIndex.getLocations(processId) which returns locations with normalized paths.
 * The PUBLIC caller of getLocations gets forward-slash paths always.
 * This IS the documented behavior from bug-api-003, but not a crash bug.
 *
 * REAL BUG CANDIDATE: ProcessIndex.removeFile with null/undefined
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { ProcessIndex } from '../client/process-index.mjs';

describe('BUG-API-008: ProcessIndex removeFile with null/undefined', () => {

  it('removeFile(null) does not throw (no-op because null key not in map)', () => {
    const index = new ProcessIndex();
    index.setFileIndex('/some/file.bpmn', ['proc1']);

    // removeFile(null) -> normalizePath(null, '/') = null
    // Map.get(null) = undefined -> early return (if !processIds) return
    // Should be a no-op
    assert.doesNotThrow(
      () => index.removeFile(null),
      'removeFile(null) should not throw'
    );
  });

  it('isIndexed(null) returns false, not throws', () => {
    const index = new ProcessIndex();
    const result = index.isIndexed(null);
    assert.equal(result, false,
      'isIndexed(null) should return false');
  });

  it('setFileIndex(null, [...]) stores null as key - then isIndexed(null) returns true (incorrect behavior)', () => {
    const index = new ProcessIndex();
    index.setFileIndex(null, ['proc1']);

    // normalizePath(null, '/') = null -> Map.set(null, ...)
    // isIndexed(null) -> normalizePath(null, '/') = null -> Map.has(null) = true
    // This is INCORRECT: null should not be a valid file path key
    const result = index.isIndexed(null);
    assert.equal(result, false,
      'isIndexed(null) must return false after setFileIndex(null, ...) - null is not a valid path');
  });

});
