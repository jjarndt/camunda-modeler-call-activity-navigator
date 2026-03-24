import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { isNewerVersion } from '../client/update-check.mjs';

// ---------------------------------------------------------------------------
// BUG-FINDER-DATA-002: isNewerVersion - lexikographischer Vergleich von
// Pre-Release-Suffixen gibt falsche Ergebnisse fuer numerische Komponenten
//
// Wenn beide Versionen Pre-Release-Tags haben, wird der Suffix lexikografisch
// verglichen (lSuffix > cSuffix). Das ist fuer rein alphabetische Suffixe
// korrekt ('beta' > 'alpha'), versagt aber wenn numerische Komponenten
// verglichen werden die unterschiedlich lang sind:
//
//   extractPreRelease('1.0.0-rc.2')  = 'rc.2'
//   extractPreRelease('1.0.0-rc.10') = 'rc.10'
//   'rc.10' > 'rc.2' = false  (lexikografisch: '1' < '2' beim Index 3)
//
// Nach SemVer-Spec (Abschnitt 11.4.1) werden numerische Pre-Release-
// Bezeichner numerisch verglichen, also 10 > 2.
//
// Konsequenz: Updates von rc.2 auf rc.10 werden nicht erkannt.
// ---------------------------------------------------------------------------
describe('BUG-FINDER-DATA-002: isNewerVersion lexicographic pre-release comparison fails for numeric components', () => {

  it('isNewerVersion("1.0.0-rc.2", "1.0.0-rc.10") should return true - rc.10 is newer than rc.2', () => {
    // rc.10 > rc.2 numerisch, aber 'rc.10' < 'rc.2' lexikografisch
    // Erwartet: true (rc.10 ist neuer)
    // Tatsaechlich: 'rc.10' > 'rc.2' = false -> gibt false zurueck
    const result = isNewerVersion('1.0.0-rc.2', '1.0.0-rc.10');
    assert.equal(
      result,
      true,
      `isNewerVersion('1.0.0-rc.2', '1.0.0-rc.10') should be true (rc.10 > rc.2 numerically), ` +
      `but got ${result}. The lexicographic comparison 'rc.10' > 'rc.2' is false ` +
      `because '1' < '2' at character position 3.`
    );
  });

  it('isNewerVersion("1.0.0-alpha.2", "1.0.0-alpha.10") should return true - alpha.10 is newer', () => {
    const result = isNewerVersion('1.0.0-alpha.2', '1.0.0-alpha.10');
    assert.equal(
      result,
      true,
      `isNewerVersion('1.0.0-alpha.2', '1.0.0-alpha.10') should be true, but got ${result}. ` +
      `'alpha.10' > 'alpha.2' = false lexicographically ('1' < '2').`
    );
  });

  it('isNewerVersion("2.0.0-beta.9", "2.0.0-beta.10") should return true - beta.10 is newer', () => {
    // 9 vs 10: 'beta.10' > 'beta.9' = false lexikografisch ('1' < '9')
    const result = isNewerVersion('2.0.0-beta.9', '2.0.0-beta.10');
    assert.equal(
      result,
      true,
      `isNewerVersion('2.0.0-beta.9', '2.0.0-beta.10') should be true, but got ${result}. ` +
      `'beta.10' > 'beta.9' = false lexicographically ('1' < '9' at index 5).`
    );
  });

});
