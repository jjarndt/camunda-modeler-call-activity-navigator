import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { NavigatorSearch } from '../client/navigator-search.mjs';
import { ProcessIndex } from '../client/process-index.mjs';

function createMockFS(files) {
  return {
    readFile: async (path) => {
      if (files.has(path)) return { contents: files.get(path) };
      throw new Error('File not found');
    }
  };
}

describe('NavigatorSearch - self-file exclusion', () => {

  it('searchInKnownFiles returns null when only match is current file', async () => {
    const bpmn = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  id="Defs_1" targetNamespace="http://example.com">
  <bpmn:process id="MyProc" isExecutable="true">
    <bpmn:startEvent id="StartEvent_1" />
  </bpmn:process>
</bpmn:definitions>`;

    const fileSystem = createMockFS(new Map([['/proj/self.bpmn', bpmn]]));
    const index = new ProcessIndex();
    const search = new NavigatorSearch({ fileSystem, index });

    const knownFiles = new Set(['/proj/self.bpmn']);
    const result = await search.searchInKnownFiles('MyProc', '/proj/self.bpmn', knownFiles);

    assert.equal(result, null);
  });

});
