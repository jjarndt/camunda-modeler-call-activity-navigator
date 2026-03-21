import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { NavigatorSearch } from '../client/navigator-search.mjs';
import { ProcessIndex } from '../client/process-index.mjs';

describe('NavigatorSearch - error handling', () => {

  it('searchInKnownFiles gracefully handles files that fail to read', async () => {
    const fileSystem = {
      readFile: async () => { throw new Error('disk I/O error'); }
    };
    const search = new NavigatorSearch({ fileSystem, index: new ProcessIndex() });

    const knownFiles = new Set(['/proj/broken1.bpmn', '/proj/broken2.bpmn']);
    const result = await search.searchInKnownFiles('SomeProcess', '/proj/current.bpmn', knownFiles);

    assert.equal(result, null);
    assert.equal(search.isFileIndexed('/proj/broken1.bpmn'), true);
    assert.equal(search.isFileIndexed('/proj/broken2.bpmn'), true);
    assert.deepEqual(search.getLocations('SomeProcess'), []);
  });
});
