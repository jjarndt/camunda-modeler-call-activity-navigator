/**
 * BUG-NULL-002: isCallActivity() and getCalledProcessId() throw TypeError
 * when called with null or undefined.
 *
 * isCallActivity(element) accesses element.type without guarding against null/undefined.
 * getCalledProcessId(element) accesses element.businessObject without guarding.
 *
 * Both functions are called from event handlers in the BPMN extension context
 * where the element could potentially be null/undefined in edge cases.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { isCallActivity, getCalledProcessId } from '../client/bpmn-extension/util.mjs';

describe('BUG-NULL-002: isCallActivity does not guard against null/undefined element', () => {
  it('throws TypeError when element is null', () => {
    assert.doesNotThrow(() => {
      isCallActivity(null);
    }, 'isCallActivity(null) must not throw');
  });

  it('throws TypeError when element is undefined', () => {
    assert.doesNotThrow(() => {
      isCallActivity(undefined);
    }, 'isCallActivity(undefined) must not throw');
  });

  it('returns false for null (safe default)', () => {
    assert.equal(isCallActivity(null), false);
  });

  it('returns false for undefined (safe default)', () => {
    assert.equal(isCallActivity(undefined), false);
  });
});

describe('BUG-NULL-002: getCalledProcessId does not guard against null/undefined element', () => {
  it('throws TypeError when element is null', () => {
    assert.doesNotThrow(() => {
      getCalledProcessId(null);
    }, 'getCalledProcessId(null) must not throw');
  });

  it('throws TypeError when element is undefined', () => {
    assert.doesNotThrow(() => {
      getCalledProcessId(undefined);
    }, 'getCalledProcessId(undefined) must not throw');
  });

  it('returns null for null element (safe default)', () => {
    assert.equal(getCalledProcessId(null), null);
  });

  it('returns null for undefined element (safe default)', () => {
    assert.equal(getCalledProcessId(undefined), null);
  });
});
