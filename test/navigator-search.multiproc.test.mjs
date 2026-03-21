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

describe('NavigatorSearch - multi-process search', () => {

  it('searchInKnownFiles finds correct file among many with different processes', async () => {
    const files = new Map([
      ['/proj/a.bpmn', '<bpmn:process id="Alpha">'],
      ['/proj/b.bpmn', '<bpmn:process id="Beta">'],
      ['/proj/c.bpmn', '<bpmn:process id="Gamma">'],
      ['/proj/d.bpmn', '<bpmn:process id="Delta">']
    ]);
    const fileSystem = createMockFS(files);
    const index = new ProcessIndex();
    const search = new NavigatorSearch({ fileSystem, index });

    const knownFiles = new Set(['/proj/a.bpmn', '/proj/b.bpmn', '/proj/c.bpmn', '/proj/d.bpmn']);

    const gammaResult = await search.searchInKnownFiles('Gamma', '/proj/current.bpmn', knownFiles);
    assert.equal(gammaResult, '/proj/c.bpmn');

    const alphaResult = await search.searchInKnownFiles('Alpha', '/proj/current.bpmn', knownFiles);
    assert.equal(alphaResult, '/proj/a.bpmn');

    const notFoundResult = await search.searchInKnownFiles('NotHere', '/proj/current.bpmn', knownFiles);
    assert.equal(notFoundResult, null);
  });
});
