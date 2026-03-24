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

describe('BUG-001: searchInKnownFiles must not return currentFilePath', () => {

  it('filters currentFilePath from results when already indexed', async () => {
    const files = new Map([
      ['/proj/current.bpmn', BPMN_WITH_PROCESS('MyProcess')],
      ['/proj/target.bpmn', BPMN_WITH_PROCESS('MyProcess')]
    ]);
    const fileSystem = createMockFS(files);
    const index = new ProcessIndex();
    const search = new NavigatorSearch({ fileSystem, index });

    // Pre-index the current file (simulates prior navigation)
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
});
