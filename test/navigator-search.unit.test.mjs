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

describe('NavigatorSearch', () => {

  describe('indexFile', () => {

    it('marks file as indexed with empty processes when readFile throws', async () => {
      const fileSystem = createMockFS(new Map());
      const index = new ProcessIndex();
      const search = new NavigatorSearch({ fileSystem, index });

      await search.indexFile('/proj/missing.bpmn');

      assert.equal(search.isFileIndexed('/proj/missing.bpmn'), true);
      assert.deepEqual(search.getLocations('AnyProcess'), []);
    });

    it('handles readFile returning null contents', async () => {
      const fileSystem = createMockFS(new Map([['/proj/empty.bpmn', null]]));
      const index = new ProcessIndex();
      const search = new NavigatorSearch({ fileSystem, index });

      await search.indexFile('/proj/empty.bpmn');

      assert.equal(search.isFileIndexed('/proj/empty.bpmn'), true);
      assert.deepEqual(search.getLocations('AnyProcess'), []);
    });
  });

  describe('getProcessIdsFromFile', () => {

    it('returns extracted process IDs from valid BPMN', async () => {
      const bpmn = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  id="Defs_1" targetNamespace="http://example.com">
  <bpmn:process id="TestProc" isExecutable="true">
    <bpmn:startEvent id="StartEvent_1" />
  </bpmn:process>
</bpmn:definitions>`;
      const fileSystem = createMockFS(new Map([['/proj/test.bpmn', bpmn]]));
      const index = new ProcessIndex();
      const search = new NavigatorSearch({ fileSystem, index });

      const result = await search.getProcessIdsFromFile('/proj/test.bpmn');

      assert.deepEqual(result, ['TestProc']);
    });

    it('returns empty array when readFile throws', async () => {
      const fileSystem = createMockFS(new Map());
      const index = new ProcessIndex();
      const search = new NavigatorSearch({ fileSystem, index });

      const result = await search.getProcessIdsFromFile('/proj/missing.bpmn');

      assert.deepEqual(result, []);
    });
  });

  describe('searchInKnownFiles', () => {

    it('returns null when the known files set is empty', async () => {
      const fileSystem = createMockFS(new Map());
      const index = new ProcessIndex();
      const search = new NavigatorSearch({ fileSystem, index });

      const result = await search.searchInKnownFiles('SomeProcess', '/proj/current.bpmn', new Set());

      assert.equal(result, null);
    });
  });

  describe('findBestMatch', () => {

    it('returns first location when all scores are equal', () => {
      const index = new ProcessIndex();
      const search = new NavigatorSearch({ fileSystem: {}, index });

      const locations = [
        { path: '/x/alpha/a.bpmn' },
        { path: '/y/beta/b.bpmn' },
        { path: '/z/gamma/c.bpmn' }
      ];

      const result = search.findBestMatch(locations, '/w/delta/current.bpmn');

      assert.equal(result.path, '/x/alpha/a.bpmn');
    });
  });
});
