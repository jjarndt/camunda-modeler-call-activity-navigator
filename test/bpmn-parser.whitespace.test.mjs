import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { extractProcessIds } from '../client/bpmn-parser.mjs';

describe('extractProcessIds - whitespace and empty id handling', () => {

  it('handles multiline process elements with whitespace', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <bpmn:process
      isExecutable="true"
      id="Multiline_Process"
      name="Test">
  </bpmn:process>
</bpmn:definitions>`;

    assert.deepStrictEqual(extractProcessIds(xml), ['Multiline_Process']);
  });

  it('skips process elements whose id is an empty string', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <bpmn:process id="" isExecutable="true"></bpmn:process>
  <bpmn:process id="Valid_1" isExecutable="true"></bpmn:process>
</bpmn:definitions>`;

    assert.deepStrictEqual(extractProcessIds(xml), ['Valid_1']);
  });

  it('does not extract empty id=""', () => {
    const content = '<bpmn:process id="" isExecutable="true"/>';
    const ids = extractProcessIds(content);
    assert.equal(ids.length, 0,
      'empty id="" should not be extracted');
  });

  it('does not extract whitespace-only id=" "', () => {
    const content = '<bpmn:process id=" " isExecutable="true"/>';
    const ids = extractProcessIds(content);
    assert.equal(ids.length, 0,
      'whitespace-only id should not be extracted as a valid process ID');
  });

  it('parses process id when attributes are separated by tabs', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <bpmn:process\tisExecutable="true"\tid="Tab_Process"\tname="Tabbed">
  </bpmn:process>
</bpmn:definitions>`;

    assert.deepStrictEqual(extractProcessIds(xml), ['Tab_Process']);
  });
});
