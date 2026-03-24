import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { normalizePath } from '../client/path-utils.mjs';

describe('Bug API-014: normalizePath verliert Windows UNC-Root bei preferredSep="/"', () => {

  it('UNC-Pfad \\\\server\\share\\file.txt wird korrekt normalisiert', () => {
    // Auf Windows koennte ein UNC-Pfad vorkommen. Wenn er mit preferredSep='/'
    // normalisiert wird (wie in ProcessIndex.setFileIndex), geht der UNC-Root verloren.
    const result = normalizePath('\\\\server\\share\\file.txt', '/');

    // Das Ergebnis muss den UNC-Root beibehalten.
    // Mindestens muss 'server' im Pfad enthalten sein als absoluter Pfad.
    assert.ok(
      result.includes('server') && result.includes('share') && result.includes('file.txt'),
      'Alle Pfad-Teile muessen enthalten sein'
    );

    // Der kritische Bug: Der Pfad wird relativ statt absolut
    assert.ok(
      result.startsWith('/') || result.startsWith('\\') || result.includes('//'),
      `UNC-Pfad muss absolut bleiben, ist aber: "${result}"`
    );
  });

  it('UNC-Pfad wird mit nativem Separator korrekt normalisiert', () => {
    const result = normalizePath('\\\\server\\share\\dir\\file.txt', '\\');

    // Mit nativem Separator sollte der UNC-Root erhalten bleiben
    assert.ok(
      result.startsWith('\\\\'),
      `UNC-Pfad muss mit \\\\ beginnen, ist aber: "${result}"`
    );
  });
});
