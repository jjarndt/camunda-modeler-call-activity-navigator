import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { isNewerVersion } from '../client/update-check.mjs';

// ---------------------------------------------------------------------------
// BUG-DATA-006: isNewerVersion ignoriert Updates wenn das GitHub-Tag einen
// Grossbuchstaben 'V' als Prefix hat (z.B. "V1.2.3" statt "v1.2.3").
//
// cleanVersion() verwendet .replace(/^v/, '') - diese Regex ist case-sensitiv
// und matchet NICHT 'V'. Ebenso der Aufruf in checkForUpdate():
//   const latestVersion = (data.tag_name || '').replace(/^v/, '')
// Wenn tag_name = 'V1.2.3', dann latestVersion = 'V1.2.3'.
// cleanVersion('V1.2.3') = 'V1.2.3' (kein Ersetzen).
// isValidVersionStr('V1.2.3') = false (Regex /^\d+(\.\d+){0,2}$/ matchet nicht).
// Ergebnis: isNewerVersion gibt false zurueck -> kein Update angezeigt.
//
// Konsequenz: Wenn ein Repository-Betreiber Tags mit Grossbuchstaben-V anlegt
// (z.B. als GitHub-Konvention), werden Updates fuer alle Nutzer unsichtbar.
// ---------------------------------------------------------------------------
describe('BUG-DATA-006: isNewerVersion fails to detect update when latest has uppercase V prefix', () => {

  it('isNewerVersion with uppercase-V latest "V1.2.0" vs current "1.1.0" should return true', () => {
    // GitHub tag_name = 'V1.2.0' -> checkForUpdate macht .replace(/^v/, '') = 'V1.2.0'
    // cleanVersion('V1.2.0') = 'V1.2.0' (kein Einfluss, 'V' != 'v')
    // isValidVersionStr('V1.2.0') = false -> isNewerVersion gibt false zurueck
    // Erwartet: true (1.2.0 ist neuer als 1.1.0)
    const result = isNewerVersion('1.1.0', 'V1.2.0');
    assert.equal(
      result,
      true,
      `isNewerVersion('1.1.0', 'V1.2.0') should be true (V1.2.0 > 1.1.0), but got ${result}. ` +
      `cleanVersion does not strip uppercase 'V' prefix.`
    );
  });

  it('isNewerVersion with uppercase-V current "V1.1.0" vs latest "1.2.0" should return true', () => {
    // Wenn der Nutzer selbst eine Version mit grossem V hat
    const result = isNewerVersion('V1.1.0', '1.2.0');
    assert.equal(
      result,
      true,
      `isNewerVersion('V1.1.0', '1.2.0') should be true, but got ${result}. ` +
      `cleanVersion does not handle uppercase 'V' prefix.`
    );
  });
});
