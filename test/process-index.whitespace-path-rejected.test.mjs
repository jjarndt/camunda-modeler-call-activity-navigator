import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePath } from '../client/path-utils.mjs';
import { ProcessIndex } from '../client/process-index.mjs';

describe('BUG-DATA-003: whitespace-only paths rejected', () => {
  it('normalizePath with whitespace-only input returns a value handled by ProcessIndex', () => {
    const result = normalizePath('   ');
    // Whether it returns '   ' or '', ProcessIndex should reject it
    const idx = new ProcessIndex();
    idx.setFileIndex(result, ['test-process']);
    const locs = idx.getLocations('test-process');
    assert.equal(locs.length, 0, 'Whitespace path should not create location entries');
  });

  it('ProcessIndex.setFileIndex rejects whitespace-only path', () => {
    const idx = new ProcessIndex();
    idx.setFileIndex('   ', ['ghost-process']);
    assert.equal(idx.getLocations('ghost-process').length, 0);
  });
});
