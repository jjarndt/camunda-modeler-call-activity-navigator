/**
 * BUG-FINDER-NULL-008: ProcessIndex.removeFile mit null/undefined Eintrag in processIds Set
 *
 * In process-index.mjs, removeFile() Zeile 40-58:
 *   const processIds = this._processesByFile.get(filePath);
 *   if (!processIds) return;
 *   for (const processId of processIds) {
 *     const locations = this._locationsByProcess.get(processId);
 *
 * Wenn processIds ein Set mit null oder undefined enthaelt (durch fehlerhafte
 * Vorbedingungen), wird null/undefined als processId verwendet, und dann
 * this._locationsByProcess.get(null) aufgerufen.
 * Das ist valide in JavaScript (gibt undefined zurueck), also kein Crash.
 *
 * Echter Verdacht: ProcessIndex.setFileIndex - was wenn filePath nach normalizePath
 * ein '.' ist (fuer relative Pfade)?
 *
 * In normalizePath() Zeile 110:
 *   return joined || '.';
 *
 * Wenn filePath = '..' und sep = '/', dann gibt normalizePath '.' zurueck.
 * In setFileIndex() Zeile 21:
 *   if (!filePath || !filePath.trim()) return;
 * '.' ist truthy und '.' .trim() ist '.', nicht leer - also wird es NICHT blockiert!
 *
 * Dann wuerde '.' als gueltiger Pfad in den Index aufgenommen werden.
 * Das ist ein semantischer Bug - '.' ist kein gueltiger absoluter Dateipfad.
 * Aber ist es ein NULL-SAFETY Bug? Nein, aber es koennte zu unerwarteten Matches fuehren.
 *
 * Echter NULL-SAFETY Test: NavigatorSearch.searchInKnownFiles
 * wenn knownFiles Elemente mit null-Eintraegen enthaelt
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NavigatorSearch } from '../client/navigator-search.mjs';
import { ProcessIndex } from '../client/process-index.mjs';

describe('BUG-FINDER-NULL-008: searchInKnownFiles mit null-Eintraegen in knownFiles', () => {
  it('wirft keinen TypeError wenn knownFiles null-Eintraege enthaelt', async () => {
    const index = new ProcessIndex();
    const fileSystem = {
      readFile: async (path) => {
        if (path && path.includes('other')) {
          return { contents: '<process id="myProcess"/>' };
        }
        throw new Error('file not found');
      }
    };
    const search = new NavigatorSearch({ fileSystem, index });

    // Set mit null-Eintrag
    const knownFiles = new Set([null, '/project/other.bpmn', undefined]);

    await assert.doesNotReject(
      async () => search.searchInKnownFiles('myProcess', '/project/current.bpmn', knownFiles),
      'searchInKnownFiles muss null/undefined in knownFiles tolerieren'
    );
  });

  it('wirft keinen TypeError wenn knownFiles Array mit null-Eintraegen ist', async () => {
    const index = new ProcessIndex();
    const fileSystem = {
      readFile: async (path) => ({ contents: '<process id="test"/>' })
    };
    const search = new NavigatorSearch({ fileSystem, index });

    const knownFiles = [null, '/project/file.bpmn', undefined, ''];

    await assert.doesNotReject(
      async () => search.searchInKnownFiles('test', '/project/current.bpmn', knownFiles),
      'searchInKnownFiles muss null/undefined Eintraege in Array tolerieren'
    );
  });
});
