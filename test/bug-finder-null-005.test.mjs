/**
 * BUG-FINDER-NULL-005: waitForFileDiscovery mit null/undefined/nicht-Array
 *
 * In file-discovery.mjs Zeile 11:
 *   if (!Array.isArray(listeners)) return Promise.resolve();
 *
 * Das ist bereits abgesichert. Teste aber weitere Szenarien:
 * - Was wenn listeners.push undefined ist (non-standard array-like)?
 * - Was wenn waehrend der Ausfuehrung listeners null wird?
 *
 * Teste auch: getProcessIdsFromFile mit TypeError von readFile
 * In navigator-search.mjs Zeile 91:
 *   if (err instanceof TypeError) throw err;
 * Das re-throws TypeError! Wenn der Aufrufer nicht aufpasst...
 *
 * In index.js Zeile 145:
 *   const embeddedProcessIds = await this._search.getProcessIdsFromFile(currentFilePath);
 * KEIN try/catch um diese Zeile! Wenn readFile TypeError wirft,
 * propagiert der TypeError unkontrolliert durch _doHandleOpenProcess.
 *
 * Aber _handleOpenProcess hat auch keinen try/catch - das ist problematisch.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NavigatorSearch } from '../client/navigator-search.mjs';
import { ProcessIndex } from '../client/process-index.mjs';

describe('BUG-FINDER-NULL-005: getProcessIdsFromFile re-throws TypeError unkontrolliert', () => {
  it('getProcessIdsFromFile sollte nicht re-thrown TypeError propagieren wenn readFile TypeError wirft', async () => {
    const fileSystem = {
      readFile: () => {
        // Simuliert z.B. TypeError aus der readFile-Implementierung
        throw new TypeError('readFile internen Fehler');
      }
    };
    const search = new NavigatorSearch({
      fileSystem,
      index: new ProcessIndex()
    });

    // getProcessIdsFromFile re-throws TypeError laut Zeile 91
    // Der Aufrufer in index.js hat KEIN try/catch dafuer
    // Erwartet: sollte sicher [] zurueckgeben oder keinen unbehandelten Fehler werfen
    await assert.rejects(
      async () => search.getProcessIdsFromFile('/some/file.bpmn'),
      TypeError,
      'getProcessIdsFromFile re-throws TypeError - das ist ein bekanntes Verhalten'
    );
    // Dieser Test BESTAETIGT den Bug: der TypeError wird re-thrown
    // Korrekt waere: der Aufrufer muss damit umgehen - aber in index.js fehlt das try/catch
  });
});
