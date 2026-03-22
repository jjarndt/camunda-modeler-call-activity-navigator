/**
 * Bug-Logik-NEW-010: normalizePath does not normalize drive letter case.
 *
 * normalizePath("c:\\foo", "\\") returns "c:\\foo"
 * normalizePath("C:\\foo", "\\") returns "C:\\foo"
 *
 * These refer to the same file on Windows (drive letters are case-insensitive),
 * but normalize to different strings. This causes ProcessIndex to create
 * separate entries for the same file when the drive letter case differs.
 *
 * Practical impact:
 * - setFileIndex("c:\\file.bpmn", ["P1"]) followed by
 *   removeFile("C:\\file.bpmn") will NOT remove the entry because
 *   the normalized paths differ ("c:/file.bpmn" vs "C:/file.bpmn").
 * - getLocations("P1") returns duplicate entries for the same file.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePath } from '../client/path-utils.mjs';
import { ProcessIndex } from '../client/process-index.mjs';

describe('BUG-LOGIK-NEW-010: drive letter case causes normalization inconsistency', () => {

  it('normalizePath should normalize drive letter case consistently', () => {
    const lower = normalizePath('c:\\foo\\bar.bpmn', '/');
    const upper = normalizePath('C:\\foo\\bar.bpmn', '/');

    assert.strictEqual(lower, upper,
      `Drive letter case causes different normalized paths: "${lower}" vs "${upper}"`);
  });

  it('ProcessIndex.removeFile fails when drive letter case differs from setFileIndex', () => {
    const index = new ProcessIndex();

    // Index with lowercase drive letter
    index.setFileIndex('c:\\project\\file.bpmn', ['MyProcess']);

    // Verify it was indexed
    const before = index.getLocations('MyProcess');
    assert.strictEqual(before.length, 1, 'Should have 1 location after setFileIndex');

    // Remove with uppercase drive letter (same file on Windows!)
    index.removeFile('C:\\project\\file.bpmn');

    // The entry should be removed, but it may not be due to case mismatch
    const after = index.getLocations('MyProcess');
    assert.strictEqual(after.length, 0,
      `removeFile with different drive letter case failed to remove entry. ` +
      `Still has ${after.length} location(s): ${JSON.stringify(after)}`);
  });

  it('ProcessIndex creates duplicates when same file indexed with different drive letter case', () => {
    const index = new ProcessIndex();

    index.setFileIndex('c:\\file.bpmn', ['Process1']);
    index.setFileIndex('C:\\file.bpmn', ['Process1']);

    const locations = index.getLocations('Process1');
    assert.strictEqual(locations.length, 1,
      `Same file with different drive letter case created ${locations.length} entries ` +
      `instead of 1: ${JSON.stringify(locations)}`);
  });
});
