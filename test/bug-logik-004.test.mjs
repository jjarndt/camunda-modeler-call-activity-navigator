/**
 * Bug-Logik-004: bpmn-parser regex fails when a process attribute value
 * contains a '>' character before the 'id' attribute.
 *
 * The regex /<bpmn2?:process[^>]+id="([^"]+)"/g uses [^>]+ to match
 * attributes between the tag name and id="...". If any attribute value
 * contains '>', the [^>]+ stops there and the id attribute is not found.
 *
 * While > in attribute values is technically poor XML practice,
 * it is not prohibited by the XML spec for attribute values in
 * non-validating parsers, and BPMN process names could contain '>'.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractProcessIds } from '../client/bpmn-parser.mjs';

describe('BUG-LOGIK-004: extractProcessIds fails when attribute value before id contains >', () => {

  it('misses process id when name attribute contains >', () => {
    // A BPMN process with name="A > B" before the id attribute
    const xml = '<bpmn:process name="A > B" id="MyProcess" isExecutable="true"/>';
    const ids = extractProcessIds(xml);

    assert.deepEqual(
      ids,
      ['MyProcess'],
      `Expected ['MyProcess'] but got ${JSON.stringify(ids)}. The > in name attribute broke the regex.`
    );
  });

  it('still finds id when > appears after id attribute (not broken case)', () => {
    // Just to confirm: id before name="A > B" works fine
    const xml = '<bpmn:process id="MyProcess" name="A > B" isExecutable="true"/>';
    const ids = extractProcessIds(xml);

    assert.deepEqual(
      ids,
      ['MyProcess'],
      `Expected ['MyProcess'] but got ${JSON.stringify(ids)}`
    );
  });

});
