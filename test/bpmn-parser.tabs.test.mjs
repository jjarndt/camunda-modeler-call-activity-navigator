import test from 'node:test';
import assert from 'node:assert/strict';

import { extractProcessIds } from '../client/bpmn-parser.mjs';

test('extractProcessIds handles tab-indented attributes', () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <bpmn:process\tisExecutable="true"\tid="Tab_Process"\tname="Tabbed">
  </bpmn:process>
</bpmn:definitions>`;

  assert.deepEqual(extractProcessIds(xml), ['Tab_Process']);
});
