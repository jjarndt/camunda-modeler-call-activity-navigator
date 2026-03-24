/**
 * Known limitation: regex-based parser cannot distinguish top-level process
 * tags from those inside element content (e.g. documentation). A full XML
 * parser would be needed to handle this.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { extractProcessIds } from '../client/bpmn-parser.mjs';

describe('extractProcessIds - process tag in element content', () => {

  it('extracts process tags from element content (known limitation)', () => {
    const bpmn = `<?xml version="1.0"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <bpmn:documentation>some text with > <bpmn:process id="FakeProcess" /> inside docs</bpmn:documentation>
  <bpmn:process id="RealProcess" />
</bpmn:definitions>`;

    const ids = extractProcessIds(bpmn);
    assert.ok(ids.includes('RealProcess'), 'Should find real process');
    // Known limitation: FakeProcess will also be extracted since regex
    // cannot understand XML nesting depth
    assert.ok(ids.includes('FakeProcess'),
      'Known limitation: regex parser also extracts from element content');
  });
});
