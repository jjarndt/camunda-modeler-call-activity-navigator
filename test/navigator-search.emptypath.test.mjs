import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { NavigatorSearch } from '../client/navigator-search.mjs';
import { ProcessIndex } from '../client/process-index.mjs';

describe('NavigatorSearch.findBestMatch', () => {

  it('findBestMatch returns first location when currentFilePath is empty string', () => {
    const search = new NavigatorSearch({
      fileSystem: {},
      index: new ProcessIndex()
    });

    const locations = [
      { path: '/a.bpmn' },
      { path: '/b.bpmn' }
    ];

    const resultEmpty = search.findBestMatch(locations, '');
    assert.deepEqual(resultEmpty, { path: '/a.bpmn' });

    const resultUndefined = search.findBestMatch(locations, undefined);
    assert.deepEqual(resultUndefined, { path: '/a.bpmn' });
  });
});
