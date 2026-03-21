import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { ProcessIndex } from '../client/process-index.mjs';

describe('ProcessIndex', () => {

  it('setFileIndex with new processes removes old ones atomically', () => {
    const index = new ProcessIndex();

    index.setFileIndex('/a.bpmn', ['p1', 'p2', 'p3']);

    assert.deepStrictEqual(index.getLocations('p1'), [{ path: '/a.bpmn' }]);
    assert.deepStrictEqual(index.getLocations('p2'), [{ path: '/a.bpmn' }]);
    assert.deepStrictEqual(index.getLocations('p3'), [{ path: '/a.bpmn' }]);

    index.setFileIndex('/a.bpmn', ['p4']);

    assert.deepStrictEqual(index.getLocations('p1'), []);
    assert.deepStrictEqual(index.getLocations('p2'), []);
    assert.deepStrictEqual(index.getLocations('p3'), []);
    assert.deepStrictEqual(index.getLocations('p4'), [{ path: '/a.bpmn' }]);
    assert.strictEqual(index.isIndexed('/a.bpmn'), true);
  });
});
