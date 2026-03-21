import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { extractProcessIds } from '../client/bpmn-parser.mjs';

describe('extractProcessIds - CDATA handling', () => {
  it('matches process-like strings inside CDATA (known regex limitation)', () => {
    const xml = `<bpmn:definitions>
  <bpmn:process id="Real_Process">
    <bpmn:script><![CDATA[
      var xml = '<bpmn:process id="Fake_Process">';
    ]]></bpmn:script>
  </bpmn:process>
</bpmn:definitions>`;

    // Regex parser cannot distinguish CDATA content from real XML,
    // so both IDs are matched. This documents the known limitation.
    assert.deepEqual(extractProcessIds(xml), ['Real_Process', 'Fake_Process']);
  });
});
