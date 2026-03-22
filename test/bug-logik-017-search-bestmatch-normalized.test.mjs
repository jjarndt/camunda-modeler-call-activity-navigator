import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NavigatorSearch } from '../client/navigator-search.mjs';
import { ProcessIndex } from '../client/process-index.mjs';

function createSearch(files) {
  const index = new ProcessIndex();
  const fileContents = {};

  for (const [path, ids] of Object.entries(files)) {
    index.setFileIndex(path, ids);
    const xml = ids.map(id => `<bpmn:process id="${id}" />`).join('\n');
    fileContents[path] = xml;
  }

  return new NavigatorSearch({
    fileSystem: {
      readFile: async (p) => ({ contents: fileContents[p] || '' })
    },
    index
  });
}

describe('BUG-003: findBestMatch normalizes currentFilePath', () => {

  it('should pick closest match even with backslash currentFilePath', async () => {
    // Index files using Windows-style backslash paths (ProcessIndex normalizes them)
    const search = createSearch({
      'C:\\far\\away\\file.bpmn': ['TargetProcess'],
      'C:\\project\\src\\nearby.bpmn': ['TargetProcess']
    });

    const knownFiles = new Set([
      'C:\\far\\away\\file.bpmn',
      'C:\\project\\src\\nearby.bpmn',
      'C:\\project\\src\\current.bpmn'
    ]);

    const result = await search.searchInKnownFiles(
      'TargetProcess',
      'C:\\project\\src\\current.bpmn',
      knownFiles
    );

    assert.strictEqual(
      result, 'C:/project/src/nearby.bpmn',
      `Should prefer nearby match, got: ${result}`
    );
  });

  it('findBestMatch should normalize Windows path before scoring', () => {
    const search = createSearch({});

    const locations = [
      { path: 'C:/far/away/file.bpmn' },
      { path: 'C:/project/src/nearby.bpmn' }
    ];

    // Pass Windows-style backslash path as currentFilePath
    const result = search.findBestMatch(locations, 'C:\\project\\src\\current.bpmn');

    assert.strictEqual(
      result.path, 'C:/project/src/nearby.bpmn',
      `Should prefer nearby match, got: ${result.path}`
    );
  });

  it('should not throw TypeError when all locations have invalid paths', async () => {
    const index = new ProcessIndex();
    const search = new NavigatorSearch({
      fileSystem: { readFile: async () => ({ contents: '' }) },
      index
    });

    // Manually inject locations with null paths
    index._locationsByProcess.set('Ghost', [{ path: null }, { path: undefined }]);
    index._processesByFile.set('fake.bpmn', new Set(['Ghost']));

    const knownFiles = new Set(['other.bpmn']);
    const result = await search.searchInKnownFiles('Ghost', 'current.bpmn', knownFiles);

    assert.strictEqual(result, null, 'Should return null without throwing');
  });
});
