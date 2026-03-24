/**
 * BUG-FINDER-API-001: extractProcessIds returns duplicate process IDs
 * when BPMN contains multiple process tags with the same id.
 * This is inconsistent with ProcessIndex.setFileIndex which deduplicates.
 * Consumers calling extractProcessIds directly (like _tryRelativePaths line 256:
 *   processIds.includes(processId)) will work, but length-based checks are wrong.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { extractProcessIds } from '../client/bpmn-parser.mjs';

describe('BUG-FINDER-API-001: extractProcessIds duplicate handling', () => {

  it('should return unique process IDs when same ID appears in multiple process tags', () => {
    const bpmn = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <bpmn:process id="MyProcess" isExecutable="true" />
  <bpmn:process id="MyProcess" isExecutable="false" />
</bpmn:definitions>`;

    const ids = extractProcessIds(bpmn);
    // If extractProcessIds returns duplicates, this is an API inconsistency
    // because ProcessIndex.setFileIndex deduplicates, but direct callers
    // (like index.js line 256) get duplicates
    const unique = [...new Set(ids)];
    assert.deepStrictEqual(ids, unique,
      'extractProcessIds should not return duplicate process IDs');
  });
});
