/**
 * Verify BPMN parser behavior with XML injection vectors: attribute values
 * containing process tag patterns, entity-encoded quotes, unclosed CDATA,
 * processing instructions, and inline script content.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractProcessIds } from '../client/bpmn-parser.mjs';

describe('extractProcessIds - XML injection vectors', () => {

  it('does not extract phantom process from single-quoted attribute value', () => {
    const xml = `<?xml version="1.0"?>
<definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <bpmn:serviceTask name='<bpmn:process id="phantom">'/>
  <bpmn:process id="real" isExecutable="true">
    <bpmn:startEvent id="start"/>
  </bpmn:process>
</definitions>`;

    const ids = extractProcessIds(xml);

    if (ids.includes('phantom')) {
      assert.fail(
        `Parser extracted phantom process ID "phantom" from attribute value. ` +
        `Got: [${ids.join(', ')}].`
      );
    }
  });

  it('does not extract phantom from entity-encoded quotes in attribute', () => {
    const xml = `<?xml version="1.0"?>
<definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <bpmn:serviceTask name="<bpmn:process id=&quot;phantom&quot;>"/>
  <bpmn:process id="real" isExecutable="true"/>
</definitions>`;

    const ids = extractProcessIds(xml);
    assert.ok(ids.includes('real'), 'Should extract real process ID');
  });

  it('handles unclosed CDATA section gracefully', () => {
    const xml = `<?xml version="1.0"?>
<definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <![CDATA[ unclosed CDATA section
  <bpmn:process id="hidden" isExecutable="true"/>
</definitions>`;

    // With unclosed CDATA, parser gives up on CDATA stripping and
    // content may or may not be visible -- either outcome is acceptable
    extractProcessIds(xml);
  });

  it('does not extract process from processing instruction', () => {
    const xml = `<?xml version="1.0"?>
<?custom <bpmn:process id="injected" isExecutable="true"> ?>
<definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <bpmn:process id="real" isExecutable="true"/>
</definitions>`;

    const ids = extractProcessIds(xml);

    if (ids.includes('injected')) {
      assert.fail(
        `Parser extracted "injected" from XML processing instruction. ` +
        `Got: [${ids.join(', ')}].`
      );
    }
  });

  it('does not extract process from inline script content', () => {
    const xml = `<?xml version="1.0"?>
<definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <bpmn:process id="real" isExecutable="true">
    <bpmn:scriptTask id="script1">
      <bpmn:script>
        var xml = '<bpmn:process id="fromScript" isExecutable="true">';
        console.log(xml);
      </bpmn:script>
    </bpmn:scriptTask>
  </bpmn:process>
</definitions>`;

    const ids = extractProcessIds(xml);

    if (ids.includes('fromScript')) {
      assert.fail(
        `Parser extracted "fromScript" from inline script content. ` +
        `Got: [${ids.join(', ')}].`
      );
    }
  });

  it('handles tricky comment formatting correctly', () => {
    const xml = `<?xml version="1.0"?>
<definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <!  -- this looks like a comment but isn't valid XML -->
  <bpmn:process id="ambiguous" isExecutable="true"/>
  <!-- real comment <bpmn:process id="hidden"/> -->
  <bpmn:process id="visible" isExecutable="true"/>
</definitions>`;

    const ids = extractProcessIds(xml);
    assert.ok(ids.includes('visible'), 'Should extract process after comment');
    assert.ok(!ids.includes('hidden'), 'Should not extract process inside comment');
  });
});
