/**
 * BUG-API-021: findBestMatch berechnet falsche Proximity-Scores bei
 * unterschiedlicher Gross/Kleinschreibung in Pfaden.
 *
 * commonPrefixLength vergleicht Pfad-Segmente case-sensitiv.
 * Auf Windows sind "C:" und "c:" dasselbe Laufwerk, aber der Vergleich
 * ergibt Score 0 statt des korrekten Werts. Das fuehrt dazu, dass
 * findBestMatch eine weiter entfernte Datei bevorzugt statt einer naeher
 * liegenden Datei mit anderem Case im Pfad.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { NavigatorSearch } from '../client/navigator-search.mjs';
import { ProcessIndex } from '../client/process-index.mjs';

describe('BUG-API-021: findBestMatch case-sensitive Proximity-Berechnung', () => {

  it('bevorzugt naehere Datei auch bei unterschiedlichem Case im Drive-Letter', () => {
    const index = new ProcessIndex();
    const search = new NavigatorSearch({
      fileSystem: { readFile: async () => ({ contents: '' }) },
      index
    });

    // Location A: gleicher Ordner, aber "c:" statt "C:"
    const locationNear = { path: 'c:/projects/myapp/src/near.bpmn' };
    // Location B: komplett anderes Verzeichnis, aber gleicher Case
    const locationFar = { path: 'C:/other/far.bpmn' };

    // currentFilePath mit "C:" (Grossbuchstabe)
    const currentFilePath = 'C:/projects/myapp/src/current.bpmn';

    const best = search.findBestMatch(
      [locationFar, locationNear],
      currentFilePath
    );

    // locationNear ist naeher (gleicher Ordner), sollte bevorzugt werden
    assert.strictEqual(best.path, locationNear.path,
      'findBestMatch muss die naehere Datei waehlen, auch wenn der Drive-Letter ' +
      'unterschiedlichen Case hat. Stattdessen wird die weiter entfernte Datei gewaehlt ' +
      'weil commonPrefixLength "C:" !== "c:" ergibt (Score 0).');
  });

  it('berechnet Score 0 fuer identische Pfade mit verschiedenem Case', () => {
    const index = new ProcessIndex();
    const search = new NavigatorSearch({
      fileSystem: { readFile: async () => ({ contents: '' }) },
      index
    });

    // Beide Locations haben identischen Pfad-Inhalt, nur Case unterschiedlich
    const locationSameDir = { path: 'c:/users/dev/project/file.bpmn' };
    const locationOtherDir = { path: 'C:/tmp/other.bpmn' };

    const currentFilePath = 'C:/Users/Dev/Project/current.bpmn';

    const best = search.findBestMatch(
      [locationOtherDir, locationSameDir],
      currentFilePath
    );

    // locationSameDir hat 4 gemeinsame Segmente (case-insensitiv),
    // aber commonPrefixLength sieht 0 weil "C:" !== "c:"
    assert.strictEqual(best.path, locationSameDir.path,
      'Pfade mit gleichem Inhalt aber verschiedenem Case muessen als nahe erkannt werden');
  });
});
