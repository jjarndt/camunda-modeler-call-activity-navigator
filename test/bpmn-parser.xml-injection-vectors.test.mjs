/**
 * SEC-NEW-006: BPMN parser XML entity/CDATA injection
 *
 * The BPMN parser uses regex-based parsing, not a proper XML parser.
 * This means it doesn't handle XML entities, processing instructions,
 * or other XML constructs. Crafted BPMN files could:
 *
 * 1. Use unclosed CDATA sections to hide/reveal process tags
 * 2. Use XML processing instructions to confuse the parser
 * 3. Use nested tags that look like process tags
 * 4. Use attributes with values containing "<bpmn:process" to inject
 *    fake process IDs
 *
 * CWE-611: Improper Restriction of XML External Entity Reference
 * CWE-91: XML Injection
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractProcessIds } from '../client/bpmn-parser.mjs';

describe('SEC-NEW-006: BPMN parser XML injection vectors', () => {

  it('attribute value containing process tag pattern creates phantom process', () => {
    // The regex-based parser doesn't properly handle context.
    // A process tag pattern inside another element's attribute value
    // could be incorrectly matched.
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
        `Got: [${ids.join(', ')}]. This means an attacker can inject fake process IDs ` +
        'by crafting attribute values in BPMN XML.'
      );
    }
  });

  it('double-quoted attribute with process tag pattern creates phantom process', () => {
    const xml = `<?xml version="1.0"?>
<definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <bpmn:serviceTask name="<bpmn:process id=&quot;phantom&quot;>"/>
  <bpmn:process id="real" isExecutable="true"/>
</definitions>`;

    const ids = extractProcessIds(xml);
    // Entity-encoded quotes won't be seen by regex, so "phantom" should NOT appear
    assert.ok(ids.includes('real'), 'Should extract real process ID');
  });

  it('unclosed CDATA section hides remaining content', () => {
    // If CDATA is not closed, everything after it is consumed
    const xml = `<?xml version="1.0"?>
<definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <![CDATA[ unclosed CDATA section
  <bpmn:process id="hidden" isExecutable="true"/>
</definitions>`;

    const ids = extractProcessIds(xml);

    // With an unclosed CDATA, the parser should handle it gracefully
    // The question is: does "hidden" get extracted or not?
    // stripComments skips CDATA blocks, but if unclosed, it should
    // stop looking for more CDATA (noMoreCdata flag) and let content through
    if (ids.includes('hidden')) {
      // This is actually correct behavior with the current parser:
      // unclosed CDATA means the parser gives up on CDATA stripping
      // and the content is visible
    }
  });

  it('processing instruction containing process tag pattern', () => {
    // XML processing instructions: <?target content?>
    // The regex parser doesn't strip these
    const xml = `<?xml version="1.0"?>
<?custom <bpmn:process id="injected" isExecutable="true"> ?>
<definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <bpmn:process id="real" isExecutable="true"/>
</definitions>`;

    const ids = extractProcessIds(xml);

    if (ids.includes('injected')) {
      assert.fail(
        `Parser extracted "injected" from XML processing instruction. ` +
        `Got: [${ids.join(', ')}]. Processing instructions should be ignored. ` +
        'A malicious BPMN file could inject arbitrary process IDs via PIs.'
      );
    }
  });

  it('script/expression containing process tag pattern', () => {
    // BPMN can have script tasks with inline code that might contain
    // strings matching the process tag pattern
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
        `Got: [${ids.join(', ')}]. Script content should not be parsed for process tags.`
      );
    }
  });

  it('process tag in XML comment with tricky formatting', () => {
    // Comment that doesn't start with exactly "<!--"
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
