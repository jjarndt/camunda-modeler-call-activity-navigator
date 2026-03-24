/**
 * BUG-API-023: Verify findBestMatch returns consistent types.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NavigatorSearch } from '../client/navigator-search.mjs';
import { ProcessIndex } from '../client/process-index.mjs';

describe('BUG-API-023: findBestMatch consistent return type', () => {

  it('returns null for empty locations', () => {
    const search = new NavigatorSearch({
      fileSystem: { readFile: async () => ({ contents: '' }) },
      index: new ProcessIndex()
    });

    assert.strictEqual(search.findBestMatch([], '/current.bpmn'), null);
  });

  it('returns null for locations without .path', () => {
    const search = new NavigatorSearch({
      fileSystem: { readFile: async () => ({ contents: '' }) },
      index: new ProcessIndex()
    });

    const result = search.findBestMatch([{ id: 'proc1' }], '/current.bpmn');
    assert.strictEqual(result, null,
      'Locations without .path should result in null');
  });

  it('returns location with .path for valid input', () => {
    const search = new NavigatorSearch({
      fileSystem: { readFile: async () => ({ contents: '' }) },
      index: new ProcessIndex()
    });

    const result = search.findBestMatch(
      [{ path: '/a.bpmn' }, { path: '/b.bpmn' }],
      '/current.bpmn'
    );
    assert.ok(result?.path, 'Should return a location with .path');
  });
});
