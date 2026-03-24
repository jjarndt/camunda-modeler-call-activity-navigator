import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { isNewerVersion } from '../client/update-check.mjs';

describe('Bug API-011: isNewerVersion erkennt Stable-Release nicht als neuer als Pre-Release', () => {

  it('1.0.0 soll als neuer erkannt werden als 1.0.0-beta', () => {
    // Nutzer hat 1.0.0-beta installiert, 1.0.0 (stable) ist verfuegbar.
    // Das ist ein echtes Update. Aber stripPreRelease entfernt den Pre-Release-
    // Suffix und vergleicht dann 1.0.0 == 1.0.0 -> false.
    const result = isNewerVersion('1.0.0-beta', '1.0.0');
    assert.strictEqual(result, true, '1.0.0 ist neuer als 1.0.0-beta');
  });

  it('1.0.0 soll als neuer erkannt werden als 1.0.0-rc.1', () => {
    const result = isNewerVersion('1.0.0-rc.1', '1.0.0');
    assert.strictEqual(result, true, '1.0.0 ist neuer als 1.0.0-rc.1');
  });

  it('2.0.0-alpha soll als neuer erkannt werden als 1.9.0', () => {
    // Hier funktioniert es korrekt, weil die Major-Version unterschiedlich ist
    const result = isNewerVersion('1.9.0', '2.0.0-alpha');
    assert.strictEqual(result, true, '2.0.0-alpha ist neuer als 1.9.0');
  });
});
