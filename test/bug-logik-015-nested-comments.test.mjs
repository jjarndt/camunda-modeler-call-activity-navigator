import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractProcessIds } from '../client/bpmn-parser.mjs';

describe('BUG-001: greedy nested comment scanning', () => {

  it('should not consume content between separate comments', () => {
    const xml = [
      '<!-- outer <!-- inner --> -->',
      '<bpmn:process id="ProcessBetween" />',
      '<!-- another comment -->'
    ].join('\n');

    const ids = extractProcessIds(xml);
    assert.ok(
      ids.includes('ProcessBetween'),
      `ProcessBetween must not be consumed by greedy comment scanning: ${JSON.stringify(ids)}`
    );
  });

  it('should handle multiple independent comments correctly', () => {
    const xml = [
      '<!-- comment 1 -->',
      '<bpmn:process id="First" />',
      '<!-- comment 2 -->',
      '<bpmn:process id="Second" />'
    ].join('\n');

    const ids = extractProcessIds(xml);
    assert.deepStrictEqual(ids, ['First', 'Second']);
  });

  it('should strip a single comment normally', () => {
    const xml = [
      '<!-- <bpmn:process id="Hidden" /> -->',
      '<bpmn:process id="Visible" />'
    ].join('\n');

    const ids = extractProcessIds(xml);
    assert.deepStrictEqual(ids, ['Visible']);
  });
});
