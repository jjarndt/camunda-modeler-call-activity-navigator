/**
 * BUG-API-NEW-004: getCalledProcessId returns empty string instead of null
 * for elements with empty calledElement attribute.
 *
 * getCalledProcessId on line 29 does: `safeGet(businessObject, 'calledElement') || null`
 * This correctly converts falsy values (undefined, '', 0, false) to null.
 *
 * BUT: safeGet on line 2-3 does:
 *   if (typeof obj?.get === 'function') return obj.get(prop);
 *   return obj?.[prop] ?? null;
 *
 * For Camunda 8 (zeebe:CalledElement), getZeebeProcessId does:
 *   return zeebeCalledElement ? safeGet(zeebeCalledElement, 'processId') || null : null;
 *
 * The `|| null` converts empty string to null. Good.
 *
 * But what about whitespace-only strings like "  "? safeGet returns "  ",
 * and `|| null` does NOT convert whitespace to null because "  " is truthy!
 * getCalledProcessId would return "  " as a valid process ID.
 *
 * This is an input validation gap: whitespace-only process IDs are treated
 * as valid by getCalledProcessId but are meaningless in BPMN.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { getCalledProcessId } from '../client/bpmn-extension/util.mjs';

describe('BUG-API-NEW-004: getCalledProcessId returns whitespace as valid processId', () => {

  it('returns whitespace-only calledElement instead of null (Camunda 7)', () => {
    const element = {
      businessObject: {
        calledElement: '   '  // whitespace only
      }
    };

    const result = getCalledProcessId(element);

    // BUG: '   ' is truthy, so `safeGet(bo, 'calledElement') || null` returns '   '
    // A whitespace-only process ID is never valid in BPMN
    assert.strictEqual(result, null,
      'Whitespace-only calledElement should return null, not "   "');
  });

  it('returns whitespace-only zeebe processId instead of null (Camunda 8)', () => {
    const element = {
      businessObject: {
        extensionElements: {
          values: [
            {
              $type: 'zeebe:CalledElement',
              processId: '   '  // whitespace only
            }
          ]
        }
      }
    };

    const result = getCalledProcessId(element);

    // BUG: '   ' is truthy, so `safeGet(..., 'processId') || null` returns '   '
    assert.strictEqual(result, null,
      'Whitespace-only zeebe processId should return null, not "   "');
  });

  it('handles tab and newline in processId', () => {
    const element = {
      businessObject: {
        calledElement: '\t\n'
      }
    };

    const result = getCalledProcessId(element);

    assert.strictEqual(result, null,
      'Tab/newline processId should return null');
  });
});
