import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { extractProcessIds } from '../client/bpmn-parser.mjs';

describe('extractProcessIds - missing id attribute', () => {
  it('should skip process elements without id and return only those with id', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <bpmn:process isExecutable="true" name="NoId"></bpmn:process>
  <bpmn:process id="HasId" isExecutable="true"></bpmn:process>
</bpmn:definitions>`;

    assert.deepEqual(extractProcessIds(xml), ['HasId']);
  });
});
