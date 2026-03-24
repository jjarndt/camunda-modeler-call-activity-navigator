/**
 * Bug-Logik-002: ProcessIndex.getLocations returns shallow-copied array
 * but location objects are shared references.
 *
 * Mutating a location object returned by getLocations corrupts
 * the internal index state of ProcessIndex.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ProcessIndex } from '../client/process-index.mjs';

describe('BUG-LOGIK-002: ProcessIndex.getLocations location objects are shared references', () => {

  it('mutating a returned location object corrupts the internal index', () => {
    const index = new ProcessIndex();
    index.setFileIndex('/a.bpmn', ['P1']);

    const locations = index.getLocations('P1');
    assert.equal(locations[0].path, '/a.bpmn');

    // Mutate the path of the returned location object
    locations[0].path = '/mutated.bpmn';

    // Now get locations again - should still return the original path
    const locationsAfter = index.getLocations('P1');
    assert.equal(
      locationsAfter[0].path,
      '/a.bpmn',
      'Internal index corrupted: location.path was changed by external mutation'
    );
  });

  it('removeFile still works correctly after a caller mutates a returned location', () => {
    const index = new ProcessIndex();
    index.setFileIndex('/a.bpmn', ['P1']);

    // Mutate the returned location
    const locations = index.getLocations('P1');
    locations[0].path = '/mutated.bpmn';

    // removeFile('/a.bpmn') should cleanly remove the file
    index.removeFile('/a.bpmn');

    const locationsAfterRemove = index.getLocations('P1');
    assert.equal(
      locationsAfterRemove.length,
      0,
      'After removeFile, locations should be empty - but internal state may be corrupted'
    );
  });

});
