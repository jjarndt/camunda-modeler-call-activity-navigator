import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { NavigatorSearch } from '../client/navigator-search.mjs';
import { ProcessIndex } from '../client/process-index.mjs';

describe('NavigatorSearch - invalidateFile', () => {

  it('should remove a file from the index and re-read it on next indexFile call', async () => {
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

    // initial index
    await search.indexFile('/proj/a.bpmn');
    assert.equal(search.getLocations('OldProc').length, 1);
    assert.equal(readCount, 1);

    // invalidate after content change
    files.set('/proj/a.bpmn', '<bpmn:process id="NewProc">');
    search.invalidateFile('/proj/a.bpmn');
    assert.equal(search.isFileIndexed('/proj/a.bpmn'), false);

    // re-index picks up the new content
    await search.indexFile('/proj/a.bpmn');
    assert.deepStrictEqual(search.getLocations('OldProc'), []);
    assert.equal(search.getLocations('NewProc').length, 1);
    assert.equal(readCount, 2);
  });
});
