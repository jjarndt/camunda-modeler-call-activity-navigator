import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { extractProcessIds } from '../client/bpmn-parser.mjs';

describe('extractProcessIds - XML comment handling', () => {

  it('ignores process id inside single-line XML comment', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <!-- <bpmn:process id="Commented_Out" isExecutable="false"> -->
  <bpmn:process id="Active_Process" isExecutable="true"></bpmn:process>
</bpmn:definitions>`;

    assert.deepStrictEqual(extractProcessIds(xml), ['Active_Process']);
  });

  it('ignores process id inside multi-line XML comment', () => {
    const xml = `<?xml version="1.0"?>
<bpmn:definitions>
  <!--
    <bpmn:process id="multiline-commented" isExecutable="true"/>
  -->
  <bpmn:process id="active-process" isExecutable="true"/>
</bpmn:definitions>`;

    const ids = extractProcessIds(xml);
    assert.ok(!ids.includes('multiline-commented'),
      'multi-line commented process ID must NOT be extracted');
    assert.ok(ids.includes('active-process'));
  });

  it('ignores ghost process id from comment before definitions', () => {
    const xml = `<?xml version="1.0"?>
<!-- <bpmn:process id="ghost-process" isExecutable="true"/> -->
<bpmn:definitions>
  <bpmn:process id="real-process" isExecutable="true"/>
</bpmn:definitions>`;

    const ids = extractProcessIds(xml);
    assert.ok(!ids.includes('ghost-process'),
      'process ID inside XML comment must not be extracted');
    assert.ok(ids.includes('real-process'));
  });

  it('does not consume content between separate comments (greedy scanning)', () => {
    const xml = [
      '<!-- outer <!-- inner --> -->',
      '<bpmn:process id="ProcessBetween" />',
      '<!-- another comment -->'
    ].join('\n');

    const ids = extractProcessIds(xml);
    assert.ok(ids.includes('ProcessBetween'),
      'ProcessBetween must not be consumed by greedy comment scanning');
  });

  it('handles multiple independent comments correctly', () => {
    const xml = [
      '<!-- comment 1 -->',
      '<bpmn:process id="First" />',
      '<!-- comment 2 -->',
      '<bpmn:process id="Second" />'
    ].join('\n');

    assert.deepStrictEqual(extractProcessIds(xml), ['First', 'Second']);
  });

  it('strips a single comment and keeps visible process', () => {
    const xml = [
      '<!-- <bpmn:process id="Hidden" /> -->',
      '<bpmn:process id="Visible" />'
    ].join('\n');

    assert.deepStrictEqual(extractProcessIds(xml), ['Visible']);
  });

  it('extracts process ids after first --> per XML spec (nested comments)', () => {
    // Per XML spec, --> always ends a comment. Nested <!-- inside comments
    // are not special. So the comment ends at the first -->.
    const xml = `<?xml version="1.0"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
             xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <!-- hidden <!-- nested --> <bpmn:process id="visible" isExecutable="true"> -->
  <bpmn:process id="legitimate" isExecutable="true">
    <bpmn:startEvent id="start"/>
  </bpmn:process>
</definitions>`;

    const ids = extractProcessIds(xml);
    assert.ok(ids.includes('visible'),
      '"visible" appears after comment end and should be extracted');
    assert.ok(ids.includes('legitimate'),
      'Should still extract the legitimate process id');
  });

  it('handles nested-style comments without consuming content between them', () => {
    const xml = `<?xml version="1.0"?>
<definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <!-- start of comment <!-- --> <bpmn:process id="between" isExecutable="true"/> <!-- -->
  <bpmn:process id="real" isExecutable="true"/>
</definitions>`;

    const ids = extractProcessIds(xml);
    assert.ok(ids.includes('between'),
      '"between" appears between comments and should be extracted');
    assert.ok(ids.includes('real'));
  });
});
