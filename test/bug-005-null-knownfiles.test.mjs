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

describe('BUG-005: searchInKnownFiles with null/undefined knownFiles', () => {

  it('does not throw when knownFiles is null', async () => {
    const fileSystem = createMockFS(new Map());
    const index = new ProcessIndex();
    const search = new NavigatorSearch({ fileSystem, index });

    const result = await search.searchInKnownFiles('SomeProcess', '/proj/current.bpmn', null);

    assert.equal(result, null);
  });

  it('does not throw when knownFiles is undefined', async () => {
    const fileSystem = createMockFS(new Map());
    const index = new ProcessIndex();
    const search = new NavigatorSearch({ fileSystem, index });

    const result = await search.searchInKnownFiles('SomeProcess', '/proj/current.bpmn', undefined);

    assert.equal(result, null);
  });
});
