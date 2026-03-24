/**
 * Verify the known validation gap between bpmn-parser (broad extraction)
 * and navigator (strict VALID_PROCESS_ID check). The parser extracts all
 * syntactically valid IDs; the navigator rejects special characters on click.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { extractProcessIds } from '../client/bpmn-parser.mjs';

describe('extractProcessIds - process ID validation gap', () => {

  it('accepts IDs with colons', () => {
    const bpmn = `<?xml version="1.0"?><bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
      <bpmn:process id="my:process" />
    </bpmn:definitions>`;

    const ids = extractProcessIds(bpmn);
    assert.ok(ids.includes('my:process'),
      'Parser should extract process IDs containing colons');
  });

  it('VALID_PROCESS_ID regex rejects colons', () => {
    const VALID_PROCESS_ID = /^(?!(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$))[a-zA-Z0-9_\-.]+$/i;

    assert.equal(VALID_PROCESS_ID.test('my:process'), false,
      'VALID_PROCESS_ID should reject colons');
    assert.equal(VALID_PROCESS_ID.test('Process_12345'), true,
      'VALID_PROCESS_ID should accept underscores');
  });

  it('parser extracts broadly, navigator validates strictly (documented behavior)', () => {
    const VALID_PROCESS_ID = /^(?!(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$))[a-zA-Z0-9_\-.]+$/i;

    const bpmn = `<?xml version="1.0"?><bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"><bpmn:process id="my:process" /></bpmn:definitions>`;
    const extracted = extractProcessIds(bpmn);
    assert.ok(extracted.includes('my:process'), 'Parser extracts broadly');
    assert.ok(!VALID_PROCESS_ID.test('my:process'), 'Navigator rejects special chars');
  });
});
