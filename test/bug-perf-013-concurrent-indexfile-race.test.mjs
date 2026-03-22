/**
 * bug-perf-013: indexFile() wird bei parallelen searchInKnownFiles-Aufrufen
 *               fuer dieselbe Datei mehrfach aufgerufen (Race Condition)
 *
 * navigator-search.mjs searchInKnownFiles() Zeilen 76-79:
 *
 *   for (const filePath of candidates) {
 *     if (!this.isFileIndexed(filePath)) {    // <-- beide Aufrufe sehen false
 *       await this.indexFile(filePath);        // <-- beide warten auf await
 *     }
 *     ...
 *   }
 *
 * Das Problem: Wenn zwei searchInKnownFiles-Aufrufe gleichzeitig (Promise.all)
 * gestartet werden, pruefen beide isFileIndexed() BEVOR einer von beiden
 * indexFile() abgeschlossen hat. Da isFileIndexed() false zurueck gibt,
 * rufen BEIDE indexFile() auf und lesen die Datei doppelt (oder N-fach).
 *
 * Die await-Anweisung gibt Kontrolle an den Event-Loop ab, sodass der zweite
 * Aufruf fortfahren kann, bevor der erste den Index befuellt hat.
 *
 * Szenario: N parallele searchInKnownFiles-Aufrufe fuer denselben processId.
 * Jeder sieht isFileIndexed=false, jeder ruft readFile() auf -> N I/O-Operationen
 * statt einer.
 *
 * Erwartet: 1 readFile()-Aufruf (erste Suche indexiert, alle weiteren ueberspringen)
 * Tatsaechlich: N readFile()-Aufrufe (jede parallele Suche liest eigenstaendig)
 *
 * Fix: In-flight-Promises cachen (z.B. Map<filePath, Promise>) damit
 * parallele Aufrufe auf dasselbe Promise warten statt neue I/O zu starten.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NavigatorSearch } from '../client/navigator-search.mjs';
import { ProcessIndex } from '../client/process-index.mjs';

describe('BUG-PERF-013: indexFile() race condition bei parallelen searchInKnownFiles-Aufrufen', () => {

  it('liest dieselbe Datei N-mal wenn N parallele Suchen gleichzeitig starten', async () => {
    const N = 5;
    let readCount = 0;

    const index = new ProcessIndex();
    const mockFS = {
      readFile: async (path) => {
        readCount++;
        // Simuliere echte async I/O: gibt Kontrolle an Event-Loop ab
        // damit parallele Aufrufe interleaven koennen
        await new Promise(r => setTimeout(r, 1));
        return { contents: '<bpmn:process id="race-proc" />' };
      }
    };

    const search = new NavigatorSearch({ fileSystem: mockFS, index });
    const knownFiles = ['/proj/shared-file.bpmn'];

    // N parallele Suchen desselben processId in derselben Datei
    const promises = Array.from({ length: N }, (_, i) =>
      search.searchInKnownFiles('race-proc', `/proj/current-${i}.bpmn`, knownFiles)
    );

    const results = await Promise.all(promises);

    // Alle Suchen sollten die Datei finden
    for (let i = 0; i < N; i++) {
      assert.equal(results[i], '/proj/shared-file.bpmn',
        `Search ${i} should find the file`);
    }

    // BUG: readFile wird N-mal aufgerufen statt einmal.
    // Jeder parallele Aufruf sieht isFileIndexed=false bevor der erste
    // indexFile() abgeschlossen hat, und liest die Datei erneut.
    assert.equal(
      readCount, 1,
      `Expected exactly 1 readFile() call (first search indexes, rest skip), ` +
      `but got ${readCount} calls. ` +
      `navigator-search.mjs indexFile() has a race condition: ` +
      `${N} parallel searchInKnownFiles calls all see isFileIndexed=false ` +
      `before any of them completes indexFile(), so all ${N} call readFile(). ` +
      `Fix: cache in-flight indexFile promises to avoid duplicate I/O.`
    );
  });

  it('verdoppelt I/O wenn genau 2 Suchen parallel fuer dieselbe Datei starten', async () => {
    let readCount = 0;

    const index = new ProcessIndex();
    const mockFS = {
      readFile: async () => {
        readCount++;
        await new Promise(r => setTimeout(r, 5)); // Simulate I/O delay
        return { contents: '<bpmn:process id="concurrent-proc" />' };
      }
    };

    const search = new NavigatorSearch({ fileSystem: mockFS, index });
    const knownFiles = ['/proj/the-file.bpmn'];

    // Beide Suchen gleichzeitig, verschiedene current-Files damit
    // die Datei nicht durch self-navigation-Filter geblockt wird
    const [r1, r2] = await Promise.all([
      search.searchInKnownFiles('concurrent-proc', '/proj/fileA.bpmn', knownFiles),
      search.searchInKnownFiles('concurrent-proc', '/proj/fileB.bpmn', knownFiles),
    ]);

    assert.equal(r1, '/proj/the-file.bpmn', 'First search should find file');
    assert.equal(r2, '/proj/the-file.bpmn', 'Second search should find file');

    assert.equal(
      readCount, 1,
      `Expected 1 readFile call, but got ${readCount}. ` +
      `With 2 parallel searchInKnownFiles calls, the file is read twice ` +
      `because both check isFileIndexed() before either completes indexFile(). ` +
      `This is a race condition in navigator-search.mjs (lines 76-79).`
    );
  });
});
