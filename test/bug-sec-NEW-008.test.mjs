/**
 * SEC-NEW-008: extractProcessIds returns unsanitized process IDs
 *
 * The bpmn-parser.mjs extractProcessIds function extracts the id=
 * attribute value from <bpmn:process> tags. It only applies .trim()
 * but does NO validation or sanitization of the extracted ID.
 *
 * This means any string that appears between quotes in id="..." is
 * returned as-is to callers. Combined with the fact that
 * CallActivityContextPadProvider uses the processId in a title
 * attribute BEFORE VALID_PROCESS_ID validation (which only happens
 * on click in _doHandleOpenProcess), malicious BPMN content could
 * inject arbitrary strings.
 *
 * The extractProcessIds function is also called in indexFile/getProcessIdsFromFile
 * where the returned IDs are used as Map keys in ProcessIndex. If an
 * extracted ID contains path separators, this could confuse path-based lookups.
 *
 * CWE-20: Improper Input Validation
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractProcessIds } from '../client/bpmn-parser.mjs';
import { ProcessIndex } from '../client/process-index.mjs';

describe('SEC-NEW-008: extractProcessIds returns unsanitized IDs', () => {

  it('extracts process ID containing path separators', () => {
    const xml = '<bpmn:process id="../../etc/passwd">';
    const ids = extractProcessIds(xml);

    if (ids.length > 0 && ids[0].includes('/')) {
      // processId with path separators gets stored in ProcessIndex
      // and used in file lookups
      const index = new ProcessIndex();
      index.setFileIndex('/safe/file.bpmn', ids);

      const locations = index.getLocations('../../etc/passwd');
      assert.strictEqual(locations.length, 1,
        'Path-like processId is stored in index');

      // This ID would be used in _buildCandidateNames:
      // "../../etc/passwd.bpmn" -> path traversal!
      // BUT: VALID_PROCESS_ID blocks "/" so _doHandleOpenProcess rejects it.
      // HOWEVER: getContextPadEntries does NOT validate, so it reaches the DOM.
    }
  });

  it('extracts process ID containing HTML entities', () => {
    const xml = '<bpmn:process id="proc&lt;script&gt;">';
    const ids = extractProcessIds(xml);
    // The regex parser doesn't decode HTML entities, so the literal
    // string "proc&lt;script&gt;" would be extracted
    // This is actually safe because the entities stay encoded
  });

  it('extracts process ID containing spaces', () => {
    const xml = '<bpmn:process id="process with spaces">';
    const ids = extractProcessIds(xml);

    if (ids.length > 0 && ids[0].includes(' ')) {
      // Spaces in processId - would fail VALID_PROCESS_ID on click,
      // but reaches title attribute on render
      assert.fail(
        `extractProcessIds returned ID with spaces: "${ids[0]}". ` +
        'This bypasses VALID_PROCESS_ID (checked only on click) and ' +
        'reaches the ContextPad title attribute unvalidated.'
      );
    }
  });

  it('extracts process ID containing newlines', () => {
    const xml = '<bpmn:process id="process\nwith\nnewlines">';
    const ids = extractProcessIds(xml);

    if (ids.length > 0 && ids[0].includes('\n')) {
      assert.fail(
        `extractProcessIds returned ID with newlines: ${JSON.stringify(ids[0])}. ` +
        'Newlines in attribute values could enable HTTP header injection ' +
        'or DOM manipulation when used in title attributes.'
      );
    }
  });

  it('extracts very long process ID (potential DoS via memory)', () => {
    const longId = 'a'.repeat(1_000_000);
    const xml = `<bpmn:process id="${longId}">`;

    const start = Date.now();
    const ids = extractProcessIds(xml);
    const elapsed = Date.now() - start;

    assert.ok(elapsed < 500, `Extracting 1M-char ID took ${elapsed}ms`);

    if (ids.length > 0 && ids[0].length === 1_000_000) {
      // A 1MB processId is stored in memory and used in string operations
      // This is a resource exhaustion vector but might be acceptable
    }
  });

  it('extracts process ID containing backslash (path separator)', () => {
    const xml = '<bpmn:process id="..\\..\\windows\\system32">';
    const ids = extractProcessIds(xml);

    if (ids.length > 0 && ids[0].includes('\\')) {
      // Backslash in processId - on Windows, this is a path separator
      // VALID_PROCESS_ID doesn't allow backslash, so it would be rejected
      // on click. But it reaches the title attribute first.
    }
  });

  it('process ID with only whitespace after trim is excluded', () => {
    const xml = '<bpmn:process id="   ">';
    const ids = extractProcessIds(xml);

    // extractIdFromTag does .trim() and returns null for empty
    assert.deepStrictEqual(ids, [],
      'Whitespace-only process ID should be excluded');
  });
});
