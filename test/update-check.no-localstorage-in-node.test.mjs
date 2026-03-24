/**
 * BUG-FINDER-NULL-009: update-check.mjs - localStorage ist in Node.js nicht definiert
 *
 * In update-check.mjs Zeile 76:
 *   const lastCheck = localStorage.getItem(THROTTLE_KEY);
 *
 * localStorage ist ein Browser-API. In Node.js-Umgebungen (Tests) ist
 * localStorage NICHT definiert. Der Zugriff auf localStorage wuerde einen
 * ReferenceError werfen.
 *
 * Da checkForUpdate() von einem try/catch umgeben ist (Zeile 101-103),
 * wird der ReferenceError abgefangen und als NO_UPDATE zurueckgegeben.
 * Das bedeutet: checkForUpdate() faengt den ReferenceError KORREKT ab
 * und gibt NO_UPDATE zurueck.
 *
 * ABER: Das Verhalten ist nicht korrekt dokumentiert und es ist kein
 * expliziter Guard fuer die localStorage-Nicht-Existenz vorhanden.
 * Wenn der outer try/catch aus irgendeinem Grund entfernt wird, crasht es.
 *
 * Echter Test: checkForUpdate() mit fehlenden localStorage
 * Sollte ohne Crash ausführbar sein und NO_UPDATE zurueckgeben.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { checkForUpdate } from '../client/update-check.mjs';

describe('BUG-FINDER-NULL-009: checkForUpdate ohne Browser-APIs (Node.js)', () => {
  it('checkForUpdate gibt NO_UPDATE zurueck wenn localStorage nicht verfuegbar ist', async () => {
    // In Node.js ist localStorage nicht definiert
    // Der outer try/catch sollte den ReferenceError abfangen
    const result = await checkForUpdate('1.0.0');

    // Sollte { available: false } zurueckgeben (NO_UPDATE) statt zu crashen
    assert.deepStrictEqual(result, { available: false },
      'checkForUpdate muss { available: false } zurueckgeben wenn localStorage fehlt');
  });
});
