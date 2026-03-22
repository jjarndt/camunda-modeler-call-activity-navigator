import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NavigatorSearch } from '../client/navigator-search.mjs';
import { ProcessIndex } from '../client/process-index.mjs';

describe('BUG-LOGIK-018: searchInKnownFiles early-break skips nearby candidate', () => {

  it('should prefer nearby file over already-indexed distant file', async () => {
    const index = new ProcessIndex();

    // Pre-index a DISTANT file with the target process
    index.setFileIndex('/far/away/distant.bpmn', ['TargetProcess']);

    // Two nearby candidate files (not yet indexed)
    const fileContents = {
      '/project/src/noMatch.bpmn': '<bpmn:process id="OtherProcess" />',
      '/project/src/nearby.bpmn': '<bpmn:process id="TargetProcess" />',
      '/far/away/distant.bpmn': '<bpmn:process id="TargetProcess" />'
    };

    const search = new NavigatorSearch({
      fileSystem: {
        readFile: async (p) => ({ contents: fileContents[p] || '' })
      },
      index
    });

    const knownFiles = new Set([
      '/project/src/noMatch.bpmn',
      '/project/src/nearby.bpmn',
      '/far/away/distant.bpmn'
    ]);

    const result = await search.searchInKnownFiles(
      'TargetProcess',
      '/project/src/current.bpmn',
      knownFiles
    );

    // The bug: the loop indexes noMatch.bpmn first (it's nearby but doesn't
    // have the process). After indexing it, getLocations returns the distant
    // file (already indexed). The break condition fires because there IS a
    // non-current location. The loop breaks BEFORE indexing nearby.bpmn.
    // findBestMatch then returns the distant file instead of the nearby one.
    assert.strictEqual(
      result, '/project/src/nearby.bpmn',
      `Should return nearby file, not distant. Got: ${result}`
    );
  });
});
