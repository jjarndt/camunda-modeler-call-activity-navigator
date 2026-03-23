/**
 * BUG-FINDER-NULL-018: ProcessIndex.setFileIndex should reject relative paths
 * like "." and ".." since they are not valid file paths for indexing.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePath } from '../client/path-utils.mjs';
import { ProcessIndex } from '../client/process-index.mjs';

describe('BUG-FINDER-NULL-018: normalizePath relative-to-dot Ergebnis im Index', () => {
  it('normalizePath(".") gibt "." zurueck', () => {
    assert.equal(normalizePath('.', '/'), '.');
  });

  it('normalizePath("..") gibt ".." zurueck (relative Pfadangabe)', () => {
    assert.equal(normalizePath('..', '/'), '..');
  });

  it('setFileIndex mit ".." erstellt keinen Eintrag fuer relative Pfade', () => {
    const index = new ProcessIndex();
    index.setFileIndex('..', ['relativeProcess']);
    const locs = index.getLocations('relativeProcess');
    assert.equal(locs.length, 0,
      'setFileIndex should reject relative paths like ".."');
  });
});
