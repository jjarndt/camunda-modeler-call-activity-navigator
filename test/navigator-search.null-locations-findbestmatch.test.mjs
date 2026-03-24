/**
 * BUG-FINDER-NULL-003: findBestMatch mit null/undefined als locations Parameter
 *
 * In navigator-search.mjs Zeile 139:
 *   findBestMatch(locations, currentFilePath)
 *
 * Wenn locations null oder undefined uebergeben wird (anstatt eines Arrays),
 * wird Zeile 140 aufgerufen:
 *   const valid = locations.filter(loc => loc?.path);
 * Das wuerde zu TypeError: Cannot read properties of null (reading 'filter') fuehren.
 *
 * In index.js Zeile 211 und 133 wird findBestMatch aufgerufen mit
 * this._search.getLocations(processId) - dieses gibt immer ein Array zurueck,
 * aber nur wenn getLocations korrekt funktioniert.
 *
 * Direkter Test: NavigatorSearch.findBestMatch(null, path) sollte nicht crashen.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NavigatorSearch } from '../client/navigator-search.mjs';
import { ProcessIndex } from '../client/process-index.mjs';

function makeSearch() {
  return new NavigatorSearch({
    fileSystem: { readFile: async () => ({ contents: '' }) },
    index: new ProcessIndex()
  });
}

describe('BUG-FINDER-NULL-003: findBestMatch mit null/undefined locations', () => {
  it('findBestMatch(null) wirft keinen TypeError', () => {
    const search = makeSearch();
    assert.doesNotThrow(() => {
      search.findBestMatch(null, '/some/file.bpmn');
    }, 'findBestMatch(null) muss null/undefined sicher behandeln');
  });

  it('findBestMatch(undefined) wirft keinen TypeError', () => {
    const search = makeSearch();
    assert.doesNotThrow(() => {
      search.findBestMatch(undefined, '/some/file.bpmn');
    }, 'findBestMatch(undefined) muss null/undefined sicher behandeln');
  });
});
