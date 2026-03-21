import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { getCalledProcessId } from '../client/bpmn-extension/util.mjs';

describe('getCalledProcessId - non-zeebe extensions', () => {
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
