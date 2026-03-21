import test from 'node:test';
import assert from 'node:assert/strict';

import { extractProcessIds } from '../client/bpmn-parser.mjs';

test('extractProcessIds extracts IDs from document with many process elements', () => {
  const processes = Array.from({length: 10}, (_, i) =>
    `<bpmn:process id="Process_${i + 1}" isExecutable="true"></bpmn:process>`
  );
  const xml = `<bpmn:definitions>${processes.join('\n')}</bpmn:definitions>`;

  const expected = Array.from({length: 10}, (_, i) => `Process_${i + 1}`);
  assert.deepEqual(extractProcessIds(xml), expected);
});
