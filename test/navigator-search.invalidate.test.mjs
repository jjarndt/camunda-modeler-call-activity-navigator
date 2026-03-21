import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { NavigatorSearch } from '../client/navigator-search.mjs';
import { ProcessIndex } from '../client/process-index.mjs';

describe('NavigatorSearch', () => {

  it('invalidateFile removes file from index so next search re-reads it', async () => {
    const files = new Map([
      ['/proj/a.bpmn', '<bpmn:process id="OldProc">']
    ]);

    let readCount = 0;

    const fileSystem = {
      readFile(path) {
        readCount++;
        return { contents: files.get(path) };
      }
    };

    const search = new NavigatorSearch({
      fileSystem,
      index: new ProcessIndex()
    });

    await search.indexFile('/proj/a.bpmn');
    assert.equal(search.getLocations('OldProc').length, 1);
    assert.equal(readCount, 1);

    files.set('/proj/a.bpmn', '<bpmn:process id="NewProc">');
    search.invalidateFile('/proj/a.bpmn');
    assert.equal(search.isFileIndexed('/proj/a.bpmn'), false);

    await search.indexFile('/proj/a.bpmn');
    assert.deepStrictEqual(search.getLocations('OldProc'), []);
    assert.equal(search.getLocations('NewProc').length, 1);
    assert.equal(readCount, 2);
  });
});
