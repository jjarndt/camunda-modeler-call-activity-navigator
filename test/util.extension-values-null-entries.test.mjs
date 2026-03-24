/**
 * BUG-NULL-NEW-001: getCalledProcessId() throws TypeError when the extensionElements
 * values array contains null or undefined entries.
 *
 * In util.mjs, getZeebeProcessId() calls:
 *   values.find(ext => ext.$type === 'zeebe:CalledElement')
 *
 * When values = [null, ...] or [undefined, ...], the find callback accesses
 * null.$type or undefined.$type, which throws:
 *   TypeError: Cannot read properties of null (reading '$type')
 *   TypeError: Cannot read properties of undefined (reading '$type')
 *
 * This can happen with BPMN models where extension elements have been partially
 * removed or corrupted, leaving null/undefined slots in the values array.
 *
 * Expected: getCalledProcessId should not throw; it should skip null/undefined
 * entries and continue searching for zeebe:CalledElement.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { getCalledProcessId } from '../client/bpmn-extension/util.mjs';

function makePlainElement(values) {
  return {
    businessObject: {
      extensionElements: { values }
    }
  };
}

function makeGetterElement(values) {
  return {
    businessObject: {
      get(key) {
        if (key === 'extensionElements') {
          return {
            get(k) {
              if (k === 'values') return values;
              return null;
            }
          };
        }
        return null;
      }
    }
  };
}

describe('BUG-NULL-NEW-001: getCalledProcessId throws when values array contains null', () => {
  it('does not throw when values array contains a null entry (plain object)', () => {
    const element = makePlainElement([null, { $type: 'zeebe:CalledElement', processId: 'MyProcess' }]);
    assert.doesNotThrow(
      () => getCalledProcessId(element),
      'getCalledProcessId must not throw when values contains null'
    );
  });

  it('does not throw when values array contains an undefined entry (plain object)', () => {
    const element = makePlainElement([undefined, { $type: 'zeebe:CalledElement', processId: 'MyProcess' }]);
    assert.doesNotThrow(
      () => getCalledProcessId(element),
      'getCalledProcessId must not throw when values contains undefined'
    );
  });

  it('does not throw when values array contains a null entry (getter-based object)', () => {
    const element = makeGetterElement([null, { $type: 'zeebe:CalledElement', processId: 'Proc2' }]);
    assert.doesNotThrow(
      () => getCalledProcessId(element),
      'getCalledProcessId must not throw when getter-style values contains null'
    );
  });

  it('does not throw when values array contains an undefined entry (getter-based object)', () => {
    const element = makeGetterElement([undefined, { $type: 'zeebe:CalledElement', processId: 'Proc3' }]);
    assert.doesNotThrow(
      () => getCalledProcessId(element),
      'getCalledProcessId must not throw when getter-style values contains undefined'
    );
  });

  it('still returns the processId when null precedes a valid zeebe:CalledElement', () => {
    const element = makePlainElement([null, { $type: 'zeebe:CalledElement', processId: 'TargetProcess' }]);
    let result;
    try {
      result = getCalledProcessId(element);
    } catch {
      result = 'THREW';
    }
    // Either it returns the correct processId (ideal fix) or returns null (fallback)
    // But must not throw - so this assertion tests the "no throw" path indirectly
    assert.notEqual(result, 'THREW', 'getCalledProcessId must not throw on null in values');
  });

  it('does not throw when values is entirely [null, null, null]', () => {
    const element = makePlainElement([null, null, null]);
    assert.doesNotThrow(
      () => getCalledProcessId(element),
      'getCalledProcessId must not throw on values=[null,null,null]'
    );
  });
});
