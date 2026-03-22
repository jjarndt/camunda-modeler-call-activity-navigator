/**
 * BUG-API-004: bpmn-parser extractProcessIds matches process IDs inside XML comments
 *
 * The regex /<bpmn2?:process[^>]+id="([^"]+)"/g has no awareness of XML comments.
 * A process element inside <!-- ... --> should NOT be extracted, but it will be.
 *
 * Also tests: process tag with id attribute BEFORE other attributes (tab/space variants).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { extractProcessIds } from '../client/bpmn-parser.mjs';

describe('BUG-API-004: extractProcessIds matches process IDs in XML comments', () => {

  it('does not extract processId from within XML comment <!-- -->', () => {
    const content = `
      <?xml version="1.0"?>
      <bpmn:definitions>
        <!-- <bpmn:process id="commented-out-process" isExecutable="true"/> -->
        <bpmn:process id="real-process" isExecutable="true"/>
      </bpmn:definitions>
    `;

    const ids = extractProcessIds(content);

    assert.ok(!ids.includes('commented-out-process'),
      'commented-out process ID must NOT be extracted');
    assert.ok(ids.includes('real-process'),
      'real process ID must be extracted');
  });

  it('does not extract processId from within multi-line XML comment', () => {
    const content = `
      <?xml version="1.0"?>
      <bpmn:definitions>
        <!--
          <bpmn:process id="multiline-commented" isExecutable="true"/>
        -->
        <bpmn:process id="active-process" isExecutable="true"/>
      </bpmn:definitions>
    `;

    const ids = extractProcessIds(content);

    assert.ok(!ids.includes('multiline-commented'),
      'multi-line commented process ID must NOT be extracted');
  });

});
