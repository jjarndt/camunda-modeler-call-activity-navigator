import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractProcessIds } from '../client/bpmn-parser.mjs';

describe('bug-sec-008: nested XML comments leak hidden process tags', () => {

  it('should NOT extract process ids hidden between nested comment markers', () => {
    // XML forbids nested comments, but a crafted payload uses nested <!-- -->
    // to trick stripComments into leaving a process tag visible.
    // <!-- outer <!-- inner --> <bpmn:process id="injected"> -->
    // After stripComments: the outer comment ends at the first "-->" (inner end),
    // leaving " <bpmn:process id="injected"> -->" in the output.
    const xml = `<?xml version="1.0"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
             xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <!-- hidden <!-- nested --> <bpmn:process id="injected" isExecutable="true"> -->
  <bpmn:process id="legitimate" isExecutable="true">
    <bpmn:startEvent id="start"/>
  </bpmn:process>
</definitions>`;

    const ids = extractProcessIds(xml);

    // The "injected" process id should NOT be extracted because it was
    // inside a comment. If it IS extracted, the parser is fooled by nested comments.
    assert.ok(
      !ids.includes('injected'),
      `Parser was tricked by nested comments into extracting "injected". Got: [${ids.join(', ')}]`
    );
    assert.ok(
      ids.includes('legitimate'),
      'Should still extract the legitimate process id'
    );
  });

  it('should not extract process ids from CDATA-like comment trick', () => {
    // A variation: comment ends early due to nested structure, revealing process tag
    const xml = `<?xml version="1.0"?>
<definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <!-- start of comment <!-- --> <bpmn:process id="sneaky" isExecutable="true"> <!-- -->
  <bpmn:process id="real" isExecutable="true"/>
</definitions>`;

    const ids = extractProcessIds(xml);

    assert.ok(
      !ids.includes('sneaky'),
      `Parser was tricked into extracting "sneaky" from nested comment. Got: [${ids.join(', ')}]`
    );
  });
});
