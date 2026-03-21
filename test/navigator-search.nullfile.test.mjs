import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { NavigatorSearch } from '../client/navigator-search.mjs';
import { ProcessIndex } from '../client/process-index.mjs';

describe('NavigatorSearch.getProcessIdsFromFile', () => {

  it('getProcessIdsFromFile handles readFile returning null', async () => {
    const fileSystem = { readFile: async () => null };

    const search = new NavigatorSearch({
      fileSystem,
      index: new ProcessIndex()
    });

    const result = await search.getProcessIdsFromFile('/proj/test.bpmn');

    assert.deepStrictEqual(result, []);
  });
});
