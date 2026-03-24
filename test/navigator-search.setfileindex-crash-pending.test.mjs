/**
 * BUG-FINDER-NULL-007: NavigatorSearch.indexFile bei Concurrent-Access mit null
 *
 * In navigator-search.mjs Zeile 58-72, indexFile():
 *   if (!isValidPath(filePath)) return;
 *   const normalized = normalizePath(filePath, '/');
 *   const existing = this._indexingPromises.get(normalized);
 *
 * Wenn filePath valide ist, normalized aber '' zurueckgibt (wegen eines Bugs),
 * dann wuerde '' als Key im Map verwendet.
 *
 * Echter Verdacht: was passiert wenn _doIndexFile() eine nicht-TypeError Exception wirft?
 * In Zeile 79-83:
 *   } catch (err) {
 *     if (err instanceof TypeError) throw err;
 *     // Mark as indexed with no processes to avoid repeated I/O failures
 *     this._index.setFileIndex(filePath, []);
 *   }
 *
 * Was wenn setFileIndex() eine Exception wirft? (z.B. weil index.setFileIndex crashed)
 * Das wuerde den Promise in _indexingPromises pending lassen und nie aufloesen!
 *
 * Test: indexFile mit einem index, dessen setFileIndex Fehler wirft
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NavigatorSearch } from '../client/navigator-search.mjs';

describe('BUG-FINDER-NULL-007: indexFile bei crashendem index.setFileIndex', () => {
  it('indexFile sollte sich aufloesen auch wenn setFileIndex() eine Exception wirft', async () => {
    let setFileIndexCallCount = 0;
    const brokenIndex = {
      isIndexed: () => false,
      removeFile: () => {},
      getLocations: () => [],
      setFileIndex: () => {
        setFileIndexCallCount++;
        throw new Error('setFileIndex crashed!');
      }
    };

    const fileSystem = {
      readFile: async () => ({ contents: '<process id="test"/>' })
    };

    const search = new NavigatorSearch({ fileSystem, index: brokenIndex });

    // indexFile sollte nicht haengen bleiben (Promise muss sich aufloesen oder rejected werden)
    // Timeout von 2 Sekunden um haengengebliebene Promises zu erkennen
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT: indexFile haengt')), 2000)
    );

    await assert.rejects(
      () => Promise.race([search.indexFile('/test/file.bpmn'), timeoutPromise]),
      (err) => {
        // Sollte entweder 'setFileIndex crashed!' oder keinen Timeout haben
        assert.notStrictEqual(err.message, 'TIMEOUT: indexFile haengt',
          'indexFile darf nicht haengen wenn setFileIndex wirft');
        return true;
      }
    );
  });
});
