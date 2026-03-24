/**
 * BUG-FINDER-API-006: NavigatorSearch.findBestMatch does not filter out
 * the current file from results. If locations contain the current file,
 * it could be returned as "best match", causing self-navigation.
 * searchInKnownFiles filters it out, but findBestMatch is a public method.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { NavigatorSearch } from '../client/navigator-search.mjs';
import { ProcessIndex } from '../client/process-index.mjs';

describe('BUG-FINDER-API-006: findBestMatch self-navigation risk', () => {

  it('findBestMatch should not return the current file as best match', () => {
    const index = new ProcessIndex();
    const fileSystem = { readFile: async () => ({ contents: '' }) };
    const search = new NavigatorSearch({ fileSystem, index });

    const locations = [
      { path: '/project/src/current.bpmn' },
      { path: '/project/src/other.bpmn' }
    ];

    const result = search.findBestMatch(locations, '/project/src/current.bpmn');

    // findBestMatch should ideally not return the current file
    assert.notEqual(result.path, '/project/src/current.bpmn',
      'findBestMatch should not return the current file as best match');
  });
});
