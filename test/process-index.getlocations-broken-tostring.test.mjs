/**
 * BUG-FINDER-NULL-017: NavigatorSearch.getProcessIdsFromFile mit TypeError
 * und der Effekt auf den Aufrufer in index.js
 *
 * Bereits untersucht in Bug-005: getProcessIdsFromFile re-throws TypeError.
 *
 * Neuer Verdacht: bpmn-parser.mjs PROCESS_TAG_RE ist eine GLOBALE regex mit /g Flag.
 * In extractProcessIds() Zeile 138:
 *   PROCESS_TAG_RE.lastIndex = 0;
 * Das setzt lastIndex zurueck. Aber ist PROCESS_TAG_RE.lastIndex thread-safe?
 *
 * In JavaScript ist es single-threaded, aber wenn extractProcessIds() sich selbst
 * aufruft (theoretisch) oder wenn es concurrent aufgerufen wird (nicht moeglich
 * in single-thread JS), koennte es ein Problem sein.
 *
 * ECHTER BUG: was wenn extractProcessIds() mit einer sehr grossen Eingabe aufgerufen
 * wird die viele PROCESS_TAG_RE Matches hat? Das regex exec() laeuft in einer Schleife.
 * lastIndex wird korrekt zurueckgesetzt. Kein Bug.
 *
 * ECHTER BUG: bpmn-parser PROCESS_TAG_RE.lastIndex wird auf 0 gesetzt.
 * Wenn extractProcessIds REENTRANT aufgerufen wird (z.B. durch einen Fehler
 * in extractIdFromTag der dann extractProcessIds aufruft), koennte lastIndex
 * inkorrekt sein. Das ist theoretisch aber sehr unwahrscheinlich.
 *
 * ECHTER BUG: isNewerVersion() - was wenn version-Strings extrem lang sind?
 * cleanVersion() ruft .replace() auf - kein Absturz erwartet.
 *
 * ECHTER NEUER BUG: ProcessIndex.setFileIndex - was wenn normalizePath()
 * einen Pfad mit Leerzeichen-Anfang/-Ende zurueckgibt?
 * normalizePath trimmt den Input. Aber wenn der Input Leerzeichen INNERHALB
 * hat? Z.B. '/pro ject/file.bpmn' - bleibt als '/pro ject/file.bpmn'.
 * Das ist kein Bug.
 *
 * ECHTER NEUER BUG: NavigatorSearch - was wenn this._fileSystem.readFile()
 * keine Promise zurueckgibt (d.h. synchron einen Wert zurueckgibt)?
 *
 * In _doIndexFile() Zeile 76:
 *   const file = await this._fileSystem.readFile(filePath);
 * Wenn readFile synchron { contents: '...' } zurueckgibt, wird es durch
 * await automatisch in ein resolves Promise gewrapped. Kein Problem.
 *
 * ECHTER NEUER BUG: ProcessIndex.isIndexed('') (leerer String)
 * normalizePath('', '/') => '' => Map.has('') => false
 * Das ist korrekt.
 *
 * ECHTER ECHTER BUG: getCalledProcessId - Camunda 7 Fallback
 * Zeile 31-32:
 *   const calledElement = safeGet(businessObject, 'calledElement') || null;
 *   return calledElement && calledElement.trim ? calledElement.trim() : null;
 *
 * safeGet() gibt obj?.[prop] ?? null zurueck.
 * Wenn businessObject.calledElement ein Boolean (true) ist:
 * safeGet => true (nicht null) => calledElement = true
 * true && true.trim => true && undefined => false => return null
 * Das ist korrekt!
 *
 * Wenn businessObject.calledElement ein Array ist:
 * safeGet => [] => calledElement = [] (oder null fuer [] wegen ?? null?)
 * Warte: [] ?? null => [] (weil [] ist nicht null/undefined)
 * [] && [].trim => [] && undefined => false => null
 * Korrekt!
 *
 * ECHTER NEUER BUG: getCalledProcessId wenn calledElement.trim vorhanden ist
 * aber keine Funktion ist (z.B. { trim: "not-a-function" }):
 * calledElement.trim => "not-a-function" (truthy) => calledElement.trim() => TypeError
 * Das ist Bug 014 der bereits bestaetigt wurde.
 *
 * NOCH EIN BUG: isNewerVersion - was wenn version ein Objekt { toString: () => '1.0.0' } ist?
 * cleanVersion(obj): if (!version || ...) => obj ist truthy => typeof obj !== 'string' => true => return ''
 * isValidVersionStr('') => false => return false
 * Korrekt - kein Crash!
 *
 * ENDGUELTIG NEUER BUG: NavigatorSearch.searchInKnownFiles -
 * getLocations(processId) kann eine exception werfen wenn processId
 * etwas ist das String() nicht korrekt konvertieren kann (z.B. ein Objekt
 * mit defektem toString)?
 * String({toString() { throw new Error() }}) => wirft Error!
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ProcessIndex } from '../client/process-index.mjs';

describe('BUG-FINDER-NULL-017: ProcessIndex.getLocations mit defektem toString', () => {
  it('getLocations mit Objekt mit defektem toString() crasht', () => {
    const index = new ProcessIndex();
    const broken = {
      toString() { throw new Error('toString crashed!'); }
    };

    // typeof broken !== 'string' und broken != null
    // => String(broken) wirft Error
    assert.doesNotThrow(
      () => index.getLocations(broken),
      'getLocations muss Objekte mit defektem toString() tolerieren'
    );
  });
});
