import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractProcessIds } from '../client/bpmn-parser.mjs';

describe('bug-sec-008: nested XML comments and process tag extraction', () => {

  it('should extract process ids that appear after first --> per XML spec', () => {
    // Per XML spec, --> always ends a comment. Nested <!-- inside comments are
    // not special. So in:
    //   <!-- hidden <!-- nested --> <bpmn:process id="visible"> -->
    // The comment ends at the first -->. Everything after is visible content.
    // "visible" is a valid process tag that SHOULD be extracted.
    const xml = `<?xml version="1.0"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
             xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <!-- hidden <!-- nested --> <bpmn:process id="visible" isExecutable="true"> -->
  <bpmn:process id="legitimate" isExecutable="true">
    <bpmn:startEvent id="start"/>
  </bpmn:process>
</definitions>`;

    const ids = extractProcessIds(xml);

    // Per XML spec, "visible" is NOT inside a comment -- it appears after -->
    assert.ok(
      ids.includes('visible'),
      `"visible" appears after comment end and should be extracted. Got: [${ids.join(', ')}]`
    );
    assert.ok(
      ids.includes('legitimate'),
      'Should still extract the legitimate process id'
    );
  });

  it('should handle multiple comments without consuming content between them', () => {
    // Two separate comments with a process tag in between
    const xml = `<?xml version="1.0"?>
<definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <!-- start of comment <!-- --> <bpmn:process id="between" isExecutable="true"/> <!-- -->
  <bpmn:process id="real" isExecutable="true"/>
</definitions>`;

    const ids = extractProcessIds(xml);

    // "between" is between two comments and should be extracted
    assert.ok(
      ids.includes('between'),
      `"between" appears between comments and should be extracted. Got: [${ids.join(', ')}]`
    );
    assert.ok(
      ids.includes('real'),
      'Should extract the real process id'
    );
  });
});
