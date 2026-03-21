import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { NavigatorSearch } from '../client/navigator-search.mjs';
import { ProcessIndex } from '../client/process-index.mjs';

describe('NavigatorSearch.searchInKnownFiles', () => {

  it('searchInKnownFiles does not re-index already indexed files', async () => {
    let readCount = 0;

    const fileSystem = {
      readFile: async (path) => {
        if (path === '/proj/a.bpmn') {
          readCount++;
          return { contents: '<bpmn:process id="Target">' };
        }
        throw new Error('file not found');
      }
    };

    const search = new NavigatorSearch({
      fileSystem,
      index: new ProcessIndex()
    });

    await search.indexFile('/proj/a.bpmn');
    assert.equal(readCount, 1);

    const result = await search.searchInKnownFiles('Target', '/proj/current.bpmn', new Set(['/proj/a.bpmn']));
    assert.equal(result, '/proj/a.bpmn');
    assert.equal(readCount, 1);
  });
});
