import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ProcessIndex } from '../client/process-index.mjs';

describe('BUG-004: setFileIndex with non-array processIds', () => {

  it('should not throw when processIds is a plain object', () => {
    const index = new ProcessIndex();
    assert.doesNotThrow(() => index.setFileIndex('/a.bpmn', {}));
    assert.deepStrictEqual(index.getLocations('anything'), []);
  });

  it('should not throw when processIds is a number', () => {
    const index = new ProcessIndex();
    assert.doesNotThrow(() => index.setFileIndex('/a.bpmn', 42));
  });

  it('should not throw when processIds is a string', () => {
    const index = new ProcessIndex();
    assert.doesNotThrow(() => index.setFileIndex('/a.bpmn', 'Process_1'));
  });
});
