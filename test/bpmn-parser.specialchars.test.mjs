import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { extractProcessIds } from '../client/bpmn-parser.mjs';

describe('extractProcessIds - special characters in IDs', () => {
  it('should parse process IDs containing dots, hyphens, underscores, and colons', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <bpmn:process id="com.example.my-process_v1.0:main" isExecutable="true" />
</bpmn:definitions>`;

    assert.deepEqual(extractProcessIds(xml), ['com.example.my-process_v1.0:main']);
  });
});
