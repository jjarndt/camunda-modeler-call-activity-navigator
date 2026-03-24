/**
 * BUG-FINDER-NULL-014: NavigatorSearch.indexFile - Promise-Deduplication Bug
 *
 * In navigator-search.mjs, indexFile() Zeile 62-71:
 *   const existing = this._indexingPromises.get(normalized);
 *   if (existing) return existing;
 *   const promise = this._doIndexFile(filePath);
 *   this._indexingPromises.set(normalized, promise);
 *   try {
 *     await promise;
 *   } finally {
 *     this._indexingPromises.delete(normalized);
 *   }
 *
 * BUG: wenn `existing` vorhanden ist und `return existing` aufgerufen wird,
 * dann wartet der Aufrufer auf das existierende Promise. ABER: der erste
 * Aufrufer hat das Promise in `_indexingPromises` gespeichert UND awaitet es.
 * Nach dem `await` loescht er es in `finally`.
 *
 * Das Sequence-Diagramm:
 * 1. Aufrufer A: normalized='x', existing=undefined, promise = _doIndexFile()
 *    _indexingPromises.set('x', promise)
 *    await promise ...
 * 2. Aufrufer B (waehrend A noch wartet): normalized='x', existing=promise
 *    return existing (=> return promise)
 *    B wartet nun auch auf promise
 * 3. promise wird resolved
 * 4. A's finally: _indexingPromises.delete('x')
 * 5. B's return existing (promise) resolved -> korrekt
 *
 * Das scheint korrekt zu sein.
 *
 * Echter Verdacht: was wenn _doIndexFile() ein TypeError wirft und
 * ein zweiter Aufrufer (der `return existing` gemacht hat) den TypeError bekommt?
 *
 * Wenn _doIndexFile throws TypeError:
 * - promise wird rejected mit TypeError
 * - A's await throws TypeError, die in A's catch-Zeile (Zeile 67-70) nicht gefangen wird
 *   (weil indexFile kein catch hat, nur finally)
 * - A propagiert TypeError nach oben
 * - B (der `return existing` hatte) bekommt AUCH den rejected promise - TypeError
 * - B propagiert TypeError nach oben
 *
 * In searchInKnownFiles (Zeile 119): await this.indexFile(filePath)
 * Kein try/catch! TypeError propagiert.
 *
 * Das ist bereits Bug 001 bestaetigt. Jetzt teste ich einen anderen Verdacht:
 *
 * ProcessIndex - was wenn removeFile auf einem File aufgerufen wird das nicht
 * indiziert ist (kein Crash erwartet, aber was wenn die interne Set-Itration
 * das Set waehrend Iteration mutiert)?
 *
 * In removeFile() iteriert ueber processIds Set, loescht aber aus
 * _locationsByProcess und _processesByFile Map - nicht aus dem processIds Set.
 * Kein concurrent-modification Problem.
 *
 * Echter neuer Verdacht: NavigatorSearch.findBestMatch mit einem Locations-Array
 * das nur Locations mit path=undefined oder path=null enthaelt:
 * Zeile 140: const valid = locations.filter(loc => loc?.path);
 * Wenn alle paths falsy sind: valid = []
 * Zeile 141: if (!valid.length) return null;
 * => gibt null zurueck. Korrekt!
 *
 * ABER: was wenn locations=[{path: undefined}, {path: 'real/path'}]?
 * valid = [{path: 'real/path'}]
 * valid.length === 1 => return valid[0]
 * Korrekt!
 *
 * Neuer Verdacht: NavigatorSearch.searchInKnownFiles gibt findBestMatch auf
 * dem GEFILTERTEN locations-Array auf. Zeile 132:
 *   const match = this.findBestMatch(locations, normalizedCurrent);
 * locations ist bereits gefiltert (exkl. currentFilePath).
 * Das ist korrekt.
 *
 * ECHTER NEUER BUG: getCalledProcessId - was wenn calledElement (Camunda 7)
 * kein String ist sondern ein Objekt? Zeile 32:
 *   return calledElement && calledElement.trim ? calledElement.trim() : null;
 *
 * Die Pruefung ist `.trim` (Methode existiert), nicht `.trim()` (aufrufen).
 * Wenn calledElement ein Objekt { trim: true } ist:
 * calledElement && calledElement.trim => truthy => calledElement.trim() => TypeError!
 * calledElement.trim() wirft TypeError: calledElement.trim is not a function
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getCalledProcessId } from '../client/bpmn-extension/util.mjs';

describe('BUG-FINDER-NULL-014: getCalledProcessId mit calledElement als Objekt', () => {
  it('crasht nicht wenn calledElement ein Objekt mit trim-Property (nicht Funktion) ist', () => {
    const element = {
      businessObject: {
        calledElement: { trim: true, toString: () => 'MyProcess' }
      }
    };
    // calledElement && calledElement.trim => truthy
    // calledElement.trim() => TypeError: calledElement.trim is not a function
    assert.doesNotThrow(
      () => getCalledProcessId(element),
      'getCalledProcessId muss tolerieren wenn calledElement.trim keine Funktion ist'
    );
  });

  it('crasht nicht wenn calledElement eine Zahl ist', () => {
    // typeof 42 !== 'string', also wird safeGet das Zahl-Objekt zurueckgeben
    // calledElement = 42, calledElement.trim => undefined (Zahlen haben kein .trim)
    // calledElement && calledElement.trim => false => null
    const element = {
      businessObject: {
        calledElement: 42
      }
    };
    assert.doesNotThrow(
      () => getCalledProcessId(element),
      'getCalledProcessId muss Zahlen-calledElement tolerieren'
    );
    // Das Ergebnis sollte null sein (keine gueltige process ID)
    const result = getCalledProcessId(element);
    assert.strictEqual(result, null, 'Zahlen calledElement sollte null zurueckgeben');
  });
});
