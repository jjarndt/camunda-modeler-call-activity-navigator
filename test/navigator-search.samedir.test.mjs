import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { NavigatorSearch } from '../client/navigator-search.mjs';
import { ProcessIndex } from '../client/process-index.mjs';

describe('NavigatorSearch.findBestMatch', () => {

  it('findBestMatch prefers file in the exact same directory', () => {
    const search = new NavigatorSearch({
      fileSystem: {},
      index: new ProcessIndex()
    });

    const locations = [
      { path: '/proj/sub/sibling.bpmn' },
      { path: '/proj/other.bpmn' },
      { path: '/proj/sub/nested/deep.bpmn' }
    ];

    const currentFilePath = '/proj/sub/current.bpmn';

    const result = search.findBestMatch(locations, currentFilePath);

    assert.equal(result.path, '/proj/sub/sibling.bpmn');
  });
});
