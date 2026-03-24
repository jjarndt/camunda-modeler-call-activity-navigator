/**
 * BUG-FINDER-NULL-016: NavigatorSearch.searchInKnownFiles - break-Logik
 * bei bereits bekanntem Prozess ueberspringt verbleibende Dateien falsch
 *
 * In navigator-search.mjs Zeile 113-116:
 *   const existingLocs = this.getLocations(processId);
 *   if (existingLocs.some(loc => pathsEqualIgnoreCase(loc.path, normalizedFilePath))) {
 *     break;
 *   }
 *
 * Wenn existingLocs eine Location enthaelt die zur AKTUELLEN Datei passt,
 * wird die ganze Schleife beendet (break). Das bedeutet: wenn die Datei
 * bereits im Index ist und der Prozess in dieser Datei gefunden wurde,
 * stoppen wir die Suche.
 *
 * ABER: was wenn der Prozess bereits in einer ANDEREN Datei indexed ist
 * und wir jetzt eine weitere Datei suchen? existingLocs koennte eine
 * Location enthalten die NICHT zur normalizedFilePath passt - dann wird
 * nicht gebreakt. Das ist korrekt.
 *
 * Echter neuer Verdacht: getCalledProcessId wenn element.businessObject
 * ein Proxy ist, der Exceptions wirft - das wird von Bug 012 abgedeckt.
 *
 * Echter neuer Verdacht: waitForFileDiscovery mit einem listeners-Array
 * das durch Mutation waehrend der Ausfuehrung veraendert wird.
 *
 * waitForFileDiscovery() pusht onEvent in listeners und der Aufrufer
 * koennte listeners leer machen. Das wuerde dazu fuehren dass
 * removeListener() nichts tut (kein Index gefunden).
 * Kein Crash, aber vielleicht ein Memory-Leak?
 *
 * ECHTER NEUER BUG: getCalledProcessId wenn element selbst ein Proxy ist
 * der beim Zugriff auf .businessObject eine Exception wirft.
 *
 * In util.mjs Zeile 24:
 *   const businessObject = element.businessObject || element;
 * Wenn element.businessObject wirft, propagiert die Exception.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getCalledProcessId } from '../client/bpmn-extension/util.mjs';

describe('BUG-FINDER-NULL-016: getCalledProcessId mit Exception-werfendem businessObject-Getter', () => {
  it('crasht nicht wenn element.businessObject ein Getter ist der Exception wirft', () => {
    const element = Object.defineProperty({}, 'businessObject', {
      get() { throw new Error('businessObject getter crashed!'); },
      enumerable: true
    });

    assert.doesNotThrow(
      () => getCalledProcessId(element),
      'getCalledProcessId muss Exception aus businessObject-Getter abfangen'
    );
  });
});
