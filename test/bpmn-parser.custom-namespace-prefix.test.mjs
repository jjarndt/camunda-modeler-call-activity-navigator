/**
 * BUG-FINDER-API-020: extractProcessIds SAFE_PROCESS_ID regex is /^[^\s/\\<>"']+$/
 * This means it accepts Unicode characters, control chars (already stripped),
 * but also accepts empty string after trim.
 *
 * Edge case: extractIdFromTag trims the id value (line 121: content.slice(j+1, end).trim())
 * What if the id is entirely whitespace? After trim -> ''. SAFE_PROCESS_ID.test('') -> false.
 * Good.
 *
 * But what about: id value with embedded null character?
 * stripControlChars removes \x00-\x1f and \x7f from the content.
 * So the id would have null stripped. But extractIdFromTag runs AFTER stripNonContent.
 * The trim in extractIdFromTag is on the already-stripped content.
 *
 * Real issue: PROCESS_TAG_RE = /<(?:bpmn2?:)?process\s/g
 * This matches <process, <bpmn:process, <bpmn2:process.
 * But it does NOT match <ns:process where ns is a custom namespace prefix.
 * In real BPMN files, the namespace prefix could be anything.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { extractProcessIds } from '../client/bpmn-parser.mjs';

describe('BUG-FINDER-API-020: extractProcessIds custom namespace prefix', () => {

  it('should extract process IDs with custom namespace prefix', () => {
    const bpmn = `<?xml version="1.0"?>
<definitions xmlns:myns="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <myns:process id="CustomNsProcess" />
</definitions>`;

    const ids = extractProcessIds(bpmn);
    // The regex only matches bpmn: or bpmn2: prefixes
    // Custom namespace prefixes will be missed
    assert.ok(ids.includes('CustomNsProcess'),
      'Should extract process IDs with custom namespace prefix like myns:process');
  });

  it('should extract process IDs without namespace prefix', () => {
    const bpmn = `<?xml version="1.0"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <process id="NoNsProcess" />
</definitions>`;

    const ids = extractProcessIds(bpmn);
    assert.ok(ids.includes('NoNsProcess'),
      'Should extract process IDs without namespace prefix');
  });

  it('should extract process IDs with bpmn2: prefix', () => {
    const bpmn = `<?xml version="1.0"?>
<bpmn2:definitions xmlns:bpmn2="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <bpmn2:process id="Bpmn2Process" />
</bpmn2:definitions>`;

    const ids = extractProcessIds(bpmn);
    assert.ok(ids.includes('Bpmn2Process'),
      'Should extract process IDs with bpmn2: prefix');
  });
});
