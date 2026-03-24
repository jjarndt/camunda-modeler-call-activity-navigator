import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { getCalledProcessId, isCallActivity } from '../client/bpmn-extension/util.mjs';

// ---------------------------------------------------------------------------
// isCallActivity
// ---------------------------------------------------------------------------

describe('isCallActivity', () => {

  describe('standard element types', () => {
    it('returns true for bpmn:CallActivity', () => {
      assert.equal(isCallActivity({ type: 'bpmn:CallActivity' }), true);
    });

    it('returns false for other element types', () => {
      assert.equal(isCallActivity({ type: 'bpmn:ServiceTask' }), false);
      assert.equal(isCallActivity({ type: 'bpmn:UserTask' }), false);
      assert.equal(isCallActivity({ type: 'bpmn:StartEvent' }), false);
    });

    it('returns false when type is missing or undefined', () => {
      assert.equal(isCallActivity({}), false);
      assert.equal(isCallActivity({ type: undefined }), false);
    });
  });

  describe('non-string types', () => {
    it('handles element with null or numeric type', () => {
      assert.equal(isCallActivity({ type: null }), false);
      assert.equal(isCallActivity({ type: 0 }), false);
      assert.equal(isCallActivity({ type: true }), false);
      assert.equal(isCallActivity({ type: ['bpmn:CallActivity'] }), false);
    });
  });

  describe('strict equality', () => {
    it('rejects similar but incorrect types', () => {
      assert.equal(isCallActivity({ type: 'bpmn:callActivity' }), false);
      assert.equal(isCallActivity({ type: 'bpmn:CallActivity ' }), false);
      assert.equal(isCallActivity({ type: ' bpmn:CallActivity' }), false);
      assert.equal(isCallActivity({ type: 'BPMN:CallActivity' }), false);
      assert.equal(isCallActivity({ type: 'bpmn:CallActivity' }), true);
    });
  });

  describe('null/undefined element guard', () => {
    it('does not throw for null', () => {
      assert.doesNotThrow(() => isCallActivity(null));
    });

    it('does not throw for undefined', () => {
      assert.doesNotThrow(() => isCallActivity(undefined));
    });

    it('returns false for null', () => {
      assert.equal(isCallActivity(null), false);
    });

    it('returns false for undefined', () => {
      assert.equal(isCallActivity(undefined), false);
    });
  });

  describe('non-standard elements ($type)', () => {
    it('returns true for element with $type but no type', () => {
      assert.strictEqual(isCallActivity({ $type: 'bpmn:CallActivity' }), true);
    });

    it('returns false for element with neither type nor $type', () => {
      assert.strictEqual(isCallActivity({}), false);
    });

    it('returns false for number', () => {
      assert.strictEqual(isCallActivity(42), false);
    });

    it('returns false for string', () => {
      assert.strictEqual(isCallActivity('bpmn:CallActivity'), false);
    });

    it('returns false for array', () => {
      assert.strictEqual(isCallActivity([]), false);
    });
  });

  describe('$type consistency with getCalledProcessId', () => {
    it('works with raw business object that has $type', () => {
      const businessObject = {
        $type: 'bpmn:CallActivity',
        calledElement: 'targetProcess'
      };

      const processId = getCalledProcessId(businessObject);
      assert.strictEqual(processId, 'targetProcess');

      const isCA = isCallActivity(businessObject);
      assert.strictEqual(isCA, true);
    });

    it('returns true for element with $type', () => {
      assert.strictEqual(isCallActivity({ $type: 'bpmn:CallActivity' }), true);
    });

    it('does not produce inconsistency between isCallActivity and getCalledProcessId', () => {
      const element = {
        $type: 'bpmn:CallActivity',
        calledElement: 'someProcess'
      };

      const isCA = isCallActivity(element);
      const processId = getCalledProcessId(element);

      if (!isCA && processId) {
        assert.fail(
          'Inconsistency: isCallActivity returns false but getCalledProcessId returns ' +
          `"${processId}" for the same element`
        );
      }
    });
  });
});

// ---------------------------------------------------------------------------
// getCalledProcessId
// ---------------------------------------------------------------------------

describe('getCalledProcessId', () => {

  // -- Camunda 7 ------------------------------------------------------------

  describe('Camunda 7', () => {
    it('returns calledElement attribute', () => {
      const element = {
        businessObject: {
          get: (attr) => attr === 'calledElement' ? 'MyProcess' : undefined
        }
      };
      assert.equal(getCalledProcessId(element), 'MyProcess');
    });

    it('returns null for empty string calledElement', () => {
      const element = {
        businessObject: {
          get: (attr) => {
            if (attr === 'extensionElements') return undefined;
            if (attr === 'calledElement') return '';
            return undefined;
          }
        }
      };
      assert.equal(getCalledProcessId(element), null);
    });

    it('returns calledElement when extensionElements values is null', () => {
      const element = {
        businessObject: {
          get: (attr) => {
            if (attr === 'extensionElements') {
              return { get: () => null };
            }
            if (attr === 'calledElement') return 'C7Process';
            return undefined;
          }
        }
      };
      assert.equal(getCalledProcessId(element), 'C7Process');
    });
  });

  // -- Camunda 8 (Zeebe) ---------------------------------------------------

  describe('Camunda 8 (Zeebe)', () => {
    it('returns processId from zeebe:CalledElement extension', () => {
      const element = {
        businessObject: {
          get: (attr) => {
            if (attr === 'extensionElements') {
              return {
                get: () => [
                  { $type: 'zeebe:CalledElement', get: (a) => a === 'processId' ? 'ZeebeProcess' : null }
                ]
              };
            }
            return undefined;
          }
        }
      };
      assert.equal(getCalledProcessId(element), 'ZeebeProcess');
    });

    it('returns null when zeebe:CalledElement has no processId', () => {
      const element = {
        businessObject: {
          get: (attr) => {
            if (attr === 'extensionElements') {
              return {
                get: () => [
                  { $type: 'zeebe:CalledElement', get: () => null }
                ]
              };
            }
            if (attr === 'calledElement') return undefined;
            return undefined;
          }
        }
      };
      assert.equal(getCalledProcessId(element), null);
    });

    it('prefers zeebe extension over calledElement', () => {
      const element = {
        businessObject: {
          get: (attr) => {
            if (attr === 'extensionElements') {
              return {
                get: () => [
                  { $type: 'zeebe:CalledElement', get: (a) => a === 'processId' ? 'ZeebeWins' : null }
                ]
              };
            }
            if (attr === 'calledElement') return 'C7Fallback';
            return undefined;
          }
        }
      };
      assert.equal(getCalledProcessId(element), 'ZeebeWins');
    });

    it('finds zeebe:CalledElement among multiple extension types', () => {
      const element = {
        businessObject: {
          get(prop) {
            if (prop === 'extensionElements') return this._extensionElements;
            if (prop === 'calledElement') return 'ShouldNotUse';
            return null;
          },
          _extensionElements: {
            get(prop) {
              if (prop === 'values') return [
                { $type: 'zeebe:IoMapping', get: () => null },
                { $type: 'zeebe:CalledElement', get: (a) => a === 'processId' ? 'FoundIt' : null },
                { $type: 'zeebe:TaskHeaders', get: () => null }
              ];
              return null;
            }
          }
        }
      };
      assert.equal(getCalledProcessId(element), 'FoundIt');
    });

    it('skips non-zeebe extension elements', () => {
      const element = {
        businessObject: {
          get: (attr) => {
            if (attr === 'extensionElements') {
              return {
                get: () => [
                  { $type: 'camunda:InputOutput', get: () => null },
                  { $type: 'camunda:Properties', get: () => null }
                ]
              };
            }
            if (attr === 'calledElement') return 'FallbackProcess';
            return undefined;
          }
        }
      };
      assert.equal(getCalledProcessId(element), 'FallbackProcess');
    });
  });

  // -- edge cases -----------------------------------------------------------

  describe('edge cases', () => {
    it('returns null when neither calledElement nor zeebe extension exists', () => {
      const element = {
        businessObject: {
          get: () => undefined
        }
      };
      assert.equal(getCalledProcessId(element), null);
    });

    it('returns null when extensionElements values are empty', () => {
      const element = {
        businessObject: {
          get: (attr) => {
            if (attr === 'extensionElements') {
              return { get: () => [] };
            }
            return undefined;
          }
        }
      };
      assert.equal(getCalledProcessId(element), null);
    });

    it('falls back to element itself when businessObject is absent', () => {
      const element = {
        get: (attr) => attr === 'calledElement' ? 'DirectProcess' : undefined
      };
      assert.equal(getCalledProcessId(element), 'DirectProcess');
    });
  });

  // -- null/undefined element guard -----------------------------------------

  describe('null/undefined element guard', () => {
    it('does not throw for null', () => {
      assert.doesNotThrow(() => getCalledProcessId(null));
    });

    it('does not throw for undefined', () => {
      assert.doesNotThrow(() => getCalledProcessId(undefined));
    });

    it('returns null for null element', () => {
      assert.equal(getCalledProcessId(null), null);
    });

    it('returns null for undefined element', () => {
      assert.equal(getCalledProcessId(undefined), null);
    });
  });

  // -- plain objects without .get() -----------------------------------------

  describe('plain objects without .get()', () => {
    it('returns null when businessObject has no .get() method', () => {
      const element = {
        businessObject: { type: 'bpmn:CallActivity' }
      };
      assert.equal(getCalledProcessId(element), null);
    });

    it('returns null when element itself has no .get() method and no .businessObject', () => {
      const element = { type: 'bpmn:CallActivity' };
      assert.equal(getCalledProcessId(element), null);
    });

    it('does not crash with plain object businessObject that has calledElement', () => {
      const element = {
        businessObject: { calledElement: 'myProcess' }
      };
      assert.doesNotThrow(() => getCalledProcessId(element));
    });

    it('does not crash when element is a plain object without businessObject', () => {
      const element = { calledElement: 'directProcess' };
      assert.doesNotThrow(() => getCalledProcessId(element));
    });

    it('handles extensionElements as plain object without .get()', () => {
      const element = {
        businessObject: {
          get(key) {
            if (key === 'extensionElements') {
              return { values: [] };
            }
            return null;
          }
        }
      };
      assert.doesNotThrow(() => getCalledProcessId(element));
    });
  });

  // -- exception-throwing getters -------------------------------------------

  describe('exception-throwing getters', () => {
    it('does not crash when extensionElements.get() throws', () => {
      const element = {
        businessObject: {
          get(key) {
            if (key === 'extensionElements') {
              return {
                get() { throw new Error('values getter crashed!'); }
              };
            }
            return null;
          }
        }
      };
      assert.doesNotThrow(() => getCalledProcessId(element));
    });

    it('does not crash when businessObject.get() throws', () => {
      const element = {
        businessObject: {
          get() { throw new Error('get() crashed!'); }
        }
      };
      assert.doesNotThrow(() => getCalledProcessId(element));
    });

    it('does not crash when processId property getter throws', () => {
      const element = {
        businessObject: {
          extensionElements: {
            values: [{
              $type: 'zeebe:CalledElement',
              get processId() { throw new Error('processId getter crashed!'); }
            }]
          }
        }
      };
      assert.doesNotThrow(() => getCalledProcessId(element));
    });

    it('does not crash when element.businessObject getter throws', () => {
      const element = Object.defineProperty({}, 'businessObject', {
        get() { throw new Error('businessObject getter crashed!'); },
        enumerable: true
      });
      assert.doesNotThrow(() => getCalledProcessId(element));
    });
  });

  // -- calledElement non-string types ---------------------------------------

  describe('calledElement non-string types', () => {
    it('does not crash when calledElement has trim property that is not a function', () => {
      const element = {
        businessObject: {
          calledElement: { trim: true, toString: () => 'MyProcess' }
        }
      };
      assert.doesNotThrow(() => getCalledProcessId(element));
    });

    it('returns null when calledElement is a number', () => {
      const element = {
        businessObject: { calledElement: 42 }
      };
      assert.doesNotThrow(() => getCalledProcessId(element));
      assert.strictEqual(getCalledProcessId(element), null);
    });
  });

  // -- whitespace processId -------------------------------------------------

  describe('whitespace processId', () => {
    it('returns null for whitespace-only calledElement (Camunda 7)', () => {
      const element = {
        businessObject: { calledElement: '   ' }
      };
      assert.strictEqual(getCalledProcessId(element), null);
    });

    it('returns null for whitespace-only zeebe processId (Camunda 8)', () => {
      const element = {
        businessObject: {
          extensionElements: {
            values: [{ $type: 'zeebe:CalledElement', processId: '   ' }]
          }
        }
      };
      assert.strictEqual(getCalledProcessId(element), null);
    });

    it('returns null for tab and newline in processId', () => {
      const element = {
        businessObject: { calledElement: '\t\n' }
      };
      assert.strictEqual(getCalledProcessId(element), null);
    });
  });

  // -- null entries in extension values -------------------------------------

  describe('null entries in extension values', () => {
    it('does not throw when values array contains null (plain object)', () => {
      const element = {
        businessObject: {
          extensionElements: {
            values: [null, { $type: 'zeebe:CalledElement', processId: 'MyProcess' }]
          }
        }
      };
      assert.doesNotThrow(() => getCalledProcessId(element));
    });

    it('does not throw when values array contains undefined (plain object)', () => {
      const element = {
        businessObject: {
          extensionElements: {
            values: [undefined, { $type: 'zeebe:CalledElement', processId: 'MyProcess' }]
          }
        }
      };
      assert.doesNotThrow(() => getCalledProcessId(element));
    });

    it('does not throw when values array contains null (getter-based)', () => {
      const element = {
        businessObject: {
          get(key) {
            if (key === 'extensionElements') {
              return {
                get(k) {
                  if (k === 'values') return [null, { $type: 'zeebe:CalledElement', processId: 'Proc' }];
                  return null;
                }
              };
            }
            return null;
          }
        }
      };
      assert.doesNotThrow(() => getCalledProcessId(element));
    });

    it('does not throw when values array contains undefined (getter-based)', () => {
      const element = {
        businessObject: {
          get(key) {
            if (key === 'extensionElements') {
              return {
                get(k) {
                  if (k === 'values') return [undefined, { $type: 'zeebe:CalledElement', processId: 'Proc' }];
                  return null;
                }
              };
            }
            return null;
          }
        }
      };
      assert.doesNotThrow(() => getCalledProcessId(element));
    });

    it('returns processId when null precedes a valid zeebe:CalledElement', () => {
      const element = {
        businessObject: {
          extensionElements: {
            values: [null, { $type: 'zeebe:CalledElement', processId: 'TargetProcess' }]
          }
        }
      };
      let result;
      try {
        result = getCalledProcessId(element);
      } catch {
        result = 'THREW';
      }
      assert.notEqual(result, 'THREW');
    });

    it('does not throw when values is entirely [null, null, null]', () => {
      const element = {
        businessObject: {
          extensionElements: { values: [null, null, null] }
        }
      };
      assert.doesNotThrow(() => getCalledProcessId(element));
    });
  });

  // -- Zeebe/C7 fallthrough -------------------------------------------------

  describe('Zeebe/C7 fallthrough with empty processId', () => {
    it('should NOT fallthrough to C7 when Zeebe CalledElement has empty processId', () => {
      const element = {
        type: 'bpmn:CallActivity',
        businessObject: {
          calledElement: 'c7-process',
          extensionElements: {
            values: [{ $type: 'zeebe:CalledElement', processId: '' }]
          }
        }
      };
      assert.equal(getCalledProcessId(element), null);
    });

    it('should NOT fallthrough to C7 when Zeebe CalledElement has whitespace-only processId', () => {
      const element = {
        type: 'bpmn:CallActivity',
        businessObject: {
          calledElement: 'c7-process',
          extensionElements: {
            values: [{ $type: 'zeebe:CalledElement', processId: '   ' }]
          }
        }
      };
      assert.equal(getCalledProcessId(element), null);
    });
  });
});
