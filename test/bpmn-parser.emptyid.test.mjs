import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { extractProcessIds } from '../client/bpmn-parser.mjs';

describe('extractProcessIds - empty id attribute', () => {
  it('should skip process elements whose id is an empty string', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <bpmn:process id="" isExecutable="true"></bpmn:process>
  <bpmn:process id="Valid_1" isExecutable="true"></bpmn:process>
</bpmn:definitions>`;

    assert.deepEqual(extractProcessIds(xml), ['Valid_1']);
  });
});
