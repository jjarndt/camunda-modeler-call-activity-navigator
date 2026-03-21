import test from 'node:test';
import assert from 'node:assert/strict';

import { getCalledProcessId } from '../client/bpmn-extension/util.mjs';

test('getCalledProcessId returns null for empty string calledElement', () => {
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
