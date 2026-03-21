import test from 'node:test';
import assert from 'node:assert/strict';

import { extractProcessIds } from '../client/bpmn-parser.mjs';

test('extractProcessIds skips process elements with empty id attribute', () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <bpmn:process id="" isExecutable="true"></bpmn:process>
  <bpmn:process id="Valid_1" isExecutable="true"></bpmn:process>
</bpmn:definitions>`;

  assert.deepEqual(extractProcessIds(xml), ['Valid_1']);
});
