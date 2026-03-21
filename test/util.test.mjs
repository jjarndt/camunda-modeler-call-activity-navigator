import test from 'node:test';
import assert from 'node:assert/strict';

import { getCalledProcessId, isCallActivity } from '../client/bpmn-extension/util.mjs';

// --- isCallActivity ---

test('isCallActivity returns true for bpmn:CallActivity', () => {
  assert.equal(isCallActivity({ type: 'bpmn:CallActivity' }), true);
});

test('isCallActivity returns false for other types', () => {
  assert.equal(isCallActivity({ type: 'bpmn:ServiceTask' }), false);
  assert.equal(isCallActivity({ type: 'bpmn:UserTask' }), false);
  assert.equal(isCallActivity({ type: 'bpmn:StartEvent' }), false);
});

// --- getCalledProcessId: Camunda 7 ---

test('getCalledProcessId returns calledElement for Camunda 7', () => {
  const element = {
    businessObject: {
      get: (attr) => attr === 'calledElement' ? 'MyProcess' : undefined
    }
  };
  assert.equal(getCalledProcessId(element), 'MyProcess');
});

// --- getCalledProcessId: Camunda 8 (Zeebe) ---

test('getCalledProcessId returns processId from zeebe:CalledElement', () => {
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

// --- getCalledProcessId: no process ID ---

test('getCalledProcessId returns null when no calledElement or zeebe extension', () => {
  const element = {
    businessObject: {
      get: () => undefined
    }
  };
  assert.equal(getCalledProcessId(element), null);
});

test('getCalledProcessId returns null for empty extension elements', () => {
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

test('getCalledProcessId uses element directly when no businessObject', () => {
  const element = {
    get: (attr) => attr === 'calledElement' ? 'DirectProcess' : undefined
  };
  assert.equal(getCalledProcessId(element), 'DirectProcess');
});

test('getCalledProcessId prefers zeebe extension over calledElement', () => {
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

// --- isCallActivity: undefined type ---

test('isCallActivity returns false for undefined type', () => {
  assert.equal(isCallActivity({}), false);
  assert.equal(isCallActivity({ type: undefined }), false);
});

// --- getCalledProcessId: zeebe CalledElement without processId ---

test('getCalledProcessId returns null when zeebe CalledElement has no processId', () => {
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
