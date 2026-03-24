/**
 * BUG-FINDER-NULL-002: searchInKnownFiles mit null currentFilePath
 *
 * In navigator-search.mjs Zeile 99:
 *   const normalizedCurrent = normalizePath(currentFilePath, '/');
 *   const currentDir = parentDir(normalizedCurrent);
 *
 * normalizePath(null, '/') gibt '' zurueck (durch den null-Guard).
 * parentDir('') ruft ''.split(/[/\\]/).slice(0, -1).join('/') auf
 * und gibt '' zurueck - das ist korrekt.
 * Aber dann wird bei Zeile 104 isValidPath('') und normalizePath('', '/')
 * aufgerufen - sollte '' zurueckgeben. Das fuehrt zum Vergleich
 * pathsEqualIgnoreCase('', '') === true und alle Dateien werden gefiltert.
 *
 * Hypothese: wenn currentFilePath null ist, sollte die Funktion sicher
 * null zurueckgeben statt zu crashen.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NavigatorSearch } from '../client/navigator-search.mjs';
import { ProcessIndex } from '../client/process-index.mjs';

describe('BUG-FINDER-NULL-002: searchInKnownFiles mit null currentFilePath', () => {
  it('wirft keinen Fehler wenn currentFilePath null ist', async () => {
    const index = new ProcessIndex();
    index.setFileIndex('/project/other.bpmn', ['myProcess']);
    const fileSystem = {
      readFile: async () => ({ contents: '<process id="myProcess"/>' })
    };
    const search = new NavigatorSearch({ fileSystem, index });

    // Sollte keinen TypeError werfen
    let result;
    assert.doesNotThrow(async () => {
      result = await search.searchInKnownFiles('myProcess', null, new Set(['/project/other.bpmn']));
    });
    // await the actual call
    result = await search.searchInKnownFiles('myProcess', null, new Set(['/project/other.bpmn']));
    // Ergebnis kann null oder einen Pfad sein, aber kein Crash
    assert.ok(result === null || typeof result === 'string');
  });
});
