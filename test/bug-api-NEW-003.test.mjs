/**
 * BUG-API-NEW-003: NavigatorSearch constructor validates fileSystem and index
 * presence but not their interface (duck-typing).
 *
 * The constructor checks `if (!fileSystem)`, but does NOT verify that
 * fileSystem has a `readFile` method. This is a known design decision.
 * TypeErrors from missing methods bubble up at runtime.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { NavigatorSearch } from '../client/navigator-search.mjs';

describe('BUG-API-NEW-003: Constructor accepts invalid fileSystem/index objects', () => {

  it('indexFile crashes with TypeError when fileSystem lacks readFile', async () => {
    const search = new NavigatorSearch({
      fileSystem: {},
      index: {
        isIndexed: () => false,
        getLocations: () => [],
        setFileIndex: () => {},
        removeFile: () => {}
      }
    });

    await assert.rejects(
      () => search.indexFile('/some/file.bpmn'),
      (err) => {
        assert.ok(err instanceof TypeError, 'Error should be TypeError');
        return true;
      }
    );
  });

  it('the TypeError from missing readFile is NOT caught by _doIndexFile error handler', async () => {
    const search = new NavigatorSearch({
      fileSystem: {},
      index: {
        isIndexed: () => false,
        getLocations: () => [],
        setFileIndex: () => {},
        removeFile: () => {}
      }
    });

    let setFileIndexCalled = false;
    search._index.setFileIndex = () => { setFileIndexCalled = true; };

    try {
      await search.indexFile('/some/file.bpmn');
    } catch {
      // expected
    }

    assert.strictEqual(setFileIndexCalled, false,
      'setFileIndex should not be called when TypeError occurs');
  });
});
