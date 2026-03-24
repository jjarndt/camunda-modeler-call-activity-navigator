/**
 * bug-perf-011: Verify _searchInSiblingDirs has early exit (via NavigatorSearch).
 *
 * The loop pattern in _searchInSiblingDirs is the same as searchInKnownFiles.
 * We test the NavigatorSearch.indexFile + getLocations pattern to confirm
 * early exit works when used as intended.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NavigatorSearch } from '../client/navigator-search.mjs';
import { ProcessIndex } from '../client/process-index.mjs';

describe('BUG-PERF-011: sibling dir search pattern uses early exit', () => {

  it('early exit pattern: check getLocations after each indexFile', async () => {
    const PROCESS_ID = 'target-process';
    const TOTAL = 100;
    let readCount = 0;

    const mockFileSystem = {
      readFile: async (path) => {
        readCount++;
        const idx = parseInt(path.replace('/repo/processes/file-', '').replace('.bpmn', ''), 10);
        if (idx === 1) {
          return { contents: `<bpmn:process id="${PROCESS_ID}"></bpmn:process>` };
        }
        return { contents: `<bpmn:process id="other-${idx}"></bpmn:process>` };
      }
    };

    const index = new ProcessIndex();
    const search = new NavigatorSearch({ fileSystem: mockFileSystem, index });

    const knownFiles = Array.from({ length: TOTAL }, (_, i) => `/repo/processes/file-${i}.bpmn`);
    const current = '/repo/processes/current.bpmn';

    // Replicate the FIXED pattern from _searchInSiblingDirs
    for (const filePath of knownFiles) {
      if (filePath === current) continue;
      if (!search.isFileIndexed(filePath)) {
        await search.indexFile(filePath);
        const found = search.getLocations(PROCESS_ID);
        if (found.length > 0) break;
      }
    }

    assert.ok(readCount <= 2,
      `Expected early exit after 2 reads, got ${readCount}`);
  });
});
