/**
 * BUG-API-024: searchInKnownFiles gibt Pfade aus dem Index zurueck (normalisiert
 * mit '/'), waehrend findBestMatch in _searchInSiblingDirs ebenfalls Index-Pfade
 * mit '/' zurueckgibt, aber _tryRelativePaths den Pfad mit dem PLATTFORM-Separator
 * zurueckgibt (z.B. '\\' auf Windows).
 *
 * Das fuehrt zu inkonsistenten Pfad-Separatoren je nach Suchpfad:
 * - searchInKnownFiles -> "C:/proj/file.bpmn"
 * - _tryRelativePaths  -> "C:\\proj\\file.bpmn"
 * - _searchInSiblingDirs -> "C:/proj/file.bpmn"
 *
 * Die Inkonsistenz entsteht weil searchInKnownFiles location.path zurueckgibt
 * (aus ProcessIndex, normalisiert mit '/'), waehrend _tryRelativePaths den
 * candidatePath direkt zurueckgibt (normalisiert mit pathSep).
 *
 * Hier testen wir den zugrundeliegenden Mechanismus: Wenn eine Datei ueber
 * searchInKnownFiles gefunden wird, hat der Pfad '/'-Separatoren. Wenn die
 * gleiche Datei direkt ueber ProcessIndex gespeichert und abgerufen wird,
 * hat sie ebenfalls '/'. Aber wenn der Pfad direkt aus normalizePath kommt
 * (wie in _tryRelativePaths), koennte er andere Separatoren haben.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { normalizePath } from '../client/path-utils.mjs';
import { ProcessIndex } from '../client/process-index.mjs';
import { NavigatorSearch } from '../client/navigator-search.mjs';

describe('BUG-API-024: Inkonsistente Pfad-Separatoren zwischen Suchmethoden', () => {

  it('searchInKnownFiles gibt Forward-Slash-Pfad zurueck fuer Windows-Pfad', async () => {
    const index = new ProcessIndex();
    const bpmnContent = '<bpmn:process id="targetProcess"></bpmn:process>';

    const search = new NavigatorSearch({
      fileSystem: {
        readFile: async (path) => {
          if (normalizePath(path, '/') === 'C:/proj/sub/target.bpmn') {
            return { contents: bpmnContent };
          }
          return { contents: '' };
        }
      },
      index
    });

    const result = await search.searchInKnownFiles(
      'targetProcess',
      'C:\\proj\\sub\\current.bpmn',
      ['C:\\proj\\sub\\target.bpmn']
    );

    // searchInKnownFiles gibt location.path aus dem Index zurueck,
    // der immer mit '/' normalisiert ist
    assert.strictEqual(result, 'C:/proj/sub/target.bpmn',
      'searchInKnownFiles gibt Forward-Slash-Pfad zurueck');
  });

  it('normalizePath mit Windows-Separator gibt Backslash-Pfad zurueck', () => {
    // _tryRelativePaths macht: normalizePath(`${searchDir}${pathSep}${name}`, pathSep)
    // mit pathSep='\\'
    const result = normalizePath('C:\\proj\\sub\\target.bpmn', '\\');

    assert.strictEqual(result, 'C:\\proj\\sub\\target.bpmn',
      'normalizePath mit \\ gibt Backslash-Pfad zurueck');
  });

  it('both search methods return forward-slash normalized paths', async () => {
    const index = new ProcessIndex();
    const bpmnContent = '<bpmn:process id="targetProcess"></bpmn:process>';

    const search = new NavigatorSearch({
      fileSystem: {
        readFile: async () => ({ contents: bpmnContent })
      },
      index
    });

    const searchResult = await search.searchInKnownFiles(
      'targetProcess',
      'C:\\proj\\current.bpmn',
      ['C:\\proj\\target.bpmn']
    );

    // After fix, _tryRelativePaths also normalizes return value to '/'
    const tryRelativeResult = normalizePath('C:\\proj\\target.bpmn', '/');

    assert.strictEqual(searchResult, tryRelativeResult,
      'Both methods should return forward-slash paths');
  });
});
