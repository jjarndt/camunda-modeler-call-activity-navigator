import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { extractProcessIds } from '../client/bpmn-parser.mjs';

describe('extractProcessIds - CDATA handling', () => {
  it('ignores process-like strings inside CDATA', () => {
    const xml = `<bpmn:definitions>
  <bpmn:process id="Real_Process">
    <bpmn:script><![CDATA[
      var xml = '<bpmn:process id="Fake_Process">';
    ]]></bpmn:script>
  </bpmn:process>
</bpmn:definitions>`;

    assert.deepEqual(extractProcessIds(xml), ['Real_Process']);
  });
});
