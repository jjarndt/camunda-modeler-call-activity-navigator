import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { NavigatorSearch } from '../client/navigator-search.mjs';
import { ProcessIndex } from '../client/process-index.mjs';

describe('NavigatorSearch.indexFile', () => {

  it('indexFile populates index so getLocations returns the file', async () => {
    const fileSystem = {
      readFile: async (path) => {
        if (path === '/proj/test.bpmn') {
          return { contents: '<bpmn:process id="MyProcess_1">' };
        }
        throw new Error('file not found');
      }
    };

    const search = new NavigatorSearch({
      fileSystem,
      index: new ProcessIndex()
    });

    await search.indexFile('/proj/test.bpmn');

    assert.equal(search.isFileIndexed('/proj/test.bpmn'), true);
    assert.deepStrictEqual(search.getLocations('MyProcess_1'), [{ path: '/proj/test.bpmn' }]);
    assert.deepStrictEqual(search.getLocations('NonExistent'), []);
  });
});
