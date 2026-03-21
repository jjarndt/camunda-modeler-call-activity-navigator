import test from 'node:test';
import assert from 'node:assert/strict';

import { extractProcessIds } from '../client/bpmn-parser.mjs';

test('extractProcessIds returns duplicate IDs when same id appears multiple times', () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <bpmn:process id="Dup" isExecutable="true" />
  <bpmn:process id="Dup" isExecutable="false" />
</bpmn:definitions>`;

  assert.deepEqual(extractProcessIds(xml), ['Dup', 'Dup']);
});
