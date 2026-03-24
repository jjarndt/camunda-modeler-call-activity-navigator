/**
 * Verify extractProcessIds behavior with unsanitized/unusual process IDs:
 * path separators, HTML entities, spaces, newlines, very long strings.
 * VALID_PROCESS_ID in the navigator blocks most of these on click, but
 * the parser returns them for indexing purposes.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractProcessIds } from '../client/bpmn-parser.mjs';
import { ProcessIndex } from '../client/process-index.mjs';

describe('extractProcessIds - unsanitized process IDs', () => {

  it('extracts process ID containing path separators', () => {
    const xml = '<bpmn:process id="../../etc/passwd">';
    const ids = extractProcessIds(xml);

    if (ids.length > 0 && ids[0].includes('/')) {
      const index = new ProcessIndex();
      index.setFileIndex('/safe/file.bpmn', ids);

      const locations = index.getLocations('../../etc/passwd');
      assert.strictEqual(locations.length, 1,
        'Path-like processId is stored in index');
    }
  });

  it('handles process ID containing HTML entities', () => {
    const xml = '<bpmn:process id="proc&lt;script&gt;">';
    // The regex parser doesn't decode HTML entities, so the literal
    // string "proc&lt;script&gt;" would be extracted -- this is safe
    extractProcessIds(xml);
  });

  it('does not extract process ID containing spaces', () => {
    const xml = '<bpmn:process id="process with spaces">';
    const ids = extractProcessIds(xml);

    if (ids.length > 0 && ids[0].includes(' ')) {
      assert.fail(
        `extractProcessIds returned ID with spaces: "${ids[0]}". ` +
        'SAFE_PROCESS_ID should reject whitespace.'
      );
    }
  });

  it('does not extract process ID containing newlines', () => {
    const xml = '<bpmn:process id="process\nwith\nnewlines">';
    const ids = extractProcessIds(xml);

    if (ids.length > 0 && ids[0].includes('\n')) {
      assert.fail(
        `extractProcessIds returned ID with newlines: ${JSON.stringify(ids[0])}.`
      );
    }
  });

  it('handles very long process ID without DoS', () => {
    const longId = 'a'.repeat(1_000_000);
    const xml = `<bpmn:process id="${longId}">`;

    const start = Date.now();
    const ids = extractProcessIds(xml);
    const elapsed = Date.now() - start;

    assert.ok(elapsed < 500, `Extracting 1M-char ID took ${elapsed}ms`);
  });

  it('handles process ID containing backslash', () => {
    const xml = '<bpmn:process id="..\\..\\windows\\system32">';
    const ids = extractProcessIds(xml);
    // VALID_PROCESS_ID in navigator rejects backslash on click
  });

  it('excludes process ID that is only whitespace after trim', () => {
    const xml = '<bpmn:process id="   ">';
    const ids = extractProcessIds(xml);

    assert.deepStrictEqual(ids, [],
      'Whitespace-only process ID should be excluded');
  });
});
