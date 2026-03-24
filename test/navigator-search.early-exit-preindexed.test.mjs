/**
 * bug-perf-012: searchInKnownFiles hat keinen Early Exit fuer bereits
 *               indizierte Dateien
 *
 * navigator-search.mjs searchInKnownFiles() Zeilen 75-82:
 *
 *   for (const filePath of candidates) {
 *     if (!this.isFileIndexed(filePath)) {          // <-- nur hier Early Exit
 *       await this.indexFile(filePath);
 *       const found = this.getLocations(processId);
 *       if (found.some(loc => loc.path !== normalizedCurrent)) break; // <-- Early Exit nur fuer neue Dateien
 *     }
 *     // bereits indizierte Dateien: kein Break moeglich!
 *   }
 *   const allLocations = this.getLocations(processId); // DANACH
 *
 * Das Problem: Der Early-Exit-Check (break) wird nur ausgefuehrt wenn eine
 * Datei NICHT bereits indiziert ist (innerhalb des if-Blocks).
 * Wenn alle Dateien bereits indiziert sind und eine davon den processId
 * enthaelt, wird die GESAMTE candidates-Liste ohne Early Exit durchlaufen.
 *
 * Szenario: 1000 Dateien wurden durch einen vorherigen _searchInSiblingDirs-
 * Aufruf bereits indiziert. Datei 0 enthaelt 'my-process'. Der naechste
 * searchInKnownFiles-Aufruf fuer 'my-process' iteriert alle 1000 candidates
 * ohne je abzubrechen (weil alle isFileIndexed = true).
 *
 * Erwartet: Wenn processId in bereits indexierter Datei gefunden wird,
 * sollte die Schleife abbrechen.
 * Tatsaechlich: Alle n Kandidaten werden iteriert.
 *
 * Fix: Nach dem if-Block pruefen ob getLocations(processId) bereits einen
 * Treffer hat und dann ebenfalls abbrechen:
 *   if (this.getLocations(processId).some(loc => loc.path !== normalizedCurrent)) break;
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Wir testen den Bug direkt durch Zaehlen der Schleifeniterationen
// indem wir die Logik von searchInKnownFiles replizieren mit einem
// Iterator-Tracking-Wrapper

describe('BUG-PERF-012: searchInKnownFiles skips early exit for pre-indexed files (navigator-search.mjs line 75-82)', () => {

  it('iterates ALL candidates even when processId is already indexed in first file', async () => {
    const { NavigatorSearch } = await import('../client/navigator-search.mjs');
    const { ProcessIndex } = await import('../client/process-index.mjs');

    const PROCESS_ID = 'pre-indexed-target';
    const TOTAL_FILES = 200;

    let isFileIndexedCallCount = 0;

    const mockFileSystem = {
      // readFile wird NIE aufgerufen weil alle Dateien schon indiziert sind
      readFile: async () => {
        throw new Error('readFile should not be called - all files already indexed');
      }
    };

    const index = new ProcessIndex();

    // Indiziere alle Dateien vorab - Datei 0 enthaelt den gesuchten processId
    index.setFileIndex('/project/file-0.bpmn', [PROCESS_ID]);
    for (let i = 1; i < TOTAL_FILES; i++) {
      index.setFileIndex(`/project/file-${i}.bpmn`, [`other-proc-${i}`]);
    }

    // Wir umhuellendie isFileIndexed-Methode um Aufrufe zu zaehlen
    const search = new NavigatorSearch({ fileSystem: mockFileSystem, index });
    const originalIsFileIndexed = search.isFileIndexed.bind(search);
    search.isFileIndexed = (filePath) => {
      isFileIndexedCallCount++;
      return originalIsFileIndexed(filePath);
    };

    const knownFiles = Array.from(
      { length: TOTAL_FILES },
      (_, i) => `/project/file-${i}.bpmn`
    );

    const result = await search.searchInKnownFiles(
      PROCESS_ID,
      '/project/current.bpmn',
      knownFiles
    );

    assert.equal(result, '/project/file-0.bpmn', 'Should find the pre-indexed file');

    // BUG: Auch wenn Datei 0 bereits indiziert ist und den processId enthaelt,
    // werden trotzdem ALLE 200 isFileIndexed-Checks durchgefuehrt.
    // Mit Early Exit wuerden nach Datei 0 maximal 2 Checks genuegen.
    assert.ok(
      isFileIndexedCallCount <= 2,
      `Expected at most 2 isFileIndexed calls (early exit after finding pre-indexed file), ` +
      `but got ${isFileIndexedCallCount} calls. ` +
      `searchInKnownFiles in navigator-search.mjs has no early exit for already-indexed files. ` +
      `The early-exit break (line 80) is inside the 'if (!isFileIndexed)' block, ` +
      `so it is NEVER reached when all files are already indexed. ` +
      `With ${TOTAL_FILES} files pre-indexed and match in file-0, ` +
      `${isFileIndexedCallCount - 2} unnecessary iterations occur.`
    );
  });

  it('iterates ALL 100 candidates when all are pre-indexed and match is at index 5', async () => {
    const { NavigatorSearch } = await import('../client/navigator-search.mjs');
    const { ProcessIndex } = await import('../client/process-index.mjs');

    const PROCESS_ID = 'cached-process';
    const TOTAL_FILES = 100;
    const MATCH_AT = 5;

    let iterationCount = 0;

    const mockFileSystem = {
      readFile: async () => {
        throw new Error('No I/O should happen - all files pre-indexed');
      }
    };

    const index = new ProcessIndex();
    for (let i = 0; i < TOTAL_FILES; i++) {
      const ids = i === MATCH_AT ? [PROCESS_ID] : [`other-${i}`];
      index.setFileIndex(`/project/file-${i}.bpmn`, ids);
    }

    const search = new NavigatorSearch({ fileSystem: mockFileSystem, index });
    const origIsIndexed = search.isFileIndexed.bind(search);
    search.isFileIndexed = (fp) => {
      iterationCount++;
      return origIsIndexed(fp);
    };

    const knownFiles = Array.from({ length: TOTAL_FILES }, (_, i) => `/project/file-${i}.bpmn`);

    await search.searchInKnownFiles(PROCESS_ID, '/project/current.bpmn', knownFiles);

    const unnecessaryIterations = iterationCount - (MATCH_AT + 1);
    assert.ok(
      unnecessaryIterations <= 0,
      `${unnecessaryIterations} unnecessary iterations after match at position ${MATCH_AT}. ` +
      `Total iterations: ${iterationCount}, expected: at most ${MATCH_AT + 1}. ` +
      `navigator-search.mjs searchInKnownFiles() early-exit break is inside ` +
      `'if (!isFileIndexed)' block (line 76-81), so it never fires when all files ` +
      `are already indexed. The loop completes all ${TOTAL_FILES} iterations ` +
      `even when the processId was findable after just ${MATCH_AT + 1} checks.`
    );
  });
});
