import test from 'node:test';
import assert from 'node:assert/strict';

import { extractProcessIds } from '../client/bpmn-parser.mjs';

test('extractProcessIds handles multiline process elements with whitespace', () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <bpmn:process
      isExecutable="true"
      id="Multiline_Process"
      name="Test">
  </bpmn:process>
</bpmn:definitions>`;

  assert.deepEqual(extractProcessIds(xml), ['Multiline_Process']);
});
