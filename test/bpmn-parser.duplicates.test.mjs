import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { extractProcessIds } from '../client/bpmn-parser.mjs';

describe('extractProcessIds - duplicate IDs', () => {
  it('should deduplicate when the same process ID appears multiple times', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <bpmn:process id="Dup" isExecutable="true" />
  <bpmn:process id="Dup" isExecutable="false" />
</bpmn:definitions>`;

    assert.deepEqual(extractProcessIds(xml), ['Dup']);
  });
});
