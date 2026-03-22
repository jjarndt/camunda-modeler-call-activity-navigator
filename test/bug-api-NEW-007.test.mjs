/**
 * BUG-API-NEW-007: isCallActivity only checks element.type but not $type.
 *
 * In bpmn-js, elements have both `type` and `businessObject.$type`.
 * isCallActivity checks `element?.type === 'bpmn:CallActivity'`.
 *
 * But in some contexts (e.g., when working directly with business objects
 * or moddle elements), the type is stored as `$type` instead of `type`.
 * The function silently returns false for these cases, which could cause
 * call activities to be invisible to the navigator.
 *
 * Similarly, getCalledProcessId checks element.businessObject || element,
 * but isCallActivity does NOT fall back to businessObject.$type.
 *
 * The two functions have inconsistent element handling:
 * - getCalledProcessId: works with both elements and raw business objects
 * - isCallActivity: only works with bpmn-js shape elements (that have .type)
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { isCallActivity, getCalledProcessId } from '../client/bpmn-extension/util.mjs';

describe('BUG-API-NEW-007: isCallActivity vs getCalledProcessId inconsistent element handling', () => {

  it('getCalledProcessId works with raw business object, isCallActivity does not', () => {
    // A raw business object (not wrapped in a shape element)
    const businessObject = {
      $type: 'bpmn:CallActivity',
      calledElement: 'targetProcess'
    };

    // getCalledProcessId works - it falls back to element as businessObject
    const processId = getCalledProcessId(businessObject);
    assert.strictEqual(processId, 'targetProcess',
      'getCalledProcessId should work with raw business object');

    // isCallActivity fails - it checks .type, not .$type
    const isCA = isCallActivity(businessObject);
    assert.strictEqual(isCA, true,
      'isCallActivity should also work with raw business objects that have $type');
  });

  it('isCallActivity returns true for element with $type (fix)', () => {
    const element = { $type: 'bpmn:CallActivity' };
    const result = isCallActivity(element);

    assert.strictEqual(result, true,
      'isCallActivity now also checks $type');
  });

  it('isCallActivity and getCalledProcessId are inconsistent for the same element', () => {
    const element = {
      $type: 'bpmn:CallActivity',
      calledElement: 'someProcess'
    };

    const isCA = isCallActivity(element);
    const processId = getCalledProcessId(element);

    // BUG: isCallActivity says "not a call activity" but getCalledProcessId
    // successfully extracts the process ID from the same element
    if (!isCA && processId) {
      assert.fail(
        'Inconsistency: isCallActivity returns false but getCalledProcessId returns ' +
        `"${processId}" for the same element`
      );
    }
  });
});
