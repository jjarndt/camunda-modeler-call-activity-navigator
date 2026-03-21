import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getCalledProcessId } from '../client/bpmn-extension/util.mjs';

describe('getCalledProcessId', () => {
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
});
