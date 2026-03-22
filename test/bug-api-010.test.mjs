import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NavigatorSearch } from '../client/navigator-search.mjs';
import { ProcessIndex } from '../client/process-index.mjs';

describe('Bug API-010: indexFile re-throws TypeErrors instead of swallowing them', () => {

  it('throws TypeError when fileSystem is undefined', async () => {
    const index = new ProcessIndex();
    const search = new NavigatorSearch({ index });

    await assert.rejects(
      () => search.indexFile('/foo.bpmn'),
      TypeError
    );

    assert.strictEqual(search.isFileIndexed('/foo.bpmn'), false,
      'File must not be marked as indexed after a TypeError');
  });

  it('still handles normal I/O errors gracefully', async () => {
    const index = new ProcessIndex();
    const search = new NavigatorSearch({
      fileSystem: { readFile: async () => { throw new Error('ENOENT'); } },
      index
    });

    await search.indexFile('/missing.bpmn');
    assert.strictEqual(search.isFileIndexed('/missing.bpmn'), true,
      'File should be marked as indexed (with no processes) after I/O error');
  });
});
