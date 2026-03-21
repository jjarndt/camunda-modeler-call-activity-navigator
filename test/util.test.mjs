import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { getCalledProcessId, isCallActivity } from '../client/bpmn-extension/util.mjs';

describe('isCallActivity', () => {

  test('returns true for bpmn:CallActivity', () => {
    assert.equal(isCallActivity({ type: 'bpmn:CallActivity' }), true);
  });

  test('returns false for other element types', () => {
    assert.equal(isCallActivity({ type: 'bpmn:ServiceTask' }), false);
    assert.equal(isCallActivity({ type: 'bpmn:UserTask' }), false);
    assert.equal(isCallActivity({ type: 'bpmn:StartEvent' }), false);
  });

  test('returns false when type is missing or undefined', () => {
    assert.equal(isCallActivity({}), false);
    assert.equal(isCallActivity({ type: undefined }), false);
  });
});

describe('getCalledProcessId', () => {

  describe('Camunda 7', () => {

    test('returns calledElement attribute', () => {
      const element = {
        businessObject: {
          get: (attr) => attr === 'calledElement' ? 'MyProcess' : undefined
        }
      };
      assert.equal(getCalledProcessId(element), 'MyProcess');
    });
  });

  describe('Camunda 8 (Zeebe)', () => {

    test('returns processId from zeebe:CalledElement extension', () => {
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

    test('returns null when zeebe:CalledElement has no processId', () => {
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

    test('prefers zeebe extension over calledElement', () => {
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
  });

  describe('edge cases', () => {

    test('returns null when neither calledElement nor zeebe extension exists', () => {
      const element = {
        businessObject: {
          get: () => undefined
        }
      };
      assert.equal(getCalledProcessId(element), null);
    });

    test('returns null when extensionElements values are empty', () => {
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

    test('falls back to element itself when businessObject is absent', () => {
      const element = {
        get: (attr) => attr === 'calledElement' ? 'DirectProcess' : undefined
      };
      assert.equal(getCalledProcessId(element), 'DirectProcess');
    });
  });
});
