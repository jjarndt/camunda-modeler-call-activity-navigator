import test from 'node:test';
import assert from 'node:assert/strict';

import { getCalledProcessId } from '../client/bpmn-extension/util.mjs';

test('getCalledProcessId returns calledElement when extensionElements values is null', () => {
  const element = {
    businessObject: {
      get: (attr) => {
        if (attr === 'extensionElements') {
          return { get: (a) => a === 'values' ? null : null };
        }
        if (attr === 'calledElement') return 'C7Process';
        return undefined;
      }
    }
  };

  assert.equal(getCalledProcessId(element), 'C7Process');
});
