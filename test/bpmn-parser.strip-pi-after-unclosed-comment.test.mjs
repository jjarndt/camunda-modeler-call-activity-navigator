/**
 * stripNonContent breaks too early when both noMoreComments and noMoreCdata
 * flags are set but PIs remain. A processing instruction after unclosed
 * comment and CDATA sections may not be stripped, potentially allowing
 * false process ID extraction from PI content.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractProcessIds } from '../client/bpmn-parser.mjs';

describe('extractProcessIds - PI after unclosed comment/CDATA', () => {

  it('should not extract process id from inside unstripped processing instruction', () => {
    const xml = [
      '<!-- unclosed comment',
      '<![CDATA[ unclosed CDATA',
      '<?fake <bpmn:process id="InPI" /> ?>',
      '<bpmn:process id="Real" />'
    ].join('\n');

    const result = extractProcessIds(xml);

    assert.ok(!result.includes('InPI'),
      'Process ID inside unstripped PI should not be extracted');
  });
});
