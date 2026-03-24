/**
 * Verify extractProcessIds handles truncated and malformed BPMN gracefully
 * without crashing: unclosed tags, unclosed quotes, missing attribute values.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractProcessIds } from '../client/bpmn-parser.mjs';

describe('extractProcessIds - truncated and malformed BPMN', () => {

  it('does not crash on process tag without closing >', () => {
    const truncated = '<process id="myId" name="foo';
    assert.doesNotThrow(() => {
      extractProcessIds(truncated);
    }, 'extractProcessIds must handle truncated BPMN safely');
  });

  it('does not crash on process tag with unclosed attribute quote', () => {
    const malformed = '<bpmn:process id="unclosed-quote name="foo">';
    assert.doesNotThrow(() => {
      extractProcessIds(malformed);
    });
  });

  it('does not crash on empty process tag attribute value without closing quote', () => {
    const malformed = '<process id="';
    assert.doesNotThrow(() => {
      const result = extractProcessIds(malformed);
      assert.ok(Array.isArray(result));
    });
  });

  it('does not crash on id attribute without value', () => {
    const malformed = '<process id= name="foo">';
    assert.doesNotThrow(() => {
      const result = extractProcessIds(malformed);
      assert.ok(Array.isArray(result));
    });
  });
});
