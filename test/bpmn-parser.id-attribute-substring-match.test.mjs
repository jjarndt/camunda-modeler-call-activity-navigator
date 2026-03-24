/**
 * extractIdFromTag must not match "id=" as a substring of longer
 * attribute names like "customid=", "xmlid=", or "valid=".
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { extractProcessIds } from '../client/bpmn-parser.mjs';

describe('extractProcessIds - id attribute substring match prevention', () => {

  it('does not extract from customid= when id= follows', () => {
    const bpmn = `<bpmn:process customid="wrong" id="correct"></bpmn:process>`;
    assert.deepStrictEqual(extractProcessIds(bpmn), ['correct']);
  });

  it('does not extract from valid= attribute', () => {
    const bpmn = `<bpmn:process valid="notThis" id="realId"></bpmn:process>`;
    assert.deepStrictEqual(extractProcessIds(bpmn), ['realId']);
  });

  it('does not extract from xmlid= attribute', () => {
    const bpmn = `<bpmn:process xmlid="xml123" id="bpmnId"></bpmn:process>`;
    assert.deepStrictEqual(extractProcessIds(bpmn), ['bpmnId']);
  });

  it('works correctly when id= is the first attribute', () => {
    const bpmn = `<bpmn:process id="firstId" customid="other"></bpmn:process>`;
    assert.deepStrictEqual(extractProcessIds(bpmn), ['firstId']);
  });
});
