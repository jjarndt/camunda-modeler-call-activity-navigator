/**
 * BUG-FINDER-NULL-004: getLocations mit number/boolean processId
 *
 * In process-index.mjs Zeile 14-16:
 *   const key = (processId != null && typeof processId !== 'string') ? String(processId) :
 *     (typeof processId === 'string' ? processId.trim() : processId);
 *   return (this._locationsByProcess.get(key) || []).map(loc => ({ ...loc }));
 *
 * Wenn processId === null (prueft processId != null --> false), dann wird
 * der zweite Branch ausgewertet: typeof null === 'object', nicht 'string',
 * also wird processId (also null) direkt als key verwendet.
 * Map.get(null) ist valide in JavaScript und gibt undefined zurueck.
 * (undefined || []).map() ist ok.
 *
 * Aber wenn processId === undefined:
 * - processId != null --> true (da undefined != null ist false in JS!)
 * Achtung: undefined != null ist FALSE in JavaScript! (loose equality)
 * Also: processId != null => undefined != null => false
 * Dann: typeof undefined !== 'string' => ja... warte:
 *   (processId != null && ...) => (false && ...) => false
 *   (typeof processId === 'string') => false
 *   sonst: processId (also undefined)
 * Map.get(undefined) ist valide. Kein Crash.
 *
 * Ueberpruefen wir: setFileIndex mit einem processId '' (leerer String nach trim)
 * Wenn processIds = ['  '] (nur Leerzeichen), wird .trim() => '' => filter(Boolean) entfernt es.
 * Das ist korrekt.
 *
 * Pruefen wir jedoch: normalizePath mit einem sehr speziellen Input - z.B. nur Backslashes
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePath } from '../client/path-utils.mjs';

describe('BUG-FINDER-NULL-004: normalizePath mit Sonderzeichen-Inputs', () => {
  it('normalizePath mit NUL-Byte im Pfad gibt sicheres Ergebnis', () => {
    // NUL-Bytes koennen Pfad-Injection verursachen
    const input = '/project/\x00etc/passwd';
    let result;
    assert.doesNotThrow(() => {
      result = normalizePath(input, '/');
    }, 'normalizePath muss NUL-Bytes verarbeiten ohne zu crashen');
    // Das Ergebnis sollte kein NUL-Byte enthalten
    if (result) {
      assert.ok(!result.includes('\x00'), 'normalizePath darf keine NUL-Bytes im Ergebnis haben');
    }
  });

  it('normalizePath mit Kontrollzeichen im Pfad gibt sicheres Ergebnis', () => {
    const input = '/project/\x01\x02\x1ffile.bpmn';
    let result;
    assert.doesNotThrow(() => {
      result = normalizePath(input, '/');
    });
    if (result) {
      // Kontrollzeichen sollten entfernt werden
      assert.ok(!/[\x00-\x1f\x7f]/.test(result), 'Ergebnis sollte keine Kontrollzeichen enthalten');
    }
  });

  it('normalizePath mit sehr langem Pfad-Segment crasht nicht', () => {
    const longSegment = 'a'.repeat(100000);
    const input = `/project/${longSegment}/file.bpmn`;
    assert.doesNotThrow(() => {
      normalizePath(input, '/');
    });
  });
});
