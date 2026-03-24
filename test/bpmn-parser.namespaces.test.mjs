import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { extractProcessIds } from '../client/bpmn-parser.mjs';

describe('extractProcessIds - namespace prefix handling', () => {

  it('extracts process ids from both bpmn: and bpmn2: prefixed elements', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<definitions>
  <bpmn:process id="Process_V1" isExecutable="true"></bpmn:process>
  <bpmn2:process id="Process_V2" isExecutable="false"></bpmn2:process>
</definitions>`;

    assert.deepStrictEqual(extractProcessIds(xml), ['Process_V1', 'Process_V2']);
  });

  it('extracts <process id="..."> without namespace prefix', () => {
    const bpmn = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <process id="myProcess" isExecutable="true">
  </process>
</definitions>`;

    assert.deepStrictEqual(extractProcessIds(bpmn), ['myProcess']);
  });

  it('extracts <bpmn:process id="..."> with standard prefix', () => {
    const bpmn = `<bpmn:definitions><bpmn:process id="stdProcess"></bpmn:process></bpmn:definitions>`;
    assert.deepStrictEqual(extractProcessIds(bpmn), ['stdProcess']);
  });

  it('extracts <bpmn2:process id="..."> with bpmn2 prefix', () => {
    const bpmn = `<bpmn2:definitions><bpmn2:process id="bpmn2Process"></bpmn2:process></bpmn2:definitions>`;
    assert.deepStrictEqual(extractProcessIds(bpmn), ['bpmn2Process']);
  });

  it('extracts process ids with custom namespace prefix', () => {
    const bpmn = `<?xml version="1.0"?>
<definitions xmlns:myns="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <myns:process id="CustomNsProcess" />
</definitions>`;

    const ids = extractProcessIds(bpmn);
    assert.ok(ids.includes('CustomNsProcess'),
      'Should extract process IDs with custom namespace prefix like myns:process');
  });
});
