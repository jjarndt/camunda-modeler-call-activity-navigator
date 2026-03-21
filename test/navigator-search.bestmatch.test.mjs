import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { NavigatorSearch } from '../client/navigator-search.mjs';
import { ProcessIndex } from '../client/process-index.mjs';

describe('NavigatorSearch.findBestMatch', () => {

  it('findBestMatch selects deepest common ancestor match', () => {
    const search = new NavigatorSearch({
      fileSystem: {},
      index: new ProcessIndex()
    });

    const locations = [
      { path: '/proj/a.bpmn' },
      { path: '/proj/sub/dir/b.bpmn' },
      { path: '/proj/sub/dir/nested/c.bpmn' }
    ];

    const currentFilePath = '/proj/sub/dir/nested/current.bpmn';

    const result = search.findBestMatch(locations, currentFilePath);

    assert.equal(result.path, '/proj/sub/dir/nested/c.bpmn');
  });
});
