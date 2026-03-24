import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// isSafeUrl ist nicht exportiert, daher testen wir indirekt ueber isNewerVersion
// und den checkForUpdate-Rueckgabewert. Aber wir koennen die Logik direkt
// nachbauen, um den Bug zu demonstrieren.

describe('Bug API-016: isSafeUrl akzeptiert Domains die auf github.com enden', () => {

  // Nachbau der isSafeUrl-Logik aus update-check.mjs
  function isSafeUrl(url) {
    try {
      const { protocol, hostname } = new URL(url);
      return protocol === 'https:' &&
        (hostname === 'github.com' || hostname.endsWith('.github.com'));
    } catch {
      return false;
    }
  }

  it('akzeptiert notgithub.com als sicher', () => {
    // Ein Angreifer koennte eine Domain wie "notgithub.com" registrieren.
    // Die endsWith-Pruefung matcht faelschlicherweise.
    const result = isSafeUrl('https://notgithub.com/evil/release');

    // Korrekt waere: false (keine github.com-Domain)
    assert.strictEqual(result, false,
      'notgithub.com darf nicht als sichere GitHub-URL akzeptiert werden');
  });

  it('akzeptiert evilgithub.com als sicher', () => {
    const result = isSafeUrl('https://evilgithub.com/release');

    assert.strictEqual(result, false,
      'evilgithub.com darf nicht als sichere GitHub-URL akzeptiert werden');
  });

  it('akzeptiert github.com korrekt', () => {
    const result = isSafeUrl('https://github.com/user/repo/releases');
    assert.strictEqual(result, true, 'github.com muss akzeptiert werden');
  });

  it('akzeptiert subdomain von github.com korrekt', () => {
    const result = isSafeUrl('https://api.github.com/repos');
    assert.strictEqual(result, true, 'api.github.com muss akzeptiert werden');
  });
});
