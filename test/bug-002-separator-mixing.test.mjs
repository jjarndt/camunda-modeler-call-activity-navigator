import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { NavigatorSearch } from '../client/navigator-search.mjs';
import { ProcessIndex } from '../client/process-index.mjs';

function createMockFS(files) {
  return {
    readFile: async (path) => {
      if (files.has(path)) return { contents: files.get(path) };
      throw new Error('File not found');
    }
  };
}

const BPMN_WITH_PROCESS = id => `<bpmn:process id="${id}" isExecutable="true"/>`;

describe('BUG-002: mixed path separators break self-exclusion and index lookup', () => {

  describe('ProcessIndex: mixed separators must not create duplicate entries', () => {

    it('setFileIndex with backslash then forward-slash overwrites (no duplicates)', () => {
      const index = new ProcessIndex();
      index.setFileIndex('C:\\proj\\a.bpmn', ['MyProcess']);
      index.setFileIndex('C:/proj/a.bpmn', ['MyProcess']);

      const locations = index.getLocations('MyProcess');
      assert.equal(locations.length, 1,
        'must have exactly one entry, not two duplicates from mixed separators');
    });

    it('removeFile with forward-slash removes backslash-indexed entry', () => {
      const index = new ProcessIndex();
      index.setFileIndex('C:\\proj\\a.bpmn', ['MyProcess']);
      index.removeFile('C:/proj/a.bpmn');

      assert.equal(index.isIndexed('C:\\proj\\a.bpmn'), false,
        'file must no longer be indexed after removal with different separator');
      assert.equal(index.isIndexed('C:/proj/a.bpmn'), false);
      assert.deepEqual(index.getLocations('MyProcess'), []);
    });

    it('isIndexed recognizes file regardless of separator style', () => {
      const index = new ProcessIndex();
      index.setFileIndex('C:\\proj\\a.bpmn', ['MyProcess']);

      assert.equal(index.isIndexed('C:/proj/a.bpmn'), true,
        'must find the file even when queried with forward slashes');
    });
  });

  describe('searchInKnownFiles: self-exclusion with mixed separators', () => {

    it('excludes current file when currentFilePath uses backslashes but knownFiles use forward slashes', async () => {
      const backslashPath = 'C:\\proj\\current.bpmn';
      const forwardSlashPath = 'C:/proj/current.bpmn';
      const targetPath = 'C:/proj/target.bpmn';

      const files = new Map([
        [forwardSlashPath, BPMN_WITH_PROCESS('MyProcess')],
        [targetPath, BPMN_WITH_PROCESS('MyProcess')]
      ]);
      const fileSystem = createMockFS(files);
      const index = new ProcessIndex();
      const search = new NavigatorSearch({ fileSystem, index });

      const result = await search.searchInKnownFiles(
        'MyProcess',
        backslashPath,
        [forwardSlashPath, targetPath]
      );

      assert.equal(result, targetPath,
        'must return target, not self (even with mixed separators)');
    });

    it('returns null when current file is the only match with mixed separators', async () => {
      const backslashPath = 'C:\\proj\\current.bpmn';
      const forwardSlashPath = 'C:/proj/current.bpmn';

      const files = new Map([
        [forwardSlashPath, BPMN_WITH_PROCESS('MyProcess')]
      ]);
      const fileSystem = createMockFS(files);
      const index = new ProcessIndex();
      const search = new NavigatorSearch({ fileSystem, index });

      const result = await search.searchInKnownFiles(
        'MyProcess',
        backslashPath,
        [forwardSlashPath]
      );

      assert.equal(result, null,
        'must return null when only the current file matches (mixed separators)');
    });
  });
});
