/**
 * bug-perf-005: _knownFiles Set wächst unbegrenzt durch _tryRelativePaths
 *
 * In index.js _tryRelativePaths (Zeile 248):
 *   this._knownFiles.add(candidatePath);
 *
 * Jede per Relative-Path-Heuristik gefundene Datei wird zu _knownFiles hinzugefuegt.
 * Dateien werden nur durch file-context:changed (Removal) entfernt.
 * Es gibt KEINEN Mechanismus der durch _tryRelativePaths hinzugefuegte Dateien
 * je wieder entfernt.
 *
 * Allerdings: Das ist nur ein Problem wenn das Plugin sehr lange laeuft und
 * viele verschiedene Prozesse navigiert werden. Keine echte Unbegrenzheit im
 * Normalgebrauch.
 *
 * Echter Bug-Kandidat: ProcessIndex Maps koennen inkonsistent werden wenn
 * setFileIndex und removeFile concurrent aufgerufen werden. Da JS single-threaded
 * ist, gibt es keine echte Concurrency. Kein Bug.
 *
 * Echter Test: Pruefen ob setFileIndex mit leeren processIds korrekt handelt.
 * (Bereits in anderen Tests abgedeckt.)
 *
 * Echter Bug: _addedRoots wird NIE geleert. Wenn ein Root-Verzeichnis
 * umbenannt oder geloescht und neu erstellt wird, wird es nie neu entdeckt,
 * weil _addedRoots ihn noch haelt.
 * ABER: newFilesCount === 0 verhindert bereits den _addedRoots.add.
 * Das ist der Bug aus bug-perf-001.
 *
 * Neuer Verdacht: _searchInSiblingDirs hat einen doppelten N+1 Loop.
 * Zeilen 192-199: iteriert _knownFiles und indiziert nicht-indizierte Dateien.
 * Das ist identisch zu dem was searchInKnownFiles auch macht (Zeilen 63-69).
 * Bei einem Aufruf von _doHandleOpenProcess werden also beide aufgerufen:
 * 1. _searchInKnownFiles (ruft searchInKnownFiles auf) -> indiziert alle
 * 2. _searchInSiblingDirs -> iteriert nochmals alle _knownFiles
 *
 * Aber nach Schritt 1 sind alle Dateien bereits indiziert, Schritt 2 macht
 * dann keinen I/O mehr. Das ist korrekt aber ineffizient (doppelte Iteration).
 *
 * Echter messbarer Bug: ProcessIndex.setFileIndex mutiert den existing Array.
 * Zeile 24: const existing = this._locationsByProcess.get(processId) || [];
 * Zeile 25: existing.push({ path: filePath });
 * Wenn getLocations einen Spread-Klon zurueckgibt (Zeile 14), ist das safe.
 * Aber setFileIndex arbeitet auf dem internen Array direkt. Das ist konsistent.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ProcessIndex } from '../client/process-index.mjs';

describe('BUG-PERF-005: ProcessIndex internal array mutation in setFileIndex', () => {

  it('getLocations returns snapshot, not live reference to internal array', () => {
    const index = new ProcessIndex();
    index.setFileIndex('/a.bpmn', ['proc1']);

    const locations = index.getLocations('proc1');

    // Manipuliere das zurueckgegebene Array
    locations.push({ path: '/injected.bpmn' });

    // Der interne State sollte unveraendert sein
    const locationsAgain = index.getLocations('proc1');
    assert.equal(locationsAgain.length, 1,
      'getLocations should return a copy, not a live reference to internal array'
    );
  });

  it('setFileIndex with same file twice does not duplicate entries', () => {
    const index = new ProcessIndex();

    index.setFileIndex('/a.bpmn', ['proc1']);
    index.setFileIndex('/a.bpmn', ['proc1']); // zweiter Aufruf

    const locations = index.getLocations('proc1');
    assert.equal(locations.length, 1,
      `Expected 1 location, got ${locations.length}. Duplicate entries in index!`
    );
  });

  it('setFileIndex updates processIds correctly (old processes removed, new added)', () => {
    const index = new ProcessIndex();

    // Erst mit proc1 indizieren
    index.setFileIndex('/a.bpmn', ['proc1']);
    assert.equal(index.getLocations('proc1').length, 1);
    assert.equal(index.getLocations('proc2').length, 0);

    // Dann ueberschreiben mit proc2
    index.setFileIndex('/a.bpmn', ['proc2']);
    assert.equal(index.getLocations('proc1').length, 0,
      'proc1 should be removed after re-indexing with proc2'
    );
    assert.equal(index.getLocations('proc2').length, 1,
      'proc2 should be present after re-indexing'
    );
  });

  it('_locationsByProcess entries are garbage collected when no files reference them', () => {
    const index = new ProcessIndex();

    // 100 Dateien hinzufuegen
    for (let i = 0; i < 100; i++) {
      index.setFileIndex(`/file${i}.bpmn`, [`proc${i}`]);
    }

    // Alle entfernen
    for (let i = 0; i < 100; i++) {
      index.removeFile(`/file${i}.bpmn`);
    }

    // Index sollte komplett leer sein
    for (let i = 0; i < 100; i++) {
      const locations = index.getLocations(`proc${i}`);
      assert.equal(locations.length, 0,
        `proc${i} should have 0 locations after all files removed, got ${locations.length}`
      );
    }

    // Interne Maps sollten leer sein (kein Memory Leak)
    // Wir testen indirekt: neue Indizierung gibt korrekte Ergebnisse
    index.setFileIndex('/new.bpmn', ['proc0']);
    assert.equal(index.getLocations('proc0').length, 1,
      'proc0 should have 1 location after re-indexing'
    );
  });
});
