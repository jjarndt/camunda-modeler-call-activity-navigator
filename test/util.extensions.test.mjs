import test from 'node:test';
import assert from 'node:assert/strict';

import { getCalledProcessId } from '../client/bpmn-extension/util.mjs';

test('getCalledProcessId skips non-zeebe extension elements', () => {
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
