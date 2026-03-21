import test from 'node:test';
import assert from 'node:assert/strict';

import { extractProcessIds } from '../client/bpmn-parser.mjs';

test('extractProcessIds skips process elements without id attribute', () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <bpmn:process isExecutable="true" name="NoId"></bpmn:process>
  <bpmn:process id="HasId" isExecutable="true"></bpmn:process>
</bpmn:definitions>`;

  assert.deepEqual(extractProcessIds(xml), ['HasId']);
});
