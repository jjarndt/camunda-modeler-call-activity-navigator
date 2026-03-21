import test from 'node:test';
import assert from 'node:assert/strict';

import { extractProcessIds } from '../client/bpmn-parser.mjs';

test('extractProcessIds matches process elements inside XML comments (known limitation)', () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <!-- <bpmn:process id="Commented_Out" isExecutable="false"> -->
  <bpmn:process id="Active_Process" isExecutable="true"></bpmn:process>
</bpmn:definitions>`;

  assert.deepEqual(extractProcessIds(xml), ['Commented_Out', 'Active_Process']);
});
