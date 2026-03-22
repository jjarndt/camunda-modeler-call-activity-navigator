import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NavigatorSearch } from '../client/navigator-search.mjs';
import { ProcessIndex } from '../client/process-index.mjs';

describe('BUG-LOGIK-019: case mismatch lets current file through filter', () => {

  it('should not return current file when path differs only in case', async () => {
    const index = new ProcessIndex();

    // Index two files with the target process
    index.setFileIndex('/Project/src/current.bpmn', ['TargetProcess']);
    index.setFileIndex('/other/dir/other.bpmn', ['TargetProcess']);

    const search = new NavigatorSearch({
      fileSystem: {
        readFile: async (p) => ({ contents: '' })
      },
      index
    });

    // The knownFiles Set uses different casing than currentFilePath
    const knownFiles = new Set([
      '/Project/src/current.bpmn',
      '/other/dir/other.bpmn'
    ]);

    // Pass currentFilePath with different case - normalizePath doesn't
    // change case, so the filter won't match
    const result = await search.searchInKnownFiles(
      'TargetProcess',
      '/project/src/current.bpmn',  // lowercase 'project'
      knownFiles
    );

    // The bug: normalizePath('/project/src/current.bpmn') != normalizePath('/Project/src/current.bpmn')
    // so the filter doesn't remove the current file, and findBestMatch may pick it
    // because commonPrefixLength is case-insensitive
    assert.notStrictEqual(
      result, '/Project/src/current.bpmn',
      `Should not return current file (case mismatch). Got: ${result}`
    );
  });
});
