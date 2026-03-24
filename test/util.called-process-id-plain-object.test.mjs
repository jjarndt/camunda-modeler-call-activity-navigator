/**
 * BUG-API-005: getCalledProcessId throws when businessObject has no .get() method
 *
 * getCalledProcessId does: businessObject.get('extensionElements')
 * and businessObject.get('calledElement').
 * If businessObject is a plain object without .get(), this throws TypeError.
 *
 * Also: isCallActivity checks element.type, but if element is null/undefined, throws.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { getCalledProcessId, isCallActivity } from '../client/bpmn-extension/util.mjs';

describe('BUG-API-005: getCalledProcessId / isCallActivity with invalid inputs', () => {

  it('getCalledProcessId returns null when businessObject has no .get() method', () => {
    const element = {
      businessObject: { type: 'bpmn:CallActivity' }
    };

    assert.equal(getCalledProcessId(element), null,
      'should return null when businessObject is a plain object');
  });

  it('getCalledProcessId returns null when element itself has no .get() method and no .businessObject', () => {
    const element = { type: 'bpmn:CallActivity' };

    assert.equal(getCalledProcessId(element), null,
      'should return null when element is a plain object');
  });

  it('isCallActivity returns false when element is null', () => {
    assert.equal(isCallActivity(null), false,
      'isCallActivity(null) should return false');
  });

  it('isCallActivity returns false when element has no type property', () => {
    const result = isCallActivity({});
    assert.equal(result, false,
      'isCallActivity({}) should return false');
  });

});
