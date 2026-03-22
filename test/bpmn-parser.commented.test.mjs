import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { extractProcessIds } from '../client/bpmn-parser.mjs';

describe('extractProcessIds - XML comments', () => {
  it('ignores process ids from inside XML comments', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <!-- <bpmn:process id="Commented_Out" isExecutable="false"> -->
  <bpmn:process id="Active_Process" isExecutable="true"></bpmn:process>
</bpmn:definitions>`;

    assert.deepEqual(extractProcessIds(xml), ['Active_Process']);
  });
});
