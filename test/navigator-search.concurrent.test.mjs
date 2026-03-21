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

describe('NavigatorSearch - concurrent indexing', () => {

  it('should index all files when multiple indexFile calls run concurrently', async () => {
    const fileSystem = createMockFS(new Map([
      ['/a.bpmn', '<bpmn:process id="ProcA">'],
      ['/b.bpmn', '<bpmn:process id="ProcB">'],
      ['/c.bpmn', '<bpmn:process id="ProcC">']
    ]));

    const search = new NavigatorSearch({
      fileSystem,
      index: new ProcessIndex()
    });

    await Promise.all([
      search.indexFile('/a.bpmn'),
      search.indexFile('/b.bpmn'),
      search.indexFile('/c.bpmn')
    ]);

    assert.equal(search.isFileIndexed('/a.bpmn'), true);
    assert.equal(search.isFileIndexed('/b.bpmn'), true);
    assert.equal(search.isFileIndexed('/c.bpmn'), true);

    assert.deepStrictEqual(search.getLocations('ProcA'), [{ path: '/a.bpmn' }]);
    assert.deepStrictEqual(search.getLocations('ProcB'), [{ path: '/b.bpmn' }]);
    assert.deepStrictEqual(search.getLocations('ProcC'), [{ path: '/c.bpmn' }]);
  });
});
