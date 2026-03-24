/**
 * BUG-NULL-003 Hypothesis: getCalledProcessId() crashes with TypeError when
 * element has no .get() method (plain object without BPMN prototype).
 *
 * getCalledProcessId(element) does:
 *   const businessObject = element.businessObject || element;
 *   getZeebeProcessId(businessObject);
 *
 * getZeebeProcessId() calls businessObject.get('extensionElements').
 * If businessObject is a plain object (no .get method), this throws
 * "TypeError: businessObject.get is not a function".
 *
 * Real-world trigger: any DOM element or plain JS object passed as element
 * where element.businessObject is falsy.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { getCalledProcessId } from '../client/bpmn-extension/util.mjs';

describe('BUG-NULL-003: getCalledProcessId crashes on plain objects without .get()', () => {
  it('throws TypeError when element is a plain object without .get() method', () => {
    const plainElement = { type: 'bpmn:CallActivity' }; // no .businessObject, no .get()
    assert.doesNotThrow(() => {
      getCalledProcessId(plainElement);
    }, 'getCalledProcessId({ type: "bpmn:CallActivity" }) must not throw');
  });

  it('throws TypeError when element.businessObject is a plain object without .get()', () => {
    const element = {
      businessObject: { type: 'bpmn:CallActivity' } // no .get() method
    };
    assert.doesNotThrow(() => {
      getCalledProcessId(element);
    }, 'getCalledProcessId with plain businessObject must not throw');
  });
});
