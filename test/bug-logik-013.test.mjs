/**
 * Bug-Logik-013: extractIdFromTag fails when there are spaces around the '='
 * in the id attribute (e.g., id = "MyProcess").
 *
 * XML spec (Production 25) allows optional whitespace: Eq ::= S? '=' S?
 * The parser uses content.startsWith('id=', i) which requires 'id=' with
 * no spaces. A process tag with id = "value" (spaces around =) will not
 * have its process ID extracted.
 *
 * While uncommon in BPMN tools, this is valid XML and could appear in
 * hand-edited or third-party-generated files.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractProcessIds } from '../client/bpmn-parser.mjs';

describe('BUG-LOGIK-013: extractIdFromTag fails with spaces around = in id attribute', () => {

  it('should extract id when space before =', () => {
    const xml = '<bpmn:process id ="SpaceBefore" />';
    const ids = extractProcessIds(xml);
    assert.deepEqual(
      ids,
      ['SpaceBefore'],
      `Expected ['SpaceBefore'] but got ${JSON.stringify(ids)}. Space before = broke extraction.`
    );
  });

  it('should extract id when space after =', () => {
    const xml = '<bpmn:process id= "SpaceAfter" />';
    const ids = extractProcessIds(xml);
    assert.deepEqual(
      ids,
      ['SpaceAfter'],
      `Expected ['SpaceAfter'] but got ${JSON.stringify(ids)}. Space after = broke extraction.`
    );
  });

  it('should extract id when spaces around =', () => {
    const xml = '<bpmn:process id = "SpaceBoth" />';
    const ids = extractProcessIds(xml);
    assert.deepEqual(
      ids,
      ['SpaceBoth'],
      `Expected ['SpaceBoth'] but got ${JSON.stringify(ids)}. Spaces around = broke extraction.`
    );
  });
});
