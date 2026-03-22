import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { isNewerVersion } from '../client/update-check.mjs';

// ---------------------------------------------------------------------------
// BUG-DATA-004: isNewerVersion – leerer String zwischen Punkten wird als 0
// behandelt, statt als ungueltige Version abgelehnt zu werden.
//
// isNewerVersion('1..0', '1.1.0'):
//   currentStr = '1..0' (stripPreRelease aendert nichts)
//   currentParts = ['1','','0'].map(Number) = [1, 0, 0]
//   Number('') = 0, isNaN(0) = false -> keine Ablehnung
//   latestParts = [1, 1, 0]
//   Vergleich: 1>1 nein, 1<1 nein -> 1>0 ja -> return true
//
// Das bedeutet '1..0' wird als '1.0.0' behandelt und nicht abgelehnt.
// Das ist eine falsche Datenkonvertierung: ein ungueltige Versionsstring
// wird akzeptiert und mit dem falschen Wert verglichen.
//
// Konsequenz: wenn ein Server eine fehlformatierte Version liefert wie '2..0',
// wird sie als '2.0.0' interpretiert und moeglicherweise korrekt verglichen -
// was zufaellig zum richtigen Ergebnis fuehrt, aber durch fehlerhafte Logik.
// ---------------------------------------------------------------------------
describe('BUG-DATA-004: isNewerVersion accepts malformed version with empty segment', () => {
  it('version string with empty segment "1..0" should be rejected (not treated as 1.0.0)', () => {
    // '1..0' ist keine gueltige Versionsnummer. Number('') = 0 statt NaN,
    // daher wird die isNaN-Pruefung umgangen.
    // Erwartetes Verhalten: false (Ablehnung bei ungueltigem Format)
    // Tatsaechliches Verhalten: wird als '1.0.0' behandelt
    const result = isNewerVersion('1..0', '1.1.0');

    // Korrekt waere: false (ungueltige Version wird abgelehnt)
    // Tatsaechlich: true (wird faelschlicherweise als 1.0.0 < 1.1.0 verglichen)
    assert.equal(result, false,
      `isNewerVersion('1..0', '1.1.0') should return false (malformed version), ` +
      `but got ${result}. Number('') = ${Number('')} is not NaN, bypassing the guard.`
    );
  });

  it('version string with only dots "..." should be rejected', () => {
    const result = isNewerVersion('...', '1.0.0');
    // stripPreRelease('...') = '...'
    // split('.') = ['','','',''] -> Number('') = 0 for all -> [0,0,0,0]
    // isNaN(0) = false -> keine Ablehnung
    // latestParts = [1,0,0]
    // 1>0 -> return true
    // Das ist falsch: '...' ist keine gueltige Version
    assert.equal(result, false,
      `isNewerVersion('...', '1.0.0') should return false (malformed version), got ${result}`
    );
  });
});
