/**
 * BUG-FINDER-NULL-013: ProcessIndex.getLocations mit Symbol processId
 *
 * In process-index.mjs Zeile 14:
 *   const key = (processId != null && typeof processId !== 'string') ? String(processId) : ...
 *
 * Wenn processId ein Symbol ist:
 * - Symbol != null => true
 * - typeof Symbol('x') !== 'string' => true
 * - String(Symbol('x')) wirft TypeError: Cannot convert a Symbol value to a string!
 *
 * Das ist ein echter NULL-SAFETY Bug: String(Symbol) wirft TypeError.
 *
 * Test: getLocations(Symbol('test')) sollte nicht crashen.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ProcessIndex } from '../client/process-index.mjs';
import { NavigatorSearch } from '../client/navigator-search.mjs';

describe('BUG-FINDER-NULL-013: ProcessIndex.getLocations mit Symbol processId', () => {
  it('getLocations(Symbol) crasht nicht', () => {
    const index = new ProcessIndex();
    const sym = Symbol('testProcess');
    assert.doesNotThrow(
      () => index.getLocations(sym),
      'getLocations muss Symbol-Input tolerieren ohne TypeError zu werfen'
    );
  });

  it('NavigatorSearch.getLocations(Symbol) crasht nicht', () => {
    const search = new NavigatorSearch({
      fileSystem: { readFile: async () => ({ contents: '' }) },
      index: new ProcessIndex()
    });
    const sym = Symbol('myProcess');
    assert.doesNotThrow(
      () => search.getLocations(sym),
      'NavigatorSearch.getLocations muss Symbol-Input tolerieren'
    );
  });
});
