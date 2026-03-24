/**
 * XML spec (Production 25) allows optional whitespace around '=' in
 * attributes: Eq ::= S? '=' S?
 * Verify extractIdFromTag handles id = "value" with spaces around =.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractProcessIds } from '../client/bpmn-parser.mjs';

describe('extractProcessIds - spaces around = in id attribute', () => {

  it('extracts id when space before =', () => {
    const xml = '<bpmn:process id ="SpaceBefore" />';
    const ids = extractProcessIds(xml);
    assert.deepStrictEqual(ids, ['SpaceBefore'],
      `Expected ['SpaceBefore'] but got ${JSON.stringify(ids)}`);
  });

  it('extracts id when space after =', () => {
    const xml = '<bpmn:process id= "SpaceAfter" />';
    const ids = extractProcessIds(xml);
    assert.deepStrictEqual(ids, ['SpaceAfter'],
      `Expected ['SpaceAfter'] but got ${JSON.stringify(ids)}`);
  });

  it('extracts id when spaces around =', () => {
    const xml = '<bpmn:process id = "SpaceBoth" />';
    const ids = extractProcessIds(xml);
    assert.deepStrictEqual(ids, ['SpaceBoth'],
      `Expected ['SpaceBoth'] but got ${JSON.stringify(ids)}`);
  });
});
