import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { extractProcessIds } from '../client/bpmn-parser.mjs';

describe('extractProcessIds - quote handling', () => {

  it('extracts process ids wrapped in single quotes', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <bpmn:process id='SingleQuoted_1' isExecutable="true" />
</bpmn:definitions>`;

    assert.deepEqual(extractProcessIds(xml), ['SingleQuoted_1']);
  });

});
