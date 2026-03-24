/**
 * bug-finder-perf-003: searchInKnownFiles ruft getLocations 2N+1 mal auf statt N+1
 *
 * navigator-search.mjs searchInKnownFiles() Zeilen 109-124:
 *
 *   for (const filePath of candidates) {                    // N Iterationen
 *     const normalizedFilePath = normalizePath(filePath, '/');
 *     const existingLocs = this.getLocations(processId);    // Aufruf 1 (O(M))
 *     if (existingLocs.some(...)) { break; }
 *     if (!this.isFileIndexed(filePath)) {
 *       await this.indexFile(filePath);
 *     }
 *     const found = this.getLocations(processId);           // Aufruf 2 (O(M)) - AUCH bei indexed!
 *     if (found.some(...)) break;
 *   }
 *   const allLocations = this.getLocations(processId);      // Aufruf 3 (O(M))
 *
 * Das Problem: 'found = this.getLocations(processId)' steht AUSSERHALB des
 * 'if (!this.isFileIndexed)'-Blocks. Das bedeutet: 'found' wird bei JEDER Iteration
 * aufgerufen, auch wenn isFileIndexed=true (kein indexFile noetig war).
 *
 * Die 'found' Prüfung ergibt nur Sinn nach einem neuen indexFile()-Aufruf,
 * da sie prüft ob die SOEBEN indexierte Datei den processId enthält.
 * Bei bereits indexierten Dateien enthält found die gleichen Werte wie existingLocs.
 *
 * Ergebnis: 2N+1 getLocations-Aufrufe statt N+1.
 * Bei M Locations pro processId: (2N+1) * M Objekt-Kopien statt (N+1) * M.
 * Das verdoppelt den Allokations-Overhead aus Bug-FINDER-PERF-001.
 *
 * Fix: 'found' nur aufrufen wenn isFileIndexed=false (innerhalb des if-Blocks).
 *   if (!this.isFileIndexed(filePath)) {
 *     await this.indexFile(filePath);
 *     const found = this.getLocations(processId);  // Nur hier!
 *     if (found.some(...)) break;
 *   }
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NavigatorSearch } from '../client/navigator-search.mjs';
import { ProcessIndex } from '../client/process-index.mjs';

describe('BUG-FINDER-PERF-003: searchInKnownFiles ruft getLocations 2N+1 mal auf (statt N+1)', () => {

  it('getLocations wird 2N+1 mal aufgerufen obwohl alle Files bereits indiziert sind', async () => {
    const N = 20;
    const index = new ProcessIndex();

    // Alle N files vorab indizieren
    for (let i = 0; i < N; i++) {
      index.setFileIndex(`/proj/file${i}.bpmn`, [`proc${i}`]);
    }

    let getLocationsCalls = 0;
    const origGetLocations = index.getLocations.bind(index);
    index.getLocations = (id) => {
      getLocationsCalls++;
      return origGetLocations(id);
    };

    const mockFS = { readFile: async () => { throw new Error('no io'); } };
    const search = new NavigatorSearch({ fileSystem: mockFS, index });
    const files = Array.from({ length: N }, (_, i) => `/proj/file${i}.bpmn`);

    await search.searchInKnownFiles('nonexistent', '/current.bpmn', files);

    // Mit dem Bug: 2N+1 Aufrufe (N für existingLocs + N für found + 1 für allLocations)
    // Korrekt wäre: N+1 Aufrufe (N für existingLocs + 1 für allLocations)
    // (found sollte nur nach indexFile aufgerufen werden, nicht bei bereits-indexierten Files)
    const expectedMax = N + 1;
    assert.ok(
      getLocationsCalls <= expectedMax,
      `getLocations wurde ${getLocationsCalls} mal aufgerufen für N=${N} pre-indexed files. ` +
      `Erwartet: maximal ${expectedMax} (N+1). ` +
      `navigator-search.mjs Zeile 122: 'const found = this.getLocations(processId)' ` +
      `steht AUSSERHALB des 'if (!this.isFileIndexed)'-Blocks. ` +
      `Das bedeutet 'found' wird bei jeder Iteration aufgerufen, auch wenn ` +
      `isFileIndexed=true und kein indexFile ausgefuehrt wurde. ` +
      `Fix: 'found'-Aufruf in den if-Block verschieben: nur nach indexFile aufrufen.`
    );
  });

  it('verdoppelter Aufruf: found wird N mal unnoetig aufgerufen bei N pre-indexed files', async () => {
    const N = 50;
    const M = 30; // 30 existing locations fuer processId

    const index = new ProcessIndex();
    for (let i = 0; i < M; i++) {
      index.setFileIndex(`/shared/s${i}.bpmn`, ['target']);
    }
    for (let i = 0; i < N; i++) {
      index.setFileIndex(`/other/f${i}.bpmn`, [`o${i}`]);
    }

    let callCountBeforeIndexFile = 0;  // calls in der Schleife vor isFileIndexed check
    let callCountAfterIndexFile = 0;   // calls in der Schleife nach isFileIndexed check
    let isFileIndexedCalls = 0;
    let indexFileCalled = false;

    const origGetLocations = index.getLocations.bind(index);
    const origIsIndexed = index.isIndexed.bind(index);

    // Instrumentiere getLocations
    index.getLocations = (id) => {
      return origGetLocations(id);
    };

    let totalGetLocationsCalls = 0;
    const origGetLocs = index.getLocations.bind(index);
    index.getLocations = (id) => {
      totalGetLocationsCalls++;
      return origGetLocs(id);
    };

    const mockFS = { readFile: async () => { throw new Error('no io'); } };
    const search = new NavigatorSearch({ fileSystem: mockFS, index });

    // Track indexFile calls
    let indexFileCalls = 0;
    const origIndexFile = search.indexFile.bind(search);
    search.indexFile = async (path) => {
      indexFileCalls++;
      return origIndexFile(path);
    };

    const files = Array.from({ length: N }, (_, i) => `/other/f${i}.bpmn`);
    await search.searchInKnownFiles('target', '/current.bpmn', files);

    // indexFile sollte 0 mal aufgerufen werden (alle pre-indexed)
    assert.equal(indexFileCalls, 0, 'indexFile should not be called for pre-indexed files');

    // getLocations sollte maximal N+1 mal aufgerufen werden:
    // N * (existingLocs check) + 1 * (allLocations am Ende)
    // Aber durch den Bug: 2N+1 mal (N existingLocs + N found + 1 allLocations)
    const expectedMax = N + 1;
    assert.ok(
      totalGetLocationsCalls <= expectedMax,
      `getLocations wurde ${totalGetLocationsCalls} mal aufgerufen ` +
      `(N=${N} pre-indexed files, M=${M} locations, 0 indexFile-Aufrufe). ` +
      `Erwartet: maximal ${expectedMax} Aufrufe. ` +
      `Tatsächlich: ${totalGetLocationsCalls} = ~2*${N}+1 (2N+1). ` +
      `'found = this.getLocations(processId)' (Zeile 122) steht nach dem ` +
      `'if (!this.isFileIndexed)' Block, also wird es auch ohne neues indexFile aufgerufen. ` +
      `Das sind ${totalGetLocationsCalls - expectedMax} unnötige Aufrufe. ` +
      `Bei M=${M} Locations: ${(totalGetLocationsCalls - expectedMax) * M} unnötige Objekt-Kopien.`
    );
  });
});
