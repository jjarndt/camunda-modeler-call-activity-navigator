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

describe('NavigatorSearch - self-file exclusion', () => {

  describe('searchInKnownFiles filters current file', () => {

    it('filters currentFilePath from results when already indexed', async () => {
      const files = new Map([
        ['/proj/current.bpmn', BPMN_WITH_PROCESS('MyProcess')],
        ['/proj/target.bpmn', BPMN_WITH_PROCESS('MyProcess')]
      ]);
      const fileSystem = createMockFS(files);
      const index = new ProcessIndex();
      const search = new NavigatorSearch({ fileSystem, index });

      await search.indexFile('/proj/current.bpmn');

      const result = await search.searchInKnownFiles(
        'MyProcess',
        '/proj/current.bpmn',
        ['/proj/current.bpmn', '/proj/target.bpmn']
      );

      assert.equal(result, '/proj/target.bpmn',
        'must return target, not the current file');
    });

    it('returns null when currentFilePath is the only match', async () => {
      const files = new Map([
        ['/proj/current.bpmn', BPMN_WITH_PROCESS('MyProcess')]
      ]);
      const fileSystem = createMockFS(files);
      const index = new ProcessIndex();
      const search = new NavigatorSearch({ fileSystem, index });

      await search.indexFile('/proj/current.bpmn');

      const result = await search.searchInKnownFiles(
        'MyProcess',
        '/proj/current.bpmn',
        ['/proj/current.bpmn']
      );

      assert.equal(result, null,
        'must return null when only the current file has the process');
    });

    it('returns null when only match is current file (full BPMN)', async () => {
      const bpmn = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  id="Defs_1" targetNamespace="http://example.com">
  <bpmn:process id="MyProc" isExecutable="true">
    <bpmn:startEvent id="StartEvent_1" />
  </bpmn:process>
</bpmn:definitions>`;

      const fileSystem = createMockFS(new Map([['/proj/self.bpmn', bpmn]]));
      const index = new ProcessIndex();
      const search = new NavigatorSearch({ fileSystem, index });

      const knownFiles = new Set(['/proj/self.bpmn']);
      const result = await search.searchInKnownFiles('MyProc', '/proj/self.bpmn', knownFiles);

      assert.equal(result, null);
    });
  });

  describe('findBestMatch self-navigation risk', () => {

    it('should not return the current file as best match', () => {
      const index = new ProcessIndex();
      const fileSystem = { readFile: async () => ({ contents: '' }) };
      const search = new NavigatorSearch({ fileSystem, index });

      const locations = [
        { path: '/project/src/current.bpmn' },
        { path: '/project/src/other.bpmn' }
      ];

      const result = search.findBestMatch(locations, '/project/src/current.bpmn');

      assert.notEqual(result.path, '/project/src/current.bpmn',
        'findBestMatch should not return the current file as best match');
    });
  });

  describe('case-mismatch self filter', () => {

    it('should not return current file when path differs only in case', async () => {
      const index = new ProcessIndex();

      index.setFileIndex('/Project/src/current.bpmn', ['TargetProcess']);
      index.setFileIndex('/other/dir/other.bpmn', ['TargetProcess']);

      const search = new NavigatorSearch({
        fileSystem: {
          readFile: async () => ({ contents: '' })
        },
        index
      });

      const knownFiles = new Set([
        '/Project/src/current.bpmn',
        '/other/dir/other.bpmn'
      ]);

      const result = await search.searchInKnownFiles(
        'TargetProcess',
        '/project/src/current.bpmn',
        knownFiles
      );

      assert.notStrictEqual(
        result, '/Project/src/current.bpmn',
        `Should not return current file (case mismatch). Got: ${result}`
      );
    });
  });
});
