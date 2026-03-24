import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { isNewerVersion } from '../client/update-check.mjs';

// ---------------------------------------------------------------------------
// BUG-FINDER-DATA-001: isNewerVersion - Build-Metadata mit Bindestrich wird
// faelschlicherweise als Pre-Release klassifiziert
//
// hasPreRelease(version) prueft nur ob ein '-' im String vorkommt:
//   const withoutV = version.replace(/^v/i, '');
//   return /-/.test(withoutV);
//
// Nach SemVer-Spec hat Build-Metadata die Form '+<identifier>', z.B.:
//   1.0.0+build-123
//   1.0.0+20231201-release
//   1.0.0+git-abcdef
//
// Wenn build metadata einen Bindestrich enthaelt, liefert /-/.test() true,
// obwohl es sich um Build-Metadata handelt und KEINE Pre-Release-Version ist.
//
// Konsequenz: isNewerVersion('1.0.0+build-123', '1.0.0') gibt true zurueck,
// weil das Plugin glaubt '1.0.0+build-123' sei eine Pre-Release-Version und
// '1.0.0' die neuere stabile Version. Das fuehrt zu falschen Update-Meldungen.
// ---------------------------------------------------------------------------
describe('BUG-FINDER-DATA-001: hasPreRelease misclassifies build metadata with dash as pre-release', () => {

  it('isNewerVersion("1.0.0+build-123", "1.0.0") should return false - same version, only build metadata differs', () => {
    // Build-Metadata veraendert die Version nicht (SemVer-Spec Abschnitt 10)
    // Erwartet: false - keine neue Version verfuegbar
    // Tatsaechlich: hasPreRelease('1.0.0+build-123') = true (dash im build-tag erkannt)
    //              -> isNewerVersion behandelt current als Pre-Release < stable
    //              -> gibt true zurueck (falsch!)
    const result = isNewerVersion('1.0.0+build-123', '1.0.0');
    assert.equal(
      result,
      false,
      `isNewerVersion('1.0.0+build-123', '1.0.0') should be false (same version, ` +
      `build metadata does not affect version precedence), but got ${result}. ` +
      `hasPreRelease() uses /-/.test() which matches dashes in build metadata.`
    );
  });

  it('isNewerVersion("1.0.0+20231201-release", "1.0.0") should return false', () => {
    // Date-based build metadata with dash after date
    const result = isNewerVersion('1.0.0+20231201-release', '1.0.0');
    assert.equal(
      result,
      false,
      `isNewerVersion('1.0.0+20231201-release', '1.0.0') should be false, but got ${result}. ` +
      `Build metadata '20231201-release' contains a dash which triggers the pre-release check.`
    );
  });

  it('isNewerVersion("1.0.0+git-abcdef", "1.0.0") should return false', () => {
    // Git commit hash build metadata with dash prefix
    const result = isNewerVersion('1.0.0+git-abcdef', '1.0.0');
    assert.equal(
      result,
      false,
      `isNewerVersion('1.0.0+git-abcdef', '1.0.0') should be false, but got ${result}. ` +
      `Git hash build metadata 'git-abcdef' contains a dash, incorrectly classified as pre-release.`
    );
  });

  it('isNewerVersion("1.0.0+build", "1.0.0") should return false - no dash in metadata, works correctly', () => {
    // Kontroll-Test: Build-Metadata ohne Bindestrich funktioniert korrekt
    const result = isNewerVersion('1.0.0+build', '1.0.0');
    assert.equal(
      result,
      false,
      `isNewerVersion('1.0.0+build', '1.0.0') should be false, got ${result}. ` +
      `Build metadata without dash works correctly as control test.`
    );
  });

});
