/**
 * extractProcessIds must handle attribute values that contain '>' before
 * the id attribute. While unusual in practice, the XML spec does not
 * prohibit '>' inside attribute values.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractProcessIds } from '../client/bpmn-parser.mjs';

describe('extractProcessIds - greater-than in attribute value', () => {

  it('finds process id when name attribute before id contains >', () => {
    const xml = '<bpmn:process name="A > B" id="MyProcess" isExecutable="true"/>';
    const ids = extractProcessIds(xml);

    assert.deepStrictEqual(ids, ['MyProcess'],
      `Expected ['MyProcess'] but got ${JSON.stringify(ids)}`);
  });

  it('finds id when > appears after id attribute', () => {
    const xml = '<bpmn:process id="MyProcess" name="A > B" isExecutable="true"/>';
    const ids = extractProcessIds(xml);

    assert.deepStrictEqual(ids, ['MyProcess'],
      `Expected ['MyProcess'] but got ${JSON.stringify(ids)}`);
  });
});
