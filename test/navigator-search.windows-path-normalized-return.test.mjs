/**
 * BUG-API-003: searchInKnownFiles path-separator inconsistency
 *
 * ProcessIndex stores paths normalized with '/' (forward slash).
 * searchInKnownFiles normalizes currentFilePath with '/' too.
 * BUT: the skip-self comparison at line 64 uses normalizePath(filePath, '/') for
 * the iteration item, while the filter at line 73 compares loc.path !== normalizedCurrent.
 *
 * The iteration-skip normalization (line 64) is NOT stored - it's just used for
 * the equality check to skip indexing the current file. The filePath passed to
 * indexFile (line 67) is the ORIGINAL (non-normalized) filePath.
 * ProcessIndex.setFileIndex normalizes it again internally.
 *
 * Scenario: Windows path C:\proj\current.bpmn is passed as currentFilePath.
 * normalizePath('C:\\proj\\current.bpmn', '/') should produce 'C:/proj/current.bpmn'.
 * ProcessIndex stores 'C:/proj/current.bpmn'.
 * Filter checks loc.path !== 'C:/proj/current.bpmn' - correct.
 * BUT: the knownFiles array item also uses backslash 'C:\\proj\\current.bpmn',
 * the skip check normalizes it to 'C:/proj/current.bpmn' === normalizedCurrent,
 * so it correctly skips re-indexing. This should work.
 *
 * ACTUAL BUG: findBestMatch is called with the ORIGINAL currentFilePath (not normalized)
 * at line 77: this.findBestMatch(locations, currentFilePath)
 * Inside findBestMatch, parentDir uses currentFilePath split by /[\\/]/, so that's fine.
 * No real bug here - but let's verify the whole path with Windows separators.
 *
 * REAL SUSPECT: getLocations returns copies with normalized (forward-slash) paths.
 * The returned path string from searchInKnownFiles is loc.path (normalized).
 * Callers might expect the original path separator back.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { NavigatorSearch } from '../client/navigator-search.mjs';
import { ProcessIndex } from '../client/process-index.mjs';

const BPMN = id => `<bpmn:process id="${id}" isExecutable="true"/>`;

function createMockFS(files) {
  return {
    readFile: async (path) => {
      // files keyed by normalized path
      const { normalizePath } = await import('../client/path-utils.mjs');
      const norm = normalizePath(path, '/');
      if (files.has(norm)) return { contents: files.get(norm) };
      throw new Error(`File not found: ${path}`);
    }
  };
}

describe('BUG-API-003: searchInKnownFiles returns normalized path, not original separator', () => {

  it('Windows paths: returned path uses forward slashes even if input used backslashes', async () => {
    const files = new Map([
      ['C:/proj/current.bpmn', BPMN('MyProcess')],
      ['C:/proj/target.bpmn', BPMN('MyProcess')]
    ]);
    const fileSystem = createMockFS(files);
    const index = new ProcessIndex();
    const search = new NavigatorSearch({ fileSystem, index });

    await search.indexFile('C:\\proj\\current.bpmn');
    await search.indexFile('C:\\proj\\target.bpmn');

    const result = await search.searchInKnownFiles(
      'MyProcess',
      'C:\\proj\\current.bpmn',
      ['C:\\proj\\current.bpmn', 'C:\\proj\\target.bpmn']
    );

    // The returned path will be normalized (forward slashes)
    // A caller might expect the original Windows path back.
    // This documents the current behavior.
    assert.equal(result, 'C:/proj/target.bpmn',
      'returns forward-slash normalized path even for Windows input - caller must be aware');
  });

  it('Windows paths: searchInKnownFiles correctly excludes current file with backslash input', async () => {
    const files = new Map([
      ['C:/proj/only.bpmn', BPMN('MyProcess')]
    ]);
    const fileSystem = createMockFS(files);
    const index = new ProcessIndex();
    const search = new NavigatorSearch({ fileSystem, index });

    await search.indexFile('C:\\proj\\only.bpmn');

    const result = await search.searchInKnownFiles(
      'MyProcess',
      'C:\\proj\\only.bpmn',
      ['C:\\proj\\only.bpmn']
    );

    assert.equal(result, null,
      'must return null when only current file has the process, even with backslash paths');
  });

});
