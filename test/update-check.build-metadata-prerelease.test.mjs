import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { isNewerVersion } from '../client/update-check.mjs';

// ---------------------------------------------------------------------------
// BUG-DATA-005: isNewerVersion behandelt Build-Metadata (+build) als Pre-Release
//
// hasPreRelease() prueft mit /[-+]/.test(version) -- d.h. sowohl '-' (Pre-Release
// nach SemVer) als auch '+' (Build-Metadata nach SemVer) loesen ein true aus.
//
// Nach SemVer-Spezifikation (semver.org §10) hat Build-Metadata KEINEN Einfluss
// auf die Versions-Praezedenz: "1.0.0+build.1" == "1.0.0" (gleiche Praezedenz).
// Pre-Release hingegen hat niedrigere Praezedenz: "1.0.0-beta" < "1.0.0".
//
// Konsequenz: isNewerVersion('1.0.0+build.123', '1.0.0') gibt true zurueck,
// weil die Logik annimmt "current hat Pre-Release, latest ist stable -> update
// verfuegbar". In Wahrheit sind beide Versionen aequivalent -- kein Update noetig.
//
// Konkret: Ein Nutzer mit Version "1.0.0+build.123" wuerde faelschlicherweise
// einen Update-Hinweis auf "1.0.0" erhalten, obwohl er bereits die gleiche
// Version (nur mit Build-Metadaten-Tag) verwendet.
// ---------------------------------------------------------------------------
describe('BUG-DATA-005: isNewerVersion treats build-metadata (+) as pre-release', () => {
  it('1.0.0+build.123 vs 1.0.0 must NOT trigger an update (build metadata is not pre-release)', () => {
    // Nach SemVer hat 1.0.0+build.123 dieselbe Praezedenz wie 1.0.0.
    // isNewerVersion(current='1.0.0+build.123', latest='1.0.0') sollte false liefern.
    // Tatsaechlich: hasPreRelease('1.0.0+build.123') = true, hasPreRelease('1.0.0') = false
    // => die Logik folgert "current ist aelter" und gibt true zurueck (falscher Update-Alarm).
    const result = isNewerVersion('1.0.0+build.123', '1.0.0');
    assert.equal(
      result,
      false,
      `isNewerVersion('1.0.0+build.123', '1.0.0') should be false (build metadata ` +
      `does not lower precedence per SemVer), but got ${result}`
    );
  });

  it('1.0.0+20240101 vs 1.0.0 must NOT trigger an update', () => {
    const result = isNewerVersion('1.0.0+20240101', '1.0.0');
    assert.equal(
      result,
      false,
      `isNewerVersion('1.0.0+20240101', '1.0.0') should be false, but got ${result}`
    );
  });
});
