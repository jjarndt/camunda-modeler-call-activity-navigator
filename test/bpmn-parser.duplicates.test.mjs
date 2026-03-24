import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { extractProcessIds } from '../client/bpmn-parser.mjs';

describe('extractProcessIds - duplicate ID handling', () => {

  it('deduplicates when the same process ID appears multiple times', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <bpmn:process id="Dup" isExecutable="true" />
  <bpmn:process id="Dup" isExecutable="false" />
</bpmn:definitions>`;

    assert.deepStrictEqual(extractProcessIds(xml), ['Dup']);
  });

  it('returns unique process IDs when same ID appears in multiple process tags', () => {
    const bpmn = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <bpmn:process id="MyProcess" isExecutable="true" />
  <bpmn:process id="MyProcess" isExecutable="false" />
</bpmn:definitions>`;

    const ids = extractProcessIds(bpmn);
    const unique = [...new Set(ids)];
    assert.deepStrictEqual(ids, unique,
      'extractProcessIds should not return duplicate process IDs');
  });
});
