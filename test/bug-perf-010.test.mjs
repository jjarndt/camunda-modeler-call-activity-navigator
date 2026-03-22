/**
 * bug-perf-010: searchInKnownFiles liest ALLE Dateien auch wenn processId fruehzeitig gefunden
 *
 * navigator-search.mjs searchInKnownFiles() Zeile 60-81:
 *
 *   for (const filePath of (knownFiles ?? [])) {
 *     if (normalizePath(filePath, '/') === normalizedCurrent) continue;
 *     if (!this.isFileIndexed(filePath)) {
 *       await this.indexFile(filePath);  // I/O fuer JEDE Datei
 *     }
 *   }
 *   const allLocations = this.getLocations(processId); // Suche DANACH
 *
 * Das Problem: Die Schleife indiziert ALLE n Dateien, BEVOR sie prueft ob der
 * gesuchte processId bereits gefunden wurde. Selbst wenn die gesuchte Datei
 * die erste oder zweite in der Liste ist, werden trotzdem alle n - 1 Dateien gelesen.
 *
 * Erwartet: Bei n=100 Dateien und Match in Datei 1 sollten ~1 I/O-Aufruf gereicht haben.
 * Tatsaechlich: 100 I/O-Aufrufe werden gemacht.
 *
 * Fix: Nach jedem indexFile-Aufruf pruefen ob der processId bereits gefunden wurde.
 * Dann kann fruehzeitig abgebrochen werden (early exit).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NavigatorSearch } from '../client/navigator-search.mjs';
import { ProcessIndex } from '../client/process-index.mjs';

describe('BUG-PERF-010: searchInKnownFiles reads all files without early exit (navigator-search.mjs line 63-69)', () => {

  it('indexes all N files even when processId is found in the first file', async () => {
    const PROCESS_ID = 'target-process';
    const TOTAL_FILES = 100;
    let readCount = 0;

    // Datei 0 enthaelt den gesuchten processId
    // Dateien 1-99 enthalten ihn nicht (aber werden trotzdem gelesen)
    const mockFileSystem = {
      readFile: async (path) => {
        readCount++;
        const idx = parseInt(path.replace('/project/file-', '').replace('.bpmn', ''), 10);
        if (idx === 0) {
          return { contents: `<bpmn:process id="${PROCESS_ID}"></bpmn:process>` };
        }
        return { contents: `<bpmn:process id="other-process-${idx}"></bpmn:process>` };
      }
    };

    const index = new ProcessIndex();
    const search = new NavigatorSearch({ fileSystem: mockFileSystem, index });

    // Erzeuge 100 bekannte Dateien
    const knownFiles = Array.from(
      { length: TOTAL_FILES },
      (_, i) => `/project/file-${i}.bpmn`
    );

    const result = await search.searchInKnownFiles(
      PROCESS_ID,
      '/project/current.bpmn', // aktuelle Datei (wird uebersprungen)
      knownFiles
    );

    assert.equal(result, '/project/file-0.bpmn', 'Should find the correct file');

    // BUG: Es wurden ALLE 100 Dateien gelesen, obwohl Match in Datei 0 war
    // Korrekt waere: Nach Fund von processId in Datei 0 haetten die restlichen
    // 99 Dateien NICHT mehr gelesen werden muessen.
    assert.ok(
      readCount <= 1,
      `Expected at most 1 readFile call (early exit after finding processId), ` +
      `but got ${readCount} calls. searchInKnownFiles in navigator-search.mjs ` +
      `reads ALL ${TOTAL_FILES} files even though processId was found in file-0.bpmn. ` +
      `Fix: add early-exit check inside the indexing loop after each indexFile call.`
    );
  });

  it('reads ALL files sequentially even with 50 files and match at position 5', async () => {
    const PROCESS_ID = 'early-match-process';
    const TOTAL_FILES = 50;
    const MATCH_AT = 5;
    let readCount = 0;

    const mockFileSystem = {
      readFile: async (path) => {
        readCount++;
        const idx = parseInt(path.replace('/project/file-', '').replace('.bpmn', ''), 10);
        if (idx === MATCH_AT) {
          return { contents: `<bpmn:process id="${PROCESS_ID}"></bpmn:process>` };
        }
        return { contents: `<bpmn:process id="other-${idx}"></bpmn:process>` };
      }
    };

    const index = new ProcessIndex();
    const search = new NavigatorSearch({ fileSystem: mockFileSystem, index });

    const knownFiles = Array.from(
      { length: TOTAL_FILES },
      (_, i) => `/project/file-${i}.bpmn`
    );

    await search.searchInKnownFiles(PROCESS_ID, '/project/current.bpmn', knownFiles);

    // Nach Match bei Index 5 sollten nur ~6 Reads stattgefunden haben (0-5)
    // Tatsaechlich werden alle 50 gelesen
    const unnecessaryReads = readCount - (MATCH_AT + 1);
    assert.ok(
      unnecessaryReads <= 0,
      `${unnecessaryReads} unnecessary readFile calls after finding processId at position ${MATCH_AT}. ` +
      `Total reads: ${readCount}, expected: at most ${MATCH_AT + 1}. ` +
      `navigator-search.mjs searchInKnownFiles() has no early exit after indexing finds the processId. ` +
      `With ${TOTAL_FILES} files and match at position ${MATCH_AT}, ` +
      `${unnecessaryReads} extra I/O operations are wasted.`
    );
  });
});
