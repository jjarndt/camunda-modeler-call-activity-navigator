/**
 * BUG-FINDER-NULL-015: isNewerVersion mit pre-release Versionen und Suffix-Vergleich
 *
 * In update-check.mjs, extractPreRelease() Zeile 23-28:
 *   function extractPreRelease(version) {
 *     if (!version || typeof version !== 'string') return '';
 *     const withoutV = version.replace(/^v/i, '');
 *     const dashIdx = withoutV.indexOf('-');
 *     return dashIdx >= 0 ? withoutV.slice(dashIdx + 1).replace(/\+.*$/, '') : '';
 *   }
 *
 * Und cleanVersion() Zeile 12-15:
 *   function cleanVersion(version) {
 *     if (!version || typeof version !== 'string') return '';
 *     return version.replace(/^v/i, '').replace(/[-+].*$/, '');
 *   }
 *
 * isNewerVersion() Zeile 65-69:
 *   if (hasPreRelease(current) && hasPreRelease(latest)) {
 *     const cSuffix = extractPreRelease(current);
 *     const lSuffix = extractPreRelease(latest);
 *     return lSuffix > cSuffix;
 *   }
 *
 * Wenn current = '1.0.0-' (leerer Pre-release Suffix nach dash):
 * hasPreRelease('1.0.0-') => /-/.test('1.0.0-') => true
 * extractPreRelease('1.0.0-') => '' (nichts nach dash)
 * cSuffix = '', lSuffix = 'alpha' => 'alpha' > '' => true
 *
 * Wenn current = '1.0.0--' (double dash):
 * extractPreRelease => '-' (nach dem ersten dash)
 * Das koennte seltsames Verhalten zeigen aber kein Crash.
 *
 * Echter neuer Verdacht: getCalledProcessId() wenn calledElement ein
 * String ist der nur aus Whitespace besteht: '   '.trim() === '' => falsy => null
 * Das ist korrekt!
 *
 * Echter neuer Verdacht: was wenn extractProcessIds() mit einem extrem grossen
 * Dokument aufgerufen wird das viele Process-Tags hat?
 * MAX_SLOW_SCAN = 5000 sollte diesen Fall begrenzen.
 *
 * ECHTER BUG: bpmn-parser.mjs, isInsideAttributeValue() Zeile 81-91
 * wird mit matchIndex aufgerufen. Wenn der Process-Tag direkt am Anfang
 * des Strings ist (matchIndex = 0), dann iteriert die Schleife von -1 abwaerts:
 *   for (let i = matchIndex - 1; i >= 0; i--)
 * i = -1 => Schleife wird NICHT ausgefuehrt (i >= 0 ist false)
 * return inSingleQuote || inDoubleQuote => false || false => false
 * Korrekt!
 *
 * ECHTER BUG: ProcessIndex.setFileIndex - filePath normalisiert zu ''
 * Wenn normalizePath() '' zurueckgibt (z.B. bei '..'),
 * Zeile 21: if (!filePath || !filePath.trim()) return;
 * normalizePath('..', '/') gibt '.' zurueck, nicht ''.
 * normalizePath('.', '/') gibt '.' zurueck.
 * '.' ist truthy und '.' .trim() ist '.'. Also wird '.' als Key benutzt!
 *
 * Test: setFileIndex mit '..' und '.'
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ProcessIndex } from '../client/process-index.mjs';

describe('BUG-FINDER-NULL-015: ProcessIndex.setFileIndex mit relativen Pfaden', () => {
  it('setFileIndex mit "." Pfad sollte keinen Eintrag erstellen', () => {
    const index = new ProcessIndex();
    // '.' wird als normalisierter Pfad von '..' oder '.' akzeptiert
    // Aber '.' ist kein gueltiger absoluter Dateipfad
    index.setFileIndex('.', ['myProcess']);

    // isIndexed('.') sollte nicht true sein wenn '.' kein gueltiger Pfad ist
    // normalizePath('.', '/') => '.'
    // _processesByFile.has('.') => should be false or the behavior is well-defined
    const locations = index.getLocations('myProcess');

    // Wenn '.' als Pfad akzeptiert wird, ist das ein semantischer Bug:
    // ein Prozess wuerde im Index als '.' Pfad gespeichert, was zu
    // falschen Matches fuehren koennte
    if (locations.length > 0) {
      assert.notEqual(locations[0].path, '.',
        'Pfad "." sollte nicht als gueltiger Prozess-Dateipfad im Index gespeichert werden');
    }
  });

  it('setFileIndex gibt keinen Eintrag fuer leeren normalisierten Pfad', () => {
    const index = new ProcessIndex();
    // normalizePath('', '/') => '' => soll geblockt werden
    index.setFileIndex('', ['myProcess']);
    const locations = index.getLocations('myProcess');
    assert.deepStrictEqual(locations, [],
      'Leerer Pfad darf nicht zu Eintraegen im Index fuehren');
  });
});
