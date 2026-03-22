/**
 * BUG-NULL-004 Hypothesis: getZeebeProcessId crashes when extensionElements
 * exists but has no .get() method.
 *
 * In util.mjs:
 *   const extensionElements = businessObject.get('extensionElements');
 *   ...
 *   const values = extensionElements.get('values') || [];
 *
 * If extensionElements is a truthy value without a .get() method (e.g., a
 * plain object {values: []}), the second .get() call throws TypeError.
 *
 * This can happen when businessObject itself has a .get() method (so the
 * first call succeeds), but returns a plain object for 'extensionElements'.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { getCalledProcessId } from '../client/bpmn-extension/util.mjs';

describe('BUG-NULL-004: getZeebeProcessId crashes when extensionElements lacks .get()', () => {
  it('throws TypeError when extensionElements is a plain object without .get()', () => {
    const element = {
      businessObject: {
        get(key) {
          if (key === 'extensionElements') {
            // returns plain object - no .get() method
            return { values: [] };
          }
          return null;
        }
      }
    };
    assert.doesNotThrow(() => {
      getCalledProcessId(element);
    }, 'getCalledProcessId must not throw when extensionElements is a plain object');
  });
});
