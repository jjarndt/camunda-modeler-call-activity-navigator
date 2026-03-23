/**
 * bug-finder-perf-001: searchInKnownFiles ruft getLocations(processId) O(N) mal auf
 *
 * navigator-search.mjs searchInKnownFiles() Zeilen 112-115:
 *
 *   for (const filePath of candidates) {           // N Iterationen
 *     const existingLocs = this.getLocations(processId);  // O(M) Allokation PRO Iteration!
 *     if (existingLocs.some(...)) { break; }
 *     ...
 *   }
 *
 * Das Problem: getLocations(processId) wird INNERHALB der Schleife aufgerufen,
 * BEVOR der isFileIndexed-Check. Bei N candidates und M bestehenden Locations
 * fuer den processId werden N * M neue Objekte erstellt (spread-copy in getLocations).
 *
 * In process-index.mjs getLocations() Zeile 16:
 *   return (this._locationsByProcess.get(key) || []).map(loc => ({ ...loc }));
 *                                                         ^^^^^^^^^^^^^^^^^^
 *                                                         Erstellt neue Objekte!
 *
 * Szenario: 50 Locations fuer 'target-proc' bereits im Index.
 * 1000 andere pre-indexed Files in knownFiles.
 * -> 1000 Iterationen * 50 Kopien/Iteration = 50.000 unnoetige Objekte.
 *
 * Erwartet: getLocations(processId) sollte maximal 2x aufgerufen werden
 * (einmal fuer den Break-Check nach Fund, einmal am Ende fuer das Ergebnis).
 * Tatsaechlich: N+1 Aufrufe (bei N knownFiles).
 *
 * Fix: getLocations-Aufruf aus der Schleife herausziehen, oder
 * intern mit _locationsByProcess.has() pruefe statt der kopierten Liste.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NavigatorSearch } from '../client/navigator-search.mjs';
import { ProcessIndex } from '../client/process-index.mjs';

describe('BUG-FINDER-PERF-001: searchInKnownFiles ruft getLocations O(N) mal auf (O(N*M) Allokationen)', () => {

  it('getLocations wird O(N) mal aufgerufen statt O(1) beim Early-Break-Check', async () => {
    const N = 200; // 200 knownFiles
    const M = 50;  // 50 Locations fuer target-proc

    const index = new ProcessIndex();

    // M Locations fuer 'target-proc' (bereits indiziert - in anderen Dateien)
    for (let i = 0; i < M; i++) {
      index.setFileIndex(`/shared/file${i}.bpmn`, ['target-proc']);
    }

    // N other files - alle bereits indiziert mit anderem proc
    for (let i = 0; i < N; i++) {
      index.setFileIndex(`/other/file${i}.bpmn`, [`other-${i}`]);
    }

    // Zaehle getLocations-Aufrufe
    let getLocationsCalls = 0;
    const origGetLocations = index.getLocations.bind(index);
    index.getLocations = (id) => {
      getLocationsCalls++;
      return origGetLocations(id);
    };

    const mockFS = { readFile: async () => ({ contents: '<bpmn:process id="x"/>' }) };
    const search = new NavigatorSearch({ fileSystem: mockFS, index });
    const knownFiles = Array.from({ length: N }, (_, i) => `/other/file${i}.bpmn`);

    await search.searchInKnownFiles('target-proc', '/project/current.bpmn', knownFiles);

    // BUG: getLocations wird N+1 mal aufgerufen (N mal in der Schleife + 1 am Ende)
    // Erwartung: maximal 3 Aufrufe (einmal fuer existingLocs-Fruehabbruch + einmal nach indexFile + einmal am Ende)
    assert.ok(
      getLocationsCalls <= 3,
      `getLocations wurde ${getLocationsCalls} mal aufgerufen (N=${N} knownFiles, M=${M} Locations). ` +
      `Erwartet: maximal 3 Aufrufe. ` +
      `navigator-search.mjs searchInKnownFiles() Zeile 113: ` +
      `'const existingLocs = this.getLocations(processId)' wird INNERHALB der N-Iterationen-Schleife aufgerufen. ` +
      `Jeder Aufruf erstellt O(M=${M}) neue Objekte via map(loc => ({...loc})) in process-index.mjs Zeile 16. ` +
      `Total: ${getLocationsCalls} * ${M} = ${getLocationsCalls * M} unnoetige Objekt-Kopien. ` +
      `Fix: getLocations-Pruefung aus der Schleife herausziehen oder _locationsByProcess direkt pruefen.`
    );
  });

  it('O(N*M) Allokationen: getLocations erzeugt pro Aufruf M Kopien, wird N mal aufgerufen', async () => {
    const N = 500;
    const M = 100; // 100 Locations pro processId

    const index = new ProcessIndex();
    for (let i = 0; i < M; i++) {
      index.setFileIndex(`/shared/s${i}.bpmn`, ['shared-proc']);
    }
    for (let i = 0; i < N; i++) {
      index.setFileIndex(`/files/f${i}.bpmn`, [`p${i}`]);
    }

    let totalObjectsCreated = 0;
    const origGetLocations = index.getLocations.bind(index);
    index.getLocations = (id) => {
      const result = origGetLocations(id);
      totalObjectsCreated += result.length;
      return result;
    };

    const mockFS = { readFile: async () => ({ contents: '<bpmn:process id="x"/>' }) };
    const search = new NavigatorSearch({ fileSystem: mockFS, index });
    const knownFiles = Array.from({ length: N }, (_, i) => `/files/f${i}.bpmn`);

    await search.searchInKnownFiles('shared-proc', '/project/current.bpmn', knownFiles);

    // Erwartet: O(M) Kopien (einige wenige Aufrufe * M Kopien)
    // Tatsaechlich: O(N * M) Kopien
    const expectedMax = M * 5; // Toleranz fuer wenige Aufrufe
    assert.ok(
      totalObjectsCreated <= expectedMax,
      `getLocations erstellte ${totalObjectsCreated} Objekt-Kopien fuer N=${N} knownFiles, M=${M} Locations. ` +
      `Erwartet: maximal ${expectedMax} Kopien (5 * M). ` +
      `navigator-search.mjs Zeile 113: getLocations(processId) wird in der N-Iterationen-Schleife aufgerufen. ` +
      `process-index.mjs Zeile 16: Jeder getLocations-Aufruf erstellt ${M} neue Objekte via map({...loc}). ` +
      `Total: ~${N} Aufrufe * ${M} Kopien = ${N * M} Objekte (O(N*M) Allokationen). ` +
      `Fix: getLocations aus der Schleife herausziehen oder intern ohne Kopie pruefen.`
    );
  });
});
