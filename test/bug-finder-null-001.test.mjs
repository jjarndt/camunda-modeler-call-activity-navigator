/**
 * BUG-FINDER-NULL-001: searchInKnownFiles propagiert TypeError unkontrolliert
 *
 * In navigator-search.mjs, _doIndexFile() re-throws TypeError (Zeile 80).
 * searchInKnownFiles() ruft indexFile() auf (Zeile 119) und hat KEINEN try/catch
 * fuer TypeError. Wenn fileSystem.readFile() eine TypeError wirft (z.B. bei
 * korruptem fileSystem-Objekt), propagiert diese TypeError unbehandelt nach oben.
 *
 * Hypothese: searchInKnownFiles wirft TypeError wenn readFile TypeError wirft
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NavigatorSearch } from '../client/navigator-search.mjs';
import { ProcessIndex } from '../client/process-index.mjs';

describe('BUG-FINDER-NULL-001: searchInKnownFiles propagiert TypeError von indexFile', () => {
  it('searchInKnownFiles sollte keinen TypeError propagieren wenn readFile TypeError wirft', async () => {
    const fileSystem = {
      readFile: () => { throw new TypeError('Cannot read properties of null (reading readFile)'); }
    };
    const index = new ProcessIndex();
    const search = new NavigatorSearch({ fileSystem, index });

    // Wenn die Datei noch nicht indiziert ist und readFile TypeError wirft,
    // sollte searchInKnownFiles nicht crashen sondern null/Ergebnis zurueckgeben
    const result = await search.searchInKnownFiles(
      'myProcess',
      '/project/current.bpmn',
      new Set(['/project/other.bpmn'])
    );

    // Erwartet: kein Throw, gibt null zurueck
    assert.equal(result, null);
  });
});
