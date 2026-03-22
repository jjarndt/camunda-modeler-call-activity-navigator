import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { normalizePath } from '../client/path-utils.mjs';

describe('Bug API-019: normalizePath macht relativen Windows-Pfad C:foo zu absolutem C:\\foo', () => {

  it('C:foo (relativ auf Laufwerk C:) wird faelschlicherweise zu C:\\foo (absolut)', () => {
    // In Windows ist 'C:foo' ein relativer Pfad bezogen auf das aktuelle
    // Verzeichnis des Laufwerks C:. 'C:\\foo' hingegen ist absolut.
    // normalizePath fuegt faelschlicherweise einen Separator nach dem Drive-Letter ein.
    const result = normalizePath('C:foo', '\\');

    // Das korrekte Ergebnis waere 'C:foo' (relativ beibehalten)
    // oder zumindest NICHT 'C:\\foo' (was ein anderer Pfad ist!)
    assert.notStrictEqual(result, 'C:\\foo',
      'C:foo darf nicht zu C:\\foo werden - das sind unterschiedliche Pfade in Windows');
  });

  it('C:\\foo (absolut) bleibt C:\\foo', () => {
    // Kontrolle: Absoluter Pfad bleibt korrekt
    const result = normalizePath('C:\\foo', '\\');
    assert.strictEqual(result, 'C:\\foo');
  });
});
