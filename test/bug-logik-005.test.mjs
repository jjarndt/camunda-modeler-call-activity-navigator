/**
 * Bug-Logik-005: extractProcessIds regex uses [\s>] after "bpmn:process",
 * allowing '>' to match. This means the regex can "escape" the opening tag
 * and match id="..." in the XML body, producing false positives.
 *
 * Example: <bpmn:process> followed by a child element with id="FakeProcess"
 * should NOT be extracted, but the regex may match it.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractProcessIds } from '../client/bpmn-parser.mjs';

describe('BUG-LOGIK-005: extractProcessIds false positive from > in [\s>]', () => {

  it('should NOT extract id from child element after <bpmn:process> (no attributes)', () => {
    // Here <bpmn:process> has no id attribute itself (contrived but legal).
    // The regex [\s>] can match >, then the rest of the regex tries to find
    // id="..." in the body content that follows.
    const xml = [
      '<bpmn:definitions>',
      '  <bpmn:process>',
      '    <bpmn:startEvent id="FakeProcess" name="Start"/>',
      '  </bpmn:process>',
      '</bpmn:definitions>'
    ].join('\n');

    const ids = extractProcessIds(xml);

    // The correct behavior: no process id should be extracted because
    // <bpmn:process> has no id attribute. The startEvent id is not a process id.
    assert.deepEqual(
      ids,
      [],
      `Expected [] but got ${JSON.stringify(ids)}. The regex matched a non-process id due to > in [\\s>].`
    );
  });

  it('should NOT extract id from a subsequent element when process tag has > before id', () => {
    // Process has name but no id, followed by a task with id
    const xml = [
      '<bpmn:definitions>',
      '  <bpmn:process name="Test">',
      '    <bpmn:task id="NotAProcessId"/>',
      '  </bpmn:process>',
      '</bpmn:definitions>'
    ].join('\n');

    const ids = extractProcessIds(xml);

    assert.deepEqual(
      ids,
      [],
      `Expected [] but got ${JSON.stringify(ids)}. Regex escaped through > and matched task id.`
    );
  });
});
