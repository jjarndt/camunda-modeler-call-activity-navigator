import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractProcessIds } from '../client/bpmn-parser.mjs';

describe('extractProcessIds - mixed bpmn/bpmn2 namespaces', () => {
  it('should extract process ids from both bpmn: and bpmn2: prefixed elements', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<definitions>
  <bpmn:process id="Process_V1" isExecutable="true"></bpmn:process>
  <bpmn2:process id="Process_V2" isExecutable="false"></bpmn2:process>
</definitions>`;

    const result = extractProcessIds(xml);
    assert.deepStrictEqual(result, ['Process_V1', 'Process_V2']);
  });
});
