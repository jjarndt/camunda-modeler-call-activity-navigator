/**
 * BUG-FINDER-NULL-012: getCalledProcessId wenn processId-Getter Exception wirft
 *
 * In util.mjs, getZeebeProcessId() Zeile 18:
 *   const processId = safeGet(zeebeCalledElement, 'processId') || null;
 *
 * safeGet() Zeile 1-4:
 *   function safeGet(obj, prop) {
 *     if (typeof obj?.get === 'function') return obj.get(prop);
 *     return obj?.[prop] ?? null;
 *   }
 *
 * Wenn obj.get() eine Exception wirft, wird diese nicht abgefangen.
 * Oder wenn obj[prop] via Getter eine Exception wirft.
 *
 * Hypothese: getCalledProcessId wirft unkontrolliert wenn ein Property-Getter
 * eine Exception wirft.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getCalledProcessId } from '../client/bpmn-extension/util.mjs';

describe('BUG-FINDER-NULL-012: getCalledProcessId mit Exception-werfenden Gettern', () => {
  it('crasht nicht wenn extensionElements.get() eine Exception wirft', () => {
    const element = {
      businessObject: {
        get(key) {
          if (key === 'extensionElements') {
            return {
              get(k) {
                if (k === 'values') throw new Error('values getter crashed!');
                return null;
              }
            };
          }
          return null;
        }
      }
    };

    // getZeebeProcessId() -> safeGet(extensionElements, 'values')
    // safeGet() ruft extensionElements.get('values') auf -> wirft Error
    // Diese Exception wird nicht abgefangen!
    assert.doesNotThrow(
      () => getCalledProcessId(element),
      'getCalledProcessId muss Exception aus Property-Getter abfangen'
    );
  });

  it('crasht nicht wenn businessObject.get() eine Exception wirft', () => {
    const element = {
      businessObject: {
        get(key) {
          throw new Error(`get(${key}) crashed!`);
        }
      }
    };

    assert.doesNotThrow(
      () => getCalledProcessId(element),
      'getCalledProcessId muss Exception aus businessObject.get() abfangen'
    );
  });

  it('crasht nicht wenn processId-Property via Getter Exception wirft', () => {
    const element = {
      businessObject: {
        extensionElements: {
          values: [{
            $type: 'zeebe:CalledElement',
            get processId() {
              throw new Error('processId getter crashed!');
            }
          }]
        }
      }
    };

    assert.doesNotThrow(
      () => getCalledProcessId(element),
      'getCalledProcessId muss Exception aus processId-Getter abfangen'
    );
  });
});
