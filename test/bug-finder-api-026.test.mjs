/**
 * BUG-FINDER-API-026: NavigatorSearch._doIndexFile catches errors but
 * re-throws TypeErrors. However, if fileSystem.readFile returns a value
 * that makes extractProcessIds throw (e.g., if contents is a number),
 * extractProcessIds checks typeof content !== 'string' and returns [].
 * So this is safe.
 *
 * But: what if indexFile is called and while _doIndexFile is running,
 * invalidateFile is called for the same file? _doIndexFile will complete
 * and call setFileIndex which will store the (now stale) data.
 * This is a race condition in the invalidation logic.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { NavigatorSearch } from '../client/navigator-search.mjs';
import { ProcessIndex } from '../client/process-index.mjs';

describe('BUG-FINDER-API-026: race condition between indexFile and invalidateFile', () => {

  it('invalidateFile during indexFile should not leave stale data', async () => {
    const index = new ProcessIndex();
    let resolveRead;
    const fileSystem = {
      readFile: () => new Promise(resolve => {
        resolveRead = resolve;
      })
    };
    const search = new NavigatorSearch({ fileSystem, index });

    // Start indexing
    const indexPromise = search.indexFile('/a/test.bpmn');

    // While readFile is pending, invalidate the file
    search.invalidateFile('/a/test.bpmn');

    // Now resolve the read with old data
    resolveRead({
      contents: `<?xml version="1.0"?><bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"><bpmn:process id="staleProcess" /></bpmn:definitions>`
    });

    await indexPromise;

    // After invalidation + completion, the file should NOT have stale data
    // But _doIndexFile calls setFileIndex AFTER the readFile resolves,
    // overwriting the invalidation
    const isIndexed = search.isFileIndexed('/a/test.bpmn');
    const locations = search.getLocations('staleProcess');

    // Current behavior: setFileIndex is called after invalidation,
    // so stale data IS stored. This is a race condition.
    assert.equal(isIndexed, false,
      'File should not be indexed after invalidation during ongoing indexing');
    assert.equal(locations.length, 0,
      'Stale process locations should not be present after invalidation');
  });
});
