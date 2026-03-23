/**
 * BUG-FINDER-API-024: getCalledProcessId checks Zeebe first, then Camunda 7.
 * If extensionElements.values is not an array (e.g., a single object),
 * the find() call would fail. But the code checks Array.isArray(values)
 * and returns null if not.
 *
 * Edge case: What if extensionElements.values contains a zeebe:CalledElement
 * with processId="" (empty string)?
 * safeGet returns "". Then `|| null` gives null.
 * So zeebeProcessId is null. Code falls through to Camunda 7 calledElement.
 * If calledElement exists, it's returned instead of the Zeebe empty processId.
 * This is wrong - if Zeebe config exists but is empty, we should probably
 * NOT fall through to C7.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { getCalledProcessId } from '../client/bpmn-extension/util.mjs';

describe('BUG-FINDER-API-024: getCalledProcessId Zeebe/C7 fallthrough with empty Zeebe processId', () => {

  it('should NOT fallthrough to C7 when Zeebe CalledElement exists but has empty processId', () => {
    const element = {
      type: 'bpmn:CallActivity',
      businessObject: {
        calledElement: 'c7-process',
        extensionElements: {
          values: [
            { $type: 'zeebe:CalledElement', processId: '' }
          ]
        }
      }
    };

    const result = getCalledProcessId(element);
    // Current behavior: Zeebe processId is '' -> || null -> null
    // Falls through to C7 -> returns 'c7-process'
    // Expected: Should return null since Zeebe configuration exists
    // (even if empty), indicating C8 mode - C7 calledElement should be ignored
    assert.equal(result, null,
      'Should return null when Zeebe CalledElement exists but has empty processId, NOT fallthrough to C7');
  });

  it('should NOT fallthrough to C7 when Zeebe CalledElement has whitespace-only processId', () => {
    const element = {
      type: 'bpmn:CallActivity',
      businessObject: {
        calledElement: 'c7-process',
        extensionElements: {
          values: [
            { $type: 'zeebe:CalledElement', processId: '   ' }
          ]
        }
      }
    };

    const result = getCalledProcessId(element);
    // Current: processId='   ', safeGet returns '   ', || null -> '   ' (truthy!)
    // Then trim() -> '', ternary: '' is falsy -> returns null
    // Falls through to C7 -> returns 'c7-process'
    assert.equal(result, null,
      'Should return null when Zeebe CalledElement has whitespace processId, NOT fallthrough to C7');
  });
});
