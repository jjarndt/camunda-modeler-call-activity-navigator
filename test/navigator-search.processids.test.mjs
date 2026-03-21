import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { NavigatorSearch } from '../client/navigator-search.mjs';
import { ProcessIndex } from '../client/process-index.mjs';

describe('NavigatorSearch.getProcessIdsFromFile', () => {

  it('returns process IDs without modifying the index', async () => {
    const fileSystem = {
      readFile(path) {
        if (path === '/proj/multi.bpmn') {
          return Promise.resolve({
            contents: '<bpmn:process id="Proc_A"><bpmn:process id="Proc_B">'
          });
        }
        return Promise.reject(new Error('not found'));
      }
    };

    const search = new NavigatorSearch({
      fileSystem,
      index: new ProcessIndex()
    });

    const ids = await search.getProcessIdsFromFile('/proj/multi.bpmn');

    assert.deepStrictEqual(ids, ['Proc_A', 'Proc_B']);
    assert.strictEqual(search.isFileIndexed('/proj/multi.bpmn'), false);
  });
});
