import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { isNewerVersion } from '../client/update-check.mjs';
import { extractProcessIds } from '../client/bpmn-parser.mjs';
import { ProcessIndex } from '../client/process-index.mjs';

// ---------------------------------------------------------------------------
// BUG-DATA-NEW-001: isNewerVersion - zwei Pre-Release-Versionen mit gleichen
// Nummern werden nie als "neuer" erkannt.
//
// Scenario: current = '1.0.0-alpha', latest = '1.0.0-beta'
// cleanVersion entfernt den Pre-Release-Teil bei BEIDEN:
//   cleanVersion('1.0.0-alpha') = '1.0.0'
//   cleanVersion('1.0.0-beta')  = '1.0.0'
// Zahlen-Vergleich: gleich.
// hasPreRelease(current) = true, hasPreRelease(latest) = true
// Bedingung: if (true && !true) -> false -> kein Update
//
// Bug: Beta ist neuer als Alpha, aber die Funktion meldet KEIN Update.
// ---------------------------------------------------------------------------
describe('BUG-DATA-NEW-001: isNewerVersion - both pre-release, newer pre-release not detected', () => {

  it('1.0.0-beta vs 1.0.0-alpha: beta is newer but isNewerVersion returns false', () => {
    // current = 1.0.0-alpha, latest = 1.0.0-beta
    // Beide haben Pre-Release: die Logik "current pre-release, latest stable -> update"
    // greift nicht. Das Ergebnis ist false, obwohl beta > alpha.
    const result = isNewerVersion('1.0.0-alpha', '1.0.0-beta');
    assert.equal(
      result,
      true,
      `isNewerVersion('1.0.0-alpha', '1.0.0-beta') should be true (beta is newer than alpha), ` +
      `but got ${result}. When both are pre-release with equal version numbers, ` +
      `the pre-release suffix ordering is ignored entirely.`
    );
  });

  it('2.0.0-rc.1 vs 2.0.0-rc.2: rc.2 is newer but isNewerVersion returns false', () => {
    const result = isNewerVersion('2.0.0-rc.1', '2.0.0-rc.2');
    assert.equal(
      result,
      true,
      `isNewerVersion('2.0.0-rc.1', '2.0.0-rc.2') should be true (rc.2 > rc.1), ` +
      `but got ${result}. Pre-release suffix comparison is not implemented.`
    );
  });

});
