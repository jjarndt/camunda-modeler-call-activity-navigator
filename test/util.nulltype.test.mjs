import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { isCallActivity } from '../client/bpmn-extension/util.mjs';

describe('isCallActivity - non-string types', () => {
  it('handles element with null or numeric type', () => {
    assert.equal(isCallActivity({ type: null }), false, 'null !== "bpmn:CallActivity"');
    assert.equal(isCallActivity({ type: 0 }), false, 'number !== string');
    assert.equal(isCallActivity({ type: true }), false, 'boolean !== string');
    assert.equal(isCallActivity({ type: ['bpmn:CallActivity'] }), false, 'array !== string');
  });
});
