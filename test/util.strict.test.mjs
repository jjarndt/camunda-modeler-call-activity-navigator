import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { isCallActivity } from '../client/bpmn-extension/util.mjs';

describe('isCallActivity - strict equality', () => {
  it('uses strict equality and rejects similar but incorrect types', () => {
    assert.equal(isCallActivity({ type: 'bpmn:callActivity' }), false, 'lowercase c must be rejected');
    assert.equal(isCallActivity({ type: 'bpmn:CallActivity ' }), false, 'trailing space must be rejected');
    assert.equal(isCallActivity({ type: ' bpmn:CallActivity' }), false, 'leading space must be rejected');
    assert.equal(isCallActivity({ type: 'BPMN:CallActivity' }), false, 'uppercase namespace must be rejected');
    assert.equal(isCallActivity({ type: 'bpmn:CallActivity' }), true, 'exact match must be accepted');
  });
});
