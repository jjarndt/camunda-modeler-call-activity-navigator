/**
 * Verify extractProcessIds does not produce false positives when a
 * process tag's > allows the regex to escape into subsequent child
 * elements' id attributes.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractProcessIds } from '../client/bpmn-parser.mjs';

describe('extractProcessIds - tag escape false positive prevention', () => {

  it('does not extract id from child element after <bpmn:process> (no attributes)', () => {
    const xml = [
      '<bpmn:definitions>',
      '  <bpmn:process>',
      '    <bpmn:startEvent id="FakeProcess" name="Start"/>',
      '  </bpmn:process>',
      '</bpmn:definitions>'
    ].join('\n');

    const ids = extractProcessIds(xml);
    assert.deepStrictEqual(ids, [],
      `Expected [] but got ${JSON.stringify(ids)}`);
  });

  it('does not extract id from subsequent element when process tag closes before id', () => {
    const xml = [
      '<bpmn:definitions>',
      '  <bpmn:process name="Test">',
      '    <bpmn:task id="NotAProcessId"/>',
      '  </bpmn:process>',
      '</bpmn:definitions>'
    ].join('\n');

    const ids = extractProcessIds(xml);
    assert.deepStrictEqual(ids, [],
      `Expected [] but got ${JSON.stringify(ids)}`);
  });
});
